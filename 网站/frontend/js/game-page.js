import { BreakoutGame } from "./breakout.js";
import { api, requireUser, logout } from "./api.js";
import { mountNav } from "./nav.js";

const canvas = document.getElementById("gameCanvas");
const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const levelDisplay = document.getElementById("levelDisplay");
const targetDisplay = document.getElementById("targetDisplay");
const scoreDisplay = document.getElementById("scoreDisplay");
const bestLevelEl = document.getElementById("bestLevel");
const myRankEl = document.getElementById("myRank");

let startTime = 0;
let timerInterval = null;
let game = null;

function formatTime(ms) {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSec % 60)
    .toString()
    .padStart(2, "0");
  const t = Math.floor((ms % 1000) / 100);
  return `${m}:${s}.${t}`;
}

function startTimer() {
  startTime = Date.now();
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timerEl.textContent = formatTime(Date.now() - startTime);
  }, 100);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
}

async function loadStats() {
  try {
    const data = await api("/records/me"); // 修复这里
    const stat = data.stats.find((s) => s.size === 3);
    if (stat && stat.bestLevel) {
      bestLevelEl.textContent = `第 ${stat.bestLevel} 关`;
      myRankEl.textContent = `第 ${stat.rank} 名 / 共 ${stat.totalPlayers} 人`;
    } else {
      bestLevelEl.textContent = "-";
      myRankEl.textContent = "暂无成绩";
    }
  } catch (error) {
    console.error("加载战绩失败", error);
  }
}

async function init() {
  // 使用 requireUser 自动处理未登录跳转，防止死循环
  const user = await requireUser();
  if (!user) return;

  mountNav(user);

  game = new BreakoutGame(canvas, {
    onScoreUpdate: (score, level, target) => {
      scoreDisplay.textContent = score;
      levelDisplay.textContent = level;
      targetDisplay.textContent = target;
    },
    onLevelUp: (level) => {
      statusEl.textContent = `第 ${level} 关完成！准备下一关...`;
    },
    onGameOver: async (finalLevel) => {
      stopTimer();
      const durationMs = Date.now() - startTime;
      statusEl.textContent = `游戏结束！到达第 ${finalLevel} 关，用时 ${formatTime(durationMs)}`;

      try {
        statusEl.textContent += "，正在保存成绩...";
        // 修复这里，使用 api() 并指定 method
        const res = await api("/records", {
          method: "POST",
          body: {
            size: 3,
            level: finalLevel,
            durationMs: durationMs,
          },
        });

        if (res.isBest) {
          statusEl.textContent = `🎉 新纪录！第 ${finalLevel} 关，排名第 ${res.rank.rank}！点击屏幕重新开始。`;
        } else {
          statusEl.textContent = `游戏结束！第 ${finalLevel} 关。点击屏幕重新开始。`;
        }
        loadStats();
      } catch (error) {
        statusEl.textContent = `成绩保存失败：${error.message}。点击屏幕重新开始。`;
      }
    },
  });

  statusEl.textContent = "点击画布或按任意键开始游戏！";
  loadStats();

  const startAction = () => {
    if (game.isGameOver || (!game.isPlaying && !game.isCountdown)) {
      statusEl.textContent = "游戏进行中...";
      timerEl.textContent = "00:00.0";
      startTimer();
      game.start();
    }
  };

  canvas.addEventListener("click", startAction);
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target === document.body) {
      e.preventDefault();
      startAction();
    }
  });

  // 绑定退出按钮
  document.getElementById("authBtn").addEventListener("click", () => {
    logout();
  });
}

init();
