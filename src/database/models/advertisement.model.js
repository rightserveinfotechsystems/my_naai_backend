// models/Advertisement.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
    const Advertisement = sequelize.define("Advertisement", {
        advertisementId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: "advertisement_id",
        },

        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        images: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
        },

        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
            field: "is_active",
        },
        isDeletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: "deleted_at",
        },

    }, {
        tableName: "advertisements",
        timestamps: true,
        underscored: true,
    });

    return Advertisement;
};
