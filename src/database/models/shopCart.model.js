const { DataTypes } = require('sequelize');

/**
 * Server-side shop cart, keyed by the BUYING SALON.
 *
 * The web portal kept its cart in localStorage, so an item added on the web
 * was invisible to the same salon signed in on the mobile app. This table is
 * the durable cart: every add/update/remove goes through the API, and the
 * cart renders identically on web and app because both read the same rows.
 *
 * Lines reference `shop_products.product_id`; price/name/image are read from
 * the product at render time (an admin price change updates the bill), so
 * only the quantity is stored here.
 */
module.exports = (sequelize) => {
    const ShopCart = sequelize.define('ShopCart', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        // Who owns the line. A salon cart carries `salonId`; a customer cart
        // (app / website USER role) carries `customerId`. `buyerType` says
        // which one to read; existing rows are salon carts.
        buyerType: {
            type: DataTypes.ENUM('SALON', 'CUSTOMER'),
            allowNull: false,
            defaultValue: 'SALON',
            field: 'buyer_type'
        },

        // The buying salon (salon token in the JWT). NULL for a customer.
        salonId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'salon_id'
        },

        // The buying customer (users.user_id). NULL for a salon.
        customerId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'customer_id'
        },

        // Shop product in the line (shop_products.product_id).
        productId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'product_id'
        },

        qty: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { min: 1, max: 99 }
        }
    }, {
        tableName: 'shop_carts',
        timestamps: true,
        indexes: [
            // One row per buyer + product. Postgres treats NULLs as distinct,
            // so a salon row (customer_id NULL) and a customer row
            // (salon_id NULL) can both hold the same product.
            { unique: true, name: 'shop_carts_buyer_product_key', fields: ['buyer_type', 'salon_id', 'customer_id', 'product_id'] },
            { fields: ['salon_id'] },
            { fields: ['customer_id'] }
        ]
    });

    ShopCart.associate = (models) => {
        ShopCart.belongsTo(models.ShopProduct, {
            foreignKey: 'productId',
            as: 'product'
        });
        ShopCart.belongsTo(models.User, {
            foreignKey: 'customerId',
            as: 'customer'
        });
    };

    return ShopCart;
};
