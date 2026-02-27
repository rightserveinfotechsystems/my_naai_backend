// models/bookingRequest.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BookingRequest = sequelize.define(
    'BookingRequest',
    {
      bookingRequestId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'booking_request_id',
      },

      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'customer_id',
      },

      salonId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'salon_id',
      },

      barberId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'barber_id',
      },

      serviceIds: {
        type: DataTypes.JSON,
        allowNull: false,
        field: 'service_ids',
        comment: 'Array of selected service IDs',
      },

      bookingDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'booking_date',
      },

      startTime: {
        type: DataTypes.TIME,
        allowNull: false,
        field: 'start_time',
      },

      endTime: {
        type: DataTypes.TIME,
        allowNull: false,
        field: 'end_time',
      },

      status: {
        type: DataTypes.ENUM(
          'PENDING',          // waiting for salon owner action
          'ACCEPTED',         // owner accepted → Booking table entry will be created
          'REJECTED',         // owner rejected → notify customer
          'DELAY_PROPOSED',   // owner proposed delay → customer will accept/reject
          'CANCELLED',
          'AUTO_CANCELLED'     // customer rejected delay
        ),
        defaultValue: 'PENDING',
        allowNull: false,
      },

      delayMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'delay_minutes',
        comment: 'Owner proposed delay: 15, 30, 60 minutes',
      },

      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    },
    {
      sequelize,
      modelName: 'BookingRequest',
      tableName: 'booking_requests',
      timestamps: true,
      underscored: true,
    }
  );

  // -------------------
  // Associations
  // -------------------
  BookingRequest.associate = (models) => {
    BookingRequest.belongsTo(models.User, {
      foreignKey: 'customerId',
      as: 'customer',
    });

    BookingRequest.belongsTo(models.Salon, {
      foreignKey: 'salonId',
      as: 'salon',
    });

    BookingRequest.belongsTo(models.Barber, {
      foreignKey: 'barberId',
      as: 'barber',
    });
  };

  return BookingRequest;
};  