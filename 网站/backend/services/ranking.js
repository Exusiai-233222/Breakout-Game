/**
 * 排行榜 / 个人排名计算
 *
 * 排名规则：
 *   1. 每位用户在同一难度只取「最佳成绩」参与排名；
 *   2. 用时越短越靠前；用时相同则步数少者靠前；仍相同则更早完成者靠前。
 */
const pool = require("../db");
const { SIZES, RECENT_RECORDS_LIMIT } = require("../config");

const BOARD_SQL = `
  WITH best AS (
    SELECT
      r.user_id,
      r.duration_ms,
      r.moves,
      r.completed_at,
      ROW_NUMBER() OVER (
        PARTITION BY r.user_id
        ORDER BY r.duration_ms ASC, r.moves ASC, r.completed_at ASC
      ) AS rn
    FROM puzzle_records r
    WHERE r.size = ?
  ),
  ranked AS (
    SELECT
      user_id,
      duration_ms,
      moves,
      completed_at,
      ROW_NUMBER() OVER (
        ORDER BY duration_ms ASC, moves ASC, completed_at ASC
      ) AS rnk
    FROM best
    WHERE rn = 1
  )
  SELECT ranked.rnk, ranked.user_id, ranked.duration_ms, ranked.moves, ranked.completed_at, u.username
  FROM ranked
  JOIN users u ON u.id = ranked.user_id
  ORDER BY ranked.rnk ASC
`;

function mapBoardRow(row) {
  return {
    rank: Number(row.rnk),
    userId: row.user_id,
    username: row.username,
    durationMs: Number(row.duration_ms),
    moves: Number(row.moves),
    completedAt: row.completed_at,
  };
}

/** 某个难度的完整排名（每位用户一条最佳成绩） */
async function getBoard(size) {
  const [rows] = await pool.query(BOARD_SQL, [size]);
  return rows.map(mapBoardRow);
}

/** 某位用户的三个难度汇总：最佳成绩、名次、完成次数 */
async function getUserStats(userId) {
  const [playRows] = await pool.execute(
    `SELECT size, COUNT(*) AS plays
     FROM puzzle_records
     WHERE user_id = ?
     GROUP BY size`,
    [userId],
  );
  const playsBySize = new Map(playRows.map((row) => [Number(row.size), Number(row.plays)]));

  const stats = [];
  for (const size of SIZES) {
    const board = await getBoard(size);
    const me = board.find((entry) => entry.userId === userId) || null;
    stats.push({
      size,
      plays: playsBySize.get(size) || 0,
      totalPlayers: board.length,
      rank: me ? me.rank : null,
      bestMs: me ? me.durationMs : null,
      bestMoves: me ? me.moves : null,
      bestAt: me ? me.completedAt : null,
    });
  }
  return stats;
}

/** 某位用户的最近完成记录 */
async function getRecentRecords(userId) {
  const [rows] = await pool.execute(
    `SELECT id, size, moves, duration_ms, completed_at
     FROM puzzle_records
     WHERE user_id = ?
     ORDER BY completed_at DESC, id DESC
     LIMIT ${Number(RECENT_RECORDS_LIMIT)}`,
    [userId],
  );

  return rows.map((row) => ({
    id: row.id,
    size: Number(row.size),
    moves: Number(row.moves),
    durationMs: Number(row.duration_ms),
    completedAt: row.completed_at,
  }));
}

module.exports = { getBoard, getUserStats, getRecentRecords };
