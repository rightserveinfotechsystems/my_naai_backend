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
      autoCancelTaskName: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // ── The answer window and the outcome ────────────────────────────────
      // Stamped by the SERVER when the request is created (created_at + 60s).
      // A client never sends it: whoever sets the window would otherwise set
      // how long the salon has to answer, and a request could be kept open
      // forever.
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'expires_at',
      },

      // When the salon answered (accept / reject), or when the window closed
      // with no answer. `created_at` -> `responded_at` is the response time the
      // leads tab reports.
      respondedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'responded_at',
      },

      // Set on ACCEPT: the booking that the acceptance created. This pointer is
      // the ONLY link between a request and a booking — they stay separate
      // tables, and a request that was never accepted has no booking at all.
      bookingId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'booking_id',
      },

      // Which barber the request was routed to (the salon's dispatch), distinct
      // from `barberId`, which is the barber the CUSTOMER chose.
      routedBarberId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'routed_barber_id',
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