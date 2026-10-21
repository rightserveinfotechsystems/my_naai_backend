const { DataTypes } = require('sequelize');

/**
 * Distributor — a delivery partner the company admin assigns a shop order
 * to. Orders carry `distributorId`; the admin (and later, distributor
 * accounts) see the internal status track per distributor.
 */
module.exports = (sequelize) => {
    const Distributor = sequelize.define('Distributor', {
        distributorId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: 'distributor_id'
        },

        name: {
            type: DataTypes.STRING,
            allowNull: false
        },

        phone: {
            type: DataTypes.STRING,
            allowNull: true
        },

        email: {
            type: DataTypes.STRING,
            allowNull: true
        },

        // Pickup / delivery area (free text, e.g. "Nagpur — west city").
        area: {
            type: DataTypes.STRING(200),
            allowNull: true
        },

        // Delivery capability, free text (e.g. "2 bikes + 1 van, 50 orders
        // a day") — shown to the admin when choosing a distributor.
        deliveryCapability: {
            type: DataTypes.STRING(200),
            allowNull: true,
            field: 'delivery_capability'
        },

        // bcrypt hash. NULL means the distributor has no portal login yet
        // (the admin sets a password when creating/updating them).
        password: {
            type: DataTypes.STRING(255),
            allowNull: true
        },

        address: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        // Dispatch location (the distributor's base / current position).
        // The admin drops a pin while adding the partner, and the distributor
        // portal can refresh it with the browser's own GPS ("live location"),
        // which is what makes "nearest distributor first" and the KM column
        // on an order meaningful. NULL means unknown — never 0,0 (Null Island
        // would sort every unlocated partner to the top of a nearest-first
        // list). DOUBLE, so a coordinate round-trips exactly.
        latitude: {
            type: DataTypes.DOUBLE,
            allowNull: true,
            field: 'latitude'
        },

        longitude: {
            type: DataTypes.DOUBLE,
            allowNull: true,
            field: 'longitude'
        },

        // When the coordinates were last set/refreshed, so the admin can tell a
        // pinned base ("set on 12 Oct") from a live fix ("2 minutes ago").
        locationUpdatedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'location_updated_at'
        },

        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active'
        }
    }, {
        tableName: 'distributors',
        timestamps: true
    });

    return Distributor;
};
