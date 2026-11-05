const { DataTypes } = require('sequelize');

/**
 * Partner plans — the ONE price list, owned by the admin panel.
 *
 * Every partner plan the portal, the app and the admin panel charge for lives
 * here: the price, the number of days, the label and the order the cards appear
 * in. Before this table the numbers were constants in whichever client was
 * showing them (`plan.util.js` on the backend, `PARTNER_PLANS` in the website
 * bundle), so a price change was a code change in three repositories.
 *
 * Two things are deliberate:
 *
 *   · `id` is a STRING and it is FIXED at creation. `salons.planType` and the
 *     `subscriptions` rows store it, so renaming "Quarterly Plan" to "Salon
 *     Growth" must never move a salon onto a different plan. `update` refuses to
 *     change an id.
 *   · The free trial is a ROW here too (`isFree`, id `Free`), because its length
 *     is the "default trial period" the admin owns. A new salon's window comes
 *     from `days` on that row — 90 by default — instead of the `+ 20` that used
 *     to be hard-coded in `salonLogin.js`.
 *
 * `days` is the source of truth for a plan's length; a display string like
 * "3 Months (90 Days)" is derived from it everywhere, so the label on the card
 * can never promise a window the salon does not get.
 */
module.exports = (sequelize) => {
    const PartnerPlan = sequelize.define('PartnerPlan', {
        id: {
            type: DataTypes.STRING(40),
            primaryKey: true,
            allowNull: false
        },

        label: {
            type: DataTypes.STRING(120),
            allowNull: false
        },

        // Money in rupees. DECIMAL so ₹249.50 is stored exactly rather than as a
        // float that Razorpay multiplies by 100.
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0
        },

        days: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 30
        },

        note: {
            type: DataTypes.STRING(200),
            allowNull: true
        },

        // The word printed on the card's corner ("BEST VALUE", "DEFAULT").
        badge: {
            type: DataTypes.STRING(24),
            allowNull: true
        },

        isRecommended: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_recommended'
        },

        sortOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'sort_order'
        },

        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active'
        },

        // Exactly one plan is the free trial: the one a new salon starts on.
        isFree: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_free'
        }
    }, {
        tableName: 'partner_plans',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return PartnerPlan;
};
