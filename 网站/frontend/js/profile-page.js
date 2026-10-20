import { api, requireUser, logout } from "./api.js";
import { mountNav } from "./nav.js";

const userNameEl = document.getElementById("navUser");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profileJoined = document.getElementById("profileJoined");
const avatar = document.getElementById("avatar");
const statsGrid = document.getElementById("statsGrid");

// 表单
const passwordForm = document.getElementById("passwordForm");
const oldPassword = document.getElementById("oldPassword");
const newPassword = document.getElementById("newPassword");
const confirmPassword = document.getElementById("confirmPassword");
const passwordError = document.getElementById("passwordError");
const passwordSuccess = document.getElementById("passwordSuccess");

async function loadProfile() {
  try {
    const user = await requireUser();
    if (!user) return;
    mountNav(user);

    // 基本信息
    profileName.textContent = user.username;
    profileEmail.textContent = user.email;
    profileJoined.textContent = `加入时间：${new Date(user.createdAt).toLocaleDateString()}`;
    avatar.textContent = user.username.charAt(0).toUpperCase();

    // 加载战绩
    const data = await api("/records/me");

    // 只取弹珠游戏的数据（size === 3）
    const stat = data.stats.find((s) => s.size === 3) || {
      bestLevel: "-",
      bestMs: null,
      rank: "-",
      totalPlayers: 0,
      plays: 0,
    };

    let timeStr = "-";
    if (stat.bestMs) {
      timeStr = (stat.bestMs / 1000).toFixed(1) + "s";
    }

    statsGrid.innerHTML = `
      <section class="card">
        <h2><span class="dot"></span>弹珠挑战</h2>
        <div style="margin-top: 15px; line-height: 2;">
          <p>最高关卡：<strong style="color: #ffcc00; font-size: 20px;">第 ${stat.bestLevel} 关</strong></p>
          <p>最佳用时：${timeStr}</p>
          <p>历史排名：第 ${stat.rank} 名 / 共 ${stat.totalPlayers} 人</p>
          <p>游玩局数：${stat.plays} 局</p>
        </div>
      </section>
    `;
  } catch (error) {
    console.error("加载个人信息失败", error);
  }
}

passwordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  passwordError.textContent = "";
  passwordSuccess.textContent = "";

  if (newPassword.value !== confirmPassword.value) {
    passwordError.textContent = "两次输入的新密码不一致";
    return;
  }

  try {
    const res = await api("/password", {
      method: "POST",
      body: {
        oldPassword: oldPassword.value,
        newPassword: newPassword.value,
      },
    });
    passwordSuccess.textContent = res.message;
    passwordForm.reset();
  } catch (error) {
    passwordError.textContent = error.message;
  }
});

document.getElementById("authBtn").addEventListener("click", () => logout());

loadProfile();
