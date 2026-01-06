// models/Advertisement.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Advertisement = sequelize.define("Advertisement", {
    advertisementId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: "advertisement_id",
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },

   images: {
      type: DataTypes.ARRAY(DataTypes.STRING), 
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },

  }, {
    tableName: "advertisements",
    timestamps: true,
    underscored: true,
  });

  return Advertisement;
};
