const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DeviceToken = sequelize.define('DeviceToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    ownerType: {
      type: DataTypes.ENUM('SALON'),
      allowNull: false
    },

    ownerId: {
      type: DataTypes.UUID,
      allowNull: false
    },

    deviceToken: {
      type: DataTypes.STRING(255),
      allowNull: false
    },

    deviceType: {
      type: DataTypes.ENUM('ANDROID', 'IOS'),
      allowNull: true
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'device_tokens',
    timestamps: true
  });

  return DeviceToken;
};
