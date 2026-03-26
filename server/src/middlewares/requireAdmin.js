const ADMIN_PERMISSION_LEVEL = 7;

function requireAdmin(req, res, next) {
  // requireAuth에서 req.user 세팅되어 있다는 전제
  // 숫자 권한 단계: ADMIN_PERMISSION_LEVEL(현재 7) 이상만 허용
  const permissionLevel = Number(req.user?.permission_level);

  if (!Number.isFinite(permissionLevel)) {
    return res.status(403).json({ message: "Forbidden (permission_level required)" });
  }

  if (permissionLevel < ADMIN_PERMISSION_LEVEL) {
    return res
      .status(403)
      .json({ message: `Forbidden (permission_level >= ${ADMIN_PERMISSION_LEVEL} required)` });
  }

  next();
}

module.exports = requireAdmin;
