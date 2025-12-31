    const { DataTypes } = require('sequelize');

    module.exports = (sequelize) => {
        const SalonRequest = sequelize.define('SalonRequest', {
            requestId: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                field: 'request_id'
            },
            fullName: {
                type: DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Full name is required'
                    },
                    len: {
                        args: [2, 100],
                        msg: 'Full name must be between 2 and 100 characters'
                    }
                },
                field: 'full_name'
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
            phoneNumber: {
                type: DataTypes.STRING(15),
                allowNull: false,
                unique: true,
                validate: {
                    notEmpty: true,
                    len: {
                        args: [10, 15],
                        msg: 'Phone number must be 10-15 digits'
                    }
                },
                field: 'phone_number'
            },
            address: {
                type: DataTypes.STRING(255),
                allowNull: false,
                validate: {
                    notEmpty: true
                },
                field: 'address'
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
            }
        }, {
            sequelize,
            modelName: 'SalonRequest',
            tableName: 'salon_requests',
            timestamps: true,
            paranoid: true,  // ✅ Soft delete enable
            indexes: [
                {
                    fields: ['phone_number'],
                    unique: true
                }
            ]
        });

        return SalonRequest;
    };
