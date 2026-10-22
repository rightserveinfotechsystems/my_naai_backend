const { DataTypes } = require('sequelize');

/**
 * Naai Shop order (B2B — a salon buying stock for its shop).
 *
 * The client (web portal and mobile app) snapshots the same shape it stores
 * locally (`my-naai-web/src/lib/shopOrders.js`) and the backend recomputes
 * the bill server-side so the amounts can never be faked from the client.
 *
 * TWO STATUS TRACKS — the same order, two audiences:
 *   `status`         INTERNAL track — what the company ADMIN and the
 *                    distributor see: who picks the parcel up and how far
 *                    it has physically come.
 *                        PENDING_ASSIGNMENT -> AWAITING_ACCEPTANCE ->
 *                        ASSIGNED -> PICKED -> SHIPPED -> DELIVERED
 *                        (CANCELLED is terminal)
 *                    AWAITING_ACCEPTANCE means a distributor was requested
 *                    and has not yet accepted; a rejection sends the order
 *                    back to PENDING_ASSIGNMENT (the reason is recorded in
 *                    shop_order_events, not here).
 *   `customerStatus` SALON track — what the buying salon (customer) sees:
 *                        PENDING -> CONFIRMED -> PROCESSING -> SHIPPED ->
 *                        DELIVERED   (CANCELLED is terminal)
 * The admin moves the internal track; the customer track is derived from it
 * (see shopOrder.service.INTERNAL_TO_CUSTOMER_STATUS) so the salon never
 * sees warehouse internals.
 *
 * `payment` is a snapshot object, not a table:
 *   { method: 'ONLINE' | 'COD', status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUND_REQUESTED' | 'REFUNDED', paymentId, amount }
 * `amounts` mirrors the client's bill:
 *   { itemCount, itemTotal, savings, deliveryFee, total, freeDeliveryAbove }
 */
module.exports = (sequelize) => {
    const ShopOrder = sequelize.define('ShopOrder', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        // Human-facing order id. The client may send its own id (the web
        // shop generates one before paying so its local record and this
        // record match); otherwise the backend generates the same format.
        orderId: {
            type: DataTypes.STRING(32),
            allowNull: false,
            unique: true,
            field: 'order_id'
        },

        // Who bought it. A salon order carries `salonId`; a customer order
        // (the app / website USER role) carries `customerId` instead, so the
        // salon column is nullable and `buyerType` says which id to read.
        // Existing rows are salon orders and default to 'SALON'.
        buyerType: {
            type: DataTypes.ENUM('SALON', 'CUSTOMER'),
            allowNull: false,
            defaultValue: 'SALON',
            field: 'buyer_type'
        },

        // The buying salon (salon token in the JWT). Sellers are the
        // company's own stock (shop_products) — no selling salon per line.
        // NULL for a customer order.
        salonId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'salon_id'
        },

        // The buying customer (users.user_id) — NULL for a salon order.
        customerId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'customer_id'
        },

        // Snapshot of the cart lines at placement time:
        // [{ productId, name, price, mrp, image, category, gender, salonName, qty }]
        items: {
            type: DataTypes.JSONB,
            allowNull: false,
            field: 'items'
        },

        // Delivery address snapshot:
        // { name, phone, line1, city, state, pincode }
        address: {
            type: DataTypes.JSONB,
            allowNull: false,
            field: 'address'
        },

        payment: {
            type: DataTypes.JSONB,
            allowNull: false,
            field: 'payment'
        },

        amounts: {
            type: DataTypes.JSONB,
            allowNull: false,
            field: 'amounts'
        },

        // INTERNAL track (admin + distributor): has the order been handed
        // to a delivery partner and where is the parcel now?
        status: {
            type: DataTypes.ENUM('PENDING_ASSIGNMENT', 'AWAITING_ACCEPTANCE', 'ASSIGNED', 'PICKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'),
            allowNull: false,
            defaultValue: 'PENDING_ASSIGNMENT',
            field: 'status'
        },

        // SALON track (customer view), derived from the internal track.
        customerStatus: {
            type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'),
            allowNull: false,
            defaultValue: 'PENDING',
            field: 'customer_status'
        },

        // The delivery partner the admin assigned (distributors table).
        distributorId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'distributor_id'
        },

        // The delivery point, snapshotted at placement: the buying salon's
        // coordinates (or the address pin the client sent). Snapshotted, not
        // joined, so moving the salon later never rewrites where an old parcel
        // went — and dispatch can still compute KM for completed orders.
        deliveryLatitude: {
            type: DataTypes.DOUBLE,
            allowNull: true,
            field: 'delivery_latitude'
        },

        deliveryLongitude: {
            type: DataTypes.DOUBLE,
            allowNull: true,
            field: 'delivery_longitude'
        },

        cancelledAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'cancelled_at'
        },

        cancelReason: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'cancel_reason'
        },

        // Free-form admin notes (status updates, support remarks).
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'notes'
        }
    }, {
        tableName: 'shop_orders',
        timestamps: true
    });

    ShopOrder.associate = (models) => {
        ShopOrder.belongsTo(models.Salon, {
            foreignKey: 'salonId',
            as: 'salon'
        });
        // The customer who placed it (null on a salon order). Every admin and
        // fulfilment payload includes it, so a customer order still has a
        // name and a phone number to show and to call.
        ShopOrder.belongsTo(models.User, {
            foreignKey: 'customerId',
            as: 'customer'
        });
        ShopOrder.belongsTo(models.Distributor, {
            foreignKey: 'distributorId',
            as: 'distributor'
        });
        ShopOrder.hasMany(models.ShopOrderEvent, {
            foreignKey: 'orderId',
            as: 'events'
        });
    };

    return ShopOrder;
};
