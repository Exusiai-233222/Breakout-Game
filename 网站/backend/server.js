require("dotenv").config({ quiet: true });
const path = require("path");
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const pool = require("./db");
const { testConnection } = pool;
const authRoutes = require("./routes/auth");
const recordRoutes = require("./routes/records");
const { apiNotFound, errorHandler } = require("./middleware/errors");
const { SESSION_COOKIE } = require("./config");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

if (!process.env.SESSION_SECRET) {
  console.warn("⚠️  未配置 SESSION_SECRET，请尽快修改 backend/.env");
}

app.disable("x-powered-by");

// 允许用 VS Code Live Server（5500 端口）打开前端时跨域携带 Cookie
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "16kb" }));

app.use(
  session({
    name: SESSION_COOKIE,
    secret: process.env.SESSION_SECRET || "dev-only-insecure-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // 本地 http 调试；上线 https 时应改为 true
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天免登录
    },
  }),
);

// 接口响应不缓存，避免拿到过期登录态
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/api/health", async (req, res) => {
  let database = false;
  let mysqlVersion = null;

  try {
    const [rows] = await pool.query("SELECT VERSION() AS version");
    database = true;
    mysqlVersion = rows[0].version;
  } catch (error) {
    // 数据库暂时不可用时，接口仍返回服务自身状态
    console.warn("健康检查：MySQL 连接失败 -", error.code || error.message);
  }

  res.json({
    ok: true,
    service: "puzzle-login",
    database,
    mysql: mysqlVersion,
    time: new Date(),
  });
});

app.use("/api", authRoutes);
app.use("/api", recordRoutes);
app.use("/api", apiNotFound);

// 前端页面（登录、游戏、排行榜、个人中心）
app.use(express.static(FRONTEND_DIR));
app.get("/", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));

app.use((req, res) => {
  res.status(404).type("text/plain; charset=utf-8").send("404 页面不存在");
});

app.use(errorHandler);

async function start() {
  const connected = await testConnection();
  if (!connected) {
    console.warn("⚠️  数据库不可用，登录、注册、成绩功能将无法使用。");
  }

  app.listen(PORT, () => {
    console.log("────────────────────────────────────────────");
    console.log(`🧩 拼图游戏服务已启动： http://localhost:${PORT}`);
    console.log(`   排行榜： http://localhost:${PORT}/leaderboard.html`);
    console.log("────────────────────────────────────────────");
  });
}

start();
