const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BoardAttachment = sequelize.define(
  "BoardAttachment",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    board_post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
    tableName: "board_attachments",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = BoardAttachment;
