const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
    const Barber = sequelize.define('Barber', {
        barberId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: 'barber_id'
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
        fullName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Full name is required'
                }
            },
            field: 'full_name'
        },
        phoneNumber: {
            type: DataTypes.STRING(10),
            allowNull: false,
            validate: {
                isNumeric: true
            },
            field: 'phone_number'
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: {
                name: 'unique_email',
                msg: 'Email already exists'
            },
            validate: {
                isEmail: true
            },
            field: 'email'
        },
        profileImageUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'profile_image_url'
        },
        specialization: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'specialization'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        isAvailable: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_available'
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
        totalServices: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            validate: {
                min: 0
            },
            field: 'total_services'
        },
        deviceToken: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'device_token'
        },
        lastLogin: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_login'
        },
        // currentStatus: {
        //     type: DataTypes.ENUM('available', 'busy', 'break'),
        //     defaultValue: 'available',
        //     field: 'current_status'
        // },
        // statusUpdatedAt: {
        //     type: DataTypes.DATE,
        //     defaultValue: DataTypes.NOW,
        //     field: 'status_updated_at'
        // },
        // estimatedFinishTime: {
        //     type: DataTypes.TIME,
        //     allowNull: true,
        //     field: 'estimated_finish_time'
        // },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'deleted_at'
        }
    }, {
        sequelize,
        modelName: 'Barber',
        tableName: 'barbers',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        paranoid: true,
        deletedAt: 'deleted_at',

        indexes: [
            {
                fields: ['salon_id']
            },
            {
                fields: ['is_active']
            },
            {
                fields: ['is_available']
            }
        ],
        // hooks: {
        //     beforeCreate: async (barber) => {
        //         if (barber.passwordHash) {
        //             const salt = await bcrypt.genSalt(10);
        //             barber.passwordHash = await bcrypt.hash(barber.passwordHash, salt);
        //         }
        //         if (barber.username) {
        //             barber.username = barber.username.toLowerCase().trim();
        //         }
        //     },
        //     beforeUpdate: async (barber) => {
        //         if (barber.changed('passwordHash')) {
        //             const salt = await bcrypt.genSalt(10);
        //             barber.passwordHash = await bcrypt.hash(barber.passwordHash, salt);
        //         }
        //         if (barber.changed('username')) {
        //             barber.username = barber.username.toLowerCase().trim();
        //         }
        //     }
        // }
    });

    // Define associations
    Barber.associate = (models) => {
        Barber.belongsTo(models.Salon, {
            foreignKey: 'salonId',
            as: 'salon'
        });

        Barber.hasMany(models.Queue, {
            foreignKey: 'barberId',
            as: 'queues'
        });

        Barber.hasMany(models.Booking, {
            foreignKey: 'barberId',
            as: 'bookings'
        });

        Barber.hasMany(models.Review, {
            foreignKey: 'barberId',
            as: 'reviews'
        });
    };

    return Barber;
};