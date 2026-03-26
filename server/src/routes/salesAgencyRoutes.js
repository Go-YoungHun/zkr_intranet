const express = require("express");
const { Op, fn, col } = require("sequelize");
const { SalesAgency, Customer } = require("../models");
const { requireAuth } = require("../middlewares/auth");
const { logAuditEvent } = require("../utils/auditLogger");

const router = express.Router();

// 감사로그 체크리스트 (검색키워드: logAuditEvent()
// - POST /api/sales-agencies
// - PUT /api/sales-agencies/:id
// - DELETE /api/sales-agencies/:id

/**
 * GET /api/sales-agencies
 * 영업 대리점 목록
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const rows = await SalesAgency.findAll({
      attributes: {
        include: [[fn("COUNT", col("customers.id")), "customer_count"]],
      },
      include: [
        {
          model: Customer,
          as: "customers",
          attributes: [],
          required: false,
        },
      ],
      group: ["SalesAgency.id"],
      order: [["id", "DESC"]],
    });
    const payload = rows.map((row) => {
      const data = row.toJSON();
      return {
        ...data,
        customer_count: Number(data.customer_count || 0),
      };
    });
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/sales-agencies/:id/customers
 * 영업 대리점 고객사 목록
 */
router.get("/:id/customers", requireAuth, async (req, res) => {
  try {
    const agency = await SalesAgency.findByPk(req.params.id);
    if (!agency) return res.status(404).json({ message: "Not found" });

    const customers = await Customer.findAll({
      where: { sales_agency_id: agency.id },
      attributes: ["id", "name", "code"],
      order: [["id", "DESC"]],
    });

    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/sales-agencies
 * 영업 대리점 생성
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const trimmedName = req.body?.name?.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: "sales agency name is required" });
    }

    const row = await SalesAgency.create({ name: trimmedName });

    await logAuditEvent({
      req,
      entityType: "sales_agency",
      entityId: row.id,
      action: "create",
      before: null,
      after: row.toJSON(),
    });

    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Duplicate sales agency" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/sales-agencies/:id
 * 영업 대리점 수정
 */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const row = await SalesAgency.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const trimmedName = req.body?.name?.trim();
    if (!trimmedName) {
      return res.status(400).json({ message: "sales agency name is required" });
    }

    const existing = await SalesAgency.findOne({
      where: { name: trimmedName, id: { [Op.ne]: row.id } },
    });

    if (existing) {
      return res.status(409).json({ message: "Duplicate sales agency" });
    }

    const before = row.toJSON();
    await row.update({ name: trimmedName });

    await logAuditEvent({
      req,
      entityType: "sales_agency",
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
 * DELETE /api/sales-agencies/:id
 * 영업 대리점 삭제
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const row = await SalesAgency.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const before = row.toJSON();
    await row.destroy();

    await logAuditEvent({
      req,
      entityType: "sales_agency",
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
