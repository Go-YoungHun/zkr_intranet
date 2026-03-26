const express = require("express");
const { Op } = require("sequelize");
const { CustomerGroup } = require("../models");
const { requireAuth } = require("../middlewares/auth");
const { logAuditEvent } = require("../utils/auditLogger");

const router = express.Router();

// 감사로그 체크리스트 (검색키워드: logAuditEvent()
// - POST /api/customers/groups
// - PUT /api/customers/groups/:id
// - DELETE /api/customers/groups/:id

/**
 * GET /api/customers/groups
 * 고객사 그룹 목록
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const rows = await CustomerGroup.findAll({
      order: [["id", "DESC"]],
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/customers/groups
 * 고객사 그룹 생성
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    const trimmedName = name?.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: "group name is required" });
    }

    const row = await CustomerGroup.create({ name: trimmedName });

    await logAuditEvent({
      req,
      entityType: "customer_group",
      entityId: row.id,
      action: "create",
      before: null,
      after: row.toJSON(),
    });

    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Duplicate group" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/customers/groups/:id
 * 고객사 그룹 수정
 */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const row = await CustomerGroup.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const trimmedName = req.body?.name?.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: "group name is required" });
    }

    const existing = await CustomerGroup.findOne({
      where: { name: trimmedName, id: { [Op.ne]: row.id } },
    });

    if (existing) {
      return res.status(409).json({ message: "Duplicate group" });
    }

    const before = row.toJSON();
    await row.update({ name: trimmedName });

    await logAuditEvent({
      req,
      entityType: "customer_group",
      entityId: row.id,
      action: "update",
      before,
      after: row.toJSON(),
    });

    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/customers/groups/:id
 * 고객사 그룹 삭제
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const row = await CustomerGroup.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const before = row.toJSON();
    await row.destroy();

    await logAuditEvent({
      req,
      entityType: "customer_group",
      entityId: row.id,
      action: "delete",
      before,
      after: null,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
