const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { BoardPost, BoardAttachment, Employee } = require("../models");
const { requireAuth } = require("../middlewares/auth");
const { logAuditEvent } = require("../utils/auditLogger");
const { sanitizeHtml } = require("../utils/sanitizeHtml");

const router = express.Router();

const uploadsRoot = path.join(__dirname, "..", "..", "uploads", "boards");
fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, "_") || "file";
    cb(null, `${Date.now()}_${safeBase}${ext}`);
  },
});

const upload = multer({ storage });
const allowedTypes = ["notice", "resource"];

const normalizeBoardType = (value) => {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  if (!allowedTypes.includes(normalized)) return null;
  return normalized;
};

const getBoardType = (req, res) => {
  const boardType = normalizeBoardType(req.params.type);
  if (!boardType) {
    res.status(400).json({ message: "Invalid board type" });
    return null;
  }
  return boardType;
};

/**
 * GET /api/boards/:type/posts
 * 게시판 목록
 */
router.get("/:type/posts", requireAuth, async (req, res) => {
  try {
    const boardType = getBoardType(req, res);
    if (!boardType) return;

    const rows = await BoardPost.findAll({
      where: { board_type: boardType },
      include: [{ model: Employee, as: "author", attributes: ["id", "name", "login_id"] }],
      order: [
        ["created_at", "DESC"],
        ["id", "DESC"],
      ],
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/boards/:type/posts/:id
 * 게시판 상세
 */
router.get("/:type/posts/:id", requireAuth, async (req, res) => {
  try {
    const boardType = getBoardType(req, res);
    if (!boardType) return;

    const row = await BoardPost.findOne({
      where: { id: req.params.id, board_type: boardType },
      include: [{ model: Employee, as: "author", attributes: ["id", "name", "login_id"] }],
    });

    if (!row) return res.status(404).json({ message: "Not found" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/boards/:type/posts/:id/attachments
 * 게시판 첨부파일 목록
 */
router.get("/:type/posts/:id/attachments", requireAuth, async (req, res) => {
  try {
    const boardType = getBoardType(req, res);
    if (!boardType) return;

    const post = await BoardPost.findOne({
      where: { id: req.params.id, board_type: boardType },
    });
    if (!post) return res.status(404).json({ message: "Not found" });

    const rows = await BoardAttachment.findAll({
      where: { board_post_id: post.id },
      order: [["id", "DESC"]],
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/boards/:type/posts
 * 게시판 등록
 */
router.post("/:type/posts", requireAuth, async (req, res) => {
  try {
    const boardType = getBoardType(req, res);
    if (!boardType) return;

    const { title, content } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }

    const sanitizedContent = sanitizeHtml(content);

    const row = await BoardPost.create({
      board_type: boardType,
      title: title.trim(),
      content: sanitizedContent,
      author_id: req.user?.id ?? null,
    });

    await logAuditEvent({
      req,
      entityType: "board_post",
      entityId: row.id,
      action: "create",
      before: null,
      after: row.toJSON(),
      onBehalfOfEmployeeId: row.author_id ?? null,
    });

    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/boards/:type/posts/:id/attachments
 * 게시판 첨부파일 업로드
 */
router.post("/:type/posts/:id/attachments", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const boardType = getBoardType(req, res);
    if (!boardType) return;

    const post = await BoardPost.findOne({
      where: { id: req.params.id, board_type: boardType },
    });
    if (!post) return res.status(404).json({ message: "Not found" });
    if (!req.file) return res.status(400).json({ message: "File is required" });

    const attachment = await BoardAttachment.create({
      board_post_id: post.id,
      file_name: req.file.originalname,
      file_url: `/uploads/boards/${req.file.filename}`,
      mime_type: req.file.mimetype,
      size: req.file.size,
      uploaded_by_employee_id: req.user?.id ?? null,
    });

    await logAuditEvent({
      req,
      entityType: "board_attachment",
      entityId: attachment.id,
      action: "create",
      before: null,
      after: attachment.toJSON(),
      onBehalfOfEmployeeId: post.author_id ?? null,
    });

    res.status(201).json(attachment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/boards/:type/posts/:id
 * 게시판 수정
 */
router.put("/:type/posts/:id", requireAuth, async (req, res) => {
  try {
    const boardType = getBoardType(req, res);
    if (!boardType) return;

    const row = await BoardPost.findOne({
      where: { id: req.params.id, board_type: boardType },
    });
    if (!row) return res.status(404).json({ message: "Not found" });

    const before = row.toJSON();

    const { title, content } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }

    const sanitizedContent = sanitizeHtml(content);

    await row.update({
      title: title.trim(),
      content: sanitizedContent,
    });

    await logAuditEvent({
      req,
      entityType: "board_post",
      entityId: row.id,
      action: "update",
      before,
      after: row.toJSON(),
      onBehalfOfEmployeeId: row.author_id ?? null,
    });

    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/boards/:type/posts/:id/attachments/:attachmentId
 * 게시판 첨부파일 삭제
 */
router.delete("/:type/posts/:id/attachments/:attachmentId", requireAuth, async (req, res) => {
  try {
    const boardType = getBoardType(req, res);
    if (!boardType) return;

    const post = await BoardPost.findOne({
      where: { id: req.params.id, board_type: boardType },
    });
    if (!post) return res.status(404).json({ message: "Not found" });

    const attachment = await BoardAttachment.findOne({
      where: { id: req.params.attachmentId, board_post_id: post.id },
    });
    if (!attachment) return res.status(404).json({ message: "Not found" });

    const before = attachment.toJSON();

    if (attachment.file_url) {
      const filename = path.basename(attachment.file_url);
      const filePath = path.join(uploadsRoot, filename);
      fs.unlink(filePath, () => {});
    }

    await attachment.destroy();

    await logAuditEvent({
      req,
      entityType: "board_attachment",
      entityId: attachment.id,
      action: "delete",
      before,
      after: null,
      onBehalfOfEmployeeId: post.author_id ?? null,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/boards/:type/posts/:id
 * 게시판 삭제
 */
router.delete("/:type/posts/:id", requireAuth, async (req, res) => {
  try {
    const boardType = getBoardType(req, res);
    if (!boardType) return;

    const row = await BoardPost.findOne({
      where: { id: req.params.id, board_type: boardType },
    });

    if (!row) return res.status(404).json({ message: "Not found" });

    const before = row.toJSON();

    await row.destroy();

    await logAuditEvent({
      req,
      entityType: "board_post",
      entityId: row.id,
      action: "delete",
      before,
      after: null,
      onBehalfOfEmployeeId: row.author_id ?? null,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
