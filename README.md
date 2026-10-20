# 🎮 弹珠挑战游戏系统 (Breakout Game System)

本项目是一个完整的 Web 全栈应用，包含用户认证、网页版弹珠闯关游戏、成绩记录与全站排行榜。项目满足“登录页面设计及网页游戏实现”的实验要求。

## ✨ 核心功能

1. **用户系统**：支持用户注册、登录、退出，以及修改密码（密码采用 bcrypt 加密存储）。
2. **弹珠游戏**：基于 HTML5 Canvas 开发，鼠标控制挡板反弹弹珠打碎砖块。
3. **难度递增**：得分达标即可过关，每次过关后弹珠速度提升，挑战性逐步增加。
4. **成绩记录**：自动记录玩家达到的最高关卡与总用时。
5. **排行榜**：实时展示全站玩家排名（优先按关卡降序，同关卡按用时升序），前三名有特殊奖牌标识。

## 🛠 技术栈

- **前端**：原生 HTML5, CSS3, 原生 JavaScript (ES Module, Canvas 渲染)
- **后端**：Node.js, Express 5
- **数据库**：MySQL 8 (使用 `mysql2` 连接池, bcrypt 密码哈希)
- **会话管理**：express-session

## 🚀 快速启动

### 1. 环境准备

S
确保你的电脑已安装 Node.js (v18+) 和 MySQL (v8+)，并启动 MySQL 服务。

### 2. 配置数据库

在 MySQL 中创建一个名为 `login_demo` 的数据库，并执行以下 SQL 建表语句：

```sql
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS puzzle_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  size TINYINT NOT NULL DEFAULT 3,
  level INT NOT NULL DEFAULT 1,
  moves INT DEFAULT 0,
  duration_ms INT NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```
