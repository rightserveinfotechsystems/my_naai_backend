const db = require('../models');

/**
 * Make `partner_plans` real on a database that never ran the migration.
 *
 * The plan price list is read on the registration screen, on the renewal screen
 * and by the admin panel. If the table is missing, all three fall back — but the
 * ADMIN's plan editor 500s, and worse, `create-salon-with-plan` would fall back
 * to whatever the deployed code remembered. So the table is created here once
 * per process, with the same idempotent DDL as
 * `migrations/2026-11-05-partner-plans.sql`, which is the fix of record:
 *
 *   · on a migrated database every statement is a no-op;
 *   · the seed is `ON CONFLICT (id) DO NOTHING`, so a price the admin has
 *     already changed is never reset by a redeploy;
 *   · if the database user lacks CREATE rights this logs and gives up, and the
 *     API keeps answering with the built-in fallback list.
 *
 * Deliberately NOT done here: the legacy 20-day trial backfill. It rewrites
 * existing salon rows, and a boot-time side effect that silently extends or
 * shortens somebody's subscription is exactly what must not happen at 3 a.m.
 * That lives in the migration, where it can be read first.
 */
const STATEMENTS = [
    `CREATE TABLE IF NOT EXISTS partner_plans (
        id             VARCHAR(40) PRIMARY KEY,
        label          VARCHAR(120) NOT NULL,
        price          DECIMAL(10, 2) NOT NULL DEFAULT 0,
        days           INTEGER NOT NULL DEFAULT 30,
        note           VARCHAR(200),
        badge          VARCHAR(24),
        is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order     INTEGER NOT NULL DEFAULT 0,
        is_active      BOOLEAN NOT NULL DEFAULT TRUE,
        is_free        BOOLEAN NOT NULL DEFAULT FALSE,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    // The seed is what the three repositories shipped before this release: the
    // same ids (subscriptions store them), the same prices, and the 90-day free
    // trial the client asked for.
    `INSERT INTO partner_plans (id, label, price, days, note, badge, is_recommended, sort_order, is_active, is_free) VALUES
        ('Free',           'Free trial',       0,   90, 'Start your salon journey at no cost', 'DEFAULT',    TRUE,  -1, TRUE, TRUE),
        ('monthly',        'Monthly Plan',     199, 30, 'Flexible month-to-month growth',      NULL,         FALSE,  0, TRUE, FALSE),
        ('trial_2_months', 'Introductory',     299, 60, 'A gentle start for new partners',     NULL,         FALSE,  1, TRUE, FALSE),
        ('quarterly',      'Quarterly Plan',   499, 90, 'Best value for busy salons',          'BEST VALUE', TRUE,   2, TRUE, FALSE)
    ON CONFLICT (id) DO NOTHING;`,
    `CREATE INDEX IF NOT EXISTS idx_partner_plans_order ON partner_plans (is_active, sort_order);`
];

let ensured = false;
let inFlight = null;

/**
 * Run the DDL. Resolves true when the table is usable, false when at least one
 * statement was refused — callers must not assume success.
 */
const ensurePlanSchema = async ({ force = false } = {}) => {
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
                '[plan-schema] could not finish the partner_plans schema — run migrations/2026-11-05-partner-plans.sql:',
                failures[0]
            );
            return false;
        }
        ensured = true;
        console.log('[plan-schema] partner_plans present (price list + free-trial length)');
        return true;
    })().finally(() => {
        inFlight = null;
    });

    return inFlight;
};

/**
 * Wrap a read so a missing table repairs itself once and the read is retried.
 * The plan list is on the registration screen: a 500 there means nobody can sign
 * up, so it is worth one silent retry.
 */
const withPlanSchema = async (run) => {
    try {
        return await run();
    } catch (error) {
        const missingTable = /relation .*partner_plans.* does not exist/i.test(String(error?.message || ''));
        if (!missingTable) throw error;
        const repaired = await ensurePlanSchema({ force: true });
        if (!repaired) throw error;
        return run();
    }
};

module.exports = {
    ensurePlanSchema,
    withPlanSchema,
    PLAN_SCHEMA_STATEMENTS: STATEMENTS
};
