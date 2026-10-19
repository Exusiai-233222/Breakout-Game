/**
 * 用户相关接口：注册 / 登录 / 退出 / 当前用户 / 修改密码
 */
const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");
const { requireLogin } = require("../middleware/auth");
const { rateLimit } = require("../middleware/rate-limit");
const { regenerate, save, destroy } = require("../utils/session");
const { validateUsername, validatePassword, validateEmail, mapUser } = require("../utils/validate");
const { SESSION_COOKIE } = require("../config");

const router = express.Router();

// 登录 / 注册限流：同一 IP 10 分钟内最多 60 次
const authLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 60 });

/** 注册：用户名 + 密码（邮箱可选，缺省自动生成） */
router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const nameCheck = validateUsername(req.body.username);
    if (!nameCheck.ok) return res.status(400).json({ error: nameCheck.error });

    const pwdCheck = validatePassword(req.body.password);
    if (!pwdCheck.ok) return res.status(400).json({ error: pwdCheck.error });

    const emailCheck = validateEmail(req.body.email, { optional: true });
    if (!emailCheck.ok) return res.status(400).json({ error: emailCheck.error });

    const username = nameCheck.value;
    const email = emailCheck.value || `${username}@student.local`;

    const hash = await bcrypt.hash(pwdCheck.value, 10);

    const [result] = await pool.execute(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, hash],
    );

    // 注册成功即登录
    await regenerate(req);
    req.session.userId = result.insertId;
    await save(req);

    res.status(201).json({
      ok: true,
      message: "注册成功",
      user: { id: result.insertId, username, email, createdAt: new Date() },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      const field = String(error.message).includes("email") ? "邮箱" : "用户名";
      return res.status(409).json({ error: `${field}已被占用，请换一个` });
    }
    next(error);
  }
});

/** 登录：用户名 + 密码 */
router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!username || !password) {
      return res.status(400).json({ error: "请输入用户名和密码" });
    }

    const [rows] = await pool.execute(
      "SELECT id, username, email, password_hash, created_at FROM users WHERE username = ?",
      [username],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    // 重新生成会话，防止会话固定攻击
    await regenerate(req);
    req.session.userId = user.id;
    await save(req);

    res.json({ ok: true, message: "登录成功", user: mapUser(user) });
  } catch (error) {
    next(error);
  }
});

/** 退出登录 */
router.post("/logout", requireLogin, async (req, res) => {
  try {
    await destroy(req);
  } catch (error) {
    console.error("销毁会话失败：", error.message);
  }
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true, message: "已退出登录" });
});

/** 获取当前登录用户 */
router.get("/me", requireLogin, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, username, email, created_at FROM users WHERE id = ?",
      [req.session.userId],
    );

    if (rows.length === 0) {
      // 用户已被删除，清理失效会话
      await destroy(req);
      return res.status(401).json({ error: "请先登录" });
    }

    res.json({ ok: true, user: mapUser(rows[0]) });
  } catch (error) {
    next(error);
  }
});

/** 修改密码：需要校验原密码 */
router.post("/password", requireLogin, async (req, res, next) => {
  try {
    const oldPassword = typeof req.body.oldPassword === "string" ? req.body.oldPassword : "";
    const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";

    if (!oldPassword) return res.status(400).json({ error: "请输入原密码" });

    const pwdCheck = validatePassword(newPassword);
    if (!pwdCheck.ok) return res.status(400).json({ error: pwdCheck.error });

    const [rows] = await pool.execute(
      "SELECT password_hash FROM users WHERE id = ?",
      [req.session.userId],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "账号不存在，请重新登录" });
    }

    const currentHash = rows[0].password_hash;
    const isValid = await bcrypt.compare(oldPassword, currentHash);
    if (!isValid) {
      return res.status(400).json({ error: "原密码不正确" });
    }

    if (await bcrypt.compare(pwdCheck.value, currentHash)) {
      return res.status(400).json({ error: "新密码不能与原密码相同" });
    }

    const newHash = await bcrypt.hash(pwdCheck.value, 10);
    await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
      newHash,
      req.session.userId,
    ]);

    res.json({ ok: true, message: "密码修改成功，请牢记新密码" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
