/**
 * 界面通用工具：时间格式化、提示条、难度名称
 */
export const ui = {
  /** 00:12.3 */
  duration(ms) {
    const safe = Math.max(0, Math.floor(Number(ms) || 0));
    const minutes = Math.floor(safe / 60000);
    const seconds = Math.floor((safe % 60000) / 1000);
    const tenths = Math.floor((safe % 1000) / 100);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
  },

  /** 12.3 秒 / 1 分 23.4 秒 */
  friendlyDuration(ms) {
    const safe = Math.max(0, Math.floor(Number(ms) || 0));
    const minutes = Math.floor(safe / 60000);
    const seconds = ((safe % 60000) / 1000).toFixed(1);
    if (minutes === 0) return `${seconds} 秒`;
    return `${minutes} 分 ${seconds} 秒`;
  },

  /** 2026/10/19 16:40 */
  shortDate(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    const pad = (number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  },

  /** 2026/10/19 */
  dateOnly(value) {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    const pad = (number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
  },

  /** 3 -> 3×3 */
  sizeName(size) {
    return `${size}×${size}`;
  },

  /** 难度中文名 */
  sizeLabel(size) {
    return { 3: "简单", 4: "中等", 5: "困难" }[size] || "";
  },

  /** 名次徽章样式：前三名特殊配色 */
  rankClass(rank) {
    if (!rank) return "rank";
    return rank <= 3 ? `rank top${rank}` : "rank";
  },
};

/** 按钮加载态：防止重复提交 */
export function setButtonLoading(button, loading, loadingText = "处理中…") {
  if (!button) return;

  if (loading) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = false;
  }
}

/** 轻提示，自动消失 */
export function toast(message, type = "info") {
  let root = document.querySelector(".toast-root");
  if (!root) {
    root = document.createElement("div");
    root.className = "toast-root";
    document.body.append(root);
  }

  const element = document.createElement("div");
  element.className = `toast toast-${type}`;
  element.textContent = message;
  root.append(element);

  requestAnimationFrame(() => element.classList.add("show"));

  setTimeout(() => {
    element.classList.remove("show");
    setTimeout(() => element.remove(), 250);
  }, 3000);
}
