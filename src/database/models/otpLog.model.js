const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const OtpLog = sequelize.define('OtpLog', {
        otpId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: 'otp_id'
        },
        phoneNumber: {
            type: DataTypes.STRING(15),
            allowNull: false,
            validate: {
                isNumeric: true
            },
            field: 'phone_number'
        },
        otpCode: {
            type: DataTypes.STRING(6),
            allowNull: false,
            validate: {
                len: [4, 6]
            },
            field: 'otp_code'
        },
        purpose: {
            type: DataTypes.ENUM('login', 'registration', 'verification'),
            allowNull: false,
            field: 'purpose'
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_verified'
        },
        attempts: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            validate: {
                min: 0
            },
            field: 'attempts'
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true,
            field: 'ip_address'
        },
        userAgent: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'user_agent'
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'expires_at'
        },
        verifiedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'verified_at'
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'created_at'
        }
    }, {
        sequelize,
        modelName: 'OtpLog',
        tableName: 'otp_logs',
        timestamps: false,
        
        indexes: [
            {
                fields: ['phone_number']
            },
            {
                fields: ['expires_at']
            },
            {
                fields: ['created_at']
            }
        ]
    });

    // No associations for OTP logs

    return OtpLog;
};