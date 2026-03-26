const express = require("express");
const { Op } = require("sequelize");
const { MachineModel } = require("../models");
const { requireAuth } = require("../middlewares/auth");
const { logAuditEvent } = require("../utils/auditLogger");

const router = express.Router();

// 감사로그 체크리스트 (검색키워드: logAuditEvent()
// - POST /api/machine-models
// - PUT /api/machine-models/:id
// - DELETE /api/machine-models/:id

/**
 * GET /api/machine-models
 * 장비 모델 목록
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const rows = await MachineModel.findAll({
      order: [["id", "DESC"]],
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/machine-models
 * 장비 모델 생성
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const trimmedName = req.body?.name?.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: "model name is required" });
    }

    const row = await MachineModel.create({ name: trimmedName });

    await logAuditEvent({
      req,
      entityType: "machine_model",
      entityId: row.id,
      action: "create",
      before: null,
      after: row.toJSON(),
    });

    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Duplicate model" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/machine-models/:id
 * 장비 모델 수정
 */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const row = await MachineModel.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const trimmedName = req.body?.name?.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: "model name is required" });
    }

    const existing = await MachineModel.findOne({
      where: { name: trimmedName, id: { [Op.ne]: row.id } },
    });

    if (existing) {
      return res.status(409).json({ message: "Duplicate model" });
    }

    const before = row.toJSON();
    await row.update({ name: trimmedName });

    await logAuditEvent({
      req,
      entityType: "machine_model",
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
 * DELETE /api/machine-models/:id
 * 장비 모델 삭제
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const row = await MachineModel.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const before = row.toJSON();
    await row.destroy();

    await logAuditEvent({
      req,
      entityType: "machine_model",
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
