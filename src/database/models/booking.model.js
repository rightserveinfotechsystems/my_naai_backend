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
            allowNull: true,
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
            // type: DataTypes.ENUM('requested', 'delay_requested', 'confirmed', 'cancelled', 'completed', 'pending'),

            type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed'),
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
        walkinName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        walkinPhone: {
            type: DataTypes.STRING,
            allowNull: true
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
        },
        ownerAction: {
            type: DataTypes.ENUM('accepted', 'rejected', 'delayed'),
            allowNull: true
        },
        requestedDelayMinutes: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        customerResponse: {
            type: DataTypes.ENUM('accepted', 'rejected'),
            allowNull: true
        },
        reminderSent: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'reminder_sent'
        },
        reminderTime: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Exact timestamp when reminder should be sent',
            field: 'reminder_time'
        }, 
        // expiresAt: {
        //     type: DataTypes.DATE,
        //     allowNull: true,
        //     field: 'expires_at'
        // },
        // originalBookingTime: {
        //     type: DataTypes.TIME,
        //     allowNull: true,
        //     field: 'original_booking_time'
        // },

        // proposedBookingTime: {
        //     type: DataTypes.TIME,
        //     allowNull: true,
        //     field: 'proposed_booking_time'
        // },
        // delayMinutes: {
        //     type: DataTypes.INTEGER,
        //     allowNull: true,
        //     field: 'delay_minutes'
        // },
        // cancelledBy: {
        //     type: DataTypes.ENUM('OWNER', 'CUSTOMER', 'SYSTEM'),
        //     allowNull: true,
        //     field: 'cancelled_by'
        // },

        // cancelReason: {
        //     type: DataTypes.STRING(255),
        //     allowNull: true,
        //     field: 'cancel_reason'
        // }
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