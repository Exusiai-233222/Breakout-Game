const pool = require("../db");

/**
 * 获取某个难度的排行榜
 */
async function getLeaderboard(size, currentUserId = null) {
  // 核心 SQL：每个用户取最好成绩，然后按 关卡降序、用时升序 排名
  const sql = `
    WITH best AS (
      SELECT r.user_id, r.level, r.duration_ms, r.completed_at,
             ROW_NUMBER() OVER (
               PARTITION BY r.user_id
               ORDER BY r.level DESC, r.duration_ms ASC, r.completed_at ASC
             ) AS rn
      FROM puzzle_records r
      WHERE r.size = ?
    ),
    ranked AS (
      SELECT user_id, level, duration_ms, completed_at,
             ROW_NUMBER() OVER (
               ORDER BY level DESC, duration_ms ASC, completed_at ASC
             ) AS rnk
      FROM best
      WHERE rn = 1
    )
    SELECT ranked.rnk, ranked.user_id, ranked.level, ranked.duration_ms, ranked.completed_at, u.username
    FROM ranked
    JOIN users u ON u.id = ranked.user_id
    ORDER BY ranked.rnk ASC
  `;

  const [rows] = await pool.execute(sql, [size]);

  const total = rows.length;
  const entries = rows.slice(0, 20).map((row) => ({
    rank: row.rnk,
    username: row.username,
    level: row.level,
    durationMs: row.duration_ms,
    completedAt: row.completed_at,
    isMe: row.user_id === currentUserId,
  }));

  let me = null;
  if (currentUserId) {
    const myRow = rows.find((r) => r.user_id === currentUserId);
    if (myRow) {
      me = {
        rank: myRow.rnk,
        username: myRow.username,
        level: myRow.level,
        durationMs: myRow.duration_ms,
        completedAt: myRow.completed_at,
      };
    }
  }

  return { size, total, entries, me };
}

/**
 * 获取某用户的个人统计（用于个人中心和提交后的返回）
 */
async function getUserStats(userId) {
  const [rows] = await pool.execute(
    `WITH best AS (
       SELECT size, level, duration_ms, completed_at,
              ROW_NUMBER() OVER (PARTITION BY size ORDER BY level DESC, duration_ms ASC) AS rn
       FROM puzzle_records WHERE user_id = ?
     )
     SELECT b.size, b.level, b.duration_ms, 
            (SELECT COUNT(*) FROM puzzle_records WHERE size = b.size AND user_id = ?) AS plays,
            (SELECT COUNT(*) FROM (SELECT user_id FROM puzzle_records WHERE size = b.size GROUP BY user_id) AS t) AS totalPlayers
     FROM best b WHERE b.rn = 1`,
    [userId, userId],
  );

  const stats = [];
  // 强制固定返回 3, 4, 5 三个难度
  for (let size of [3, 4, 5]) {
    const row = rows.find((r) => r.size === size);
    if (row) {
      // 计算真实排名
      const [rankRows] = await pool.execute(
        `WITH best AS (
           SELECT user_id, level, duration_ms,
                  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY level DESC, duration_ms ASC) AS rn
           FROM puzzle_records WHERE size = ?
         ),
         ranked AS (
           SELECT user_id, ROW_NUMBER() OVER (ORDER BY level DESC, duration_ms ASC) AS rnk
           FROM best WHERE rn = 1
         )
         SELECT rnk FROM ranked WHERE user_id = ?`,
        [size, userId],
      );

      stats.push({
        size,
        plays: row.plays,
        totalPlayers: row.totalPlayers,
        rank: rankRows.length > 0 ? rankRows[0].rnk : null,
        bestLevel: row.level,
        bestMs: row.duration_ms,
        bestAt: row.completed_at,
      });
    } else {
      stats.push({
        size,
        plays: 0,
        totalPlayers: 0,
        rank: null,
        bestLevel: null,
        bestMs: null,
        bestAt: null,
      });
    }
  }
  return stats;
}

module.exports = { getLeaderboard, getUserStats };
