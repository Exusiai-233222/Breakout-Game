/**
 * 顶部导航：显示当前用户、退出登录
 */
import { logout } from "./api.js";

export function mountNav(user) {
  const nameElement = document.getElementById("navUser");
  if (nameElement) {
    nameElement.textContent = user ? user.username : "";
    nameElement.hidden = !user;
  }

  const authButton = document.getElementById("authBtn");
  if (!authButton) return;

  if (user) {
    authButton.textContent = "退出";
    authButton.addEventListener("click", () => logout());
  } else {
    authButton.textContent = "登录";
    authButton.addEventListener("click", () => {
      location.href = "index.html";
    });
  }
}
