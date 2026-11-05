const { Op, fn, col } = require('sequelize');
const db = require('../database/models');
const { ensurePlanSchema, withPlanSchema } = require('../database/config/ensurePlanSchema');

/**
 * Partner plans — the ONE price list the website, the app and the admin panel
 * charge from.
 *
 *   · `listPublic()`  what a client renders: active plans in the admin's order,
 *                     plus the free trial first. No auth — the registration
 *                     screen shows prices before anybody has an account.
 *   · `listAdmin()`   every row, with how many salons are currently ON each plan
 *                     (deactivating a plan with live subscriptions is the way a
 *                     renewal silently charges a plan that no longer exists).
 *   · `durationDays()` the single answer to "how long is plan X", used by salon
 *                     creation, renewal and the free trial. This is what makes an
 *                     admin's `days` change real instead of cosmetic.
 *
 * The built-in FALLBACK list mirrors what the seed inserts, so an un-migrated
 * deployment still sells the same plans at the same prices instead of a blank
 * picker.
 */

const FALLBACK_PLANS = [
    { id: 'Free', label: 'Free trial', price: 0, days: 90, note: 'Start your salon journey at no cost', badge: 'DEFAULT', isRecommended: true, sortOrder: -1, isActive: true, isFree: true },
    { id: 'monthly', label: 'Monthly Plan', price: 199, days: 30, note: 'Flexible month-to-month growth', badge: null, isRecommended: false, sortOrder: 0, isActive: true, isFree: false },
    { id: 'trial_2_months', label: 'Introductory', price: 299, days: 60, note: 'A gentle start for new partners', badge: null, isRecommended: false, sortOrder: 1, isActive: true, isFree: false },
    { id: 'quarterly', label: 'Quarterly Plan', price: 499, days: 90, note: 'Best value for busy salons', badge: 'BEST VALUE', isRecommended: true, sortOrder: 2, isActive: true, isFree: false }
];

// Legacy ids that predate the table. `yearly` was in `plan.util.js`'s map and a
// handful of salons may still carry it, so a renewal on that id must keep
// working even though no card offers it.
const LEGACY_DAYS = { yearly: 365, FREE: 90 };

const MAX_DAYS = 3650;
const MAX_PRICE = 1000000;

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

const toRow = (row) => ({
    id: row.id,
    label: row.label,
    price: Number(row.price ?? 0),
    days: Number(row.days ?? 0),
    note: row.note || '',
    badge: row.badge || '',
    isRecommended: row.isRecommended !== false && Boolean(row.isRecommended),
    sortOrder: Number(row.sortOrder ?? 0),
    isActive: row.isActive !== false,
    isFree: Boolean(row.isFree),
    updatedAt: row.updatedAt || row.updated_at || null
});

// "90" => "3 Months (90 Days)". Derived, never stored: a card cannot promise a
// window the salon does not get.
const describeDuration = (days) => {
    const value = Number(days) || 0;
    if (!value) return '';
    if (value === 1) return '1 Day';
    if (value === 7) return '7 Days (1 Week)';
    if (value % 30 === 0) {
        const months = value / 30;
        return `${months} ${months === 1 ? 'Month' : 'Months'} (${value} Days)`;
    }
    return `${value} Days`;
};

const normalizeText = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

const normalizeDays = (value, fallback = 30) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    if (parsed < 1 || parsed > MAX_DAYS) throw fail(`A plan must run for 1–${MAX_DAYS} days`);
    return parsed;
};

const normalizePrice = (value, fallback = 0) => {
    if (value === undefined || value === null || value === '') return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_PRICE) {
        throw fail(`A price must be a number between 0 and ${MAX_PRICE}`);
    }
    return Math.round(parsed * 100) / 100;
};

const normalizeFlag = (value, fallback = true) => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    return /^(true|1|yes|active|on)$/i.test(String(value).trim());
};

const normalizeSort = (value, fallback = 0) => {
    // 0 is the first card, so this must never be a `||` default.
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(-100, Math.min(100000, parsed));
};

// "Salon Growth" -> "salon-growth". Only used when the admin creates a plan
// WITHOUT an id: ids are permanent, so one that is supplied is never rewritten.
const toPlanId = (label = '') => String(label)
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');

const orderedRows = (rows) => rows
    .map(toRow)
    .sort((a, b) => (a.sortOrder - b.sortOrder) || String(a.label).localeCompare(String(b.label)));

const toPublicPlan = (row) => ({
    id: row.id,
    title: row.label,
    label: row.label,
    price: row.price,
    days: row.days,
    duration: describeDuration(row.days),
    note: row.note,
    badge: row.badge,
    best: row.isRecommended || undefined,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isFree: row.isFree
});

/**
 * The plan list a client renders. No token required.
 *
 * `freeTrial` is returned separately because every client shows it first and
 * needs its length for the "Start your 90-day free trial" line.
 */
const listPublic = async () => {
    let rows;
    try {
        rows = await withPlanSchema(() => db.PartnerPlan.findAll({
            where: { isActive: true },
            order: [['sortOrder', 'ASC']],
            raw: true
        }));
    } catch (error) {
        console.error('[partner-plans] falling back to the built-in list:', error.message);
        rows = [];
    }

    const plans = orderedRows(rows).filter(row => !row.isFree);
    const freeRow = orderedRows(rows).find(row => row.isFree);

    if (!plans.length) {
        // No table (or nothing active): the built-in list keeps the picker
        // working, at the prices this release shipped with.
        return {
            plans: FALLBACK_PLANS.filter(plan => !plan.isFree).map(toPublicPlan),
            freeTrial: toPublicPlan(FALLBACK_PLANS[0]),
            currency: 'INR',
            source: 'fallback'
        };
    }

    return {
        plans: plans.map(toPublicPlan),
        freeTrial: toPublicPlan(freeRow || { ...FALLBACK_PLANS[0] }),
        currency: 'INR',
        source: 'db'
    };
};

/**
 * How many salons are on each plan right now, and how many of those are live
 * (plan not yet ended). Deactivating or renaming a plan that live salons hold is
 * the only way this data hurts somebody, so the count is part of every admin
 * answer.
 */
const usageByPlan = async () => {
    const [live, all] = await Promise.all([
        db.Salon.findAll({
            attributes: ['planType', [fn('COUNT', col('salon_id')), 'total']],
            where: { isPlanActive: true },
            group: ['planType'],
            raw: true
        }),
        db.Salon.findAll({
            attributes: ['planType', [fn('COUNT', col('salon_id')), 'total']],
            group: ['planType'],
            raw: true
        })
    ]);
    const total = {};
    const active = {};
    all.forEach(row => { if (row.planType) total[row.planType] = Number(row.total) || 0; });
    live.forEach(row => { if (row.planType) active[row.planType] = Number(row.total) || 0; });
    return { total, active };
};

/** The admin panel's view: every row, newest rules, plus who is on what. */
const listAdmin = async () => {
    await ensurePlanSchema();
    const [rows, usage] = await Promise.all([
        db.PartnerPlan.findAll({ order: [['sortOrder', 'ASC']], raw: true }),
        usageByPlan()
    ]);
    const plans = orderedRows(rows).map(row => ({
        ...row,
        duration: describeDuration(row.days),
        activeSalons: usage.active[row.id] || 0,
        totalSalons: usage.total[row.id] || 0
    }));
    // A plan id that salons are on but the table does not hold (a legacy id like
    // `yearly`) is reported instead of being invisible: that is exactly the row
    // an admin needs to create before those salons can renew.
    const known = new Set(plans.map(plan => plan.id));
    const orphaned = Object.keys(usage.total)
        .filter(id => !known.has(id))
        .map(id => ({ id, totalSalons: usage.total[id] || 0, activeSalons: usage.active[id] || 0 }));
    return {
        plans,
        orphaned,
        freeTrialDays: plans.find(plan => plan.isFree)?.days ?? FALLBACK_PLANS[0].days,
        defaultPlanDays: 30,
        currency: 'INR'
    };
};

/**
 * "How long is this plan?" — the one answer the acceptance paths use.
 *
 * Order: the row in `partner_plans` → a legacy id this release still honours →
 * 30 days. Never throws: a salon creation must not fail because the price table
 * is unreadable, it must fall back to the window it always had.
 */
const durationDays = async (planId) => {
    const id = String(planId ?? '').trim();
    if (!id) return 30;
    try {
        const row = await withPlanSchema(() => db.PartnerPlan.findByPk(id, { raw: true }));
        if (row && Number(row.days) > 0) return Number(row.days);
    } catch (error) {
        console.error('[partner-plans] could not read the plan length, using the legacy default:', error.message);
    }
    if (LEGACY_DAYS[id] !== undefined) return LEGACY_DAYS[id];
    const fallback = FALLBACK_PLANS.find(plan => plan.id === id);
    return fallback ? fallback.days : 30;
};

/** The free trial a brand-new salon starts on (90 days by default). */
const defaultTrialDays = async () => {
    try {
        const row = await withPlanSchema(() => db.PartnerPlan.findOne({ where: { isFree: true }, raw: true }));
        if (row && Number(row.days) > 0) return Number(row.days);
    } catch (error) {
        console.error('[partner-plans] could not read the trial length, using 90 days:', error.message);
    }
    return FALLBACK_PLANS[0].days;
};

/**
 * The price of a plan, for the server-side amount check. Returns null when the
 * id is unknown (a legacy or retired id), so the caller can decide whether to
 * trust the client's amount.
 */
const priceOf = async (planId) => {
    const id = String(planId ?? '').trim();
    if (!id) return null;
    try {
        const row = await withPlanSchema(() => db.PartnerPlan.findByPk(id, { raw: true }));
        if (row) return Number(row.price ?? 0);
    } catch (error) {
        console.error('[partner-plans] could not read the plan price:', error.message);
    }
    const fallback = FALLBACK_PLANS.find(plan => plan.id === id);
    return fallback ? Number(fallback.price) : null;
};

/**
 * The check every paid path runs: is this plan real, and does the amount the
 * client sent match the price the admin set?
 *
 * This is what makes an admin price change authoritative. Without it a client
 * could send `amount: 1` for the quarterly plan and Razorpay would happily make
 * a ₹1 order for a ₹499 subscription.
 */
const assertPayableAmount = async ({ planType, amount }) => {
    const price = await priceOf(planType);
    if (price === null) {
        throw fail(`Unknown plan "${planType}". Refresh the plan list and try again.`);
    }
    if (price === 0) {
        // A free plan is never paid for through the gateway.
        throw fail('This plan is free — start it without a payment.');
    }
    const sent = Number(amount);
    if (!Number.isFinite(sent) || Math.abs(sent - price) > 0.5) {
        throw fail(`The price of this plan is ₹${price}. Refresh the plan list and try again.`);
    }
    return price;
};

const requireUniqueLabel = async (label, exceptId) => {
    const rows = await db.PartnerPlan.findAll({ attributes: ['id', 'label'], raw: true });
    const clash = rows.find(row => String(row.label).toLowerCase() === label.toLowerCase() && row.id !== exceptId);
    if (clash) throw fail(`A plan called "${clash.label}" already exists`);
};

const create = async ({ id, label, title, price, days, note, badge, isRecommended, best, sortOrder, isActive, isFree } = {}) => {
    await ensurePlanSchema();
    const cleanLabel = normalizeText(label ?? title);
    if (cleanLabel.length < 2 || cleanLabel.length > 120) throw fail('A plan name must be 2–120 characters');

    const wantedId = String(id || toPlanId(cleanLabel)).trim().slice(0, 40);
    if (!wantedId) throw fail('A plan needs an id of letters, digits or dashes');

    const existing = await db.PartnerPlan.findByPk(wantedId);
    if (existing) throw fail(`A plan with the id "${wantedId}" already exists ("${existing.label}")`);
    await requireUniqueLabel(cleanLabel);

    const free = normalizeFlag(isFree, false);
    if (free) {
        // Exactly one free plan: it is the trial every new salon starts on.
        const current = await db.PartnerPlan.findOne({ where: { isFree: true } });
        if (current) throw fail(`"${current.label}" is already the free trial — edit that plan instead`);
    }

    const maxSort = await db.PartnerPlan.max('sortOrder');
    const row = await db.PartnerPlan.create({
        id: wantedId,
        label: cleanLabel,
        price: free ? 0 : normalizePrice(price, 0),
        days: normalizeDays(days, 30),
        note: normalizeText(note) || null,
        badge: normalizeText(badge) || null,
        isRecommended: normalizeFlag(isRecommended ?? best, false),
        sortOrder: normalizeSort(sortOrder, Number.isFinite(Number(maxSort)) ? Number(maxSort) + 1 : 0),
        isActive: normalizeFlag(isActive, true),
        isFree: free
    });
    return toRow(row.get({ plain: true }));
};

/** Partial update. `id` identifies the row and can never change. */
const update = async ({ id, label, title, price, days, note, badge, isRecommended, best, sortOrder, isActive, isFree } = {}) => {
    await ensurePlanSchema();
    const row = await db.PartnerPlan.findByPk(String(id || '').trim());
    if (!row) throw fail('That plan no longer exists — refresh the list', 404);

    const next = {};
    const nextLabel = label ?? title;
    if (nextLabel !== undefined) {
        const cleanLabel = normalizeText(nextLabel);
        if (cleanLabel.length < 2 || cleanLabel.length > 120) throw fail('A plan name must be 2–120 characters');
        await requireUniqueLabel(cleanLabel, row.id);
        next.label = cleanLabel;
    }
    if (price !== undefined) {
        // A free plan stays free whatever the caller sends; the paid ones must
        // cost something or the payment path would refuse them.
        next.price = row.isFree ? 0 : normalizePrice(price, Number(row.price));
        if (!row.isFree && next.price <= 0) throw fail('A paid plan must cost more than ₹0 — deactivate it instead of pricing it at zero');
    }
    if (days !== undefined) next.days = normalizeDays(days, Number(row.days));
    if (note !== undefined) next.note = normalizeText(note) || null;
    if (badge !== undefined) next.badge = normalizeText(badge) || null;
    if (isRecommended !== undefined || best !== undefined) next.isRecommended = normalizeFlag(isRecommended ?? best, false);
    if (sortOrder !== undefined) next.sortOrder = normalizeSort(sortOrder, Number(row.sortOrder));
    if (isActive !== undefined) next.isActive = normalizeFlag(isActive, true);
    if (isFree !== undefined) {
        const free = normalizeFlag(isFree, Boolean(row.isFree));
        if (free && !row.isFree) {
            const current = await db.PartnerPlan.findOne({ where: { isFree: true } });
            if (current) throw fail(`"${current.label}" is already the free trial`);
        }
        next.isFree = free;
    }

    if (!Object.keys(next).length) return toRow(row.get({ plain: true }));
    await row.update(next);
    return toRow(row.get({ plain: true }));
};

/**
 * Remove a plan. Refused while any salon is on it — those subscriptions would
 * otherwise point at a plan that no longer exists, and the renewal screen would
 * have nothing to renew. The admin either moves them (`deactivate: true`, which
 * hides the plan from new purchases but keeps it valid for its holders) or
 * deletes once the count is zero.
 */
const remove = async ({ id, deactivate } = {}) => {
    await ensurePlanSchema();
    const row = await db.PartnerPlan.findByPk(String(id || '').trim());
    if (!row) throw fail('That plan no longer exists — refresh the list', 404);
    if (row.isFree) throw fail('The free trial is required — edit its length instead of deleting it');

    const usage = await db.Salon.count({ where: { planType: row.id } });
    if (usage > 0) {
        if (normalizeFlag(deactivate, false)) {
            await row.update({ isActive: false });
            return { id: row.id, deleted: false, deactivated: true, salons: usage };
        }
        throw fail(`${usage} salon${usage === 1 ? ' is' : 's are'} on "${row.label}" — deactivate it instead of deleting it`);
    }
    await row.destroy();
    return { id: row.id, deleted: true, deactivated: false, salons: 0 };
};

module.exports = {
    FALLBACK_PLANS,
    describeDuration,
    toPlanId,
    listPublic,
    listAdmin,
    durationDays,
    defaultTrialDays,
    priceOf,
    assertPayableAmount,
    create,
    update,
    remove
};
