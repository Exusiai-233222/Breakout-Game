/**
 * 成绩与排行榜接口
 *   POST /api/records       提交一局完成成绩
 *   GET  /api/records/me    我的成绩汇总与最近记录
 *   GET  /api/leaderboard   某个难度的排行榜
 */
const express = require("express");
const pool = require("../db");
const { requireLogin } = require("../middleware/auth");
const { SIZES, LIMITS, LEADERBOARD_LIMIT } = require("../config");
const { getBoard, getUserStats, getRecentRecords } = require("../services/ranking");
const { mapUser } = require("../utils/validate");

const router = express.Router();

function toInt(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function normalizeSize(raw) {
  const size = toInt(raw);
  return SIZES.includes(size) ? size : null;
}

/** 提交成绩 */
router.post("/records", requireLogin, async (req, res, next) => {
  try {
    const size = normalizeSize(req.body.size);
    const moves = toInt(req.body.moves);
    const durationMs = toInt(req.body.durationMs);

    if (!size) {
      return res.status(400).json({ error: "难度不合法" });
    }
    if (moves === null || moves < LIMITS.MIN_MOVES || moves > LIMITS.MAX_MOVES) {
      return res.status(400).json({ error: "步数不合法，成绩未保存" });
    }
    if (
      durationMs === null ||
      durationMs < LIMITS.MIN_DURATION_MS ||
      durationMs > LIMITS.MAX_DURATION_MS
    ) {
      return res.status(400).json({ error: "完成时间不合法，成绩未保存" });
    }

    const userId = req.session.userId;

    // 提交前的最佳成绩，用于判断是否刷新个人记录
    const [prevRows] = await pool.execute(
      "SELECT MIN(duration_ms) AS best FROM puzzle_records WHERE user_id = ? AND size = ?",
      [userId, size],
    );
    const previousBest = prevRows[0].best === null ? null : Number(prevRows[0].best);

    const [result] = await pool.execute(
      "INSERT INTO puzzle_records (user_id, size, moves, duration_ms) VALUES (?, ?, ?, ?)",
      [userId, size, moves, durationMs],
    );

    const board = await getBoard(size);
    const me = board.find((entry) => entry.userId === userId) || null;

    res.status(201).json({
      ok: true,
      record: { id: result.insertId, size, moves, durationMs, completedAt: new Date() },
      isBest: previousBest === null || durationMs < previousBest,
      rank: {
        rank: me ? me.rank : null,
        total: board.length,
        bestMs: me ? me.durationMs : durationMs,
        bestMoves: me ? me.moves : moves,
      },
    });
  } catch (error) {
    next(error);
  }
});

/** 我的成绩：三档难度的最佳成绩 / 名次 / 次数 + 最近记录 */
router.get("/records/me", requireLogin, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, username, email, created_at FROM users WHERE id = ?",
      [req.session.userId],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "账号不存在，请重新登录" });
    }

    const [stats, records] = await Promise.all([
      getUserStats(req.session.userId),
      getRecentRecords(req.session.userId),
    ]);

    res.json({ ok: true, user: mapUser(rows[0]), stats, records });
  } catch (error) {
    next(error);
  }
});

/** 排行榜：默认 3×3，可传 ?size=4 */
router.get("/leaderboard", async (req, res, next) => {
  try {
    const size = normalizeSize(req.query.size) || 3;
    const board = await getBoard(size);
    const userId = req.session.userId || null;

    const entries = board.slice(0, LEADERBOARD_LIMIT).map((entry) => ({
      rank: entry.rank,
      username: entry.username,
      durationMs: entry.durationMs,
      moves: entry.moves,
      completedAt: entry.completedAt,
      isMe: entry.userId === userId,
    }));

    const mine = userId ? board.find((entry) => entry.userId === userId) : null;

    res.json({
      ok: true,
      size,
      total: board.length,
      entries,
      me: mine
        ? {
            rank: mine.rank,
            username: mine.username,
            durationMs: mine.durationMs,
            moves: mine.moves,
            completedAt: mine.completedAt,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
