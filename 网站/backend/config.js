/**
 * 全局常量配置
 */

// 支持的棋盘边长（3×3 简单 / 4×4 中等 / 5×5 困难）
const SIZES = [3, 4, 5];

// 成绩合法性校验范围
const LIMITS = {
  MIN_MOVES: 1,
  MAX_MOVES: 5000,
  MIN_DURATION_MS: 800,
  MAX_DURATION_MS: 3 * 60 * 60 * 1000, // 3 小时
};

// 排行榜显示前 N 名
const LEADERBOARD_LIMIT = 20;

// 个人主页显示的最近记录条数
const RECENT_RECORDS_LIMIT = 20;

// 会话 Cookie 名称
const SESSION_COOKIE = "puzzle.sid";

module.exports = { SIZES, LIMITS, LEADERBOARD_LIMIT, RECENT_RECORDS_LIMIT, SESSION_COOKIE };
