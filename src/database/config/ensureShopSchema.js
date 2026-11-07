// database/config/ensureShopSchema.js
//
// The belt to the migration's braces.
//
// Three features ship in this release and each of them reads a column or a
// table that a database which never ran
// `migrations/2026-11-05-shop-categories-leads-bulk.sql` does not have:
//
//   · `shop_categories` — the shop's category list. Missing, the website's
//     filter silently falls back to its seed list (survivable), and the admin's
//     Categories manager throws (not survivable — the panel shows an empty
//     page).
//   · `booking_requests.expires_at` / `responded_at` / `booking_id` — the 60
//     second answer window and the leads tab. Missing, the new tab 500s, and
//     the client falls back to reading notifications.
//   · `shop_products.bulk_import_id`, the sheet's optional columns and
//     `shop_product_imports` — bulk upload. Missing, every import fails with
//     "column does not exist".
//
// This guard runs the same idempotent DDL once per process: at boot, and again
// (best-effort) the first time a feature touches the schema. Every statement is
// `IF NOT EXISTS` / `ON CONFLICT`, so:
//
//   · on a migrated database it is a no-op;
//   · existing rows keep their meaning (the new columns are nullable, and the
//     category seed is inserted with the ids the shop already used);
//   · if the database user lacks ALTER rights it logs and gives up, and the API
//     keeps answering with what the database can actually do.
//
// Deliberately NOT done here: the legacy free-text-to-id rewrite of
// `shop_products.category` and the auto-cancel backfill. Both CHANGE existing
// rows, and a boot-time side effect that rewrites a catalogue is exactly what
// nobody wants at 2 a.m. They stay in the migration, where they can be reviewed
// first.
const db = require('../models');

const SEED_CATEGORIES = [
    ['hair-care', 'Hair care', 0],
    ['beard-grooming', 'Beard & grooming', 1],
    ['skin-face', 'Skin & face', 2],
    ['fragrance', 'Fragrance', 3],
    ['hair-colour', 'Hair colour', 4],
    ['tools-equipment', 'Tools & equipment', 5],
    ['kits-sets', 'Kits & sets', 6]
];

const SEED_VALUES = SEED_CATEGORIES
    .map(([id, label, order]) => `('${id}', '${label.replace(/'/g, "''")}', ${order})`)
    .join(',\n    ');

const STATEMENTS = [
    // ── The one category list ────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS shop_categories (
        id          VARCHAR(64) PRIMARY KEY,
        label       VARCHAR(120) NOT NULL,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    `INSERT INTO shop_categories (id, label, sort_order) VALUES
    ${SEED_VALUES}
    ON CONFLICT (id) DO NOTHING;`,

    // ── The lead's answer window ─────────────────────────────────────────
    `ALTER TABLE IF EXISTS booking_requests ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;`,
    `ALTER TABLE IF EXISTS booking_requests ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;`,
    `ALTER TABLE IF EXISTS booking_requests ADD COLUMN IF NOT EXISTS booking_id UUID;`,
    `ALTER TABLE IF EXISTS booking_requests ADD COLUMN IF NOT EXISTS routed_barber_id UUID;`,
    // A request created before this release has no window; give it the one it
    // would have had. This is a value fill, not a status change — the sweeper
    // decides what happens next.
    // Five minutes: the answer window this release ships with (WINDOW_SECONDS in
    // services/bookingRequestLead.service.js). Only rows that never had a window
    // are touched.
    `UPDATE booking_requests SET expires_at = created_at + INTERVAL '300 seconds' WHERE expires_at IS NULL;`,
    `CREATE INDEX IF NOT EXISTS idx_booking_requests_salon_status ON booking_requests (salon_id, status, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_booking_requests_pending_expiry ON booking_requests (expires_at) WHERE status = 'PENDING';`,

    // ── Who answered, and the index the admin tab pages through ──────────
    // An admin may answer on a salon's behalf, so the row records the actor.
    // Nullable on purpose: every existing row was answered by its salon, and
    // the panel reads a null as exactly that.
    `ALTER TABLE IF EXISTS booking_requests ADD COLUMN IF NOT EXISTS acted_by_role VARCHAR(16);`,
    `ALTER TABLE IF EXISTS booking_requests ADD COLUMN IF NOT EXISTS acted_by_admin_id VARCHAR(64);`,
    `ALTER TABLE IF EXISTS booking_requests ADD COLUMN IF NOT EXISTS acted_at TIMESTAMPTZ;`,
    `ALTER TABLE IF EXISTS booking_requests ADD COLUMN IF NOT EXISTS on_behalf_of_salon BOOLEAN NOT NULL DEFAULT FALSE;`,
    `ALTER TABLE IF EXISTS booking_requests ADD COLUMN IF NOT EXISTS admin_note TEXT;`,
    // The admin tab opens on TODAY and pages newest-first across every salon;
    // without this it is a sequential scan of the whole lead table per page.
    `CREATE INDEX IF NOT EXISTS idx_booking_requests_created_at ON booking_requests (created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_booking_requests_status_created ON booking_requests (status, created_at DESC);`,

    // ── Bulk upload ──────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS shop_product_imports (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id      VARCHAR(64) NOT NULL,
        file_name     VARCHAR(255) NOT NULL,
        mode          VARCHAR(16) NOT NULL DEFAULT 'CREATE_ONLY',
        rows_total    INTEGER NOT NULL DEFAULT 0,
        rows_created  INTEGER NOT NULL DEFAULT 0,
        rows_updated  INTEGER NOT NULL DEFAULT 0,
        rows_failed   INTEGER NOT NULL DEFAULT 0,
        report        JSONB NOT NULL DEFAULT '{}'::jsonb,
        undone_at     TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    `ALTER TABLE IF EXISTS shop_products ADD COLUMN IF NOT EXISTS bulk_import_id UUID;`,
    `ALTER TABLE IF EXISTS shop_products ADD COLUMN IF NOT EXISTS stock_count INTEGER;`,
    `ALTER TABLE IF EXISTS shop_products ADD COLUMN IF NOT EXISTS bar_code VARCHAR(64);`,
    `ALTER TABLE IF EXISTS shop_products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(16);`,
    `ALTER TABLE IF EXISTS shop_products ADD COLUMN IF NOT EXISTS gst_percent DECIMAL(5, 2);`,
    `CREATE INDEX IF NOT EXISTS idx_shop_products_bulk_import ON shop_products (bulk_import_id);`
];

let ensured = false;
let inFlight = null;

/**
 * Run the DDL. Resolves true when everything the database can be asked for was
 * asked for, false when at least one statement was refused — callers must not
 * assume success.
 *
 * Statements are independent: one failure (say, no CREATE TABLE right, but
 * ALTER right present) does not stop the rest, because a half-repaired schema is
 * strictly better than none and the log says which statement was refused.
 */
const ensureShopSchema = async ({ force = false } = {}) => {
    if (ensured && !force) return true;
    if (inFlight) return inFlight;

    inFlight = (async () => {
        const failures = [];
        for (const statement of STATEMENTS) {
            try {
                await db.sequelize.query(statement);
            } catch (error) {
                failures.push(error.message);
            }
        }

        if (failures.length) {
            console.error(
                '[shop-schema] could not finish the shop/leads schema — run migrations/2026-11-05-shop-categories-leads-bulk.sql:',
                failures[0]
            );
            return false;
        }

        ensured = true;
        console.log('[shop-schema] shop_categories, booking_requests window and bulk-import columns present');
        return true;
    })().finally(() => {
        inFlight = null;
    });

    return inFlight;
};

module.exports = {
    ensureShopSchema,
    SHOP_SCHEMA_STATEMENTS: STATEMENTS,
    SEED_CATEGORIES
};
