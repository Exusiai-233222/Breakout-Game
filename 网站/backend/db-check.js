/**
 * MySQL 连接自检：npm run db:check
 * 输出 MySQL 版本、数据库、数据表与行数，用于确认后端真实连接到 MySQL。
 */
require("dotenv").config({ quiet: true });
const pool = require("./db");

const HOST = process.env.DB_HOST || "localhost";
const PORT = Number(process.env.DB_PORT) || 3306;

async function main() {
  const [versionRows] = await pool.query(
    "SELECT VERSION() AS version, DATABASE() AS db, @@character_set_database AS charset",
  );
  const { version, db, charset } = versionRows[0];

  console.log("┌─ MySQL 连接信息 ─────────────────────────────");
  console.log(`│ 驱动： mysql2（Node.js 连接池）`);
  console.log(`│ 版本： MySQL ${version}`);
  console.log(`│ 地址： ${HOST}:${PORT}`);
  console.log(`│ 数据库： ${db}（${charset}）`);
  console.log("└──────────────────────────────────────────────");

  const [tables] = await pool.query(
    `SELECT TABLE_NAME AS name
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME`,
    [db],
  );

  if (tables.length === 0) {
    console.log("\n⚠️  数据库中没有数据表，请运行 npm run setup-db");
    process.exitCode = 1;
    return;
  }

  console.log("\n数据表：");
  for (const table of tables) {
    // 表名来自当前库的 information_schema，仅做反引号包裹
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${table.name}\``);
    console.log(`  • ${table.name}（${countRows[0].total} 行）`);
  }

  console.log("\n✅ MySQL 连接正常");
}

main()
  .catch((error) => {
    console.error(`❌ 无法连接 MySQL：${error.code ? `${error.code} ` : ""}${error.message}`);
    console.error("   请确认 MySQL 服务已启动，并检查 backend/.env 配置。");
    console.error("   首次使用请运行 npm run setup-db。");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
