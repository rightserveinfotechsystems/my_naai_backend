const { Op, fn, col, where } = require('sequelize');
const db = require('../database/models');
const { ensureShopSchema } = require('../database/config/ensureShopSchema');
const { toCategoryId, CATEGORY_ID_MAX } = require('../utils/categorySlug');

/**
 * Shop categories — the ONE list the admin panel, the website and the app read.
 *
 * Every surface used to keep its own answer to "what is this product's
 * category?": the panel offered eight long labels, the website guessed from the
 * product name. This service is the single answer:
 *
 *   · `listActive()`   the storefront's filter (active rows, admin's order),
 *   · `listAdmin()`    the panel's manager (every row + how many products use
 *                      it, because deleting a shelf with products on it is how
 *                      a catalogue silently loses items),
 *   · `resolveCategoryId()` the guard for every write — a product may only be
 *                      filed under a category that exists.
 *
 * The id is a slug FIXED at creation: `shop_products.category` stores it, so a
 * label rename keeps the id (and therefore every product) intact. That is why
 * `update` refuses to change an id even when the caller sends one.
 */

const MAX_LABEL = 120;
const MAX_SORT = 100000;

// Errors carry their status so the controllers stay one-liners. A service
// failure that a caller can fix (a duplicate id, a used category) is a 400; a
// failure they cannot (database down) stays a 500.
const fail = (message, status = 400) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const normalizeLabel = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

const normalizeSort = (value, fallback = 0) => {
    // 0 is the first chip, so this must never be a `||` default.
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(MAX_SORT, parsed));
};

const normalizeFlag = (value, fallback = true) => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    const text = String(value).trim().toLowerCase();
    if (['true', '1', 'yes', 'active', 'shown'].includes(text)) return true;
    if (['false', '0', 'no', 'hidden', 'inactive'].includes(text)) return false;
    return fallback;
};

// The storefront reads this shape (`{ id, label, sortOrder }`); the panel reads
// the same plus `isActive` and `productCount`.
const toRow = (row, productCount) => ({
    id: row.id,
    label: row.label,
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
    isActive: row.isActive !== false,
    ...(productCount === undefined ? {} : { productCount })
});

/**
 * How many live products sit on each category.
 *
 * `shop_products.category` is free text and old rows may still hold a legacy
 * label, so a product counts towards a category when its value IS the id or IS
 * the category's label (case-insensitively). Anything else is reported under
 * `unmatched` — that is the list an admin needs to re-file by hand, and it is
 * also what makes "delete refused, 12 products" honest instead of off by five.
 */
const usageByCategory = async (categories) => {
    const rows = await db.ShopProduct.findAll({
        attributes: ['category', [fn('COUNT', col('product_id')), 'total']],
        where: { deletedAt: null },
        group: ['category'],
        raw: true
    });

    const byKey = new Map();
    rows.forEach((row) => {
        const key = String(row.category || '').trim().toLowerCase();
        if (!key) return;
        byKey.set(key, (byKey.get(key) || 0) + Number(row.total || 0));
    });

    const counts = new Map();
    const known = new Set();
    categories.forEach((category) => {
        const id = String(category.id).toLowerCase();
        const label = String(category.label || '').toLowerCase();
        known.add(id);
        known.add(label);
        counts.set(category.id, (byKey.get(id) || 0) + (byKey.get(label) || 0));
    });

    const unmatched = [];
    byKey.forEach((total, key) => {
        if (!known.has(key)) unmatched.push({ value: key, productCount: total });
    });

    return { counts, unmatched };
};

/**
 * The storefront's filter list: active only, ordered by the admin's
 * `sort_order` (ties broken by id so two surfaces never disagree).
 */
const listActive = async () => {
    await ensureShopSchema();
    const rows = await db.ShopCategory.findAll({
        where: { isActive: true },
        order: [['sortOrder', 'ASC'], ['id', 'ASC']]
    });
    return rows.map((row) => toRow(row));
};

/**
 * The admin panel's manager: every row, with how many products use it.
 * `includeInactive` defaults to TRUE here — the panel must be able to see a
 * hidden category to un-hide it.
 */
const listAdmin = async ({ includeInactive = true } = {}) => {
    await ensureShopSchema();
    const where = includeInactive ? {} : { isActive: true };
    const rows = await db.ShopCategory.findAll({
        where,
        order: [['sortOrder', 'ASC'], ['id', 'ASC']]
    });
    const { counts, unmatched } = await usageByCategory(rows);
    return {
        categories: rows.map((row) => toRow(row, counts.get(row.id) || 0)),
        // Free-text values no category owns. The panel shows them under the
        // manager so a shelf the admin forgot about is visible, not guessed at.
        unmatched
    };
};

/** The bare list of ids, used to validate a product write. */
const categoryIds = async () => {
    await ensureShopSchema();
    const rows = await db.ShopCategory.findAll({ attributes: ['id'], raw: true });
    return rows.map((row) => row.id);
};

/**
 * Turn whatever a caller sent into a real category id.
 *
 * Accepted, in order: an exact id ("hair-care"), a label in any case ("Hair
 * Care"), or a label's slug ("hair care" -> "hair-care"). Anything else is
 * `null` — the caller decides whether that is a 400 or a skipped row, and the
 * message can then name what was actually sent.
 *
 * The slug fallback matters for hand-written sheets: "Tools & equipment"
 * slugs to "tools-and-equipment", which is NOT the seeded id, so the lookup by
 * label has to run first or a perfectly correct sheet row would fail.
 */
const resolveCategoryId = async (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';

    await ensureShopSchema();
    const rows = await db.ShopCategory.findAll({ attributes: ['id', 'label'], raw: true });
    const wantedId = raw.toLowerCase();
    const wantedLabel = raw.toLowerCase();

    const byId = rows.find((row) => String(row.id).toLowerCase() === wantedId);
    if (byId) return byId.id;

    const byLabel = rows.find((row) => String(row.label).toLowerCase() === wantedLabel);
    if (byLabel) return byLabel.id;

    // Then the slug: "Nail care" and "nail-care" must land on the same row, and
    // so must "tools and equipment" (what a spreadsheet tends to contain) and
    // the seeded id "tools-equipment".
    const slug = toCategoryId(raw);
    const bySlugId = rows.find((row) => String(row.id).toLowerCase() === slug);
    if (bySlugId) return bySlugId.id;

    const bySlugLabel = rows.find((row) => toCategoryId(row.label) === slug);
    return bySlugLabel ? bySlugLabel.id : null;
};

/** Validate a product's category, throwing the message a human can act on. */
const requireCategoryId = async (value, { allowEmpty = true } = {}) => {
    const resolved = await resolveCategoryId(value);
    if (resolved === null) {
        throw fail(`Unknown category "${String(value).trim()}" — use one of the ids from the category list`);
    }
    if (!resolved && !allowEmpty) {
        throw fail('Category is required');
    }
    return resolved;
};

const requireUniqueLabel = async (label, exceptId) => {
    const rows = await db.ShopCategory.findAll({ attributes: ['id', 'label'], raw: true });
    const clash = rows.find((row) => (
        String(row.label).toLowerCase() === label.toLowerCase() && row.id !== exceptId
    ));
    if (clash) throw fail(`A category called "${clash.label}" already exists`);
};

const create = async ({ id, label, sortOrder, isActive } = {}) => {
    await ensureShopSchema();
    const cleanLabel = normalizeLabel(label);
    if (cleanLabel.length < 2 || cleanLabel.length > MAX_LABEL) {
        throw fail(`A category name must be 2–${MAX_LABEL} characters`);
    }

    const wantedId = toCategoryId(id || cleanLabel);
    if (!wantedId) throw fail('A category name must contain at least one letter or digit');
    if (wantedId.length > CATEGORY_ID_MAX) throw fail(`A category id may be at most ${CATEGORY_ID_MAX} characters`);

    const existing = await db.ShopCategory.findByPk(wantedId);
    if (existing) throw fail(`A category with the id "${wantedId}" already exists ("${existing.label}")`);

    await requireUniqueLabel(cleanLabel);

    const row = await db.ShopCategory.create({
        id: wantedId,
        label: cleanLabel,
        // A new category goes to the end of the filter unless the caller says
        // where it belongs.
        sortOrder: normalizeSort(sortOrder, (await nextSortOrder())),
        isActive: normalizeFlag(isActive, true)
    });

    return toRow(row, 0);
};

const nextSortOrder = async () => {
    const rows = await db.ShopCategory.findAll({ attributes: ['sortOrder'], raw: true });
    if (!rows.length) return 0;
    return Math.max(...rows.map((row) => Number(row.sortOrder) || 0)) + 1;
};

/**
 * Partial update. `id` is accepted only to IDENTIFY the row — it can never be
 * changed, because products reference it (and a renamed id would orphan them).
 */
const update = async ({ id, label, sortOrder, isActive } = {}) => {
    await ensureShopSchema();
    const wantedId = toCategoryId(id || '');
    if (!wantedId) throw fail('Category id is required');

    const row = await db.ShopCategory.findByPk(wantedId);
    if (!row) throw fail(`No category with the id "${wantedId}"`, 404);

    const patch = {};

    if (label !== undefined) {
        const cleanLabel = normalizeLabel(label);
        if (cleanLabel.length < 2 || cleanLabel.length > MAX_LABEL) {
            throw fail(`A category name must be 2–${MAX_LABEL} characters`);
        }
        await requireUniqueLabel(cleanLabel, row.id);
        patch.label = cleanLabel;
    }

    if (sortOrder !== undefined) patch.sortOrder = normalizeSort(sortOrder, row.sortOrder);
    if (isActive !== undefined) patch.isActive = normalizeFlag(isActive, row.isActive);

    if (!Object.keys(patch).length) throw fail('No fields to update');

    await row.update(patch);
    const { counts } = await usageByCategory([row]);
    return toRow(row, counts.get(row.id) || 0);
};

/**
 * Move the products off a category before it disappears.
 *
 * Both spellings are moved: the category's id and its LABEL, because a product
 * filed before this table existed may still carry the label as free text. Only
 * moving the id would leave rows pointing at a shelf that no longer exists.
 * Returns how many rows were re-filed.
 */
const reassignProducts = async (fromId, toId, fromCategory) => {
    const keys = [String(fromId).toLowerCase(), String(fromCategory?.label || '').toLowerCase()].filter(Boolean);
    const [moved] = await db.ShopProduct.update(
        { category: toId },
        { where: { deletedAt: null, [Op.and]: [where(fn('lower', col('category')), { [Op.in]: keys })] } }
    );
    return moved;
};

/**
 * Delete a category.
 *
 * Refused while products use it, unless the caller names a `reassignTo` — the
 * admin panel offers "Move 12 products to…" and only then deletes. Silently
 * orphaning products is what makes a shelf vanish from the storefront.
 */
const remove = async ({ id, reassignTo } = {}) => {
    await ensureShopSchema();
    const wantedId = toCategoryId(id || '');
    if (!wantedId) throw fail('Category id is required');

    const row = await db.ShopCategory.findByPk(wantedId);
    if (!row) throw fail(`No category with the id "${wantedId}"`, 404);

    const { counts } = await usageByCategory([row]);
    const inUse = counts.get(row.id) || 0;

    let moved = 0;
    if (inUse > 0) {
        if (!reassignTo) {
            throw fail(`This category is used by ${inUse} product${inUse === 1 ? '' : 's'} — choose where to move them before deleting`);
        }
        const target = await resolveCategoryId(reassignTo);
        if (!target) throw fail(`Unknown category "${String(reassignTo).trim()}" to move the products to`);
        if (target === row.id) throw fail('Choose a different category to move the products to');
        // `row` (the category being deleted) is what carries the label the old
        // products may still hold — not the target.
        moved = await reassignProducts(row.id, target, row);
    }

    await row.destroy();
    return { id: row.id, label: row.label, movedProducts: moved };
};

module.exports = {
    listActive,
    listAdmin,
    categoryIds,
    resolveCategoryId,
    requireCategoryId,
    create,
    update,
    remove,
    // Exported for the bulk importer and for tests: the same rules, no DB.
    normalizeFlag,
    normalizeSort,
    usageByCategory
};
