const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Booking = sequelize.define('Booking', {
        bookingId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: 'booking_id'
        },
        queueId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            references: {
                model: 'queue',
                key: 'queue_id'
            },
            field: 'queue_id'
        },
        salonId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'salons',
                key: 'salon_id'
            },
            field: 'salon_id'
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            },
            field: 'user_id'
        },
        barberId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'barbers',
                key: 'barber_id'
            },
            field: 'barber_id'
        },
        // serviceId: {
        //     type: DataTypes.UUID,
        //     allowNull: true,
        //     references: {
        //         model: 'services',
        //         key: 'service_id'
        //     },
        //     field: 'service_id'
        // },

        services: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
            comment: 'Array of services [{serviceId, name, duration, price}]',
            field: 'services'
        },

        bookingStatus: {
            type: DataTypes.ENUM('completed', 'pending'),
            allowNull: false,
            field: 'booking_status'
        },
        serviceDuration: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Actual service duration in minutes',
            field: 'service_duration'
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            validate: {
                min: 0
            },
            field: 'amount'
        },

        bookingDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            field: 'booking_date'
        },
        bookingTime: {
            type: DataTypes.TIME,
            allowNull: true,
            field: 'booking_time'
        },

        // paymentStatus: {
        //     type: DataTypes.ENUM('pending', 'paid', 'refunded'),
        //     defaultValue: 'pending',
        //     field: 'payment_status'
        // },
        // paymentMethod: {
        //     type: DataTypes.STRING(50),
        //     allowNull: true,
        //     field: 'payment_method'
        // },
        // startedAt: {
        //     type: DataTypes.DATE,
        //     allowNull: true,
        //     field: 'started_at'
        // },
        // completedAt: {
        //     type: DataTypes.DATE,
        //     allowNull: true,
        //     field: 'completed_at'
        // },
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
        modelName: 'Booking',
        tableName: 'bookings',
        timestamps: true,

        indexes: [
            {
                fields: ['salon_id']
            },
            {
                fields: ['user_id']
            },
            {
                fields: ['barber_id']
            },
            {
                fields: ['booking_status']
            },
            // {
            //     fields: ['payment_status']
            // },
            {
                fields: ['created_at']
            }
        ]
    });

    // Define associations
    Booking.associate = (models) => {
        Booking.belongsTo(models.Queue, {
            foreignKey: 'queueId',
            as: 'queue'
        });

        Booking.belongsTo(models.Salon, {
            foreignKey: 'salonId',
            as: 'salon'
        });

        Booking.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });

        Booking.belongsTo(models.Barber, {
            foreignKey: 'barberId',
            as: 'barber'
        });

        // Booking.belongsTo(models.Service, {
        //     foreignKey: 'serviceId',
        //     as: 'service'
        // });

        Booking.hasOne(models.Review, {
            foreignKey: 'bookingId',
            as: 'review'
        });
    };

    return Booking;
};