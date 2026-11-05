// utils/istRange.js
//
// The ONE place an admin tab's "Today / Last 7 days / Last 30 days / All time"
// becomes a pair of instants.
//
// Why this file exists: `adminListBookingRequests` and
// `adminBookingRequestSummary` each used to carry their own copy of this maths,
// and they disagreed with each other and with the service that applied the
// bounds:
//
//   · the list controller defaulted to `ALL` when the panel forgot to send a
//     range — so "Today" on the tiles and "everything ever" on the table;
//   · the service then re-read the two instants by slicing the first ten
//     characters off an ISO string and treating that as UTC midnight. An IST
//     midnight is 18:30 UTC the day before, so the window it actually applied
//     ran 00:00→05:30 of the WRONG day: early-morning requests vanished from
//     "Today", and the previous evening's leaked in.
//
// Delhi is UTC+05:30 all year (no daylight saving), so the offset is exact and
// no timezone database is needed.
//
// Everything returned here is an ISO instant. A bare `YYYY-MM-DD` is read as
// that DAY in IST — a date input says "5th November", not "5th November UTC".

const IST_OFFSET_MS = 330 * 60 * 1000;

const DAY_MS = 86400000;

// How many days each range covers, counting today. ALL is deliberately absent:
// it is the "no bounds" case.
const RANGE_DAYS = {
    TODAY: 1,
    WEEK: 7,
    '7D': 7,
    MONTH: 30,
    '30D': 30
};

// A client asking for something unknown gets today, never the whole table: an
// admin tab that silently widens to "everything" is how a busy platform ends up
// paging through months of leads.
const DEFAULT_RANGE = 'TODAY';

const startOfIstDay = (date = new Date()) => {
    const shifted = new Date(date.getTime() + IST_OFFSET_MS);
    shifted.setUTCHours(0, 0, 0, 0);
    return new Date(shifted.getTime() - IST_OFFSET_MS);
};

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

const normalizeRange = (value) => {
    const key = String(value || DEFAULT_RANGE).trim().toUpperCase();
    if (key === 'ALL') return 'ALL';
    return RANGE_DAYS[key] ? key : DEFAULT_RANGE;
};

/**
 * Parse one end of a window.
 *
 * - `YYYY-MM-DD` -> that day in IST (`end: true` gives the next midnight, so the
 *   bound stays exclusive and "5th November" includes the whole 5th).
 * - anything else -> an instant, used as given.
 */
const parseBound = (value, { end = false } = {}) => {
    if (!value || value === 'null' || value === 'undefined') return null;
    const raw = String(value).trim();
    const dayOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
    const at = dayOnly ? new Date(`${raw}T00:00:00.000+05:30`) : new Date(raw);
    if (Number.isNaN(at.getTime())) return null;
    return dayOnly && end ? addDays(at, 1) : at;
};

/**
 * `{ range, fromDate, toDate }` (as a body sends them) -> the window the query
 * must use, plus the range key that was actually applied.
 *
 * An explicit `fromDate` / `toDate` wins over the range for that end — the
 * older contract let the panel send a hand-picked window, and it still does.
 */
const resolveRange = ({ range, fromDate, toDate } = {}) => {
    const key = normalizeRange(range);

    let windowFrom = null;
    let windowTo = null;
    if (RANGE_DAYS[key]) {
        const startOfToday = startOfIstDay();
        windowFrom = addDays(startOfToday, -(RANGE_DAYS[key] - 1));
        windowTo = addDays(startOfToday, 1);
    }

    const from = parseBound(fromDate) || windowFrom;
    const to = parseBound(toDate, { end: true }) || windowTo;

    return {
        range: key,
        fromDate: from ? from.toISOString() : null,
        toDate: to ? to.toISOString() : null
    };
};

module.exports = {
    IST_OFFSET_MS,
    DAY_MS,
    RANGE_DAYS,
    DEFAULT_RANGE,
    startOfIstDay,
    addDays,
    normalizeRange,
    parseBound,
    resolveRange
};
