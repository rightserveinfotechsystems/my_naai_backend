const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const BusinessHours = sequelize.define('BusinessHours', {
        scheduleId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            field: 'schedule_id'
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
    
        //  Multiple holiday days allowed
        holidayDays: {
            type: DataTypes.ARRAY(DataTypes.INTEGER), 
            allowNull: true,
            comment: "0=Sunday, 1=Monday, ..., 6=Saturday"
        },

        isOpen: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_open'
        },
        openingTime: {
            type: DataTypes.TIME,
            allowNull: false,
            field: 'opening_time'
        },
        closingTime: {
            type: DataTypes.TIME,
            allowNull: true,
            field: 'closing_time'
        },
        breakStartTime: {
            type: DataTypes.TIME,
            allowNull: true,
            field: 'break_start_time'
        },
        breakEndTime: {
            type: DataTypes.TIME,
            allowNull: true,
            field: 'break_end_time'
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
        modelName: 'BusinessHours',
        tableName: 'business_hours',
        timestamps: true,

    });

    // Define associations
    BusinessHours.associate = (models) => {
        BusinessHours.belongsTo(models.Salon, {
            foreignKey: 'salonId',
            as: 'salon'
        });
    };

    return BusinessHours;
};