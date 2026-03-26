const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    entity_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    action: {
      type: DataTypes.ENUM("create", "update", "delete"),
      allowNull: false,
    },
    actor_employee_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    performed_by_employee_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    on_behalf_of_employee_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    changed_fields_json: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    before_json: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    after_json: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    ip: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "audit_logs",
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ["entity_type"] },
      { fields: ["entity_id"] },
      { fields: ["created_at"] },
      { fields: ["actor_employee_id"] },
    ],
  },
);

module.exports = AuditLog;
