const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Queue = sequelize.define('Queue', {
        queueId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: 'queue_id'
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
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'user_id'
            },
            onDelete: 'CASCADE',
            field: 'user_id'
        },
        barberId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'barbers',
                key: 'barber_id'
            },
            onDelete: 'SET NULL',
            field: 'barber_id'
        },
        serviceId: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'services',
                key: 'service_id'
            },
            onDelete: 'SET NULL',
            field: 'service_id'
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
        queueNumber: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: {
                    args: 1,
                    msg: 'Queue number must be positive'
                }
            },
            field: 'queue_number'
        },
        tokenNumber: {
            type: DataTypes.STRING(20),
            allowNull: true,
            field: 'token_number'
        },
        status: {
            type: DataTypes.ENUM('waiting', 'in_service', 'completed', 'cancelled', 'no_show'),
            allowNull: false,
            defaultValue: 'waiting',
            field: 'status'
        },
        estimatedWaitTime: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Estimated wait time in minutes',
            field: 'estimated_wait_time'
        },
        priority: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'priority'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'notes'
        },
        joinedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'joined_at'
        },
        calledAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'called_at'
        },
        completedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'completed_at'
        },
        cancelledAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'cancelled_at'
        },
        cancellationReason: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'cancellation_reason'
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
        modelName: 'Queue',
        tableName: 'queue',
        timestamps: true,

        indexes: [
            {
                fields: ['salon_id', 'status']
            },
            {
                fields: ['user_id']
            },
            {
                fields: ['barber_id']
            },
            {
                fields: ['status']
            },
            {
                fields: ['joined_at']
            },
            {
                fields: ['salon_id', 'queue_number']
            }
        ],
        hooks: {
            beforeCreate: (queue) => {
                // Auto-generate token number if not provided
                if (!queue.tokenNumber && queue.queueNumber) {
                    queue.tokenNumber = `T${String(queue.queueNumber).padStart(3, '0')}`;
                }
            }
        }
    });

    // Define associations
    Queue.associate = (models) => {
        Queue.belongsTo(models.Salon, {
            foreignKey: 'salonId',
            as: 'salon'
        });

        Queue.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });

        Queue.belongsTo(models.Barber, {
            foreignKey: 'barberId',
            as: 'barber'
        });

        Queue.belongsTo(models.Service, {
            foreignKey: 'serviceId',
            as: 'service'
        });

        Queue.hasOne(models.Booking, {
            foreignKey: 'queueId',
            as: 'booking'
        });
    };

    return Queue;
};