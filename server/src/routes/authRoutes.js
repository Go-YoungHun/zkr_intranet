const express = require("express");
const bcrypt = require("bcrypt");
const models = require("../models");
const { signToken } = require("../utils/jwt");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/ping", (req, res) => {
  res.json({ ok: true, message: "auth pong" });
});

router.post("/login", async (req, res) => {
  try {
    const { login_id, password } = req.body;
    if (!login_id || !password) {
      return res.status(400).json({ message: "login_id and password required" });
    }

    const user = await models.Employee.findOne({ where: { login_id, is_active: true } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    // ✅ role 컬럼이 생겼다면 여기 role도 포함
    const token = signToken({
      id: String(user.id),
      login_id: user.login_id,
      name: user.name,
      role: user.role, // role 없으면 일단 지워도 됨
      permission_level: user.permission_level,
    });

    const isProd = process.env.NODE_ENV === "production";
    res.cookie(process.env.COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24,
    });

    await user.update({ last_login_at: new Date() });

    return res.json({
      id: user.id,
      login_id: user.login_id,
      name: user.name,
      role: user.role,
      permission_level: user.permission_level,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

router.post("/logout", (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie(process.env.COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
  return res.json({ ok: true });
});

module.exports = router;
