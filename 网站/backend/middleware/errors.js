/**
 * 统一的 404 与错误处理
 */
function apiNotFound(req, res) {
  res.status(404).json({ error: "接口不存在" });
}

function errorHandler(err, req, res, next) {
  console.error("[服务器错误]", err);
  if (res.headersSent) return next(err);

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "请求数据格式有误" });
  }

  res.status(500).json({ error: "服务器开小差了，请稍后再试" });
}

module.exports = { apiNotFound, errorHandler };
