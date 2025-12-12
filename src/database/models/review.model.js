const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Review = sequelize.define('Review', {
        reviewId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: 'review_id'
        },
        bookingId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            references: {
                model: 'bookings',
                key: 'booking_id'
            },
            field: 'booking_id'
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
        salonId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'salons',
                key: 'salon_id'
            },
            field: 'salon_id'
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
        rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: {
                    args: 1,
                    msg: 'Rating must be at least 1'
                },
                max: {
                    args: 5,
                    msg: 'Rating must not exceed 5'
                }
            },
            field: 'rating'
        },
        reviewText: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'review_text'
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_verified'
        },
        isVisible: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_visible'
        },
        adminResponse: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'admin_response'
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
        modelName: 'Review',
        tableName: 'reviews',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                fields: ['salon_id']
            },
            {
                fields: ['barber_id']
            },
            {
                fields: ['user_id']
            },
            {
                fields: ['rating']
            },
            {
                fields: ['is_visible']
            },
            {
                fields: ['created_at']
            }
        ]
    });

    // Define associations
    Review.associate = (models) => {
        Review.belongsTo(models.Booking, {
            foreignKey: 'bookingId',
            as: 'booking'
        });

        Review.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });

        Review.belongsTo(models.Salon, {
            foreignKey: 'salonId',
            as: 'salon'
        });

        Review.belongsTo(models.Barber, {
            foreignKey: 'barberId',
            as: 'barber'
        });
    };

    return Review;
};