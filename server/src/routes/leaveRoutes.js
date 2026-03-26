const express = require("express");
const { LeaveRequest, Employee } = require("../models");
const { requireAuth } = require("../middlewares/auth");
const requireAdmin = require("../middlewares/requireAdmin");
const { logAuditEvent } = require("../utils/auditLogger");

const router = express.Router();
const LEAVE_REASON_MAX_LENGTH = 500;
const DEFAULT_ANNUAL_LEAVE_DAYS = 15;

// 감사로그 체크리스트 (검색키워드: logAuditEvent()
// - POST /api/leaves
// - PATCH /api/leaves/:id/status

function calculateDurationDays(startDate, endDate, leaveUnit) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const oneDayMs = 1000 * 60 * 60 * 24;
  const diffDays = Math.floor((end.getTime() - start.getTime()) / oneDayMs) + 1;

  if (leaveUnit === "half_am" || leaveUnit === "half_pm") return 0.5;
  return diffDays;
}

function validateLeavePayload(payload) {
  const { start_date, end_date, leave_unit, reason } = payload;

  if (!start_date || !end_date || !reason) {
    return "start_date, end_date, reason are required";
  }

  const start = new Date(`${start_date}T00:00:00`);
  const end = new Date(`${end_date}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Invalid date format";
  }

  if (start > end) {
    return "start_date must be less than or equal to end_date";
  }

  if (!["full", "half_am", "half_pm"].includes(leave_unit)) {
    return "leave_unit must be one of full, half_am, half_pm";
  }

  if ((leave_unit === "half_am" || leave_unit === "half_pm") && start_date !== end_date) {
    return "Half-day leave must be a single date";
  }

  if (String(reason).trim().length > LEAVE_REASON_MAX_LENGTH) {
    return `reason must be <= ${LEAVE_REASON_MAX_LENGTH} characters`;
  }

  return null;
}

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const employeeId = Number(req.user?.id);

    const approvedRows = await LeaveRequest.findAll({
      where: { employee_id: employeeId, status: "approved" },
      attributes: ["duration_days"],
    });

    const pendingRows = await LeaveRequest.findAll({
      where: { employee_id: employeeId, status: "pending" },
      attributes: ["duration_days"],
    });

    const usedDays = approvedRows.reduce((sum, row) => sum + Number(row.duration_days), 0);
    const pendingDays = pendingRows.reduce((sum, row) => sum + Number(row.duration_days), 0);

    return res.json({
      total_days: DEFAULT_ANNUAL_LEAVE_DAYS,
      used_days: Number(usedDays.toFixed(1)),
      pending_days: Number(pendingDays.toFixed(1)),
      remaining_days: Number((DEFAULT_ANNUAL_LEAVE_DAYS - usedDays).toFixed(1)),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const isAdmin = Number(req.user?.permission_level) >= 7;
    const where = isAdmin ? {} : { employee_id: Number(req.user.id) };

    const rows = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: Employee,
          as: "requester",
          attributes: ["id", "name", "login_id", "permission_level"],
        },
        {
          model: Employee,
          as: "reviewer",
          attributes: ["id", "name", "login_id"],
        },
      ],
      order: [["id", "DESC"]],
    });

    return res.json(rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const validationError = validateLeavePayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const row = await LeaveRequest.create({
      employee_id: Number(req.user.id),
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      leave_unit: req.body.leave_unit,
      duration_days: calculateDurationDays(req.body.start_date, req.body.end_date, req.body.leave_unit),
      reason: String(req.body.reason).trim(),
      status: "pending",
    });

    await logAuditEvent({
      req,
      entityType: "leave_request",
      entityId: row.id,
      action: "create",
      before: null,
      after: row.toJSON(),
    });

    return res.status(201).json(row);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.patch("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const row = await LeaveRequest.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const { status, review_comment } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be approved or rejected" });
    }

    if (review_comment && String(review_comment).trim().length > LEAVE_REASON_MAX_LENGTH) {
      return res.status(400).json({ message: `review_comment must be <= ${LEAVE_REASON_MAX_LENGTH} characters` });
    }

    const before = row.toJSON();
    await row.update({
      status,
      review_comment: review_comment ? String(review_comment).trim() : null,
      reviewed_by_employee_id: Number(req.user.id),
      reviewed_at: new Date(),
    });

    await logAuditEvent({
      req,
      entityType: "leave_request",
      entityId: row.id,
      action: "update",
      before,
      after: row.toJSON(),
    });

    return res.json(row);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
