const { DataTypes } = require('sequelize');

const User = (sequelize) => {
    const User = sequelize.define('User', {
        userId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: 'user_id'
        },
        phoneNumber: {
            type: DataTypes.STRING(15),
            allowNull: false,
            unique: {
                name: 'unique_phone_number',
                msg: 'Phone number already exists'
            },
            validate: {
                notEmpty: {
                    msg: 'Phone number is required'
                },
                isNumeric: {
                    msg: 'Phone number must contain only numbers'
                },
                len: {
                    args: [10, 15],
                    msg: 'Phone number must be between 10 and 15 digits'
                }
            },
            field: 'phone_number'
        },
        fullName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            validate: {
                len: {
                    args: [2, 100],
                    msg: 'Full name must be between 2 and 100 characters'
                }
            },
            field: 'full_name'
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: {
                name: 'unique_email',
                msg: 'Email already exists'
            },
            validate: {
                isEmail: {
                    msg: 'Must be a valid email address'
                }
            },
            field: 'email'
        },
        profileImageUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'profile_image_url'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
            field: 'is_active'
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
            field: 'is_verified'
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
        // savedSalonId: {
        //     type: DataTypes.UUID,
        //     allowNull: true,
        //     field: 'saved_salon_id',
        //     references: {
        //         model: 'salons', 
        //         key: 'salon_id'
        //     },
        //     onDelete: 'SET NULL'
        // }
    }, {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
        // paranoid: true,

        indexes: [
            {
                unique: true,
                fields: ['phone_number']
            },
            {
                fields: ['email']
            },
            {
                fields: ['is_active']
            },
            {
                fields: ['created_at']
            }
        ],
        hooks: {
            beforeCreate: (user) => {
                if (user.phoneNumber) {
                    user.phoneNumber = user.phoneNumber.trim();
                }
                if (user.email) {
                    user.email = user.email.toLowerCase().trim();
                }
            },
            beforeUpdate: (user) => {
                if (user.changed('phoneNumber')) {
                    user.phoneNumber = user.phoneNumber.trim();
                }
                if (user.changed('email') && user.email) {
                    user.email = user.email.toLowerCase().trim();
                }
            }
        }
    });

    // Define associations
    User.associate = (models) => {
        // User.belongsTo(models.Salon, {   
        //     foreignKey: 'savedSalonId',
        //     as: 'savedSalon'
        // }); 

        User.hasMany(models.Queue, {
            foreignKey: 'userId',
            as: 'queues',
            onDelete: 'CASCADE'
        });

        User.hasMany(models.Booking, {
            foreignKey: 'userId',
            as: 'bookings',
            onDelete: 'CASCADE'
        });

        User.hasMany(models.Review, {
            foreignKey: 'userId',
            as: 'reviews',
            onDelete: 'CASCADE'
        });
    };

    return User;
};
module.exports = User;