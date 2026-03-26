const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Employee = sequelize.define(
  "Employee",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },

    login_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    hire_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    permission_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    department: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    job_title: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    employment_status: {
      type: DataTypes.ENUM("ACTIVE", "ON_LEAVE", "RESIGNED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },

    contact_phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    contact_email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    address_line1: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    address_line2: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // role 컬럼은 아직 안 만든 상태라면 주석
    // role: {
    //   type: DataTypes.STRING(20),
    //   allowNull: false,
    //   defaultValue: "USER",
    // },
  },
  {
    tableName: "employees", // 테이블명이 employees면 소문자로 바꿔
    underscored: true,      // created_at / updated_at 자동 매핑
    timestamps: true,
  }
);

module.exports = Employee;
