require("dotenv").config();
const bcrypt = require("bcrypt");
const sequelize = require("../config/db");
const { Employee } = require("../models");

(async () => {
  try {
    await sequelize.authenticate();

    const login_id = "admin";
    const password = "admin1234";
    const hash = await bcrypt.hash(password, 10);

    const [user, created] = await Employee.findOrCreate({
      where: { login_id },
      defaults: {
        login_id,
        email: "admin@local",
        password_hash: hash,
        name: "관리자",
        hire_date: "2026-01-01",
        is_active: true,
        permission_level: 9,
      },
    });

    if (!created) {
      await user.update({
        password_hash: hash,
        is_active: true,
        permission_level: 9,
      });
    }

    console.log("✅ admin ready");
    console.log("login_id:", login_id);
    console.log("password:", password);
    console.log("hash:", hash);
  } catch (err) {
    console.error("❌ error:", err);
  } finally {
    await sequelize.close();
  }
})();
