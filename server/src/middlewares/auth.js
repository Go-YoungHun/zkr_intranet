const { verifyToken } = require("../utils/jwt");

function requireAuth(req, res, next) {
  const token = req.cookies?.[process.env.COOKIE_NAME];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    req.user = verifyToken(token); // { id, login_id, name }
    return next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = { requireAuth };
