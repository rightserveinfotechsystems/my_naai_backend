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
        // dayOfWeek: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false,
        //     validate: {
        //         min: 0,
        //         max: 6
        //     },
        //     comment: '0=Sunday, 1=Monday, ..., 6=Saturday',
        //     field: 'day_of_week'
        // },
             dayType: {
            type: DataTypes.ENUM('weekdays', 'sunday'),
            allowNull: false,
            field: 'day_type',
            comment: 'weekdays = Monday-Saturday, sunday = closed'
        },
        isOpen: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            field: 'is_open'
        },
        openingTime: {
            type: DataTypes.TIME,
            allowNull: true,
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
        
        indexes: [
            {
                unique: true,
                fields: ['salon_id', 'day_type']
            }
        ]
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