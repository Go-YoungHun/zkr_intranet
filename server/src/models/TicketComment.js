const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TicketComment = sequelize.define(
  "TicketComment",
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
    employee_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "ticket_comments",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = TicketComment;