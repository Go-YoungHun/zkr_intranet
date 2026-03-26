const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CustomerGroup = sequelize.define(
  "CustomerGroup",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "customer_groups",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [],
  }
);

module.exports = CustomerGroup;
