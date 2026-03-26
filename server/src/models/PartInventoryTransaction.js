const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const PartInventoryTransaction = sequelize.define(
  "PartInventoryTransaction",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    inventory_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("IN", "OUT", "ADJUST"),
      allowNull: false,
    },
    quantity_delta: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    note: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    created_by_employee_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "part_inventory_transactions",
    timestamps: false,
    underscored: true,
  }
);

module.exports = PartInventoryTransaction;
