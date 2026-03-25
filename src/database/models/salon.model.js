const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Salon = sequelize.define('Salon', {
        salonId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: 'salon_id'
        },
        salonName: {
            type: DataTypes.STRING(150),
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Salon name is required'
                },
                len: {
                    args: [2, 150],
                    msg: 'Salon name must be between 2 and 150 characters'
                }
            },
            field: 'salon_name'
        },
        ownerName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'owner_name'
        },

        phoneNumber: {
            type: DataTypes.STRING(15),
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: false,
                isNumeric: true
            },
            field: 'phone_number'
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: true,
            // unique: true,
            // validate: {
            //     isEmail: {
            //         msg: 'Must be a valid email address'
            //     }
            // },
            field: 'email'
        },
        addressLine1: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'address_line1'
        },
        addressLine2: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'address_line2'
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'city'
        },
        genderType: {
            type: DataTypes.ENUM('MALE', 'FEMALE', 'UNISEX'),
            allowNull: false,
            defaultValue: 'UNISEX',
            field: 'gender_type',
            validate: {
                notEmpty: {
                    msg: 'Gender type is required'
                }
            }
        },

        state: {
            type: DataTypes.STRING(100),
            allowNull: true,
            validate: {
                notEmpty: true
            },
            field: 'state'
        },
        pincode: {
            type: DataTypes.STRING(10),
            allowNull: true,
            field: 'pincode'
        },
        latitude: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true,
            validate: {
                min: -90,
                max: 90
            },
            field: 'latitude'
        },
        longitude: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true,
            validate: {
                min: -180,
                max: 180
            },
            field: 'longitude'
        },
        isOpen: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
            field: 'is_open'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
            field: 'is_active'
        },
        ratingAverage: {
            type: DataTypes.DECIMAL(3, 2),
            defaultValue: 0.00,
            validate: {
                min: 0,
                max: 5
            },
            field: 'rating_average'
        },
        totalReviews: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            validate: {
                min: 0
            },
            field: 'total_reviews'
        },
        imageUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'image_url'
        },
        imagesArray: {
            type: DataTypes.JSONB,
            allowNull: true,
            default: []
        },
        planType: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'plan_type'
        },

        planStartDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'plan_start_date'
        },

        planEndDate: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'plan_end_date'
        },
        isPlanActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_plan_active'
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
        }

    }, {
        sequelize,
        modelName: 'Salon',
        tableName: 'salons',
        timestamps: true,
        paranoid: true,

        indexes: [
            {
                fields: ['city']
            },
            {
                fields: ['pincode']
            },
            {
                fields: ['is_active']
            },
            {
                fields: ['is_open']
            },
            {
                name: 'idx_salon_location',
                fields: ['latitude', 'longitude']
            }
        ]
    });

    // Define associations
    Salon.associate = (models) => {
        Salon.belongsTo(models.Admin, {
            foreignKey: 'createdBy',
            as: 'creatorAdmin',
            onDelete: 'SET NULL'
        });
        Salon.hasMany(models.Barber, {
            foreignKey: 'salonId',
            as: 'barbers',
            onDelete: 'CASCADE'
        });

        Salon.hasMany(models.Service, {
            foreignKey: 'salonId',
            as: 'services',
            onDelete: 'CASCADE'
        });

        Salon.hasMany(models.Queue, {
            foreignKey: 'salonId',
            as: 'queues',
            onDelete: 'CASCADE'
        });

        Salon.hasMany(models.Booking, {
            foreignKey: 'salonId',
            as: 'bookings',
            onDelete: 'CASCADE'
        });

        Salon.hasMany(models.Review, {
            foreignKey: 'salonId',
            as: 'reviews',
            onDelete: 'CASCADE'
        });

        Salon.hasMany(models.BusinessHours, {
            foreignKey: 'salonId',
            as: 'businessHours',
            onDelete: 'CASCADE'
        });
        Salon.hasMany(models.Product, {
            foreignKey: 'salonId',
            as: 'products',
        });

    };

    return Salon;
};