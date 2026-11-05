const { DataTypes } = require('sequelize');

/**
 * Shop product category — the ONE list the admin panel, the website and the
 * mobile app all read.
 *
 * Before this table each surface had its own list: the admin panel offered a
 * hard-coded array of eight long labels ("Hair Colour and Chemical Products"),
 * the website inferred a category from the product's name, and the app did its
 * own guess. A category created in the panel was invisible to customers, and a
 * product filed under a long free-text label was shown under whatever shelf the
 * keyword rules happened to pick.
 *
 * `id` is a slug and it is FIXED at creation: `shop_products.category` stores
 * it, so renaming a label must never rewrite the id (that would orphan every
 * product filed under it). `sort_order` is the order the customer's filter
 * shows — the admin's order, not an alphabetical guess.
 */
module.exports = (sequelize) => {
    const ShopCategory = sequelize.define('ShopCategory', {
        id: {
            type: DataTypes.STRING(64),
            primaryKey: true
        },

        // What the customer reads on the filter chip and on a product card.
        label: {
            type: DataTypes.STRING(120),
            allowNull: false
        },

        // 0 is a valid position (the first chip), so this is never defaulted
        // from `||` arithmetic anywhere — see the ordering notes in
        // shopCategory.service.js.
        sortOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'sort_order'
        },

        // Hiding a category removes it from the storefront's filter but leaves
        // it on the products already filed under it.
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active'
        }
    }, {
        tableName: 'shop_categories',
        timestamps: true,
        underscored: true
    });

    return ShopCategory;
};
