/**
 * 接口请求封装
 * 所有请求都带上 Cookie，后端返回的 { error } 统一转成 ApiError。
 */
const API_BASE = "/api";

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const options = {
    method,
    credentials: "include",
    headers: {},
  };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(API_BASE + path, options);
  } catch {
    throw new ApiError("无法连接服务器，请确认后端已启动", 0);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(data?.error || `请求失败（${response.status}）`, response.status);
  }

  return data;
}

/** 读取当前登录用户，未登录返回 null */
export async function getCurrentUser() {
  try {
    const data = await api("/me");
    return data.user;
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

const ALLOWED_PAGES = ["game.html", "profile.html", "leaderboard.html"];

/** 登录后的跳转地址，只允许站内页面，避免开放重定向 */
export function safeNextPage() {
  const next = new URLSearchParams(location.search).get("next");
  if (!next) return "game.html";
  const page = next.split("?")[0];
  return ALLOWED_PAGES.includes(page) ? next : "game.html";
}

/** 跳转到登录页，并记录登录后要返回的页面 */
export function redirectToLogin() {
  const current = location.pathname.split("/").pop() || "game.html";
  const page = ALLOWED_PAGES.includes(current) ? current : "game.html";
  location.replace(`index.html?next=${encodeURIComponent(page)}`);
}

/** 受保护页面使用：未登录时自动跳转登录页并返回 null */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirectToLogin();
    return null;
  }
  return user;
}

export async function logout() {
  try {
    await api("/logout", { method: "POST" });
  } catch {
    // 即使退出接口失败，也跳回登录页
  }
  location.replace("index.html");
}
