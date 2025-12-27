const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Service = sequelize.define('Service', {
        serviceId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: 'service_id'
        },
        salonId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'salons',
                key: 'salon_id'
            },
            onDelete: 'CASCADE',
            field: 'salon_id'
        },
        serviceName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Service name is required'
                }
            },
            field: 'service_name'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'description'
        },
        durationMinutes: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: {
                    args: [1],
                    msg: 'Duration must be at least 1 minute'
                }
            },
            field: 'duration_minutes'
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: {
                    args: [0],
                    msg: 'Price must be positive'
                }
            },
            field: 'price'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        displayOrder: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'display_order'
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'updated_at'
        }
    }, {
        sequelize,
        modelName: 'Service',
        tableName: 'services',
        timestamps: true,
        
        indexes: [
            {
                fields: ['salon_id']
            },
            {
                fields: ['is_active']
            },
            {
                fields: ['display_order']
            }
        ]
    });

    // Define associations
    Service.associate = (models) => {
        Service.belongsTo(models.Salon, {
            foreignKey: 'salonId',
            as: 'salon'
        });

        Service.hasMany(models.Queue, {
            foreignKey: 'serviceId',
            as: 'queues'
        });

        Service.hasMany(models.Booking, {
            foreignKey: 'serviceId',
            as: 'bookings'
        });
    };

    return Service;
};