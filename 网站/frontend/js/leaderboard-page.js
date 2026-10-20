import { api, getCurrentUser } from "./api.js";
import { mountNav } from "./nav.js";

const leaderBody = document.getElementById("leaderBody");
const boardDesc = document.getElementById("boardDesc");
const myRankBox = document.getElementById("myRankBox");

async function loadLeaderboard() {
  boardDesc.textContent = "正在加载...";
  leaderBody.innerHTML = "";
  myRankBox.innerHTML = "";

  try {
    // 固定请求 size=3 的榜单（弹珠游戏）
    const data = await api(`/leaderboard?size=3`);

    boardDesc.textContent = `共 ${data.total} 名玩家参与`;

    if (data.entries.length === 0) {
      leaderBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #888;">暂无成绩，快去挑战吧！</td></tr>`;
    } else {
      data.entries.forEach((entry) => {
        const tr = document.createElement("tr");
        if (entry.isMe) tr.style.backgroundColor = "rgba(102, 126, 234, 0.1)";

        let rankDisplay = entry.rank;
        if (entry.rank === 1) rankDisplay = "🥇 1";
        if (entry.rank === 2) rankDisplay = "🥈 2";
        if (entry.rank === 3) rankDisplay = "🥉 3";

        const totalSec = entry.durationMs / 1000;
        const m = Math.floor(totalSec / 60)
          .toString()
          .padStart(2, "0");
        const s = Math.floor(totalSec % 60)
          .toString()
          .padStart(2, "0");
        const t = Math.floor((entry.durationMs % 1000) / 100);
        const timeStr = `${m}:${s}.${t}`;

        tr.innerHTML = `
          <td>${rankDisplay}</td>
          <td>${entry.username} ${entry.isMe ? '<span style="color:#667eea">(我)</span>' : ""}</td>
          <td style="color: #ffcc00; font-weight: bold;">第 ${entry.level} 关</td>
          <td>${timeStr}</td>
          <td>${new Date(entry.completedAt).toLocaleString()}</td>
        `;
        leaderBody.appendChild(tr);
      });
    }

    if (data.me) {
      myRankBox.innerHTML = `我的最佳成绩：<strong>第 ${data.me.level} 关</strong>（${(data.me.durationMs / 1000).toFixed(1)}秒），当前排名第 <strong>${data.me.rank}</strong> 名`;
    } else {
      myRankBox.innerHTML = `你还没有成绩，快去挑战吧！`;
    }
  } catch (error) {
    boardDesc.textContent = "加载失败：" + error.message;
  }
}

async function init() {
  try {
    const user = await getCurrentUser();
    if (user) mountNav(user);
  } catch (e) {}
  loadLeaderboard(); // 直接加载
}

init();
