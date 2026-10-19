/**
 * 命令行修改密码工具（忘记密码时的备用手段）
 * 用法：node change-password.js <用户名> <新密码>
 * 示例：node change-password.js 123456 654321
 */
const bcrypt = require("bcrypt");
const pool = require("./db");

const [username, newPassword] = process.argv.slice(2);

if (!username || !newPassword) {
  console.error("用法：node change-password.js <用户名> <新密码>");
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error("❌ 新密码至少 6 位");
  process.exit(1);
}

(async () => {
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    const [result] = await pool.execute(
      "UPDATE users SET password_hash = ? WHERE username = ?",
      [hash, username],
    );

    if (result.affectedRows === 0) {
      console.error(`❌ 用户 ${username} 不存在`);
      process.exitCode = 1;
    } else {
      console.log(`✅ 用户 ${username} 的密码已重置为：${newPassword}`);
    }
  } catch (error) {
    console.error("❌ 修改失败：", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
