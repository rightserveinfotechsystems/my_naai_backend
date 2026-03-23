const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const AdminNotification = sequelize.define('AdminNotification', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        targetType: {
            type: DataTypes.ENUM('ALL', 'ALL_USERS', 'ALL_SALONS'),
            allowNull: false,
            field: 'target_type'
        },

        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        body: {
            type: DataTypes.STRING,
            allowNull: false
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'updated_at'
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
              field: 'created_by'
        }

    }, {
        sequelize,
        modelName: 'AdminNotification',
        tableName: 'admin_notification',
        timestamps: true,
        paranoid: true
    });

    return AdminNotification;
};