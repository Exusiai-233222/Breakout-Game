/**
 * MySQL 连接池（mysql2/promise）
 * 数据库：MySQL 8，字符集 utf8mb4，未使用 SQLite。
 */
const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME || "login_demo",

  // 中文与表情符号统一使用 utf8mb4
  charset: "utf8mb4_unicode_ci",
  timezone: "local",
  decimalNumbers: true,

  // 连接池
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
  maxIdle: Number(process.env.DB_POOL_SIZE) || 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 10000,
};

const pool = mysql.createPool(DB_CONFIG);

/** 启动时检测 MySQL 是否可用 */
async function testConnection() {
  try {
    const [rows] = await pool.query(
      "SELECT VERSION() AS version, DATABASE() AS db, @@port AS port",
    );
    const { version, db, port } = rows[0];
    console.log(`✅ MySQL 连接成功（MySQL ${version} · 数据库 ${db} · 端口 ${port}）`);
    return true;
  } catch (error) {
    console.error(`❌ MySQL 连接失败：${error.code ? `${error.code} ` : ""}${error.message}`);
    console.error(
      `   连接配置：${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}（用户 ${DB_CONFIG.user}）`,
    );
    console.error("   请确认 MySQL 服务已启动并检查 backend/.env；首次使用请运行 npm run setup-db");
    return false;
  }
}

module.exports = pool;
module.exports.testConnection = testConnection;
