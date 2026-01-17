const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DeviceToken = sequelize.define('DeviceToken', {
    deviceId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    salonId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'salons',
        key: 'salon_id'
      },
      onDelete: 'CASCADE'
    },

    deviceToken: {
      type: DataTypes.STRING(255),
      allowNull: false
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'device_tokens',
    timestamps: true
  });

  // Associate DeviceToken with Salon
  DeviceToken.associate = (models) => {
    DeviceToken.belongsTo(models.Salon, {
      foreignKey: 'salonId',
      as: 'salon'
    });
  };

  return DeviceToken;
};
