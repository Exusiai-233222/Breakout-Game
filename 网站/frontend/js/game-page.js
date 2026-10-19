/**
 * 游戏页：难度 / 图片选择、计时、成绩提交
 */
import { api, redirectToLogin, requireUser } from "./api.js";
import { mountNav } from "./nav.js";
import { toast, ui } from "./ui.js";
import { PuzzleGame } from "./puzzle.js";

const IMAGES = [
  { id: "sunset", name: "日落山湖", url: "assets/puzzle-sunset.svg" },
  { id: "neon", name: "霓虹光环", url: "assets/puzzle-neon.svg" },
];

// 方向键：按下某个方向键时，把空格该方向上的拼块移过来
const KEY_DIRECTIONS = {
  ArrowUp: [1, 0],
  ArrowDown: [-1, 0],
  ArrowLeft: [0, 1],
  ArrowRight: [0, -1],
};

const state = {
  user: null,
  size: 3,
  imageId: "sunset",
  game: null,
  timerId: null,
  startedAt: 0,
  elapsedMs: 0,
  running: false,
  submitting: false,
  roundId: 0,
  stats: new Map(),
};

const el = (id) => document.getElementById(id);

function startTimer() {
  if (state.running) return;

  state.running = true;
  state.startedAt = performance.now() - state.elapsedMs;

  if (state.timerId) clearInterval(state.timerId);
  state.timerId = setInterval(updateTimer, 100);
  updateTimer();
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  if (state.running) {
    state.elapsedMs = performance.now() - state.startedAt;
  }
  state.running = false;
  updateTimer();
}

function currentElapsed() {
  return state.running ? performance.now() - state.startedAt : state.elapsedMs;
}

function updateTimer() {
  el("timer").textContent = ui.duration(currentElapsed());
}

function newGame() {
  stopTimer();
  state.elapsedMs = 0;
  state.submitting = false;
  state.roundId += 1;
  hideOverlay();
  updateTimer();

  const image = IMAGES.find((item) => item.id === state.imageId) || IMAGES[0];
  const reference = el("referenceImg");
  reference.src = image.url;
  reference.alt = `原图：${image.name}`;

  state.game = new PuzzleGame({
    board: el("board"),
    size: state.size,
    imageUrl: image.url,
    onFirstMove: startTimer,
    onMove: (moves) => {
      el("moves").textContent = String(moves);
    },
    onSolved: handleSolved,
  });

  state.game.setShowNumbers(el("showNumbers").checked);
  state.game.newGame();

  el("moves").textContent = "0";
  el("status").textContent = `${ui.sizeName(state.size)} · 点击与空格相邻的方块，也可以使用方向键移动。`;
  updateBest();
  updateRankLabel();
}

async function handleSolved({ moves }) {
  stopTimer();

  const durationMs = Math.round(state.elapsedMs);
  showOverlay({ durationMs, moves, loading: true });
  el("status").textContent = `🎉 完成！用时 ${ui.friendlyDuration(durationMs)}，共 ${moves} 步，正在保存成绩…`;

  await submitRecord({ size: state.size, moves, durationMs, roundId: state.roundId });
}

async function submitRecord({ size, moves, durationMs, roundId }) {
  if (state.submitting) return;
  state.submitting = true;

  try {
    const result = await api("/records", {
      method: "POST",
      body: { size, moves, durationMs },
    });

    const isCurrentRound = state.roundId === roundId;
    const previous = state.stats.get(size) || {};
    state.stats.set(size, {
      ...previous,
      size,
      bestMs: result.rank.bestMs,
      bestMoves: result.rank.bestMoves,
      rank: result.rank.rank,
      totalPlayers: result.rank.total,
      plays: (previous.plays || 0) + 1,
    });

    updateBest();
    updateRankLabel();

    // 提交期间如果已经重开一局，就不要再打扰当前这一局
    if (!isCurrentRound) return;

    showOverlay({ durationMs, moves, result });
    el("status").textContent = `🎉 完成！用时 ${ui.friendlyDuration(durationMs)}，共 ${moves} 步。`;
    toast(result.isBest ? "新纪录！成绩已保存" : "成绩已保存", "success");
  } catch (error) {
    if (state.roundId !== roundId) return;

    showOverlay({ durationMs, moves, error: error.message });
    el("status").textContent = "成绩保存失败，请检查网络后重新完成一局。";
    toast(error.message, "error");
  } finally {
    state.submitting = false;
  }
}

function showOverlay({ durationMs, moves, result, error, loading = false }) {
  el("solvedTime").textContent = ui.duration(durationMs);
  el("solvedMoves").textContent = `${moves} 步`;

  const rankElement = el("solvedRank");
  const noteElement = el("solvedNote");
  rankElement.replaceChildren();
  noteElement.textContent = "";

  if (loading) {
    rankElement.textContent = "正在保存成绩…";
  } else if (error) {
    rankElement.textContent = "成绩未能保存";
    noteElement.textContent = error;
  } else if (result) {
    const strong = document.createElement("strong");
    strong.textContent = String(result.rank.rank);
    rankElement.append("本难度第 ", strong, ` 名 / 共 ${result.rank.total} 人`);
    noteElement.textContent = result.isBest
      ? "刷新了个人最佳成绩！"
      : `个人最佳：${ui.duration(result.rank.bestMs)}`;
  }

  el("solvedOverlay").classList.remove("hidden");
}

function hideOverlay() {
  el("solvedOverlay").classList.add("hidden");
}

async function loadStats() {
  try {
    const data = await api("/records/me");
    state.stats = new Map(data.stats.map((item) => [item.size, item]));
  } catch (error) {
    if (error.status === 401) {
      redirectToLogin();
      return;
    }
    toast(`个人成绩加载失败：${error.message}`, "error");
  }

  updateBest();
  updateRankLabel();
}

function updateBest() {
  const stats = state.stats.get(state.size);
  el("best").textContent = stats && stats.bestMs ? ui.duration(stats.bestMs) : "--:--.-";
}

function updateRankLabel() {
  const stats = state.stats.get(state.size);
  if (stats && stats.rank) {
    el("myRank").textContent = `第 ${stats.rank} 名 / 共 ${stats.totalPlayers} 人`;
  } else {
    el("myRank").textContent = "暂无成绩";
  }
}

function bindPickers() {
  el("sizePicker").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-size]");
    if (!button) return;

    const size = Number(button.dataset.size);
    if (size === state.size) return;

    state.size = size;
    el("sizePicker")
      .querySelectorAll("button")
      .forEach((item) => item.classList.toggle("active", item === button));
    newGame();
  });

  el("imagePicker").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-image]");
    if (!button) return;

    const image = IMAGES.find((item) => item.id === button.dataset.image);
    if (!image || image.id === state.imageId) return;

    state.imageId = image.id;
    el("imagePicker")
      .querySelectorAll("button")
      .forEach((item) => item.classList.toggle("active", item === button));
    newGame();
  });

  el("showNumbers").addEventListener("change", (event) => {
    state.game?.setShowNumbers(event.target.checked);
  });
}

function bindBoard() {
  el("board").addEventListener("click", (event) => {
    const tile = event.target.closest(".tile");
    if (!tile || !state.game) return;

    const piece = Number(tile.dataset.piece);
    state.game.move(state.game.positionOf(piece));
  });
}

function bindActions() {
  el("restartBtn").addEventListener("click", newGame);
  el("playAgainBtn").addEventListener("click", newGame);
}

function handleKeydown(event) {
  if (!state.game || state.game.solved) return;
  if (event.target instanceof HTMLInputElement) return;

  const direction = KEY_DIRECTIONS[event.key];
  if (!direction) return;

  event.preventDefault();

  const size = state.size;
  const blank = state.game.tiles.indexOf(state.game.blankPiece);
  const row = Math.floor(blank / size) + direction[0];
  const column = (blank % size) + direction[1];

  if (row < 0 || row >= size || column < 0 || column >= size) return;
  state.game.move(row * size + column);
}

async function init() {
  const user = await requireUser();
  if (!user) return;

  state.user = user;
  mountNav(user);

  bindPickers();
  bindBoard();
  bindActions();

  await loadStats();
  newGame();

  window.addEventListener("keydown", handleKeydown);
}

init().catch((error) => {
  console.error(error);
  toast(`页面初始化失败：${error.message}`, "error");
});
