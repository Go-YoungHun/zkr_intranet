const express = require("express");
const { Op } = require("sequelize");
const { PartInventory, PartInventoryTransaction } = require("../models");
const { requireAuth } = require("../middlewares/auth");
const { logAuditEvent } = require("../utils/auditLogger");

const router = express.Router();

const likeOperator =
  PartInventory.sequelize?.getDialect?.() === "postgres" ? Op.iLike : Op.like;

const sendValidationError = (res, message) =>
  res.status(400).json({ message });

// 감사로그 체크리스트 (검색키워드: logAuditEvent()
// - POST /api/inventories
// - PATCH /api/inventories/:id
// - DELETE /api/inventories/:id
// - POST /api/inventories/:id/transactions

const parseQuantity = (value) => {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

const parseInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
};

/**
 * GET /api/inventories
 * 재고 목록 조회 (검색/필터/페이지네이션)
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const location =
      typeof req.query.location === "string" ? req.query.location.trim() : "";
    const includeZero =
      req.query.include_zero === "1" || req.query.include_zero === "true";
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
    const offset = (page - 1) * limit;

    const where = {};

    if (q) {
      where[Op.or] = [
        { serial_no: { [likeOperator]: `%${q}%` } },
        { category: { [likeOperator]: `%${q}%` } },
        { asset_name: { [likeOperator]: `%${q}%` } },
        { location: { [likeOperator]: `%${q}%` } },
        { note: { [likeOperator]: `%${q}%` } },
      ];
    }

    if (location) {
      where.location = { [likeOperator]: `%${location}%` };
    }

    if (!includeZero) {
      where.quantity = { [Op.gt]: 0 };
    }

    const { rows, count } = await PartInventory.findAndCountAll({
      where,
      order: [["id", "DESC"]],
      limit,
      offset,
      include: [
        {
          model: PartInventoryTransaction,
          as: "transactions",
          attributes: ["type", "created_at"],
          separate: true,
          limit: 1,
          order: [
            ["created_at", "DESC"],
            ["id", "DESC"],
          ],
        },
      ],
    });

    const normalizedRows = rows.map((row) => {
      const latestTransaction = row.transactions?.[0] || null;
      const payload = row.toJSON();
      delete payload.transactions;

      return {
        ...payload,
        latest_transaction_type: latestTransaction?.type || null,
        latest_transaction_at: latestTransaction?.created_at || null,
      };
    });

    res.json({
      rows: normalizedRows,
      pagination: {
        page,
        limit,
        totalCount: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/inventories
 * 재고 등록
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { serial_no, category, asset_name, quantity, location, note } =
      req.body;

    if (!category || !String(category).trim()) {
      return sendValidationError(res, "category is required");
    }
    if (!asset_name || !String(asset_name).trim()) {
      return sendValidationError(res, "asset_name is required");
    }

    const parsedQuantity = parseQuantity(quantity ?? 0);
    if (parsedQuantity === null) {
      return sendValidationError(res, "quantity must be a non-negative number");
    }

    const row = await PartInventory.create({
      serial_no: serial_no || null,
      category: String(category).trim(),
      asset_name: String(asset_name).trim(),
      quantity: parsedQuantity ?? 0,
      location: location ? String(location).trim() : null,
      note: note ? String(note).trim() : null,
    });

    await logAuditEvent({
      req,
      entityType: "inventory",
      entityId: row.id,
      action: "create",
      before: null,
      after: row.toJSON(),
    });

    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Duplicate serial_no" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/inventories/:id
 * 재고 수정
 */
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const row = await PartInventory.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const { serial_no, category, asset_name, quantity, location, note } =
      req.body;
    const before = row.toJSON();

    if (category !== undefined && !String(category).trim()) {
      return sendValidationError(res, "category is required");
    }
    if (asset_name !== undefined && !String(asset_name).trim()) {
      return sendValidationError(res, "asset_name is required");
    }

    const parsedQuantity = parseQuantity(quantity);
    if (parsedQuantity === null) {
      return sendValidationError(res, "quantity must be a non-negative number");
    }

    await row.update({
      serial_no: serial_no ?? row.serial_no,
      category:
        category !== undefined ? String(category).trim() : row.category,
      asset_name:
        asset_name !== undefined ? String(asset_name).trim() : row.asset_name,
      quantity: parsedQuantity ?? row.quantity,
      location: location !== undefined ? String(location).trim() : row.location,
      note: note !== undefined ? String(note).trim() : row.note,
    });

    await logAuditEvent({
      req,
      entityType: "inventory",
      entityId: row.id,
      action: "update",
      before,
      after: row.toJSON(),
    });

    res.json(row);
  } catch (err) {
    console.error(err);
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ message: "Duplicate serial_no" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/inventories/:id
 * 재고 삭제
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const row = await PartInventory.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const before = row.toJSON();
    await row.destroy();

    await logAuditEvent({
      req,
      entityType: "inventory",
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

/**
 * POST /api/inventories/:id/transactions
 * 입/출고/조정 등록
 */
router.post("/:id/transactions", requireAuth, async (req, res) => {
  const inventoryId = parseInteger(req.params.id);
  if (inventoryId === null || inventoryId <= 0) {
    return sendValidationError(res, "invalid inventory id");
  }

  const { type, quantity, quantity_delta, reason, note } = req.body;

  if (!["IN", "OUT", "ADJUST"].includes(type)) {
    return sendValidationError(res, "type must be one of IN, OUT, ADJUST");
  }

  if (!reason || !String(reason).trim()) {
    return sendValidationError(res, "reason is required");
  }

  const inputQuantity = quantity ?? quantity_delta;
  const parsedQuantity = parseInteger(inputQuantity);
  if (parsedQuantity === null || parsedQuantity <= 0) {
    return sendValidationError(res, "quantity must be a positive integer");
  }

  try {
    const result = await PartInventory.sequelize.transaction(async (tx) => {
      const inventory = await PartInventory.findByPk(inventoryId, {
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      });

      if (!inventory) {
        return { notFound: true };
      }

      const currentQuantity = inventory.quantity;
      const inventoryBefore = inventory.toJSON();
      const nextQuantity =
        type === "ADJUST"
          ? parsedQuantity
          : currentQuantity + (type === "OUT" ? -parsedQuantity : parsedQuantity);

      if (nextQuantity < 0) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const quantityDelta = nextQuantity - currentQuantity;

      await inventory.update(
        {
          quantity: nextQuantity,
        },
        {
          transaction: tx,
        }
      );

      const transactionRow = await PartInventoryTransaction.create(
        {
          inventory_id: inventory.id,
          type,
          quantity_delta: quantityDelta,
          reason: String(reason).trim(),
          note: note ? String(note).trim() : null,
          created_by_employee_id: req.user.id,
        },
        {
          transaction: tx,
        }
      );

      return {
        inventory,
        transaction: transactionRow,
        inventoryBefore,
      };
    });

    if (result.notFound) {
      return res.status(404).json({ message: "Not found" });
    }

    await logAuditEvent({
      req,
      entityType: "inventory",
      entityId: result.inventory.id,
      action: "update",
      before: result.inventoryBefore,
      after: result.inventory.toJSON(),
    });

    await logAuditEvent({
      req,
      entityType: "inventory_transaction",
      entityId: result.transaction.id,
      action: "create",
      before: null,
      after: {
        ...result.transaction.toJSON(),
        inventory_id: result.inventory.id,
      },
    });

    return res.status(201).json(result);
  } catch (err) {
    if (err.message === "INSUFFICIENT_STOCK") {
      return sendValidationError(res, "insufficient stock");
    }
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/inventories/:id/transactions
 * 재고 이력 조회
 */
router.get("/:id/transactions", requireAuth, async (req, res) => {
  try {
    const inventoryId = parseInteger(req.params.id);
    if (inventoryId === null || inventoryId <= 0) {
      return sendValidationError(res, "invalid inventory id");
    }

    const inventory = await PartInventory.findByPk(inventoryId, {
      attributes: ["id"],
    });
    if (!inventory) {
      return res.status(404).json({ message: "Not found" });
    }

    const rows = await PartInventoryTransaction.findAll({
      where: { inventory_id: inventoryId },
      order: [
        ["created_at", "DESC"],
        ["id", "DESC"],
      ],
    });

    return res.json({ rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
