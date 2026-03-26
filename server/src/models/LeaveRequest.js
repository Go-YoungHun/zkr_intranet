const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const LeaveRequest = sequelize.define(
  "LeaveRequest",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    employee_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    leave_unit: {
      type: DataTypes.ENUM("full", "half_am", "half_pm"),
      allowNull: false,
      defaultValue: "full",
    },
    duration_days: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    reviewed_by_employee_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    review_comment: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: "leave_requests",
    underscored: true,
    timestamps: true,
  }
);

module.exports = LeaveRequest;
