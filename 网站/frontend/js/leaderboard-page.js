/**
 * 排行榜页：三档难度切换、本人排名高亮
 */
import { api, getCurrentUser } from "./api.js";
import { mountNav } from "./nav.js";
import { toast, ui } from "./ui.js";

const state = { size: 3, user: null };
const el = (id) => document.getElementById(id);

function createCell(text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) cell.className = className;
  return cell;
}

function renderTable(data) {
  const tbody = el("leaderBody");
  tbody.replaceChildren();

  if (!data.entries.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty";
    const emoji = document.createElement("span");
    emoji.className = "emoji";
    emoji.textContent = "🏁";
    cell.append(emoji, "这个难度还没有人完成，快来抢占第一名！");
    row.append(cell);
    tbody.append(row);
    return;
  }

  for (const entry of data.entries) {
    const row = document.createElement("tr");
    if (entry.isMe) row.className = "me";

    const rankCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = ui.rankClass(entry.rank);
    badge.textContent = String(entry.rank);
    rankCell.append(badge);

    const nameCell = document.createElement("td");
    nameCell.textContent = entry.username;
    if (entry.isMe) {
      const tag = document.createElement("span");
      tag.className = "me-tag";
      tag.textContent = "我";
      nameCell.append(tag);
    }

    row.append(
      rankCell,
      nameCell,
      createCell(ui.duration(entry.durationMs), "num"),
      createCell(`${entry.moves} 步`, "num"),
      createCell(ui.shortDate(entry.completedAt)),
    );
    tbody.append(row);
  }
}

function renderMyRank(data) {
  const box = el("myRankBox");
  box.replaceChildren();

  if (!state.user) {
    const text = document.createElement("span");
    text.textContent = "登录后即可查看自己的排名";
    const link = document.createElement("a");
    link.className = "btn btn-ghost btn-sm";
    link.href = "index.html";
    link.textContent = "去登录";
    box.append(text, link);
    return;
  }

  if (!data.me) {
    const text = document.createElement("span");
    text.textContent = `你还没有 ${ui.sizeName(data.size)} 难度的成绩`;
    const link = document.createElement("a");
    link.className = "btn btn-primary btn-sm";
    link.href = "game.html";
    link.textContent = "去挑战";
    box.append(text, link);
    return;
  }

  const label = document.createElement("span");
  label.textContent = "我的排名";

  const value = document.createElement("strong");
  const rankText = document.createElement("span");
  rankText.className = "rank-highlight";
  rankText.textContent = `第 ${data.me.rank} 名`;
  value.append(rankText, ` / 共 ${data.total} 人`);

  const best = document.createElement("span");
  best.textContent = `最佳 ${ui.duration(data.me.durationMs)} · ${data.me.moves} 步`;

  box.append(label, value, best);
}

async function load(size) {
  state.size = size;
  const data = await api(`/leaderboard?size=${size}`);
  el("boardDesc").textContent = `${ui.sizeName(size)} 难度 · 共 ${data.total} 位玩家完成挑战（按个人最佳用时排名）`;
  renderTable(data);
  renderMyRank(data);
}

function bindTabs() {
  const tabs = document.querySelectorAll("[data-size]");
  tabs.forEach((tab) => {
    tab.addEventListener("click", async () => {
      tabs.forEach((item) => item.classList.toggle("active", item === tab));
      try {
        await load(Number(tab.dataset.size));
      } catch (error) {
        toast(`排行榜加载失败：${error.message}`, "error");
      }
    });
  });
}

async function init() {
  state.user = await getCurrentUser().catch(() => null);
  mountNav(state.user);
  bindTabs();

  try {
    await load(3);
  } catch (error) {
    toast(`排行榜加载失败：${error.message}`, "error");
  }
}

init().catch((error) => {
  console.error(error);
  toast(`页面初始化失败：${error.message}`, "error");
});
