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

      // ── Who answered ─────────────────────────────────────────────────────
      // A booking request is normally answered by its own salon. An admin may
      // answer on the salon's behalf (a dead phone, a customer at the counter),
      // and when that happens the row has to say so: the salon's tab shows
      // "accepted by My Naai on your behalf", and a support conversation can be
      // settled from the record instead of from memory.
      //
      // Null on rows written before this column existed, which read as the
      // salon's own answer — that is what they were.
      actedByRole: {
        type: DataTypes.STRING(16),
        allowNull: true,
        field: 'acted_by_role',
        comment: "'SALON' | 'ADMIN'",
      },

      actedByAdminId: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: 'acted_by_admin_id',
      },

      actedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'acted_at',
      },

      onBehalfOfSalon: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        field: 'on_behalf_of_salon',
      },

      // Why the platform team answered this way. Kept short (the controller
      // caps it at 500 characters) and shown to the salon, never to the
      // customer.
      adminNote: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'admin_note',
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