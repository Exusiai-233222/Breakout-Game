/**
 * 请求参数校验与用户信息序列化
 */

// 用户名：3~20 位，支持中文、字母、数字、下划线
const USERNAME_RE = /^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateUsername(value) {
  const username = toText(value);
  if (!username) return { ok: false, error: "请输入用户名" };
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: "用户名需为 3~20 位中文、字母、数字或下划线" };
  }
  return { ok: true, value: username };
}

function validatePassword(value) {
  const password = typeof value === "string" ? value : "";
  if (!password) return { ok: false, error: "请输入密码" };
  if (password.length < 6) return { ok: false, error: "密码至少 6 位" };
  if (password.length > 64) return { ok: false, error: "密码不能超过 64 位" };
  return { ok: true, value: password };
}

function validateEmail(value, { optional = false } = {}) {
  const email = toText(value).toLowerCase();
  if (!email) {
    return optional ? { ok: true, value: "" } : { ok: false, error: "请输入邮箱" };
  }
  if (email.length > 100 || !EMAIL_RE.test(email)) {
    return { ok: false, error: "邮箱格式不正确" };
  }
  return { ok: true, value: email };
}

/** 数据库行 -> 前端用户对象（绝不返回 password_hash） */
function mapUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    createdAt: row.created_at,
  };
}

module.exports = { validateUsername, validatePassword, validateEmail, mapUser, toText };
