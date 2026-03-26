const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const {
  Ticket,
  TicketCategory,
  TicketComment,
  TicketAttachment,
  Customer,
  Machine,
  Employee,
} = require("../models");
const { Op } = require("sequelize");
const { requireAuth } = require("../middlewares/auth");
const requireAdmin = require("../middlewares/requireAdmin");
const { logAuditEvent } = require("../utils/auditLogger");
const { sanitizeHtml } = require("../utils/sanitizeHtml");

const router = express.Router();

const uploadsRoot = path.join(__dirname, "..", "..", "uploads", "tickets");
fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, "_") || "file";
    const filename = `${Date.now()}_${safeBase}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "photo",
  "service_report",
  "log_file",
  "certificate",
  "etc",
]);

const sanitizeAttachmentType = (value) => {
  if (typeof value !== "string") return "etc";
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "etc";
  return ALLOWED_ATTACHMENT_TYPES.has(normalized) ? normalized : null;
};

const sanitizeAttachmentLabel = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 255);
};

const ticketIncludes = [
  { model: TicketCategory, attributes: ["id", "name"] },
  { model: Customer, attributes: ["id", "name", "name_en", "sales_agent"] },
  { model: Machine, attributes: ["id", "name", "serial_no"] },
  { model: Employee, as: "openedBy", attributes: ["id", "name", "login_id"] },
  { model: Employee, as: "assignedTo", attributes: ["id", "name", "login_id"] },
];

/**
 * GET /api/tickets
 * 티켓 목록
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const rawCustomerId = Array.isArray(req.query.customerId)
      ? req.query.customerId[0]
      : req.query.customerId;
    const customerId = rawCustomerId ? Number(rawCustomerId) : null;
    if (rawCustomerId && (!Number.isFinite(customerId) || customerId <= 0)) {
      return res.status(400).json({ message: "Invalid customerId" });
    }
    const query =
      typeof req.query.query === "string" ? req.query.query.trim() : "";
    const rawPage = Number.parseInt(req.query.page, 10);
    const rawPageSize = Number.parseInt(req.query.pageSize, 10);
    const rawLimit = Number.parseInt(req.query.limit, 10);
    const rawOffset = Number.parseInt(req.query.offset, 10);
    const pageSize = Number.isFinite(rawPageSize)
      ? Math.max(rawPageSize, 1)
      : Number.isFinite(rawLimit)
        ? Math.max(rawLimit, 1)
        : 20;
    const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1;
    const offset = Number.isFinite(rawOffset)
      ? Math.max(rawOffset, 0)
      : (page - 1) * pageSize;
    const likeOperator =
      Ticket.sequelize?.getDialect?.() === "postgres" ? Op.iLike : Op.like;
    const where = {};
    if (customerId) {
      where.customer_id = customerId;
    }

    if (query) {
      where[Op.or] = [
        { subject: { [likeOperator]: `%${query}%` } },
        { description: { [likeOperator]: `%${query}%` } },
        { status: { [likeOperator]: `%${query}%` } },
        { priority: { [likeOperator]: `%${query}%` } },
        { "$Customer.name$": { [likeOperator]: `%${query}%` } },
        { "$Machine.name$": { [likeOperator]: `%${query}%` } },
        { "$Machine.serial_no$": { [likeOperator]: `%${query}%` } },
      ];
    }
    const rows = await Ticket.findAll({
      where,
      include: ticketIncludes,
      order: [["id", "DESC"]],
      limit: pageSize,
      offset,
      subQuery: false,
    });

    const count = await Ticket.count({
      where,
      distinct: true,
      include: [
        {
          model: Customer,
          attributes: [],
          required: false,
        },
        {
          model: Machine,
          attributes: [],
          required: false,
        },
      ],
    });

    res.json({
      rows,
      total: count,
      page,
      pageSize,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/tickets/categories
 * 티켓 카테고리 목록
 */
router.get("/categories", requireAuth, async (req, res) => {
  try {
    const rows = await TicketCategory.findAll({
      where: { is_active: true },
      order: [["name", "ASC"]],
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/tickets/categories
 * 티켓 카테고리 등록
 */
router.post("/categories", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const existing = await TicketCategory.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ message: "name already exists" });
    }

    const row = await TicketCategory.create({
      name,
      description: description ?? null,
      is_active: is_active ?? true,
    });

    await logAuditEvent({
      req,
      entityType: "ticket_category",
      entityId: row.id,
      action: "create",
      before: null,
      after: row.toJSON(),
    });

    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/tickets/categories/:id
 * 티켓 카테고리 수정
 */
router.put("/categories/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const row = await TicketCategory.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const { name, description, is_active } = req.body;
    const before = row.toJSON();

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const existing = await TicketCategory.findOne({
      where: { name, id: { [Op.ne]: row.id } },
    });

    if (existing) {
      return res.status(400).json({ message: "name already exists" });
    }

    await row.update({
      name,
      description: description ?? null,
      is_active: is_active ?? row.is_active,
    });

    await logAuditEvent({
      req,
      entityType: "ticket_category",
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
 * PATCH /api/tickets/categories/:id
 * 티켓 카테고리 부분 수정
 */
router.patch("/categories/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const row = await TicketCategory.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const { name, description, is_active } = req.body;
    const before = row.toJSON();

    if (name) {
      const existing = await TicketCategory.findOne({
        where: { name, id: { [Op.ne]: row.id } },
      });

      if (existing) {
        return res.status(400).json({ message: "name already exists" });
      }
    }

    await row.update({
      name: name ?? row.name,
      description: description ?? row.description,
      is_active: is_active ?? row.is_active,
    });

    await logAuditEvent({
      req,
      entityType: "ticket_category",
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
 * DELETE /api/tickets/categories/:id
 * 티켓 카테고리 삭제
 */
router.delete(
  "/categories/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const row = await TicketCategory.findByPk(req.params.id);
      if (!row) return res.status(404).json({ message: "Not found" });

      const before = row.toJSON();
      await row.destroy();

      await logAuditEvent({
        req,
        entityType: "ticket_category",
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
  },
);

/**
 * POST /api/tickets
 * 티켓 등록
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      category_id,
      customer_id,
      machine_id,
      opened_by_employee_id,
      assigned_to_employee_id,
      subject,
      description,
      status,
      priority,
      opened_at,
      closed_at,
    } = req.body;

    const openedByEmployeeId = opened_by_employee_id ?? req.user?.id ?? null;
    const assignedToEmployeeId = assigned_to_employee_id ?? null;
    const resolvedSubject = subject ?? req.body.title ?? "";

    if (!category_id) {
      return res.status(400).json({ message: "category_id is required" });
    }

    if (!openedByEmployeeId) {
      return res
        .status(400)
        .json({ message: "opened_by_employee_id is required" });
    }

    if (!customer_id || !resolvedSubject) {
      return res
        .status(400)
        .json({ message: "customer_id and subject are required" });
    }

    const row = await Ticket.create({
      category_id,
      customer_id,
      machine_id: machine_id ?? null,
      opened_by_employee_id: openedByEmployeeId,
      assigned_to_employee_id: assignedToEmployeeId,
      subject: resolvedSubject,
      description: sanitizeHtml(description),
      status: status ?? "open",
      priority: priority ?? null,
      opened_at: opened_at ?? new Date(),
      closed_at: closed_at ?? null,
    });

    await logAuditEvent({
      req,
      entityType: "ticket",
      entityId: row.id,
      action: "create",
      before: null,
      after: row.toJSON(),
      onBehalfOfEmployeeId: row.opened_by_employee_id ?? null,
    });

    const created = await Ticket.findByPk(row.id, { include: ticketIncludes });
    res.status(201).json(created || row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/tickets/:id
 * 티켓 상세
 */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const row = await Ticket.findByPk(req.params.id, {
      include: [
        ...ticketIncludes,
        {
          model: TicketComment,
          include: [
            { model: Employee, attributes: ["id", "name", "login_id"] },
          ],
        },
      ],
      order: [[TicketComment, "id", "ASC"]],
    });

    if (!row) return res.status(404).json({ message: "Not found" });

    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/tickets/:id/attachments
 * 티켓 첨부파일 목록
 */
router.get("/:id/attachments", requireAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Not found" });

    const rows = await TicketAttachment.findAll({
      where: { ticket_id: ticket.id },
      order: [["id", "DESC"]],
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/tickets/:id/attachments
 * 티켓 첨부파일 업로드
 */
router.post(
  "/:id/attachments",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const ticket = await Ticket.findByPk(req.params.id);
      if (!ticket) return res.status(404).json({ message: "Not found" });
      if (!req.file)
        return res.status(400).json({ message: "File is required" });

      const attachmentType = sanitizeAttachmentType(req.body?.attachment_type);
      if (!attachmentType) {
        return res
          .status(400)
          .json({ message: "attachment_type must be one of: photo, service_report, log_file, certificate, etc" });
      }

      const attachment = await TicketAttachment.create({
        ticket_id: ticket.id,
        file_name: req.file.originalname,
        label: sanitizeAttachmentLabel(req.body?.label),
        attachment_type: attachmentType,
        file_url: `/uploads/tickets/${req.file.filename}`,
        mime_type: req.file.mimetype,
        size: req.file.size,
        uploaded_by_employee_id: req.user?.id ?? null,
      });

      res.status(201).json(attachment);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

const deleteTicketAttachment = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Not found" });

    const attachmentId =
      req.params.attachmentId ||
      req.query.attachment_id ||
      req.body?.attachment_id;

    if (!attachmentId) {
      return res.status(400).json({ message: "attachment_id is required" });
    }

    const attachment = await TicketAttachment.findOne({
      where: { id: attachmentId, ticket_id: ticket.id },
    });

    if (!attachment) return res.status(404).json({ message: "Not found" });

    if (attachment.file_url) {
      const filename = path.basename(attachment.file_url);
      const filePath = path.join(uploadsRoot, filename);
      fs.unlink(filePath, () => {});
    }

    await attachment.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE /api/tickets/:id/attachments
 */
router.delete("/:id/attachments", requireAuth, deleteTicketAttachment);

/**
 * DELETE /api/tickets/:id/attachments/:attachmentId
 */
router.delete(
  "/:id/attachments/:attachmentId",
  requireAuth,
  deleteTicketAttachment,
);

/**
 * PUT /api/tickets/:id
 * 티켓 수정
 */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const row = await Ticket.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const {
      category_id,
      customer_id,
      machine_id,
      opened_by_employee_id,
      assigned_to_employee_id,
      subject,
      description,
      status,
      priority,
      opened_at,
      closed_at,
    } = req.body;
    const sanitizedDescription =
      description !== undefined ? sanitizeHtml(description) : row.description;
    const before = row.toJSON();

    await row.update({
      category_id: category_id ?? row.category_id,
      customer_id: customer_id ?? row.customer_id,
      machine_id: machine_id ?? row.machine_id,
      opened_by_employee_id:
        opened_by_employee_id ?? row.opened_by_employee_id,
      assigned_to_employee_id:
        assigned_to_employee_id ?? row.assigned_to_employee_id,
      subject: subject ?? req.body.title ?? row.subject,
      description: sanitizedDescription,
      status: status ?? row.status,
      priority: priority ?? row.priority,
      opened_at: opened_at ?? row.opened_at,
      closed_at: closed_at ?? row.closed_at,
    });

    await logAuditEvent({
      req,
      entityType: "ticket",
      entityId: row.id,
      action: "update",
      before,
      after: row.toJSON(),
      onBehalfOfEmployeeId: row.opened_by_employee_id ?? null,
    });

    const updated = await Ticket.findByPk(row.id, { include: ticketIncludes });
    res.json(updated || row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/tickets/:id
 * 티켓 삭제
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const row = await Ticket.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const before = row.toJSON();
    await row.destroy();

    await logAuditEvent({
      req,
      entityType: "ticket",
      entityId: row.id,
      action: "delete",
      before,
      after: null,
      onBehalfOfEmployeeId: row.opened_by_employee_id ?? null,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/tickets/:id/status
 * 티켓 상태 변경
 */
router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const row = await Ticket.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const { status, closed_at } = req.body;
    if (!status) return res.status(400).json({ message: "status is required" });
    const normalizedStatus = String(status).trim().toLowerCase();

    let nextClosedAt = row.closed_at;
    if (normalizedStatus === "closed") {
      if (closed_at !== undefined) {
        if (closed_at === null || closed_at === "") {
          nextClosedAt = null;
        } else {
          const parsedClosedAt = new Date(closed_at);
          if (Number.isNaN(parsedClosedAt.getTime())) {
            return res.status(400).json({ message: "closed_at must be a valid datetime" });
          }
          nextClosedAt = parsedClosedAt;
        }
      } else if (!row.closed_at) {
        nextClosedAt = new Date();
      }
    } else {
      nextClosedAt = null;
    }

    const before = row.toJSON();
    await row.update({ status, closed_at: nextClosedAt });

    await logAuditEvent({
      req,
      entityType: "ticket",
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
 * POST /api/tickets/:id/comments
 * 티켓 코멘트 추가
 */
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Not found" });

    const { comment } = req.body;
    if (!comment)
      return res.status(400).json({ message: "comment is required" });

    const row = await TicketComment.create({
      ticket_id: ticket.id,
      employee_id: req.user?.id ?? null,
      comment: sanitizeHtml(comment),
    });

    await logAuditEvent({
      req,
      entityType: "ticket_comment",
      entityId: row.id,
      action: "create",
      before: null,
      after: row.toJSON(),
      onBehalfOfEmployeeId: ticket.opened_by_employee_id ?? null,
    });

    const created = await TicketComment.findByPk(row.id, {
      include: [{ model: Employee, attributes: ["id", "name", "login_id"] }],
    });

    res.status(201).json(created || row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
