const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Ticket = sequelize.define(
  "Ticket",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    category_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    customer_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    machine_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    opened_by_employee_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    assigned_to_employee_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    subject: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "open",
    },
    priority: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    opened_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "tickets",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Ticket;
