const express = require("express");
const pool = require("../db");
const { requireLogin } = require("../middleware/auth");
const { getLeaderboard, getUserStats } = require("../services/ranking");

const router = express.Router();

/** 提交一局成绩 */
router.post("/", requireLogin, async (req, res, next) => {
  try {
    // 接收 level 和 durationMs
    const size = Number(req.body.size) || 3; // 弹珠游戏可以固定传 3
    const level = Number(req.body.level);
    const durationMs = Number(req.body.durationMs);
    const moves = Number(req.body.moves) || 0; // 弹珠游戏没有步数，传0即可

    // 参数校验
    if (!Number.isInteger(level) || level < 1) {
      return res.status(400).json({ error: "关卡数不合法" });
    }
    if (!Number.isInteger(durationMs) || durationMs < 800) {
      return res.status(400).json({ error: "用时太短，疑似作弊" });
    }

    // 查询历史最佳（用于判断是否破纪录）
    // 规则：先看关卡，关卡高更好；同关卡，用时短更好
    const [bestRows] = await pool.execute(
      `SELECT level, duration_ms FROM puzzle_records 
       WHERE user_id = ? AND size = ? 
       ORDER BY level DESC, duration_ms ASC LIMIT 1`,
      [req.session.userId, size],
    );

    let isBest = true;
    if (bestRows.length > 0) {
      const best = bestRows[0];
      // 如果以前关卡更高，或者关卡一样但时间更短，说明不是最佳
      if (
        best.level > level ||
        (best.level === level && best.duration_ms <= durationMs)
      ) {
        isBest = false;
      }
    }

    // 插入成绩
    const [result] = await pool.execute(
      `INSERT INTO puzzle_records (user_id, size, level, moves, duration_ms) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.session.userId, size, level, moves, durationMs],
    );

    // 获取提交后的最新排名
    const stats = await getUserStats(req.session.userId);
    const currentStat = stats.find((s) => s.size === size);

    res.status(201).json({
      ok: true,
      record: {
        id: result.insertId,
        size,
        level,
        moves,
        durationMs,
        completedAt: new Date(),
      },
      isBest,
      rank: {
        rank: currentStat.rank,
        total: currentStat.totalPlayers,
        bestLevel: currentStat.bestLevel,
        bestMs: currentStat.bestMs,
      },
    });
  } catch (error) {
    next(error);
  }
});

/** 我的成绩汇总与最近记录 */
router.get("/me", requireLogin, async (req, res, next) => {
  try {
    const stats = await getUserStats(req.session.userId);

    // 查最近 20 条记录
    const [records] = await pool.execute(
      `SELECT id, size, level, moves, duration_ms AS durationMs, completed_at AS completedAt 
       FROM puzzle_records WHERE user_id = ? 
       ORDER BY completed_at DESC LIMIT 20`,
      [req.session.userId],
    );

    res.json({
      ok: true,
      user: { id: req.session.userId },
      stats,
      records,
    });
  } catch (error) {
    next(error);
  }
});

/** 排行榜 */
router.get("/leaderboard", async (req, res, next) => {
  try {
    const size = Number(req.query.size) || 3;
    const data = await getLeaderboard(size, req.session.userId);
    res.json({ ok: true, ...data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
