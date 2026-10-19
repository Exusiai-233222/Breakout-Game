/**
 * express-session 的 Promise 封装
 * 登录成功后调用 regenerate，可防止会话固定（Session Fixation）攻击。
 */

function regenerate(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function save(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

function destroy(req) {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

module.exports = { regenerate, save, destroy };
