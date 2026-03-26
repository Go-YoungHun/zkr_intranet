const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { Op } = require("sequelize");
const {
  Machine,
  Customer,
  Ticket,
  MachineAttachment,
  MachineModel,
  Employee,
  SalesAgency,
} = require("../models");
const { requireAuth } = require("../middlewares/auth");
const { isImageMimeType } = require("../utils/mime");
const { logAuditEvent } = require("../utils/auditLogger");

const uploadsRoot = path.join(__dirname, "..", "..", "uploads", "machines");
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
const MAX_ATTACHMENT_UPLOAD_COUNT = 20;

const router = express.Router();

const MACHINE_STATUSES = ["active", "maintenance", "inactive", "retired"];
const ACTIVE_MACHINE_STATUSES = new Set(["active", "maintenance"]);

const normalizeMachineStatus = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return MACHINE_STATUSES.includes(normalized) ? normalized : null;
};

const statusToIsActive = (status) => ACTIVE_MACHINE_STATUSES.has(status);

const sanitizeAttachmentLabel = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 255);
};

const buildAttachmentAuditPayload = (attachment, machineIdOverride = null) => {
  const plain = attachment?.toJSON ? attachment.toJSON() : attachment || {};
  return {
    id: plain.id ?? null,
    file_name: plain.file_name ?? null,
    label: plain.label ?? null,
    mime_type: plain.mime_type ?? null,
    size: plain.size ?? null,
    machine_id: machineIdOverride ?? plain.machine_id ?? null,
  };
};

const serializeAttachment = (attachment) => {
  const plain = attachment?.toJSON ? attachment.toJSON() : attachment;
  return {
    ...plain,
    is_image: isImageMimeType(plain?.mime_type),
  };
};

/**
 * GET /api/machines
 * 장비 목록 (고객사 포함)
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const all = req.query.all === "1";
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
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
      Machine.sequelize?.getDialect?.() === "postgres" ? Op.iLike : Op.like;
    const where = {};

    if (!all) {
      where.status = { [Op.in]: Array.from(ACTIVE_MACHINE_STATUSES) };
    }

    if (q) {
      where[Op.or] = [
        { name: { [likeOperator]: `%${q}%` } },
        { model: { [likeOperator]: `%${q}%` } },
        { software_name: { [likeOperator]: `%${q}%` } },
        { serial_no: { [likeOperator]: `%${q}%` } },
        { location: { [likeOperator]: `%${q}%` } },
      ];
    }

    const { rows, count } = await Machine.findAndCountAll({
      where,
      include: [
        {
          model: Customer,
          attributes: ["id", "name", "address", "sales_agent"],
          include: [
            {
              model: SalesAgency,
              as: "salesAgency",
              attributes: ["id", "name"],
            },
          ],
        },
        { model: MachineModel, attributes: ["id", "name"] },
        { model: Employee, as: "Owner", attributes: ["id", "name"] },
      ],
      order: [["id", "DESC"]],
      limit: pageSize,
      offset,
      distinct: true,
    });

    res.json({ rows, total: count, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/machines/:id/tickets
 * 장비에 연결된 티켓 목록
 */
router.get("/:id/tickets", requireAuth, async (req, res) => {
  try {
    const machine = await Machine.findByPk(req.params.id);
    if (!machine) return res.status(404).json({ message: "Not found" });

    const rows = await Ticket.findAll({
      where: { machine_id: machine.id },
      order: [["id", "DESC"]],
    });

    res.json(rows.map(serializeAttachment));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/machines/:id
 * 장비 상세 (고객사, 티켓 포함)
 */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const row = await Machine.findByPk(req.params.id, {
      include: [
        { model: Customer, attributes: ["id", "name"] },
        { model: MachineModel, attributes: ["id", "name"] },
        { model: Employee, as: "Owner", attributes: ["id", "name"] },
        { model: Ticket, attributes: ["id", "subject", "status", "priority"] },
      ],
    });

    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/machines/:id/attachments
 * 장비 첨부파일 목록
 */
router.get("/:id/attachments", requireAuth, async (req, res) => {
  try {
    const machine = await Machine.findByPk(req.params.id);
    if (!machine) return res.status(404).json({ message: "Not found" });

    const rows = await MachineAttachment.findAll({
      where: { machine_id: machine.id },
      order: [["id", "DESC"]],
    });

    res.json(rows.map(serializeAttachment));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/machines/:id/attachments
 * 장비 첨부파일 단건 업로드
 */
router.post(
  "/:id/attachments",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const machine = await Machine.findByPk(req.params.id);
      if (!machine) return res.status(404).json({ message: "Not found" });
      if (!req.file)
        return res.status(400).json({ message: "File is required" });

      const attachment = await MachineAttachment.create({
        machine_id: machine.id,
        file_name: req.file.originalname,
        label: sanitizeAttachmentLabel(req.body?.label),
        file_url: `/uploads/machines/${req.file.filename}`,
        mime_type: req.file.mimetype,
        size: req.file.size,
        uploaded_by_employee_id: req.user?.id ?? null,
      });

      const auditPayload = buildAttachmentAuditPayload(attachment, machine.id);
      await logAuditEvent({
        req,
        entityType: "machine",
        entityId: machine.id,
        action: "update",
        before: null,
        after: {
          attachment_event: "upload",
          attachment: auditPayload,
        },
      });

      res.status(201).json(serializeAttachment(attachment));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

/**
 * POST /api/machines/:id/attachments/bulk
 * 장비 첨부파일 다건 업로드
 */
router.post(
  "/:id/attachments/bulk",
  requireAuth,
  upload.array("files", MAX_ATTACHMENT_UPLOAD_COUNT),
  async (req, res) => {
    try {
      const machine = await Machine.findByPk(req.params.id);
      if (!machine) return res.status(404).json({ message: "Not found" });

      const uploadedFiles = req.files || [];
      if (uploadedFiles.length === 0) {
        return res.status(400).json({ message: "Files are required" });
      }

      const labels = Array.isArray(req.body?.labels)
        ? req.body.labels
        : req.body?.labels !== undefined
          ? [req.body.labels]
          : [];

      const results = await Promise.all(
        uploadedFiles.map(async (file, index) => {
          const label = sanitizeAttachmentLabel(labels[index]);

          try {
            const attachment = await MachineAttachment.create({
              machine_id: machine.id,
              file_name: file.originalname,
              label,
              file_url: `/uploads/machines/${file.filename}`,
              mime_type: file.mimetype,
              size: file.size,
              uploaded_by_employee_id: req.user?.id ?? null,
            });

            const auditPayload = buildAttachmentAuditPayload(attachment, machine.id);
            await logAuditEvent({
              req,
              entityType: "machine",
              entityId: machine.id,
              action: "update",
              before: null,
              after: {
                attachment_event: "upload",
                attachment: auditPayload,
              },
            });

            return {
              file_name: file.originalname,
              status: "success",
              attachment: serializeAttachment(attachment),
              error: null,
            };
          } catch (error) {
            if (file.filename) {
              const filePath = path.join(uploadsRoot, file.filename);
              fs.unlink(filePath, () => {});
            }
            return {
              file_name: file.originalname,
              status: "failed",
              attachment: null,
              error: error?.message || "Upload failed",
            };
          }
        }),
      );

      const successCount = results.filter(
        (item) => item.status === "success",
      ).length;
      const failureCount = results.length - successCount;

      res.status(201).json({
        results,
        successCount,
        failureCount,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

const deleteMachineAttachment = async (req, res) => {
  try {
    const machine = await Machine.findByPk(req.params.id);
    if (!machine) return res.status(404).json({ message: "Not found" });

    const attachmentId =
      req.params.attachmentId ||
      req.query.attachment_id ||
      req.body?.attachment_id;

    if (!attachmentId) {
      return res.status(400).json({ message: "attachment_id is required" });
    }

    const attachment = await MachineAttachment.findOne({
      where: { id: attachmentId, machine_id: machine.id },
    });

    if (!attachment) return res.status(404).json({ message: "Not found" });

    if (attachment.file_url) {
      const filename = path.basename(attachment.file_url);
      const filePath = path.join(uploadsRoot, filename);
      fs.unlink(filePath, () => {});
    }

    const beforeAttachment = buildAttachmentAuditPayload(attachment, machine.id);
    await attachment.destroy();

    await logAuditEvent({
      req,
      entityType: "machine",
      entityId: machine.id,
      action: "update",
      before: {
        attachment_event: "delete",
        attachment: beforeAttachment,
      },
      after: null,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * DELETE /api/machines/:id/attachments
 */
router.delete("/:id/attachments", requireAuth, deleteMachineAttachment);

/**
 * DELETE /api/machines/:id/attachments/:attachmentId
 */
router.delete(
  "/:id/attachments/:attachmentId",
  requireAuth,
  deleteMachineAttachment,
);

/**
 * POST /api/machines
 * 장비 등록
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      customer_id,
      name,
      model,
      software_name,
      serial_no,
      location,
      machine_model_id,
      status,
      software_installed_at,
      owner_employee_id,
    } = req.body;

    if (!customer_id || !name) {
      return res
        .status(400)
        .json({ message: "customer_id and name are required" });
    }

    let resolvedStatus = "active";
    if (status !== undefined) {
      resolvedStatus = normalizeMachineStatus(status);
      if (!resolvedStatus) {
        return res.status(400).json({ message: "status is invalid" });
      }
    }

    let resolvedModelName = model?.trim();
    let resolvedMachineModelId = machine_model_id ?? null;
    if (resolvedMachineModelId) {
      const selectedModel = await MachineModel.findByPk(resolvedMachineModelId);
      if (!selectedModel) {
        return res.status(400).json({ message: "machine_model_id is invalid" });
      }
      if (!resolvedModelName) {
        resolvedModelName = selectedModel.name;
      }
    }

    let resolvedOwnerEmployeeId = null;
    if (
      owner_employee_id !== "" &&
      owner_employee_id !== undefined &&
      owner_employee_id !== null
    ) {
      const parsedOwnerEmployeeId = Number(owner_employee_id);
      if (Number.isNaN(parsedOwnerEmployeeId)) {
        return res
          .status(400)
          .json({ message: "owner_employee_id is invalid" });
      }
      if (parsedOwnerEmployeeId !== 0) {
        resolvedOwnerEmployeeId = parsedOwnerEmployeeId;
        const owner = await Employee.findByPk(resolvedOwnerEmployeeId);
        if (!owner) {
          return res
            .status(400)
            .json({ message: "owner_employee_id is invalid" });
        }
      }
    }

    const row = await Machine.create({
      customer_id,
      name,
      model: resolvedModelName || null,
      software_name: software_name?.trim() || null,
      serial_no,
      location,
      machine_model_id: resolvedMachineModelId,
      software_installed_at: software_installed_at || null,
      owner_employee_id: resolvedOwnerEmployeeId,
      status: resolvedStatus,
      is_active: statusToIsActive(resolvedStatus),
    });

    await logAuditEvent({
      req,
      entityType: "machine",
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
 * PUT /api/machines/:id
 */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const row = await Machine.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const {
      customer_id,
      name,
      model,
      software_name,
      serial_no,
      location,
      machine_model_id,
      is_active,
      status,
      software_installed_at,
      owner_employee_id,
    } = req.body;

    const before = row.toJSON();
    if (!customer_id || !name) {
      return res
        .status(400)
        .json({ message: "customer_id and name are required" });
    }

    let resolvedStatus;
    if (status !== undefined) {
      resolvedStatus = normalizeMachineStatus(status);
      if (!resolvedStatus) {
        return res.status(400).json({ message: "status is invalid" });
      }
    }

    let resolvedIsActive;
    if (is_active !== undefined) {
      if (typeof is_active === "boolean") {
        resolvedIsActive = is_active;
      } else if (is_active === "true" || is_active === "false") {
        resolvedIsActive = is_active === "true";
      } else {
        return res.status(400).json({ message: "is_active must be a boolean" });
      }
      if (!resolvedStatus) {
        resolvedStatus = resolvedIsActive ? "active" : "inactive";
      }
    }

    let resolvedModelName = model?.trim();
    let resolvedMachineModelId = machine_model_id ?? null;
    if (resolvedMachineModelId) {
      const selectedModel = await MachineModel.findByPk(resolvedMachineModelId);
      if (!selectedModel) {
        return res.status(400).json({ message: "machine_model_id is invalid" });
      }
      if (!resolvedModelName) {
        resolvedModelName = selectedModel.name;
      }
    }

    let resolvedOwnerEmployeeId = null;
    if (
      owner_employee_id !== "" &&
      owner_employee_id !== undefined &&
      owner_employee_id !== null
    ) {
      const parsedOwnerEmployeeId = Number(owner_employee_id);
      if (Number.isNaN(parsedOwnerEmployeeId)) {
        return res
          .status(400)
          .json({ message: "owner_employee_id is invalid" });
      }
      if (parsedOwnerEmployeeId !== 0) {
        resolvedOwnerEmployeeId = parsedOwnerEmployeeId;
        const owner = await Employee.findByPk(resolvedOwnerEmployeeId);
        if (!owner) {
          return res
            .status(400)
            .json({ message: "owner_employee_id is invalid" });
        }
      }
    }

    await row.update({
      customer_id,
      name,
      model: resolvedModelName || null,
      software_name: software_name?.trim() || null,
      serial_no: serial_no ?? null,
      location: location ?? null,
      machine_model_id: resolvedMachineModelId,
      software_installed_at: software_installed_at || null,
      owner_employee_id: resolvedOwnerEmployeeId,
      ...(resolvedStatus ? { status: resolvedStatus } : {}),
      ...(resolvedStatus
        ? { is_active: statusToIsActive(resolvedStatus) }
        : resolvedIsActive !== undefined
          ? { is_active: resolvedIsActive }
          : {}),
    });

    await logAuditEvent({
      req,
      entityType: "machine",
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
 * DELETE /api/machines/:id
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const row = await Machine.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const before = row.toJSON();
    await row.update({ status: "inactive", is_active: false });

    await logAuditEvent({
      req,
      entityType: "machine",
      entityId: row.id,
      action: "delete",
      before,
      after: row.toJSON(),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/:id/restore", requireAuth, async (req, res) => {
  try {
    const row = await Machine.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const before = row.toJSON();
    await row.update({ status: "active", is_active: true });

    await logAuditEvent({
      req,
      entityType: "machine",
      entityId: row.id,
      action: "update",
      before,
      after: row.toJSON(),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
