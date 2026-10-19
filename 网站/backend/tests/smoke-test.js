/**
 * 接口冒烟测试：注册 → 登录态 → 提交成绩 → 排行榜 → 修改密码 → 重新登录 → 退出
 *
 * 使用前请先启动服务（npm start），然后运行：
 *   npm run smoke
 * 测试会创建临时用户，结束后自动删除。
 */
require("dotenv").config({ quiet: true });
const mysql = require("mysql2/promise");

const BASE_URL = process.env.TEST_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failed += 1;
    console.error(`  ❌ ${name}${detail ? `\n     ${detail}` : ""}`);
  }
}

function getCookie(response) {
  const raw = response.headers.get("set-cookie");
  return raw ? raw.split(";")[0] : null;
}

async function call(path, { method = "GET", body, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data, cookie: getCookie(response) };
}

async function main() {
  const suffix = Math.random().toString(36).slice(2, 8);
  const username = `test_${suffix}`;
  const email = `${username}@example.com`;
  const password = "test123456";
  const newPassword = "test654321";

  console.log(`\n接口测试目标：${BASE_URL}\n临时用户：${username}\n`);

  console.log("1. 基础接口");
  const health = await call("/api/health");
  check("服务健康检查返回 200", health.status === 200 && health.data.ok);
  check(
    "健康检查确认已连接 MySQL",
    health.data.database === true && /^\d+\.\d+/.test(String(health.data.mysql)),
    JSON.stringify(health.data),
  );

  const guestMe = await call("/api/me");
  check("未登录访问 /api/me 返回 401", guestMe.status === 401);

  console.log("2. 注册与登录态");
  const register = await call("/api/register", {
    method: "POST",
    body: { username, email, password },
  });
  check("注册成功返回 201", register.status === 201, JSON.stringify(register.data));
  check("注册后下发会话 Cookie", Boolean(register.cookie));

  const duplicate = await call("/api/register", {
    method: "POST",
    body: { username, email, password },
  });
  check("重复用户名注册返回 409", duplicate.status === 409);

  const shortPassword = await call("/api/register", {
    method: "POST",
    body: { username: `x_${suffix}`, password: "123" },
  });
  check("弱密码被拒绝（400）", shortPassword.status === 400);

  const me = await call("/api/me", { cookie: register.cookie });
  check("登录态读取当前用户", me.status === 200 && me.data.user.username === username);

  console.log("3. 成绩与排名");
  const record1 = await call("/api/records", {
    method: "POST",
    cookie: register.cookie,
    body: { size: 3, moves: 48, durationMs: 12500 },
  });
  check("提交成绩返回 201", record1.status === 201, JSON.stringify(record1.data));
  check(
    "第一次成绩为个人最佳",
    record1.data.isBest === true && record1.data.rank.bestMs === 12500,
  );
  check("返回个人名次", typeof record1.data.rank.rank === "number");

  const record2 = await call("/api/records", {
    method: "POST",
    cookie: register.cookie,
    body: { size: 3, moves: 36, durationMs: 9800 },
  });
  check("更快的成绩刷新个人最佳", record2.data.rank.bestMs === 9800);
  check(
    "最佳成绩取用时最短的一次",
    record2.data.rank.bestMoves === 36,
  );

  const slowRecord = await call("/api/records", {
    method: "POST",
    cookie: register.cookie,
    body: { size: 3, moves: 60, durationMs: 30000 },
  });
  check("较慢成绩不覆盖个人最佳", slowRecord.data.rank.bestMs === 9800);

  const badSize = await call("/api/records", {
    method: "POST",
    cookie: register.cookie,
    body: { size: 7, moves: 30, durationMs: 9000 },
  });
  check("非法难度被拒绝（400）", badSize.status === 400);

  const badDuration = await call("/api/records", {
    method: "POST",
    cookie: register.cookie,
    body: { size: 4, moves: 30, durationMs: 10 },
  });
  check("非法用时被拒绝（400）", badDuration.status === 400);

  const anonymousRecord = await call("/api/records", {
    method: "POST",
    body: { size: 3, moves: 30, durationMs: 9000 },
  });
  check("未登录不能提交成绩（401）", anonymousRecord.status === 401);

  const mine = await call("/api/records/me", { cookie: register.cookie });
  check("个人成绩接口返回 200", mine.status === 200);
  check("个人成绩含三档难度", Array.isArray(mine.data.stats) && mine.data.stats.length === 3);
  check(
    "3×3 最佳成绩为 9.8 秒",
    mine.data.stats.find((s) => s.size === 3)?.bestMs === 9800,
  );
  check("最近记录包含 3 条成绩", mine.data.records.length === 3);

  const leaderboard = await call("/api/leaderboard?size=3", { cookie: register.cookie });
  check("排行榜返回 200", leaderboard.status === 200);
  check("排行榜有成绩条目", Array.isArray(leaderboard.data.entries) && leaderboard.data.entries.length > 0);
  check("排行榜标记出本人", leaderboard.data.entries.some((entry) => entry.isMe));
  check("排行榜按用时升序排列", leaderboard.data.entries[0].durationMs <= leaderboard.data.entries.at(-1).durationMs);

  const emptyBoard = await call("/api/leaderboard?size=5", { cookie: register.cookie });
  check("无成绩时的排行榜正常返回", emptyBoard.status === 200);

  console.log("4. 修改密码");
  const wrongOld = await call("/api/password", {
    method: "POST",
    cookie: register.cookie,
    body: { oldPassword: "wrong-password", newPassword },
  });
  check("原密码错误被拒绝（400）", wrongOld.status === 400);

  const samePassword = await call("/api/password", {
    method: "POST",
    cookie: register.cookie,
    body: { oldPassword: password, newPassword: password },
  });
  check("新旧密码相同被拒绝（400）", samePassword.status === 400);

  const changePassword = await call("/api/password", {
    method: "POST",
    cookie: register.cookie,
    body: { oldPassword: password, newPassword },
  });
  check("修改密码成功", changePassword.status === 200 && changePassword.data.ok);

  console.log("5. 退出与重新登录");
  const logout = await call("/api/logout", { method: "POST", cookie: register.cookie });
  check("退出登录成功", logout.status === 200);

  const afterLogout = await call("/api/me", { cookie: register.cookie });
  check("退出后会话失效（401）", afterLogout.status === 401);

  const oldLogin = await call("/api/login", {
    method: "POST",
    body: { username, password },
  });
  check("旧密码无法登录（401）", oldLogin.status === 401);

  const newLogin = await call("/api/login", {
    method: "POST",
    body: { username, password: newPassword },
  });
  check("新密码登录成功", newLogin.status === 200 && newLogin.data.user.username === username);

  const wrongLogin = await call("/api/login", {
    method: "POST",
    body: { username, password: password },
  });
  check("错误密码登录失败（401）", wrongLogin.status === 401);

  const newMe = await call("/api/me", { cookie: newLogin.cookie });
  check("新会话可读取当前用户", newMe.status === 200 && newMe.data.user.username === username);

  console.log("\n6. 前端页面可访问性");
  for (const page of ["/", "/game.html", "/leaderboard.html", "/profile.html"]) {
    const response = await fetch(`${BASE_URL}${page}`);
    check(`页面 ${page} 返回 200`, response.status === 200);
  }

  // 清理测试数据（外键级联会一并删除成绩）
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "login_demo",
  });
  await connection.execute("DELETE FROM users WHERE username = ?", [username]);
  await connection.end();

  console.log(`\n结果：通过 ${passed} 项，失败 ${failed} 项\n`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error("\n❌ 测试执行失败：", error.message);
  process.exit(1);
});
