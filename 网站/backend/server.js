require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");

const pool = require("./db");
const { SESSION_COOKIE } = require("./config");

// 引入路由
const authRouter = require("./routes/auth");
const recordsRouter = require("./routes/records");

// 引入错误处理
const { apiNotFound, errorHandler } = require("./middleware/errors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "16kb" }));

app.use(
  session({
    name: SESSION_COOKIE,
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

// --- API 路由 ---
app.use("/api", authRouter);
app.use("/api/records", recordsRouter); // <--- 核心就在这行，挂载成绩接口

// 健康检查
app.get("/api/health", async (req, res) => {
  let dbStatus = false;
  try {
    await pool.execute("SELECT VERSION()");
    dbStatus = true;
  } catch (e) {}
  res.json({ ok: true, database: dbStatus });
});

// 排行榜
const { getLeaderboard } = require("./services/ranking");
app.get("/api/leaderboard", async (req, res, next) => {
  try {
    const size = Number(req.query.size) || 3;
    const data = await getLeaderboard(size, req.session.userId);
    res.json({ ok: true, ...data });
  } catch (error) {
    next(error);
  }
});

// --- 静态文件 ---
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (req, res) => res.redirect("/index.html"));

// --- 错误处理 ---
app.use("/api", apiNotFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🎮 服务已启动： http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `❌ 错误：端口 ${PORT} 被占用，请关闭其他运行的项目或重启电脑！`,
    );
  } else {
    console.error("❌ 服务器启动失败：", err);
  }
});
