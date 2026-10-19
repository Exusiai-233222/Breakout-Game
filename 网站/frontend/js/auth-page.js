/**
 * 登录 / 注册页
 */
import { api, getCurrentUser, safeNextPage } from "./api.js";
import { setButtonLoading, toast } from "./ui.js";

const next = safeNextPage();
const USERNAME_RE = /^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/;
const el = (id) => document.getElementById(id);

function showError(box, message) {
  box.textContent = message;
  box.classList.add("show");
}

function clearError(box) {
  box.textContent = "";
  box.classList.remove("show");
}

function switchTab(name) {
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  el("loginForm").classList.toggle("hidden", name !== "login");
  el("registerForm").classList.toggle("hidden", name !== "register");
  clearError(el("loginError"));
  clearError(el("registerError"));
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  document.querySelectorAll("[data-switch]").forEach((button) => {
    button.addEventListener("click", () => {
      switchTab(button.dataset.switch);
      const firstInput = el(button.dataset.switch === "login" ? "loginUsername" : "registerUsername");
      firstInput?.focus();
    });
  });
}

async function handleLogin(event) {
  event.preventDefault();

  const errorBox = el("loginError");
  clearError(errorBox);

  const username = el("loginUsername").value.trim();
  const password = el("loginPassword").value;

  if (!username || !password) {
    showError(errorBox, "请输入用户名和密码");
    return;
  }

  const button = el("loginSubmit");
  setButtonLoading(button, true, "登录中…");

  try {
    const data = await api("/login", { method: "POST", body: { username, password } });
    toast(`欢迎回来，${data.user.username}`, "success");
    location.replace(next);
  } catch (error) {
    showError(errorBox, error.message);
    setButtonLoading(button, false);
    el("loginPassword").focus();
    el("loginPassword").select();
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const errorBox = el("registerError");
  clearError(errorBox);

  const username = el("registerUsername").value.trim();
  const email = el("registerEmail").value.trim();
  const password = el("registerPassword").value;
  const confirmPassword = el("registerPassword2").value;

  if (!USERNAME_RE.test(username)) {
    showError(errorBox, "用户名需为 3~20 位中文、字母、数字或下划线");
    el("registerUsername").focus();
    return;
  }
  if (password.length < 6) {
    showError(errorBox, "密码至少 6 位");
    el("registerPassword").focus();
    return;
  }
  if (password !== confirmPassword) {
    showError(errorBox, "两次输入的密码不一致");
    el("registerPassword2").focus();
    return;
  }

  const button = el("registerSubmit");
  setButtonLoading(button, true, "注册中…");

  const body = { username, password };
  if (email) body.email = email;

  try {
    await api("/register", { method: "POST", body });
    toast("注册成功，开始拼图吧！", "success");
    location.replace(next);
  } catch (error) {
    showError(errorBox, error.message);
    setButtonLoading(button, false);
  }
}

async function init() {
  // 已登录则直接进入游戏
  const user = await getCurrentUser().catch(() => null);
  if (user) {
    location.replace(next);
    return;
  }

  bindTabs();
  el("loginForm").addEventListener("submit", handleLogin);
  el("registerForm").addEventListener("submit", handleRegister);
  el("loginUsername").focus();
}

init();
