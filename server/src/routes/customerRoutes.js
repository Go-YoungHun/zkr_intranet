const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { Op } = require("sequelize");
const {
  Customer,
  CustomerGroup,
  Machine,
  SalesAgency,
  CustomerAttachment,
} = require("../models");
const { requireAuth } = require("../middlewares/auth");
const { isImageMimeType } = require("../utils/mime");
const { logAuditEvent } = require("../utils/auditLogger");

const uploadsRoot = path.join(__dirname, "..", "..", "uploads", "customers");
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

const router = express.Router();

const ALPHABET_TO_HANGUL = {
  a: "에이",
  b: "비",
  c: "씨",
  d: "디",
  e: "이",
  f: "에프",
  g: "지",
  h: "에이치",
  i: "아이",
  j: "제이",
  k: "케이",
  l: "엘",
  m: "엠",
  n: "엔",
  o: "오",
  p: "피",
  q: "큐",
  r: "알",
  s: "에스",
  t: "티",
  u: "유",
  v: "브이",
  w: "더블유",
  x: "엑스",
  y: "와이",
  z: "지",
};

const HANGUL_TO_ALPHABET = [
  ["더블유", "w"],
  ["에이치", "h"],
  ["케이", "k"],
  ["엠", "m"],
  ["에스", "s"],
  ["에이", "a"],
  ["비", "b"],
  ["씨", "c"],
  ["디", "d"],
  ["이", "e"],
  ["에프", "f"],
  ["지", "g"],
  ["아이", "i"],
  ["제이", "j"],
  ["엘", "l"],
  ["엔", "n"],
  ["오", "o"],
  ["피", "p"],
  ["큐", "q"],
  ["알", "r"],
  ["티", "t"],
  ["유", "u"],
  ["브이", "v"],
  ["엑스", "x"],
  ["와이", "y"],
  ["제트", "z"],
];

const buildHangulFromAlphabet = (input) => {
  const letters = input.replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!letters) return null;
  return letters
    .split("")
    .map((char) => ALPHABET_TO_HANGUL[char])
    .filter(Boolean)
    .join("");
};

const buildAlphabetFromHangul = (input) => {
  let remaining = input.replace(/\s+/g, "");
  let result = "";

  while (remaining.length > 0) {
    if (/^[a-zA-Z0-9]/.test(remaining)) {
      result += remaining[0].toLowerCase();
      remaining = remaining.slice(1);
      continue;
    }

    let matched = false;
    for (const [token, letter] of HANGUL_TO_ALPHABET) {
      if (remaining.startsWith(token)) {
        result += letter;
        remaining = remaining.slice(token.length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      return null;
    }
  }

  return result || null;
};

const buildSearchVariants = (query) => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const variants = new Set([trimmed, trimmed.toLowerCase()]);
  const hangulVariant = buildHangulFromAlphabet(trimmed);
  if (hangulVariant) variants.add(hangulVariant);

  const alphabetVariant = buildAlphabetFromHangul(trimmed);
  if (alphabetVariant) variants.add(alphabetVariant);

  return Array.from(variants);
};

const sanitizeAttachmentLabel = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 255);
};

const serializeAttachment = (attachment) => {
  const plain = attachment?.toJSON ? attachment.toJSON() : attachment;
  return {
    ...plain,
    is_image: isImageMimeType(plain?.mime_type),
  };
};

/**
 * GET /api/customers
 * 고객사 목록
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
      Customer.sequelize?.getDialect?.() === "postgres" ? Op.iLike : Op.like;
    const where = {};

    if (!all) {
      where.is_active = true;
    }

    const groupRecordCondition = {
      name_en: null,
      code: null,
      phone: null,
      address: null,
      sales_agent: null,
      sales_agency_id: null,
      [Op.and]: Customer.sequelize.where(
        Customer.sequelize.col("Customer.legal_name"),
        Op.eq,
        Customer.sequelize.col("Customer.name")
      ),
    };

    where[Op.and] = [...(where[Op.and] ?? []), { [Op.not]: groupRecordCondition }];

    if (q) {
      const variants = buildSearchVariants(q);
      const orConditions = [];

      variants.forEach((variant) => {
        orConditions.push(
          { name: { [likeOperator]: `%${variant}%` } },
          { legal_name: { [likeOperator]: `%${variant}%` } },
          { name_en: { [likeOperator]: `%${variant}%` } },
          { code: { [likeOperator]: `%${variant}%` } },
          { phone: { [likeOperator]: `%${variant}%` } },
          { address: { [likeOperator]: `%${variant}%` } },
          { sales_agent: { [likeOperator]: `%${variant}%` } },
          { "$salesAgency.name$": { [likeOperator]: `%${variant}%` } }
        );
      });

      if (orConditions.length > 0) {
        where[Op.or] = orConditions;
      }
    }

    const customerGroupColumns = Object.values(Customer.rawAttributes).map(
      (attribute) => `Customer.${attribute.field || attribute.fieldName || attribute.field}`
    );

    const rows = await Customer.findAll({
      where,
      order: [["id", "DESC"]],
      limit: pageSize,
      offset,
      subQuery: false,
      include: [
        {
          model: Machine,
          attributes: [],
          required: false,
        },
        {
          model: SalesAgency,
          as: "salesAgency",
          attributes: ["id", "name"],
          required: false,
        },
      ],
      attributes: {
        include: [
          [
            Customer.sequelize.fn("COUNT", Customer.sequelize.col("Machines.id")),
            "machine_count",
          ],
        ],
      },
      group: [...customerGroupColumns, "salesAgency.id", "salesAgency.name"],
    });

    const count = await Customer.count({
      where,
      distinct: true,
      include: [
        {
          model: SalesAgency,
          as: "salesAgency",
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
 * GET /api/customers/:id/machines
 * 고객사에 연결된 장비 목록
 */
router.get("/:id/machines", requireAuth, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: "Not found" });

    const rows = await Machine.findAll({
      where: { customer_id: customer.id },
      order: [["id", "DESC"]],
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/customers/:id/attachments
 * 고객사 첨부파일 목록
 */
router.get("/:id/attachments", requireAuth, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: "Not found" });

    const rows = await CustomerAttachment.findAll({
      where: { customer_id: customer.id },
      order: [["id", "DESC"]],
    });

    res.json(rows.map(serializeAttachment));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/customers/:id/attachments
 * 고객사 첨부파일 업로드
 */
router.post(
  "/:id/attachments",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const customer = await Customer.findByPk(req.params.id);
      if (!customer) return res.status(404).json({ message: "Not found" });
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }

      const attachment = await CustomerAttachment.create({
        customer_id: customer.id,
        file_name: req.file.originalname,
        label: sanitizeAttachmentLabel(req.body?.label),
        file_url: `/uploads/customers/${req.file.filename}`,
        mime_type: req.file.mimetype,
        size: req.file.size,
        uploaded_by_employee_id: req.user?.id ?? null,
      });

      res.status(201).json(serializeAttachment(attachment));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

const deleteCustomerAttachment = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: "Not found" });

    const attachmentId =
      req.params.attachmentId ||
      req.query.attachment_id ||
      req.body?.attachment_id;

    if (!attachmentId) {
      return res.status(400).json({ message: "attachment_id is required" });
    }

    const attachment = await CustomerAttachment.findOne({
      where: { id: attachmentId, customer_id: customer.id },
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
 * DELETE /api/customers/:id/attachments
 */
router.delete("/:id/attachments", requireAuth, deleteCustomerAttachment);

/**
 * DELETE /api/customers/:id/attachments/:attachmentId
 */
router.delete(
  "/:id/attachments/:attachmentId",
  requireAuth,
  deleteCustomerAttachment,
);

/**
 * GET /api/customers/:id
 * 고객사 상세 (연결 장비 포함)
 */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const row = await Customer.findByPk(req.params.id, {
      include: [
        {
          model: Machine,
          attributes: ["id", "name", "model", "is_active"],
        },
        {
          model: SalesAgency,
          as: "salesAgency",
          attributes: ["id", "name"],
        },
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
 * POST /api/customers
 * 고객사 등록
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      name,
      legal_name,
      name_en,
      code,
      phone,
      address,
      is_active,
      sales_agent,
      sales_agency_id,
      group_id,
    } = req.body;

    const trimmedLegalName = legal_name?.trim() || null;
    const resolvedName = name?.trim() || trimmedLegalName;

    if (!resolvedName) {
      return res.status(400).json({ message: "name or legal_name is required" });
    }

    let resolvedGroupId = null;
    if (group_id !== undefined && group_id !== null) {
      const group = await CustomerGroup.findByPk(group_id);
      if (!group) {
        return res.status(400).json({ message: "Invalid group_id" });
      }
      resolvedGroupId = group.id;
    }

    let resolvedSalesAgencyId = null;
    if (sales_agency_id !== undefined && sales_agency_id !== null) {
      const salesAgency = await SalesAgency.findByPk(sales_agency_id);
      if (!salesAgency) {
        return res.status(400).json({ message: "Invalid sales_agency_id" });
      }
      resolvedSalesAgencyId = salesAgency.id;
    }

    const row = await Customer.create({
      name: resolvedName,
      legal_name: trimmedLegalName,
      name_en: name_en || null,
      code: code || null,
      phone: phone || null,
      address: address || null,
      sales_agent: sales_agent || null,
      sales_agency_id: resolvedSalesAgencyId,
      is_active: is_active ?? true,
      group_id: resolvedGroupId,
    });

    await logAuditEvent({
      req,
      entityType: "customer",
      entityId: row.id,
      action: "create",
      before: null,
      after: row.toJSON(),
    });

    res.status(201).json(row);
  } catch (err) {
    console.error(err);

    // unique 에러 처리(중복)
    if (err?.name === "SequelizeUniqueConstraintError") {
      const sqlMessage = err?.original?.sqlMessage || "";
      if (sqlMessage.includes("uq_customers_code")) {
        return res.status(409).json({ message: "고객사 코드 중복" });
      }
      return res.status(409).json({ message: "Duplicate customer data" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/customers/:id
 * 고객사 수정
 */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const row = await Customer.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const {
      name,
      legal_name,
      name_en,
      code,
      phone,
      address,
      is_active,
      sales_agent,
      sales_agency_id,
      group_id,
    } = req.body;

    const before = row.toJSON();
    const trimmedLegalName = legal_name?.trim();
    const resolvedName =
      name?.trim() ??
      trimmedLegalName ??
      row.name;

    let resolvedGroupId = row.group_id;
    if (group_id !== undefined) {
      if (group_id === null) {
        resolvedGroupId = null;
      } else {
        const group = await CustomerGroup.findByPk(group_id);
        if (!group) {
          return res.status(400).json({ message: "Invalid group_id" });
        }
        resolvedGroupId = group.id;
      }
    }

    let resolvedSalesAgencyId = row.sales_agency_id;
    if (sales_agency_id !== undefined) {
      if (sales_agency_id === null) {
        resolvedSalesAgencyId = null;
      } else {
        const salesAgency = await SalesAgency.findByPk(sales_agency_id);
        if (!salesAgency) {
          return res.status(400).json({ message: "Invalid sales_agency_id" });
        }
        resolvedSalesAgencyId = salesAgency.id;
      }
    }

    await row.update({
      name: resolvedName,
      legal_name: legal_name !== undefined ? trimmedLegalName || null : row.legal_name,
      name_en: name_en !== undefined ? name_en : row.name_en,
      code: code ?? row.code,
      phone: phone ?? row.phone,
      address: address ?? row.address,
      sales_agent: sales_agent !== undefined ? sales_agent : row.sales_agent,
      sales_agency_id: resolvedSalesAgencyId,
      is_active: is_active ?? row.is_active,
      group_id: resolvedGroupId,
    });

    await logAuditEvent({
      req,
      entityType: "customer",
      entityId: row.id,
      action: "update",
      before,
      after: row.toJSON(),
    });

    res.json(row);
  } catch (err) {
    console.error(err);
    if (err?.name === "SequelizeUniqueConstraintError") {
      const sqlMessage = err?.original?.sqlMessage || "";
      if (sqlMessage.includes("uq_customers_code")) {
        return res.status(409).json({ message: "고객사 코드 중복" });
      }
      return res.status(409).json({ message: "Duplicate customer data" });
    }
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/customers/:id
 * 고객사 삭제
 */
// router.delete("/:id",requireAuth, async (req, res) => {
//   try {
//     const row = await Customer.findByPk(req.params.id);
//     if (!row) return res.status(404).json({ message: "Not found" });

//     await row.destroy();
//     res.json({ ok: true });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const row = await Customer.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const before = row.toJSON();
    await row.update({ is_active: false });

    await logAuditEvent({
      req,
      entityType: "customer",
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
    const row = await Customer.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const before = row.toJSON();
    await row.update({ is_active: true });

    await logAuditEvent({
      req,
      entityType: "customer",
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
