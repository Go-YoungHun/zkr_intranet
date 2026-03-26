const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const PartInventory = sequelize.define(
  "PartInventory",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    serial_no: {
      type: DataTypes.STRING(80),
      allowNull: true,
      unique: true,
    },
    category: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    asset_name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    location: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    note: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "part_inventories",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = PartInventory;
