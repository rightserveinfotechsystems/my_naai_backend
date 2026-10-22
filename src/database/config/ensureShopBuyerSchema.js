const db = require('../models');

/**
 * Make the shop's two-buyer schema real on a database that never ran the
 * migration.
 *
 * A customer order needs `buyer_type` + `customer_id` on `shop_orders`, and
 * `salon_id` must stop being NOT NULL (a customer has no salon). The models
 * declare exactly that — but `allowNull: true` is a *model* declaration, it
 * never alters an existing column. Only a migration or `sync({ alter: true })`
 * touches the database, and this deployment shipped the code without either,
 * so every customer checkout died with:
 *
 *   null value in column "salon_id" of relation "shop_orders"
 *   violates not-null constraint
 *
 * The fix of record is migrations/2026-10-22-shop-customers.sql. This guard is
 * the belt to that braces: it runs the same, idempotent DDL once per process —
 * at boot, and again (best-effort) the first time a write trips PostgreSQL's
 * not-null check, then the write is retried. Every statement is
 * `IF NOT EXISTS` / `IF EXISTS`, so:
 *
 *   - on a migrated database it is a no-op;
 *   - on a salon order it does nothing at all — dropping NOT NULL never
 *     rejects a value, and the extra columns are nullable;
 *   - if the database user lacks ALTER rights it logs and gives up, and the
 *     API keeps returning the honest "not set up yet" error to the shopper.
 *
 * Deliberately NOT done here: the foreign keys and the unique cart index. A
 * FK fails on orphan rows (and would make boot noisy), so those stay in the
 * migration, which is the thing to run.
 */

const STATEMENTS = [
    // Sequelize names the enum type after the table + column, so there are two.
    `DO $$
     BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_shop_orders_buyer_type') THEN
         CREATE TYPE "enum_shop_orders_buyer_type" AS ENUM ('SALON', 'CUSTOMER');
       END IF;
       IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_shop_carts_buyer_type') THEN
         CREATE TYPE "enum_shop_carts_buyer_type" AS ENUM ('SALON', 'CUSTOMER');
       END IF;
     END $$;`,
    // Orders: existing rows are salon orders, so the default backfills them.
    `ALTER TABLE IF EXISTS shop_orders ADD COLUMN IF NOT EXISTS buyer_type "enum_shop_orders_buyer_type" NOT NULL DEFAULT 'SALON';`,
    `ALTER TABLE IF EXISTS shop_orders ADD COLUMN IF NOT EXISTS customer_id UUID;`,
    `ALTER TABLE IF EXISTS shop_orders ALTER COLUMN salon_id DROP NOT NULL;`,
    // Carts fail the same way, and a silent cart failure is worse than a loud
    // order failure — the browser shows a cart the server does not have.
    `ALTER TABLE IF EXISTS shop_carts ADD COLUMN IF NOT EXISTS buyer_type "enum_shop_carts_buyer_type" NOT NULL DEFAULT 'SALON';`,
    `ALTER TABLE IF EXISTS shop_carts ADD COLUMN IF NOT EXISTS customer_id UUID;`,
    `ALTER TABLE IF EXISTS shop_carts ALTER COLUMN salon_id DROP NOT NULL;`
];

let ensured = false;
let inFlight = null;

/**
 * True for the exact failure this guard exists to repair — and only that one.
 * A not-null violation on any other column (or any other error) is left alone
 * so a real bug is never masked by a retry.
 */
const isSalonIdNotNullError = (error) => {
    const text = [
        error?.message,
        error?.original?.detail,
        error?.parent?.detail,
        error?.original?.column,
        error?.parent?.column
    ].filter(Boolean).join(' ');
    const code = error?.original?.code || error?.parent?.code || error?.code;
    if (/null value in column "salon_id"/i.test(text)) return true;
    return code === '23502' && /salon_id/i.test(text);
};

/**
 * Run the DDL. Resolves true when the schema is known-good, false when the
 * database refused (no ALTER rights, connection down, …) — callers must not
 * assume success.
 */
const ensureShopBuyerSchema = async ({ force = false } = {}) => {
    if (ensured && !force) return true;
    if (inFlight) return inFlight;

    inFlight = (async () => {
        try {
            for (const statement of STATEMENTS) {
                await db.sequelize.query(statement);
            }
            ensured = true;
            console.log('[shop-schema] buyer_type / customer_id present, salon_id nullable on shop_orders + shop_carts');
            return true;
        } catch (error) {
            console.error('[shop-schema] could not repair the shop schema — run migrations/2026-10-22-shop-customers.sql:', error.message);
            return false;
        } finally {
            inFlight = null;
        }
    })();

    return inFlight;
};

/**
 * Wrap a write that may hit the missing-schema error. The happy path is one
 * try/catch; the recovery path repairs the schema once and replays the write,
 * so a shopper on a stale deployment does not have to be told to call support.
 */
const withBuyerSchema = async (operation) => {
    try {
        return await operation();
    } catch (error) {
        if (!isSalonIdNotNullError(error)) throw error;
        const repaired = await ensureShopBuyerSchema({ force: true });
        if (!repaired) throw error;
        return operation();
    }
};

module.exports = {
    ensureShopBuyerSchema,
    withBuyerSchema,
    isSalonIdNotNullError,
    SHOP_BUYER_SCHEMA_STATEMENTS: STATEMENTS
};
