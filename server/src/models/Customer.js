const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Customer = sequelize.define(
  "Customer",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    group_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    legal_name: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    name_en: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    sales_agent: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    sales_agency_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "customers",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [],
  }
);

module.exports = Customer;
