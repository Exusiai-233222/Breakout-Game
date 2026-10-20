/**
 * 可选脚本：生成 / 清除排行榜演示数据
 * 平时做实验、截图时可以让排行榜更好看，不影响正式功能。
 *
 * 用法（在 backend 目录执行）：
 *   node seed-demo.js           生成 6 个演示账号及成绩（密码均为 demo123456）
 *   node seed-demo.js --clear   清除所有演示账号（成绩会一并删除）
 */
require("dotenv").config({ quiet: true });
const bcrypt = require("bcrypt");
const pool = require("./db");

const DEMO_PASSWORD = "demo123456";

// [难度, 步数, 用时(毫秒)]
const DEMO_USERS = [
  {
    username: "弹珠小林",
    records: [
      [3, 38, 28900],
      [3, 25, 31200],
      [4, 142, 138000],
      [4, 118, 121400],
      [5, 320, 356000],
    ],
  },
  {
    username: "夜航船",
    records: [
      [3, 44, 33500],
      [4, 160, 168000],
      [4, 150, 155000],
    ],
  },
  {
    username: "苏打水",
    records: [
      [3, 52, 41200],
      [3, 60, 47800],
      [5, 410, 498000],
    ],
  },
  {
    username: "阿祖",
    records: [
      [3, 30, 26400],
      [3, 41, 30100],
      [4, 130, 128000],
    ],
  },
  {
    username: "mika",
    records: [
      [3, 48, 38900],
      [4, 210, 226000],
      [5, 480, 612000],
    ],
  },
  { username: "老王", records: [[4, 175, 189000]] },
];

async function clearDemo() {
  const [result] = await pool.execute(
    "DELETE FROM users WHERE email LIKE '%@demo.local'",
  );
  console.log(`🧹 已清除 ${result.affectedRows} 个演示账号及其成绩`);
}

async function seedDemo() {
  for (const demo of DEMO_USERS) {
    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE username = ?",
      [demo.username],
    );
    let userId = existing[0]?.id;

    if (!userId) {
      const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
      const [result] = await pool.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        [demo.username, `${demo.username}@demo.local`, hash],
      );
      userId = result.insertId;
    }

    await pool.execute("DELETE FROM puzzle_records WHERE user_id = ?", [
      userId,
    ]);
    for (const [size, moves, durationMs] of demo.records) {
      await pool.execute(
        "INSERT INTO puzzle_records (user_id, size, moves, duration_ms) VALUES (?, ?, ?, ?)",
        [userId, size, moves, durationMs],
      );
    }
  }

  console.log("✅ 演示数据已生成");
  console.log(
    `   演示账号：${DEMO_USERS.map((user) => user.username).join("、")}`,
  );
  console.log(`   统一密码：${DEMO_PASSWORD}`);
  console.log("   清除命令：node seed-demo.js --clear");
}

(async () => {
  try {
    if (process.argv.includes("--clear")) {
      await clearDemo();
    } else {
      await seedDemo();
    }
  } catch (error) {
    console.error("❌ 操作失败：", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
