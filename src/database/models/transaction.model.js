// models/Transaction.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.UUID,
      autoIncrement: true,
      primaryKey: true
    },

    salonId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'salons',
        key: 'salon_id'
      },
      field: 'salon_id'
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    paymentType: {
      type: DataTypes.STRING,
      field: 'payment_type'
    },

    transactionId: {
      type: DataTypes.STRING, // or "paymentId"
      allowNull: false,
      field: 'payment_id'
    },

    razorpayOrderId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'razorpay_order_id'
    },

    planType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'plan_type'
    },

    // status: {
    //   type: DataTypes.ENUM('pending', 'success', 'failed', 'refunded'),
    //   defaultValue: 'pending',
    // },

    description: {
      type: DataTypes.STRING,
    }
  }, {
    tableName: "transactions",
    timestamps: true
  });

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.Salon, {
      foreignKey: 'salonId',
      as: 'salon',
      onDelete: 'CASCADE'
    });
  };

  return Transaction;
};
