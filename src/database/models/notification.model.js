const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    notificationId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    receiverType: {
      type: DataTypes.ENUM('SALON', 'USER'),
      allowNull: false
    },

    receiverId: {
      type: DataTypes.UUID,
      allowNull: false
    },

    title: DataTypes.STRING,
    message: DataTypes.STRING,

    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'notifications',
    timestamps: true
  });

  return Notification;
};
