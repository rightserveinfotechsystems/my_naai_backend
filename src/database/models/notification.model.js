const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    notificationId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'notification_id'
    },

    receiverType: {
      type: DataTypes.ENUM('SALON', 'USER'),
      allowNull: false,
      field: 'receiver_type'
},

    receiverId: {    
      type: DataTypes.UUID,
      allowNull: false,
      field: 'receiver_id'
    },

    title: {
      type: DataTypes.STRING,
    },
    message: {
      type: DataTypes.STRING
    },

    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_read'
    }
  }, {
    tableName: 'notifications',
    timestamps: true
  });

  return Notification;
};
