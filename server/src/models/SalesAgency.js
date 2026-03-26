const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SalesAgency = sequelize.define(
  "SalesAgency",
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
    tableName: "sales_agencies",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [],
  }
);

module.exports = SalesAgency;
