// models/Transaction.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    transactionId: {
      type: DataTypes.UUID,
      autoIncrement: true,
      primaryKey: true,
      field: 'transaction_id'
    },

    salonId: {
        type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'salons',
        key: 'salon_id'
      }
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },

    // paymentType: {
    //   type: DataTypes.STRING, 
    // },

    transactionId: {
      type: DataTypes.STRING, // ya "paymentId"
      allowNull: false,
      field: 'payment_id'
    },

    razorpayOrderId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    planType: {
      type: DataTypes.STRING,
      allowNull: true,
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
