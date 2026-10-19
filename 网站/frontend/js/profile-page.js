/**
 * 个人中心：我的名次、最佳成绩、最近记录、修改密码
 */
import { api, requireUser } from "./api.js";
import { mountNav } from "./nav.js";
import { setButtonLoading, toast, ui } from "./ui.js";

const el = (id) => document.getElementById(id);

function renderUser(user) {
  el("avatar").textContent = (user.username || "?").slice(0, 1).toUpperCase();
  el("profileName").textContent = user.username;
  el("profileEmail").textContent = user.email || "未填写邮箱";
  el("profileJoined").textContent = `加入时间：${ui.dateOnly(user.createdAt)}`;
}

function createStatCard(item) {
  const card = document.createElement("article");
  card.className = "stat-card";

  const name = document.createElement("div");
  name.className = "name";
  const level = document.createElement("span");
  level.textContent = `${ui.sizeName(item.size)} · ${ui.sizeLabel(item.size)}`;
  const plays = document.createElement("span");
  plays.textContent = `${item.plays} 局`;
  name.append(level, plays);

  const big = document.createElement("div");
  big.className = "big";
  big.textContent = item.bestMs ? ui.duration(item.bestMs) : "--:--.-";

  const sub = document.createElement("div");
  sub.className = "sub";
  sub.textContent = item.bestMs
    ? `最佳 ${item.bestMoves} 步 · 第 ${item.rank} 名 / 共 ${item.totalPlayers} 人`
    : "还没有完成过该难度";

  card.append(name, big, sub);
  return card;
}

function renderStats(stats) {
  const grid = el("statsGrid");
  grid.replaceChildren(...stats.map(createStatCard));
}

function renderRecords(records) {
  const tbody = el("recentBody");
  tbody.replaceChildren();

  if (!records.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "empty";
    const emoji = document.createElement("span");
    emoji.className = "emoji";
    emoji.textContent = "🧩";
    cell.append(emoji, "还没有成绩记录，去完成一局拼图吧！");
    row.append(cell);
    tbody.append(row);
    return;
  }

  for (const record of records) {
    const row = document.createElement("tr");

    const difficulty = document.createElement("td");
    difficulty.textContent = `${ui.sizeName(record.size)} · ${ui.sizeLabel(record.size)}`;

    const time = document.createElement("td");
    time.className = "num";
    time.textContent = ui.duration(record.durationMs);

    const moves = document.createElement("td");
    moves.className = "num";
    moves.textContent = `${record.moves} 步`;

    const date = document.createElement("td");
    date.textContent = ui.shortDate(record.completedAt);

    row.append(difficulty, time, moves, date);
    tbody.append(row);
  }
}

function bindPasswordForm() {
  const form = el("passwordForm");
  const errorBox = el("passwordError");
  const successBox = el("passwordSuccess");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    errorBox.classList.remove("show");
    successBox.classList.remove("show");

    const oldPassword = el("oldPassword").value;
    const newPassword = el("newPassword").value;
    const confirmPassword = el("confirmPassword").value;

    const showError = (message) => {
      errorBox.textContent = message;
      errorBox.classList.add("show");
    };

    if (!oldPassword) return showError("请输入原密码");
    if (newPassword.length < 6) return showError("新密码至少 6 位");
    if (newPassword === oldPassword) return showError("新密码不能与原密码相同");
    if (newPassword !== confirmPassword) return showError("两次输入的新密码不一致");

    const button = el("passwordSubmit");
    setButtonLoading(button, true, "保存中…");

    try {
      await api("/password", {
        method: "POST",
        body: { oldPassword, newPassword },
      });

      form.reset();
      successBox.textContent = "密码修改成功，下次请使用新密码登录。";
      successBox.classList.add("show");
      toast("密码修改成功", "success");
    } catch (error) {
      showError(error.message);
    } finally {
      setButtonLoading(button, false);
    }
  });
}

async function init() {
  const user = await requireUser();
  if (!user) return;

  mountNav(user);
  bindPasswordForm();

  try {
    const data = await api("/records/me");
    renderUser(data.user);
    renderStats(data.stats);
    renderRecords(data.records);
  } catch (error) {
    if (error.status === 401) return;
    toast(`数据加载失败：${error.message}`, "error");
  }
}

init().catch((error) => {
  console.error(error);
  toast(`页面初始化失败：${error.message}`, "error");
});
