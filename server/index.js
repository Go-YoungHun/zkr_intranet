require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const sequelize = require("./src/config/db");
const { verifyCustomerNameFields } = require("./src/utils/verifySchema");

// ✅ 모델/관계 로드는 명시적으로
require("./src/models/index");

const authRoutes = require("./src/routes/authRoutes");
const customerRoutes = require("./src/routes/customerRoutes");
const customerGroupRoutes = require("./src/routes/customerGroupRoutes");
const machineModelRoutes = require("./src/routes/machineModelRoutes");
const machineRoutes = require("./src/routes/machineRoutes");
const employeeRoutes = require("./src/routes/employeeRoutes"); // ✅ 추가
const ticketRoutes = require("./src/routes/ticketRoutes");
const inventoryRoutes = require("./src/routes/inventoryRoutes");
const boardRoutes = require("./src/routes/boardRoutes");
const salesAgencyRoutes = require("./src/routes/salesAgencyRoutes");
const leaveRoutes = require("./src/routes/leaveRoutes");
const auditLogRoutes = require("./src/routes/auditLogRoutes");
const app = express();
const CLIENT_BUILD_PATH = path.join(__dirname, "../client/dist");

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ routes
app.use("/api/auth", authRoutes);
app.use("/api/customers/groups", customerGroupRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/machine-models", machineModelRoutes);
app.use("/api/machines", machineRoutes);
app.use("/api/employees", employeeRoutes); // ✅ 추가
app.use("/api/tickets", ticketRoutes);
app.use("/api/inventories", inventoryRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/sales-agencies", salesAgencyRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/audit-logs", auditLogRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(CLIENT_BUILD_PATH));
  app.get(/^(?!\/api\/|\/uploads\/).*/, (req, res) => {
    return res.sendFile(path.join(CLIENT_BUILD_PATH, "index.html"));
  });
}
app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ ok: true, db: "connected" });
  } catch (e) {
    res.status(500).json({
      ok: false,
      db: "failed",
      error: String(e.message || e),
    });
  }
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await sequelize.authenticate();
  await verifyCustomerNameFields(sequelize);
  app.listen(PORT, () => console.log(`✅ Server http://localhost:${PORT}`));
};

startServer().catch((error) => {
  console.error("❌ Server startup failed:", error);
  process.exit(1);
});
