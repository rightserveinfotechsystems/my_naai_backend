const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const db = require('../database/models');
const { ensureShopSchema } = require('../database/config/ensureShopSchema');
const { addDays, parseBound, resolveRange, startOfIstDay } = require('../utils/istRange');

/**
 * Booking REQUESTS — the leads API behind the salon's Booking requests tab and
 * the admin panel's Booking requests tab.
 *
 * A request is not a booking. `booking_requests` is the lead a customer sent;
 * `booking` / `booking_list` is the chair that exists after a salon accepts.
 * Nothing in this file reads the bookings table to answer a question about a
 * request, and nothing counts a request as a booking: the accept path writes
 * `booking_id` on the request, and that pointer is the only link.
 *
 * The answer window: a request is answerable for 60 seconds (WRITE side:
 * `expires_at` is stamped by the booking-request create path, never by a
 * client). The only sane reading of "still PENDING, past its window" is
 * AUTO_CANCELLED — the salon missed it — so this service derives that state for
 * every row it returns and the sweeper (§ tasks/bookingRequestSweeper.js) writes
 * it down. Auto-cancelled is NOT a rejection: a salon that misses leads has a
 * staffing problem, a salon that rejects them has a pricing one, and the tabs
 * show them in separate tiles.
 */

const WINDOW_SECONDS = 60;
const WINDOW_MS = WINDOW_SECONDS * 1000;
const DEFAULT_LIMIT = parseInt(process.env.PAGE_LIMIT) || 20;
const MAX_LIMIT = 100;

// Status the client may ask for -> the statuses stored for it.
//   · 'DELAYED' is the client's word (a new time was proposed); the column
//     stores 'DELAY_PROPOSED'.
//   · 'CANCELLED' is the customer withdrawing the request; it is its own bucket
//     and is never counted as an auto-cancel.
const STATUS_FILTERS = {
    ALL: null,
    PENDING: ['PENDING'],
    ACCEPTED: ['ACCEPTED'],
    REJECTED: ['REJECTED'],
    AUTO_CANCELLED: ['AUTO_CANCELLED'],
    CANCELLED: ['CANCELLED'],
    CANCELLED_BY_CUSTOMER: ['CANCELLED'],
    DELAYED: ['DELAY_PROPOSED'],
    DELAY_PROPOSED: ['DELAY_PROPOSED']
};

const statusFilterOf = (value) => {
    const key = String(value || 'ALL').trim().toUpperCase();
    return STATUS_FILTERS[key] === undefined ? null : STATUS_FILTERS[key];
};

// ---------------------------------------------------------------- time helpers
//
// The maths lives in utils/istRange.js, because the two admin controllers used
// to carry their own copy and the three disagreed. `rangeStart` stays exported
// for callers that only need the lower bound.

const rangeStart = (range) => {
    const { fromDate } = resolveRange({ range });
    return fromDate ? new Date(fromDate) : null;
};

/**
 * The window for a range, as the ISO pair `resolveRange` returns. Summaries take
 * `range`; a list takes the instants the controller resolved, so the tiles and
 * the table below them can never describe different windows.
 */
const windowOf = ({ range, fromDate, toDate } = {}) => resolveRange({ range, fromDate, toDate });

const clampLimit = (value) => {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed)) return Math.min(DEFAULT_LIMIT, MAX_LIMIT);
    return Math.max(1, Math.min(MAX_LIMIT, parsed));
};

// --------------------------------------------------------------- derivations

const minutesBetween = (from, to) => {
    if (!from || !to) return null;
    const seconds = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000);
    return Number.isFinite(seconds) ? Math.max(0, seconds) : null;
};

/**
 * The state a row is IN, as opposed to the state the column still says.
 * A PENDING row past its window is auto-cancelled even before the sweeper has
 * written it down, so the tab never offers an Accept that cannot succeed.
 */
const effectiveStatus = (row, now = Date.now()) => {
    if (row.status !== 'PENDING') return row.status;
    const expiresAt = row.expiresAt ? new Date(row.expiresAt).getTime() : null;
    if (expiresAt === null) return row.status;
    return expiresAt <= now ? 'AUTO_CANCELLED' : 'PENDING';
};

// The client's `summarizeLeads` reads `status`; a request that expired while the
// page was open must read the same as one the sweeper already caught.
const DISPLAY_STATUS = {
    AUTO_CANCELLED: 'AUTO_CANCELLED',
    DELAY_PROPOSED: 'DELAYED'
};

/**
 * The services snapshot taken at request time (`serviceIds` is a JSON column:
 * `[{ serviceId, name, duration, price }]`). No join: what the customer asked
 * for is what the lead shows, even if the salon edits its price list later.
 */
const servicesOf = (raw) => {
    const list = Array.isArray(raw) ? raw : [];
    return list
        .map((item) => ({
            serviceId: item?.serviceId || item?.id || null,
            serviceName: item?.serviceName || item?.name || 'Service',
            price: item?.price ?? item?.amount ?? null
        }))
        .filter((item) => item.serviceName);
};

const totalOf = (services) => services.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

const toRow = (row, { now = Date.now(), admin = false } = {}) => {
    const services = servicesOf(row.serviceIds);
    const status = effectiveStatus(row, now);
    const respondedAt = row.respondedAt || null;
    const line = {
        bookingRequestId: row.bookingRequestId,
        customerName: row.customer?.fullName || 'Customer',
        customerPhone: row.customer?.phoneNumber || '',
        bookingDate: row.bookingDate,
        bookingTime: row.startTime,
        endTime: row.endTime,
        barberName: row.barber?.fullName || '',
        status: DISPLAY_STATUS[status] || status,
        rawStatus: row.status,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt || (row.createdAt ? new Date(new Date(row.createdAt).getTime() + WINDOW_MS) : null),
        respondedAt,
        bookingId: row.bookingId || null,
        services,
        total: totalOf(services)
    };

    if (!admin) return line;

    // Admin-only columns: who the lead belonged to, and how quickly they
    // answered it. `outcome` is the panel's word for the three buckets a lead
    // can end in, and it is derived here so the panel never re-implements the
    // rule differently.
    return {
        ...line,
        salonId: row.salonId,
        salonName: row.salon?.salonName || '',
        salonPhone: row.salon?.phoneNumber || '',
        city: row.salon?.city || '',
        // Who answered. Null means the salon did (every row written before the
        // admin-on-behalf feature existed), which the panel prints as such.
        answeredByRole: row.actedByRole || 'SALON',
        onBehalfOfSalon: Boolean(row.onBehalfOfSalon),
        actedAt: row.actedAt || respondedAt,
        adminNote: row.adminNote || null,
        responseSeconds: minutesBetween(row.createdAt, respondedAt),
        outcome: status === 'ACCEPTED' || status === 'REJECTED'
            ? 'answered'
            : status === 'AUTO_CANCELLED'
                ? 'missed'
                : status === 'CANCELLED'
                    ? 'withdrawn'
                    : 'open'
    };
};

// ------------------------------------------------------------------- queries

const withRelations = () => ([
    {
        model: db.User,
        as: 'customer',
        attributes: ['userId', 'fullName', 'phoneNumber'],
        required: false
    },
    {
        model: db.Salon,
        as: 'salon',
        attributes: ['salonId', 'salonName', 'phoneNumber', 'city', 'isActive'],
        required: false
    },
    {
        model: db.Barber,
        as: 'barber',
        attributes: ['barberId', 'fullName'],
        required: false
    }
]);

/**
 * Turn the tab's filters into a WHERE clause.
 *
 * `status: 'AUTO_CANCELLED'` must include the PENDING rows whose window has
 * closed (they ARE auto-cancelled, the sweeper just has not written it yet), and
 * `status: 'PENDING'` must exclude them. That asymmetry is why the status
 * filter cannot be a plain `IN`.
 */
const buildWhere = ({ salonId, status, search, fromDate, toDate } = {}) => {
    const where = {};
    if (salonId) where.salonId = salonId;

    // Filters that need an OR of their own are collected here and ANDed
    // together at the end. They used to be written straight into `where[Op.or]`,
    // so a status filter plus a search term became ONE flat OR — "auto-cancelled
    // OR any customer whose name matches" — and either filter stopped
    // filtering. Two groups, one AND: every filter now narrows the last.
    const groups = [];

    const wanted = statusFilterOf(status);
    const now = new Date();
    if (wanted) {
        if (wanted.length === 1 && wanted[0] === 'PENDING') {
            // Live leads only: not expired, and with an expiry actually written
            // (a row from before the migration has no window — the sweeper
            // stamps it at boot, and until then it is not "answerable").
            where.status = 'PENDING';
            where.expiresAt = { [Op.gt]: now };
        } else if (wanted.length === 1 && wanted[0] === 'AUTO_CANCELLED') {
            groups.push({
                [Op.or]: [
                    { status: 'AUTO_CANCELLED' },
                    { status: 'PENDING', expiresAt: { [Op.lte]: now } }
                ]
            });
        } else {
            where.status = { [Op.in]: wanted };
        }
    }

    // `parseBound` reads a bare `YYYY-MM-DD` as that day in IST and a timestamp
    // as the instant it names. The old code sliced ten characters off whatever
    // it was given and called it UTC midnight, which shifted every window by
    // 5h30m — requests sent between midnight and 05:30 IST were missing from
    // "Today".
    const from = parseBound(fromDate);
    const to = parseBound(toDate, { end: true });
    if (from || to) {
        where.createdAt = {
            ...(from ? { [Op.gte]: from } : {}),
            ...(to ? { [Op.lt]: to } : {})
        };
    }

    const term = String(search || '').trim();
    if (term) {
        // Customer name, customer phone, or the salon's name — the three things
        // somebody on the phone actually knows.
        groups.push({
            [Op.or]: [
                { '$customer.full_name$': { [Op.iLike]: `%${term}%` } },
                { '$customer.phone_number$': { [Op.iLike]: `%${term}%` } },
                { '$salon.salon_name$': { [Op.iLike]: `%${term}%` } }
            ]
        });
    }

    if (groups.length) where[Op.and] = groups;

    return where;
};

const pagedQuery = async ({ where, page, limit, admin }) => {
    const safePage = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
    const safeLimit = clampLimit(limit);

    const { count, rows } = await db.BookingRequest.findAndCountAll({
        where,
        include: withRelations(),
        order: [['createdAt', 'DESC'], ['bookingRequestId', 'DESC']],
        limit: safeLimit,
        offset: (safePage - 1) * safeLimit,
        // The search joins two tables, so the count has to be over the joined
        // result rather than over booking_requests alone.
        distinct: true,
        subQuery: false
    });

    const now = Date.now();
    return {
        requests: rows.map((row) => toRow(row, { admin, now })),
        pagination: {
            page: safePage,
            limit: safeLimit,
            totalPages: Math.ceil(count / safeLimit) || 0,
            totalRequests: count
        }
    };
};

/**
 * Write down the auto-cancels the world can already see.
 *
 * The `WHERE status = 'PENDING' AND expires_at < NOW()` clause makes this
 * idempotent: a second run in the same second finds nothing. It is called by the
 * cron sweeper (which also notifies the customers) and, best-effort, by the two
 * list endpoints so a tab opened a second before the cron tick is still right.
 */
let lastSweepAt = 0;
const SWEEP_THROTTLE_MS = 2000;

const sweepExpiredRequests = async ({ force = false } = {}) => {
    const now = Date.now();
    if (!force && now - lastSweepAt < SWEEP_THROTTLE_MS) return [];
    lastSweepAt = now;

    const rows = await db.sequelize.query(
        `UPDATE booking_requests
            SET status = 'AUTO_CANCELLED',
                responded_at = COALESCE(responded_at, expires_at),
                updated_at = NOW()
          WHERE status = 'PENDING'
            AND expires_at IS NOT NULL
            AND expires_at < NOW()
        RETURNING booking_request_id AS "bookingRequestId",
                  salon_id AS "salonId",
                  customer_id AS "customerId"`,
        { type: QueryTypes.SELECT }
    );

    return rows || [];
};

/**
 * The safe wrapper: a list must never fail because the sweeper could not run
 * (a replica without write rights still has to be able to show the tab).
 */
const sweepQuietly = async () => {
    try {
        return await sweepExpiredRequests();
    } catch (error) {
        console.error('[booking-request] sweeper skipped:', error.message);
        return [];
    }
};

// ------------------------------------------------------------------ counting

// A request past its window IS auto-cancelled, whether or not the sweeper has
// written that down yet. Counting the raw column would put those rows in
// "awaiting" and make the tab's chips disagree with the rows it returns for the
// same filter, so the count derives the state exactly as `effectiveStatus` does
// — in SQL, so a month of leads never has to be shipped to be counted.
const DERIVED_STATUS_SQL = `CASE
            WHEN status = 'PENDING' AND expires_at IS NOT NULL AND expires_at <= NOW()
                THEN 'AUTO_CANCELLED'
            ELSE status
        END`;

const countByStatus = async (where) => {
    const rows = await db.BookingRequest.findAll({
        where,
        attributes: [
            [literal(DERIVED_STATUS_SQL), 'status'],
            [fn('COUNT', col('booking_request_id')), 'total']
        ],
        group: [literal(DERIVED_STATUS_SQL)],
        raw: true
    });
    return rows.reduce((acc, row) => {
        acc[row.status] = Number(row.total) || 0;
        return acc;
    }, {});
};

/**
 * The chip row above the admin table: how many requests the CURRENT window
 * holds, per status, before the status filter is applied.
 *
 * Deliberately range + salon only. Counting through the search join would mean
 * a GROUP BY over `booking_requests` joined to two tables on every keystroke,
 * and the chips would then shuffle under the cursor while somebody types. The
 * panel labels them "in this range" and prints the search's own total next to
 * the table, so nothing on the screen claims two different numbers are the same
 * thing.
 *
 * A failure here must not take the list down with it — the caller drops the
 * chips and the table still renders.
 */
const statusCounts = async ({ salonId, fromDate, toDate } = {}) => {
    const counts = await countByStatus(buildWhere({ salonId, fromDate, toDate }));
    const pick = (key) => counts[key] || 0;
    return {
        ALL: Object.values(counts).reduce((sum, value) => sum + value, 0),
        PENDING: pick('PENDING'),
        ACCEPTED: pick('ACCEPTED'),
        REJECTED: pick('REJECTED'),
        AUTO_CANCELLED: pick('AUTO_CANCELLED'),
        CANCELLED: pick('CANCELLED'),
        DELAYED: pick('DELAY_PROPOSED')
    };
};

/**
 * The counters a tab leads with. Both tabs get the same shape; the admin's adds
 * the per-salon report.
 *
 * `answerRate = round((accepted + rejected) / received * 100)`, and the buckets
 * add up: accepted + rejected + autoCancelled + cancelledByCustomer + awaiting +
 * delayed === received.
 */
const summarize = async (where) => {
    const counts = await countByStatus(where);
    const received = Object.values(counts).reduce((sum, value) => sum + value, 0);

    const accepted = counts.ACCEPTED || 0;
    const rejected = counts.REJECTED || 0;
    const autoCancelled = counts.AUTO_CANCELLED || 0;
    // The column stores the customer's withdrawal as CANCELLED — it is a third
    // bucket, never folded into the salon's missed leads.
    const cancelledByCustomer = counts.CANCELLED || 0;
    const awaiting = counts.PENDING || 0;
    const delayed = counts.DELAY_PROPOSED || 0;
    const answered = accepted + rejected;

    const lastReceivedAt = await db.BookingRequest.max('createdAt', { where });

    return {
        received,
        awaiting,
        accepted,
        rejected,
        autoCancelled,
        cancelledByCustomer,
        delayed,
        answered,
        answerRate: received ? Math.round((answered / received) * 100) : 0,
        lastReceivedAt: lastReceivedAt || null
    };
};

// ------------------------------------------------------------------- readers

const listSalonLeads = async ({ salonId, status = 'ALL', page, limit, fromDate, toDate } = {}) => {
    await ensureShopSchema();
    await sweepQuietly();
    return pagedQuery({ where: buildWhere({ salonId, status, fromDate, toDate }), page, limit, admin: false });
};

const salonSummary = async ({ salonId, range = 'ALL', fromDate, toDate } = {}) => {
    await ensureShopSchema();
    await sweepQuietly();

    const start = rangeStart(range);
    const where = buildWhere({ salonId, status: 'ALL', fromDate: fromDate || (start ? start.toISOString() : undefined), toDate });
    return summarize(where);
};

const listAdminLeads = async ({ salonId, status = 'ALL', search, page, limit, fromDate, toDate } = {}) => {
    await ensureShopSchema();
    await sweepQuietly();

    const [result, chips] = await Promise.all([
        pagedQuery({
            where: buildWhere({ salonId, status, search, fromDate, toDate }),
            page,
            limit,
            admin: true
        }),
        statusCounts({ salonId, fromDate, toDate }).catch((error) => {
            console.error('[booking-request] status counts skipped:', error.message);
            return null;
        })
    ]);

    // The chips describe the window; the table describes the window + filters.
    // Both numbers are on the screen, each labelled, and neither is guessed.
    return chips ? { ...result, statusCounts: chips } : result;
};

/**
 * Median first-response time per salon, straight from Postgres.
 *
 * In SQL rather than in JS on purpose: a month of leads on a busy platform is
 * tens of thousands of rows, and `percentile_cont` answers it without shipping
 * them anywhere. Salons that never answered are simply absent — the panel shows
 * a dash, not a zero (a zero would read as "instant reply").
 */
const medianResponseBySalon = async (where = {}) => {
    const clauses = ['responded_at IS NOT NULL'];
    const replacements = {};

    if (where.salonId) {
        clauses.push('salon_id = :salonId');
        replacements.salonId = where.salonId;
    }
    const from = where.createdAt?.[Op.gte];
    const to = where.createdAt?.[Op.lt];
    if (from) {
        clauses.push('created_at >= :from');
        replacements.from = from;
    }
    if (to) {
        clauses.push('created_at < :to');
        replacements.to = to;
    }

    const rows = await db.sequelize.query(
        `SELECT salon_id AS "salonId",
                percentile_cont(0.5) WITHIN GROUP (
                    ORDER BY EXTRACT(EPOCH FROM (responded_at - created_at))
                ) AS "medianSeconds"
           FROM booking_requests
          WHERE ${clauses.join(' AND ')}
          GROUP BY salon_id`,
        { replacements, type: QueryTypes.SELECT }
    );
    return rows.reduce((acc, row) => {
        acc[row.salonId] = row.medianSeconds === null ? null : Math.round(Number(row.medianSeconds));
        return acc;
    }, {});
};

/**
 * The report the admin team actually asked for: which salons get leads, and
 * which of them let them die.
 */
const adminSummary = async ({ range = 'ALL', salonId, fromDate, toDate } = {}) => {
    await ensureShopSchema();
    await sweepQuietly();

    const start = rangeStart(range);
    const where = buildWhere({
        salonId,
        status: 'ALL',
        fromDate: fromDate || (start ? start.toISOString() : undefined),
        toDate
    });

    const platform = await summarize(where);

    const grouped = await db.BookingRequest.findAll({
        where,
        attributes: [
            'salonId',
            'status',
            [fn('COUNT', col('booking_request_id')), 'total']
        ],
        group: ['salonId', 'status'],
        raw: true
    });

    const bySalon = new Map();
    grouped.forEach((row) => {
        const id = row.salonId;
        if (!bySalon.has(id)) {
            bySalon.set(id, {
                salonId: id,
                salonName: '',
                received: 0,
                accepted: 0,
                rejected: 0,
                autoCancelled: 0,
                cancelledByCustomer: 0,
                awaiting: 0,
                delayed: 0,
                answerRate: 0,
                medianResponseSeconds: null
            });
        }
        const entry = bySalon.get(id);
        const total = Number(row.total) || 0;
        entry.received += total;
        if (row.status === 'ACCEPTED') entry.accepted += total;
        if (row.status === 'REJECTED') entry.rejected += total;
        if (row.status === 'AUTO_CANCELLED') entry.autoCancelled += total;
        if (row.status === 'CANCELLED') entry.cancelledByCustomer += total;
        if (row.status === 'PENDING') entry.awaiting += total;
        if (row.status === 'DELAY_PROPOSED') entry.delayed += total;
    });

    const ids = [...bySalon.keys()].filter(Boolean);
    if (ids.length) {
        const salons = await db.Salon.findAll({
            where: { salonId: { [Op.in]: ids } },
            attributes: ['salonId', 'salonName', 'city'],
            raw: true
        });
        const names = new Map(salons.map((salon) => [salon.salonId, salon]));
        bySalon.forEach((entry, id) => {
            const salon = names.get(id);
            entry.salonName = salon?.salonName || '';
            entry.city = salon?.city || '';
        });
    }

    const medians = await medianResponseBySalon(where);
    const rows = [...bySalon.values()].map((entry) => {
        const answered = entry.accepted + entry.rejected;
        return {
            ...entry,
            answered,
            answerRate: entry.received ? Math.round((answered / entry.received) * 100) : 0,
            medianResponseSeconds: medians[entry.salonId] ?? null
        };
    });

    // Worst first: the list an account manager works down. A salon that never
    // answered sorts ahead of one that answered slowly.
    rows.sort((a, b) => (
        b.autoCancelled - a.autoCancelled
        || b.received - a.received
        || String(a.salonName).localeCompare(String(b.salonName))
    ));

    return { ...platform, bySalon: rows, platform };
};

module.exports = {
    WINDOW_SECONDS,
    WINDOW_MS,
    STATUS_FILTERS,
    statusFilterOf,
    rangeStart,
    windowOf,
    statusCounts,
    effectiveStatus,
    servicesOf,
    toRow,
    buildWhere,
    sweepExpiredRequests,
    listSalonLeads,
    salonSummary,
    listAdminLeads,
    adminSummary,
    summarize,
    medianResponseBySalon
};
