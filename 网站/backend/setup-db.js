/**
 * 一键初始化 MySQL 数据库：创建数据库 + 数据表 + 约束
 * 用法：npm run setup-db
 */
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

/**
 * 已存在的旧表不会被 CREATE TABLE IF NOT EXISTS 修改，
 * 这里为 puzzle_records 补齐 MySQL 8 的 CHECK 约束（幂等）。
 */
async function ensureCheckConstraints(connection, dbName) {
  const constraints = [
    ["chk_puzzle_size", "size IN (3, 4, 5)"],
    ["chk_puzzle_moves", "moves > 0"],
    ["chk_puzzle_duration", "duration_ms > 0"],
  ];

  const [rows] = await connection.query(
    `SELECT CONSTRAINT_NAME AS name
       FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'puzzle_records'
        AND CONSTRAINT_TYPE = 'CHECK'`,
    [dbName],
  );
  const existing = new Set(rows.map((row) => row.name));

  for (const [name, expression] of constraints) {
    if (existing.has(name)) continue;
    try {
      await connection.query(
        `ALTER TABLE puzzle_records ADD CONSTRAINT \`${name}\` CHECK (${expression})`,
      );
      console.log(`   + 已补充 CHECK 约束：${name}`);
    } catch (error) {
      console.warn(`   ! 跳过约束 ${name}：${error.message}`);
    }
  }
}

async function main() {
  const dbName = process.env.DB_NAME || "login_demo";
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
    throw new Error(`DB_NAME 不合法：${dbName}`);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
  });

  const [versionRows] = await connection.query("SELECT VERSION() AS version");
  console.log(`连接到 MySQL ${versionRows[0].version}`);

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.query(`USE \`${dbName}\``);

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await connection.query(schema);
  await ensureCheckConstraints(connection, dbName);

  const [tables] = await connection.query("SHOW TABLES");
  const names = tables.map((row) => Object.values(row)[0]);
  console.log(`✅ 数据库 ${dbName} 初始化完成（MySQL ${versionRows[0].version}）`);
  console.log(`   数据表：${names.join("、")}`);

  await connection.end();
}

main().catch((error) => {
  console.error("❌ 数据库初始化失败：", error.message);
  console.error("   请检查 backend/.env 中的 MySQL 配置，并确认 MySQL 服务已启动。");
  process.exit(1);
});
