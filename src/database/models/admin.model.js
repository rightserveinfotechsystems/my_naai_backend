const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
    const Admin = sequelize.define('Admin', {
        adminId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: 'admin_id'
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: {
                name: 'unique_admin_username',
                msg: 'Username already exists'
            },
            validate: {
                notEmpty: true,
                len: {
                    args: [3, 50],
                    msg: 'Username must be between 3 and 50 characters'
                }
            },
            field: 'username'
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
            field: 'email'
        },
        passwordHash: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'password_hash'
        },
        fullName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true
            },
            field: 'full_name'
        },
        role: {
            type: DataTypes.ENUM('admin', 'super_admin'),
            defaultValue: 'admin',
            field: 'role'
        },
        permissions: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
            field: 'permissions'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_active'
        },
        lastLogin: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_login'
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
        modelName: 'Admin',
        tableName: 'admins',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['username']
            },
            {
                unique: true,
                fields: ['email']
            },
            {
                fields: ['is_active']
            }
        ],
        hooks: {
            beforeCreate: async (admin) => {
                if (admin.passwordHash) {
                    const salt = await bcrypt.genSalt(10);
                    admin.passwordHash = await bcrypt.hash(admin.passwordHash, salt);
                }
                if (admin.username) {
                    admin.username = admin.username.toLowerCase().trim();
                }
                if (admin.email) {
                    admin.email = admin.email.toLowerCase().trim();
                }
            },
            beforeUpdate: async (admin) => {
                if (admin.changed('passwordHash')) {
                    const salt = await bcrypt.genSalt(10);
                    admin.passwordHash = await bcrypt.hash(admin.passwordHash, salt);
                }
                if (admin.changed('username')) {
                    admin.username = admin.username.toLowerCase().trim();
                }
                if (admin.changed('email')) {
                    admin.email = admin.email.toLowerCase().trim();
                }
            }
        }
    });

    // No associations for Admin (standalone)

    return Admin;
};