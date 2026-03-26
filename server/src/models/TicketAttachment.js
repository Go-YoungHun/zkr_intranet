const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TicketAttachment = sequelize.define(
  "TicketAttachment",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    ticket_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    attachment_type: {
      type: DataTypes.ENUM(
        "photo",
        "service_report",
        "log_file",
        "certificate",
        "etc",
      ),
      allowNull: false,
      defaultValue: "etc",
    },
    file_url: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    size: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    uploaded_by_employee_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
  },
  {
    tableName: "ticket_attachments",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);

module.exports = TicketAttachment;
