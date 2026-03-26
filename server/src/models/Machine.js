const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Machine = sequelize.define(
  "Machine",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    customer_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    serial_no: {
      type: DataTypes.STRING(80),
      allowNull: true,
      unique: true,
    },
    model: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    software_name: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    machine_model_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    software_installed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    owner_employee_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "active",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "machines",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Machine;
