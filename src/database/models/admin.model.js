const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
    const Admin = sequelize.define('Admin', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        mobile: {
            type: DataTypes.STRING(10),
            allowNull: true,
            validate: {
                notEmpty: {
                    msg: 'Phone number is required'
                },
                isNumeric: {
                    msg: 'Phone number must contain only numbers'
                },
                len: {
                    args: [10],
                    msg: 'Phone number must be 10 digits'
                }
            },
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: {
                name: 'unique_admin_email',
                msg: 'Email already exists'
            },
            validate: {
                isEmail: {
                    msg: 'Must be a valid email address'
                }
            },
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true
            },
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: true,
        },
        lastLogin: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    }, {
        sequelize,
        modelName: 'Admin',
        tableName: 'admins',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['email']
            },
            {
                fields: ['isActive']
            }
        ],
        hooks: {
            beforeCreate: async (admin) => {
                if (admin.password) {
                    const salt = await bcrypt.genSalt(10);
                    admin.password = await bcrypt.hash(admin.password, salt);
                }

                if (admin.email) {
                    admin.email = admin.email.toLowerCase().trim();
                }
            },
            beforeUpdate: async (admin) => {
                if (admin.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    admin.password = await bcrypt.hash(admin.password, salt);
                }
                if (admin.changed('email')) {
                    admin.email = admin.email.toLowerCase().trim();
                }
            }
        }
    });

    return Admin;
};