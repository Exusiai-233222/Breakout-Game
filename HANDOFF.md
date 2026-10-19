# 交接文档（Handoff Document）· 网页版拼图游戏 / 登录系统

> **文档用途**：供接手本项目的 AI / 开发者快速掌握现状并直接继续开发。
> **项目根目录**：`C:\Users\16282\Desktop\login-system`
> **文档版本**：v1.0 ｜ **最后更新**：2026-10-19
> **当前状态**：实验报告要求的全部功能已完成并通过测试，无进行中任务。

---

## 0. 快速上手（TL;DR）

| 项目 | 值 |
| --- | --- |
| 运行环境 | Windows，Node.js v18.7.0，MySQL 8.0.46（Windows 服务 `MySQL80`） |
| 启动命令 | `cd 网站/backend` → `npm start` → http://localhost:3000 |
| 数据库 | MySQL `login_demo`，已初始化；`users` 4 行、`puzzle_records` 0 行 |
| 数据库自检 | `npm run db:check`；接口自检 `GET /api/health` |
| 接口测试 | 服务启动后 `npm run smoke`（39 项，当前全部通过） |
| 首次读代码建议顺序 | `server.js` → `schema.sql` → `routes/auth.js` → `routes/records.js` → `services/ranking.js` → `前端 js/puzzle.js` → `js/game-page.js` |
| 重要约束 | **数据库必须保持 MySQL，禁止引入 SQLite**；不要改动 `users` 表既有账号 |

---

## 1. 项目背景与目标

### 1.1 需求来源

需求来自实验报告文档：`C:\Users\16282\Desktop\web\实验报告1.doc`（广东海洋大学学生实验报告书）。

报告中与本项目相关的内容：

- **实验名称**：登录页面设计
- **实验目的**：实现网页版拼图游戏
- **实验要求**：
  1. 能够注册用户，通过用户名和密码登录；
  2. 能够修改密码；
  3. 能够记录用户的完成时间，并可以查看本人排名；
  4. 能够给出最终的用户排行榜。

### 1.2 初始代码基线（接手前的状态）

原始工作区只有一个最小可用登录系统：

- 后端 `server.js`：Express + MySQL，`/register`、`/login`、`/me`、`/logout` 四个根路径接口；
- 密码用 bcrypt 哈希，`express-session` 保存登录态；
- 前端 `index.html`：单张登录卡片，内联脚本直接 `fetch("http://localhost:3000/...")`；
- 数据库 `login_demo.users` 已有 4 个账号（`123456`、`456789`、`123789`、`abc123`）；
- 辅助脚本 `change-password.js` 写死账号/新密码；
- 没有拼图、成绩、排名、排行榜、建表脚本。

### 1.3 本次目标与验收标准

在保留原有账号体系与 `users` 表数据的前提下，扩展为完整可玩的网页版拼图游戏，满足报告四项要求，并且：

- 数据库使用 **MySQL 8**（InnoDB、utf8mb4），不引入 SQLite；
- 密码安全存储，登录态可靠；
- 成绩与排名规则明确、可复现；
- 提供可运行的建库脚本、自检脚本与接口测试；
- 前后端可直接启动演示。

### 1.4 最终交付物

- 完整前后端代码（Express 5 + 原生 ES Module 前端）；
- MySQL Schema（`schema.sql`）、一键初始化脚本（`setup-db.js`）；
- 接口冒烟测试（39 项）、数据库自检、演示数据脚本；
- 项目说明 `README.md` 与本交接文档。

---

## 2. 架构与依赖变更

### 2.1 总体架构

```text
浏览器（原生 HTML/CSS/ES Module，无构建）
  │  同源请求，Cookie: puzzle.sid
  ▼
Express 5（backend/server.js，端口 3000）
  ├─ 静态托管 ../frontend（登录页 / 游戏页 / 排行榜 / 个人中心）
  ├─ /api/* 路由（Session + JSON）
  │    ├─ routes/auth.js      注册 / 登录 / 退出 / 当前用户 / 修改密码
  │    └─ routes/records.js   提交成绩 / 我的成绩 / 排行榜
  ├─ services/ranking.js      CTE + ROW_NUMBER 排名计算
  └─ db.js                    mysql2/promise 连接池
  ▼
MySQL 8（login_demo：users、puzzle_records）
```

- 前端与后端**同源**（由 Express 托管静态文件），因此不需要跨域即可携带 Cookie；
- 额外允许 `http://localhost:5500` / `http://127.0.0.1:5500`（VS Code Live Server）跨域，便于调试；
- 没有打包/编译步骤，浏览器直接运行 ES Module。

### 2.2 技术栈

| 层 | 技术 |
| --- | --- |
| 运行时 | Node.js 18+（当前 v18.7.0），CommonJS 后端 |
| Web 框架 | Express 5.2.1 |
| 会话 | express-session 1.19（内存存储 MemoryStore） |
| 密码 | bcrypt 6（cost 10） |
| 数据库 | MySQL 8.0.46，驱动 mysql2/promise 3.24 |
| 配置 | dotenv 17（`.env`，`quiet: true`） |
| 跨域 | cors 2.8 |
| 前端 | 原生 HTML + CSS + ES Module，无框架、无构建 |
| 测试 | 自研 HTTP 冒烟脚本（Node 18 原生 `fetch`），无测试框架 |

### 2.3 npm 依赖变更

**核心结论：没有新增或删除任何 npm 依赖。** 初始项目已包含本项目所需的全部包，`dependencies` 与版本范围保持不变：

```json
"dependencies": {
  "bcrypt": "^6.0.0",
  "cors": "^2.8.6",
  "dotenv": "^17.4.2",
  "express": "^5.2.1",
  "express-session": "^1.19.0",
  "mysql2": "^3.24.4"
}
```

`package.json` 的非依赖字段有调整：

| 字段 | 原值 | 现值 |
| --- | --- | --- |
| version | 1.0.0 | 2.0.0 |
| description | 空 | 网页版拼图游戏：注册登录、修改密码、成绩记录与排行榜 |
| main | index.js（不存在） | server.js |
| scripts | 仅 test（占位报错） | `start` / `setup-db` / `db:check` / `change-password` / `seed-demo` / `smoke` / `test` |

> 已知小问题：`package-lock.json` 根部的 `version` 仍为 `1.0.0`（本次未重新生成 lock 文件，依赖未变所以不影响安装）。下次在 `backend` 目录执行 `npm install` 会自动同步，或手动改 lock 文件中两处 `version`。

### 2.4 数据库变更

- **数据库类型从未改变：始终是 MySQL 8**，项目中不存在 SQLite 依赖、SQLite 文件或 SQLite 语法（早期 grep 到的 `sqlite` 字样仅来自 `node_modules` 中依赖包自带的文档/类型定义）。
- 新增表：`puzzle_records`（拼图成绩）。
- 保留表：`users`（字段、数据、唯一索引均未改动）。
- 第二次需求（“更改为 MySQL”）实际做的是**补强 MySQL 配置与约束**，而非换库：
  - `db.js` 显式连接池参数（utf8mb4、keepAlive、`DB_POOL_SIZE`、超时、时区）；
  - `schema.sql` 增加 MySQL 8 `CHECK` 约束；
  - `setup-db.js` 幂等为已有表补齐 CHECK 约束，并打印 MySQL 版本；
  - 新增 `db-check.js`（`npm run db:check`）；
  - `GET /api/health` 返回 `database` 与 `mysql` 版本；
  - 新增 `.env.example`。

### 2.5 运行环境与配置

| 项 | 值 |
| --- | --- |
| 操作系统 | Windows（当前用户 `EXUSIAI\16282`） |
| Node.js | v18.7.0 |
| MySQL | 8.0.46，`localhost:3306`，服务名 `MySQL80` |
| 数据库名 | `login_demo` |
| 后端端口 | 3000（`.env` 的 `PORT`，可改） |
| 前端访问地址 | http://localhost:3000 |
| 版本控制 | **无 Git 仓库**（不要假设可回滚，改动前先备份） |

`.env` 变量（真实密码见该文件，勿外泄）：

| 变量 | 当前用途 |
| --- | --- |
| `DB_HOST` | MySQL 地址（localhost） |
| `DB_PORT` | 3306 |
| `DB_USER` | root |
| `DB_PASSWORD` | 本机开发密码（见 `.env`） |
| `DB_NAME` | login_demo |
| `DB_POOL_SIZE` | 可选，连接池大小，默认 10 |
| `SESSION_SECRET` | 会话签名密钥（当前值较弱，仅本地实验用） |
| `PORT` | 3000 |
| `CORS_ORIGINS` | 可选，逗号分隔的额外允许来源，默认 5500 两个地址 |

---

## 3. 核心文件变更清单

> 状态说明：**新增** = 原项目没有；**改写** = 原有文件被整体重写；**修改** = 局部调整；**未改** = 保持原样（列出供参考）。
> 删除：**没有删除任何原有文件**。开发期间的临时预览/截图脚本已全部清理，不在项目树中。

### 3.1 根目录

| 文件 | 状态 | 变更原因 |
| --- | --- | --- |
| `README.md` | 新增 | 面向使用者的运行说明、接口文档、数据库设计、验证结果与实验报告写作建议。 |
| `HANDOFF.md` | 新增 | 本交接文档，面向接手的 AI/开发者。 |
| `.vscode/launch.json` | 未改 | 原调试配置，**已知失效**：指向不存在的 `网站/public/index.html`，见第 7 节。 |

### 3.2 后端（`网站/backend/`）

| 文件 | 状态 | 变更原因 |
| --- | --- | --- |
| `server.js` | 改写 | 从“只有根路径登录接口”改为完整应用入口：统一 `/api` 前缀、Session 配置、健康检查、静态页面托管、404/错误处理。 |
| `db.js` | 改写 | 从简单连接池改为显式 MySQL 配置（utf8mb4、keepAlive、池大小、超时）并提供启动时的连接诊断（版本/库名/端口）。 |
| `package.json` | 修改 | 更新版本/描述/入口，新增 `start`、`setup-db`、`db:check`、`seed-demo`、`smoke` 等脚本。 |
| `package-lock.json` | 未改 | 依赖没有变化，因此未重新生成 lock 文件。 |
| `change-password.js` | 改写 | 从写死账号/密码改为命令行参数 `node change-password.js <用户名> <新密码>`，增加长度校验并在结束时关闭连接池。 |
| `.env` | 未改 | 原有 MySQL 连接配置沿用，未改动；`db.js` 为各参数提供了默认值兜底。 |
| `.env.example` | 新增 | 提供 MySQL 连接与会话配置模板，避免把真实密码写进文档。 |
| `config.js` | 新增 | 集中维护支持难度、成绩校验上下限、排行榜条数、最近记录条数、Session Cookie 名。 |
| `schema.sql` | 新增 | MySQL 8 建表脚本：`users`（已存在则跳过）+ `puzzle_records`（索引、外键、CHECK 约束）。 |
| `setup-db.js` | 新增 | 一键创建数据库/表，并为已存在的 `puzzle_records` 幂等补齐 CHECK 约束；打印 MySQL 版本。 |
| `db-check.js` | 新增 | 连接自检：输出 MySQL 版本、库名、字符集、数据表与行数，证明真实连接 MySQL。 |
| `seed-demo.js` | 新增 | 可选：生成/清除 6 个演示账号与成绩，便于演示或报告截图（统一密码 `demo123456`）。 |
| `middleware/auth.js` | 新增 | `requireLogin`：无 Session `userId` 时统一返回 401 JSON。 |
| `middleware/rate-limit.js` | 新增 | 内存限流器，保护注册/登录接口，超限返回 429 与 `Retry-After`。 |
| `middleware/errors.js` | 新增 | 统一 API 404 与 500 错误处理，并识别 JSON 解析错误（400）。 |
| `routes/auth.js` | 新增 | 注册、登录、退出、当前用户、修改密码五个接口及全部校验逻辑。 |
| `routes/records.js` | 新增 | 提交成绩、我的成绩、排行榜三个接口与成绩合法性校验。 |
| `services/ranking.js` | 新增 | 使用 MySQL 8 窗口函数计算“每人每难度最佳成绩”的排名、个人汇总与最近记录。 |
| `utils/session.js` | 新增 | `express-session` 的 Promise 封装（regenerate/save/destroy），用于防会话固定。 |
| `utils/validate.js` | 新增 | 用户名/密码/邮箱校验，以及“数据库行 → 安全用户对象”的映射（绝不返回密码哈希）。 |
| `tests/smoke-test.js` | 新增 | 39 项接口冒烟测试，覆盖注册到排行榜、改密、重新登录与页面可访问性。 |
| `node_modules/` | 未改 | 依赖已安装，未新增包。 |

### 3.3 前端（`网站/frontend/`）

| 文件 | 状态 | 变更原因 |
| --- | --- | --- |
| `index.html` | 改写 | 从单张登录卡片改为“登录/注册”双 Tab 页面，接入新的 `/api` 接口，注册支持可选邮箱。 |
| `game.html` | 新增 | 拼图游戏页：计时/步数、棋盘、完成弹层、难度/图片选择、原图参考、本人最佳与名次。 |
| `leaderboard.html` | 新增 | 排行榜页：三档难度切换、前 20 名、前三名奖牌样式、本人高亮与“我的排名”。 |
| `profile.html` | 新增 | 个人中心：账号信息、各难度最佳/名次/局数、最近 20 条成绩、修改密码表单。 |
| `css/style.css` | 新增 | 全站样式：深色玻璃拟态主题、响应式布局（720px/980px 断点）、棋盘与拼块动画。 |
| `js/api.js` | 新增 | `fetch` 封装：统一 `/api` 前缀、`credentials: "include"`、错误转 `ApiError`、登录跳转白名单。 |
| `js/ui.js` | 新增 | 通用工具：时间格式化、名次样式、Toast、按钮加载态。 |
| `js/nav.js` | 新增 | 顶部导航用户信息与退出按钮绑定。 |
| `js/puzzle.js` | 新增 | 滑块拼图核心类：状态、可解性打乱、移动判定、完成检测、拼块 DOM 与动画定位。 |
| `js/auth-page.js` | 新增 | 登录/注册页逻辑：Tab 切换、客户端校验、提交、错误展示、已登录跳转。 |
| `js/game-page.js` | 新增 | 游戏页控制器：计时器、难度/图片切换、成绩提交、名次展示、键盘操作、竞态保护。 |
| `js/profile-page.js` | 新增 | 个人中心渲染与修改密码提交逻辑。 |
| `js/leaderboard-page.js` | 新增 | 排行榜加载、表格渲染、我的排名与空状态。 |
| `assets/puzzle-sunset.svg` | 新增 | 拼图图片一：日落山湖（纯 SVG，无外部资源）。 |
| `assets/puzzle-neon.svg` | 新增 | 拼图图片二：霓虹光环（纯 SVG）。 |

### 3.4 其他原有文件

| 文件 | 状态 | 说明 |
| --- | --- | --- |
| `网站/.vscode/settings.json` | 未改 | Python 环境设置，与本项目无关。 |
| `网站/屏幕截图 2026-09-10 214945.png` | 未改 | 原工作区遗留的 CSS 盒模型示意图，与本项目无关，未使用。 |

---

## 4. 数据库 Schema 定义

### 4.1 数据库级信息

| 项 | 值 |
| --- | --- |
| DBMS | MySQL 8.0.46（要求 8.0.16+，以便 CHECK 约束强制执行） |
| 数据库 | `login_demo` |
| 默认字符集/排序 | `utf8mb4` / `utf8mb4_unicode_ci` |
| 存储引擎 | InnoDB |
| 当前数据 | `users` 4 行；`puzzle_records` 0 行 |

### 4.2 `users`（用户表，沿用原结构，未改动）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | INT | PK，NOT NULL，AUTO_INCREMENT | 用户 ID |
| `username` | VARCHAR(50) | NOT NULL，UNIQUE `username` | 登录名，3~20 位中文/字母/数字/下划线（应用层校验） |
| `email` | VARCHAR(100) | NOT NULL，UNIQUE `email` | 邮箱；API 中可选，缺省生成 `${username}@student.local` |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt 哈希（cost 10），永不返回前端 |
| `created_at` | TIMESTAMP | NULL，DEFAULT CURRENT_TIMESTAMP | 注册时间 |

- 引擎/字符集：`InnoDB` / `utf8mb4_unicode_ci`。
- 因排序规则为 `_ci`，用户名、邮箱的唯一性与查询均**大小写不敏感**。
- `email` 在库中为 NOT NULL，所以“邮箱选填”由后端自动补全，不能存 NULL。

建表语句见 [`网站/backend/schema.sql`](网站/backend/schema.sql)。

### 4.3 `puzzle_records`（拼图完成记录，本次新增）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| `id` | INT | PK，NOT NULL，AUTO_INCREMENT | 记录 ID |
| `user_id` | INT | NOT NULL，FK → `users.id` | 所属用户 |
| `size` | TINYINT | NOT NULL，CHECK `size IN (3,4,5)` | 棋盘边长（难度） |
| `moves` | INT | NOT NULL，CHECK `moves > 0` | 本局移动步数 |
| `duration_ms` | INT | NOT NULL，CHECK `duration_ms > 0` | 完成用时（毫秒） |
| `completed_at` | TIMESTAMP | NOT NULL，DEFAULT CURRENT_TIMESTAMP | 完成时间 |

索引：

| 索引名 | 字段 | 用途 |
| --- | --- | --- |
| `PRIMARY` | `id` | 主键 |
| `idx_size_time` | (`size`, `duration_ms`) | 按难度取成绩/排序 |
| `idx_user_size` | (`user_id`, `size`) | 查某用户某难度最佳 |
| `idx_user_time` | (`user_id`, `completed_at`) | 查用户最近记录 |

外键与检查约束：

| 约束名 | 类型 | 定义 |
| --- | --- | --- |
| `fk_puzzle_records_user` | FOREIGN KEY | `user_id` REFERENCES `users(id)` ON DELETE CASCADE |
| `chk_puzzle_size` | CHECK | `size IN (3, 4, 5)` |
| `chk_puzzle_moves` | CHECK | `moves > 0` |
| `chk_puzzle_duration` | CHECK | `duration_ms > 0` |

完整 DDL：

```sql
CREATE TABLE IF NOT EXISTS puzzle_records (
  id           INT       NOT NULL AUTO_INCREMENT,
  user_id      INT       NOT NULL COMMENT '关联 users.id',
  size         TINYINT   NOT NULL COMMENT '棋盘边长：3 / 4 / 5',
  moves        INT       NOT NULL COMMENT '本局移动步数',
  duration_ms  INT       NOT NULL COMMENT '完成用时（毫秒）',
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_size_time (size, duration_ms),
  KEY idx_user_size (user_id, size),
  KEY idx_user_time (user_id, completed_at),
  CONSTRAINT chk_puzzle_size CHECK (size IN (3, 4, 5)),
  CONSTRAINT chk_puzzle_moves CHECK (moves > 0),
  CONSTRAINT chk_puzzle_duration CHECK (duration_ms > 0),
  CONSTRAINT fk_puzzle_records_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '拼图完成记录';
```

### 4.4 关系与规则

- 一个用户 0..N 条成绩；删除用户会级联删除其所有成绩。
- 排行榜只关心每位用户在每个难度的**一条最佳成绩**（用窗口函数选取，见第 6 节）。
- `size` 只允许 3/4/5；前端目前也只提供这三档。

---

## 5. API 接口定义

### 5.1 通用约定

- 基地址：同源 `/api`（默认 http://localhost:3000）。
- 请求体：`Content-Type: application/json`，上限 16KB。
- 成功响应：HTTP 200/201 + `{ "ok": true, ... }`。
- 失败响应：HTTP 4xx/5xx + `{ "error": "中文提示" }`，例如：

```json
{ "error": "用户名或密码错误" }
```

- 认证方式：服务端 Session，Cookie 名 `puzzle.sid`（HttpOnly、SameSite=Lax、7 天）。
- 需要登录的接口未登录时返回 `401 { "error": "请先登录" }`。
- 所有 `/api` 响应带 `Cache-Control: no-store`。
- 时间字段由 MySQL `TIMESTAMP` / JS `Date` 序列化为 ISO 8601 字符串。
- 限流：`/api/register` 与 `/api/login` 共用同一 IP 限流桶，10 分钟最多 60 次，超出返回 `429` 与 `Retry-After`。

### 5.2 接口总览（方法 / 路径 -> 请求 -> 返回）

| 接口 | 请求参数 -> 返回结构 |
| --- | --- |
| `POST /api/register` | `{ username, password, email? }` -> `{ ok, message, user }`（201） |
| `POST /api/login` | `{ username, password }` -> `{ ok, message, user }` |
| `POST /api/logout` | 无 -> `{ ok, message }` |
| `GET /api/me` | 无 -> `{ ok, user }` |
| `POST /api/password` | `{ oldPassword, newPassword }` -> `{ ok, message }` |
| `POST /api/records` | `{ size, moves, durationMs }` -> `{ ok, record, isBest, rank }`（201） |
| `GET /api/records/me` | 无 -> `{ ok, user, stats[], records[] }` |
| `GET /api/leaderboard?size=3` | 查询参数 `size?` -> `{ ok, size, total, entries[], me }` |
| `GET /api/health` | 无 -> `{ ok, service, database, mysql, time }` |

> `logout`、`me`、`password`、`records`、`records/me` 需要登录（401）；`register`、`login`、`leaderboard`、`health` 公开。

### 5.3 未登录可访问

#### `POST /api/register` — 注册（成功即登录）

请求：

```ts
{
  username: string; // 3~20 位中文/字母/数字/下划线
  password: string; // 6~64 位
  email?: string;   // 可选；不填自动生成 `${username}@student.local`
}
```

成功 `201`：

```ts
{
  ok: true;
  message: "注册成功";
  user: {
    id: number;
    username: string;
    email: string;
    createdAt: string; // ISO 时间
  };
}
```

错误：

| 状态 | 场景 |
| --- | --- |
| 400 | 用户名/密码/邮箱格式不合法 |
| 409 | 用户名或邮箱已存在（`ER_DUP_ENTRY`） |
| 429 | 触发限流 |
| 500 | 服务器异常 |

---

#### `POST /api/login` — 登录

请求：

```ts
{ username: string; password: string }
```

成功 `200`：

```ts
{
  ok: true;
  message: "登录成功";
  user: { id: number; username: string; email: string; createdAt: string };
}
```

错误：`400` 缺少参数；`401` 用户名或密码错误（不区分用户不存在/密码错）；`429` 限流；`500`。

---

#### `GET /api/leaderboard?size=3` — 排行榜（公开）

请求参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `size` | number | 否 | 3/4/5，非法或缺省按 3 处理 |

成功 `200`：

```ts
{
  ok: true;
  size: number;   // 3 | 4 | 5
  total: number;  // 该难度有成绩的用户数（不是记录数）
  entries: Array<{
    rank: number;         // 从 1 开始，唯一
    username: string;
    durationMs: number;
    moves: number;
    completedAt: string;
    isMe: boolean;        // 仅当请求携带有效登录 Session
  }>;                     // 最多 20 条
  me: null | {
    rank: number;
    username: string;
    durationMs: number;
    moves: number;
    completedAt: string;
  };
}
```

说明：未登录或本人无该难度成绩时 `me = null`；`me` 不受前 20 名截断影响。

---

#### `GET /api/health` — 健康检查

成功 `200`（即使 MySQL 不可用也返回 200，用 `database` 标识）：

```ts
{
  ok: true;
  service: "puzzle-login";
  database: boolean;    // MySQL SELECT VERSION() 是否成功
  mysql: string | null; // 例如 "8.0.46"
  time: string;
}
```

---

### 5.4 需要登录（401 见 5.1）

#### `POST /api/logout` — 退出

请求：无 body。成功 `200`：

```ts
{ ok: true; message: "已退出登录" }
```

同时销毁 Session 并清除 `puzzle.sid` Cookie。

---

#### `GET /api/me` — 当前用户

成功 `200`：

```ts
{ ok: true; user: { id: number; username: string; email: string; createdAt: string } }
```

若用户已被删除：清理 Session 并返回 `401`。

---

#### `POST /api/password` — 修改密码

请求：

```ts
{ oldPassword: string; newPassword: string }
```

成功 `200`：

```ts
{ ok: true; message: "密码修改成功，请牢记新密码" }
```

错误：

| 状态 | 场景 |
| --- | --- |
| 400 | 缺原密码 / 新密码不合规（6~64 位） / 原密码错误 / 新旧密码相同 |
| 401 | 未登录或账号不存在 |

修改后当前 Session 保持有效，不强制重新登录。

---

#### `POST /api/records` — 提交一局成绩

请求：

```ts
{
  size: number;       // 3 | 4 | 5
  moves: number;      // 整数，1~5000
  durationMs: number; // 整数，800~10,800,000（3 小时）
}
```

成功 `201`：

```ts
{
  ok: true;
  record: {
    id: number;
    size: number;
    moves: number;
    durationMs: number;
    completedAt: string;
  };
  isBest: boolean;     // 是否刷新个人该难度最佳（严格更快才算）
  rank: {
    rank: number;       // 提交后的本人名次
    total: number;      // 该难度有成绩的用户数
    bestMs: number;     // 本人该难度最佳用时
    bestMoves: number;  // 最佳成绩对应步数
  };
}
```

错误：`400` 难度/步数/用时非法（成绩不入库）；`401` 未登录；`500`。

---

#### `GET /api/records/me` — 我的成绩汇总 + 最近记录

成功 `200`：

```ts
{
  ok: true;
  user: { id: number; username: string; email: string; createdAt: string };
  stats: Array<{              // 固定 3 条，顺序为 3×3、4×4、5×5
    size: number;
    plays: number;            // 该难度完成局数
    totalPlayers: number;     // 该难度有成绩的用户数
    rank: number | null;      // 未完成过则为 null
    bestMs: number | null;
    bestMoves: number | null;
    bestAt: string | null;
  }>;
  records: Array<{            // 最近 20 条，按完成时间倒序
    id: number;
    size: number;
    moves: number;
    durationMs: number;
    completedAt: string;
  }>;
}
```

---

### 5.5 静态页面（非 API）

| 路径 | 返回 |
| --- | --- |
| `GET /` | `frontend/index.html` |
| `GET /game.html` | 游戏页（前端自行校验登录） |
| `GET /leaderboard.html` | 排行榜（公开） |
| `GET /profile.html` | 个人中心（前端自行校验登录） |
| `GET /css/*`、`/js/*`、`/assets/*` | 静态资源 |
| 其他未匹配路径 | `404` 纯文本“404 页面不存在” |

---

## 6. 核心业务逻辑说明

### 6.1 认证与密码

- **密码存储**：`bcrypt.hash(password, 10)`，只存哈希；数据库不存明文，接口不返回 `password_hash`。
- **登录校验**：按用户名查用户（大小写不敏感），`bcrypt.compare`；用户不存在与密码错误统一返回“用户名或密码错误”，避免账号枚举。
- **会话固定防护**：注册成功、登录成功后都调用 `req.session.regenerate()`，再写入 `userId` 并 `save()`。
- **Session**：`express-session` 默认 MemoryStore（保存在 Node 进程内存），重启服务后所有登录态失效；Cookie 名 `puzzle.sid`，`httpOnly: true`、`sameSite: "lax"`、`secure: false`（仅本地 HTTP）、`maxAge: 7 天`。
- **退出**：销毁 Session + 清 Cookie。
- **限流**：内存 Map 按 IP 计数（注册与登录共享），10 分钟 60 次；`Retry-After` 为剩余秒数。重启清零。

### 6.2 注册校验规则

| 字段 | 规则 |
| --- | --- |
| username | trim 后 3~20 位，正则 `/^[A-Za-z0-9_\u4e00-\u9fa5]{3,20}$/` |
| password | 6~64 位，不 trim（允许空格） |
| email | 可选；trim + 转小写；有值则校验格式且 ≤100 位；为空则 `${username}@student.local` |

重复注册由数据库唯一索引兜底：捕获 `ER_DUP_ENTRY`，根据错误信息含 `email` 判断是邮箱冲突还是用户名冲突，返回 409。

### 6.3 修改密码

1. 必须登录；
2. 校验原密码非空、新密码 6~64 位；
3. `bcrypt.compare(oldPassword, currentHash)` 必须通过，否则 400“原密码不正确”；
4. 新旧密码 `bcrypt.compare` 相同则拒绝；
5. `bcrypt.hash(newPassword, 10)` 更新数据库。

### 6.4 成绩提交与校验

- 服务端要求整数（`Number.isInteger(Number(value))`，因此 `"3"` 这类数字字符串也会被接受）：`size ∈ {3,4,5}`、`moves ∈ [1, 5000]`、`durationMs ∈ [800, 10,800,000]`；
- 插入前查询该用户该难度的历史最佳 `MIN(duration_ms)`，用于返回 `isBest`（严格小于才算刷新）；
- 插入后重新计算该难度完整排名，返回本人名次、总人数与最佳成绩；
- 数据库层还有 CHECK 与 FK 兜底，非法数据写入会被 MySQL 拒绝（`ER_CHECK_CONSTRAINT_VIOLATED` / `ER_NO_REFERENCED_ROW_2`）。

### 6.5 排名与排行榜算法

核心 SQL（`services/ranking.js`，MySQL 8 窗口函数）：

```sql
WITH best AS (
  SELECT r.user_id, r.duration_ms, r.moves, r.completed_at,
         ROW_NUMBER() OVER (
           PARTITION BY r.user_id
           ORDER BY r.duration_ms ASC, r.moves ASC, r.completed_at ASC
         ) AS rn
  FROM puzzle_records r
  WHERE r.size = ?
),
ranked AS (
  SELECT user_id, duration_ms, moves, completed_at,
         ROW_NUMBER() OVER (
           ORDER BY duration_ms ASC, moves ASC, completed_at ASC
         ) AS rnk
  FROM best
  WHERE rn = 1
)
SELECT ranked.rnk, ranked.user_id, ranked.duration_ms, ranked.moves,
       ranked.completed_at, u.username
FROM ranked
JOIN users u ON u.id = ranked.user_id
ORDER BY ranked.rnk ASC;
```

规则：

1. 每位用户在同一难度只取**最佳成绩**（先按用时、再按步数、再按完成时间排序取第一条）；
2. 排名按用时升序；
3. 用时相同比步数，步数少者靠前；
4. 仍相同则更早完成者靠前；
5. `ROW_NUMBER()` 保证名次唯一、不并列；
6. 排行榜接口只返回前 20 条，`total` 是参与人数，`me` 始终可查（即使排在 20 名外）；
7. 个人中心的 `stats` 复用同一份排名结果，保证“游戏页 / 个人中心 / 排行榜”三处名次一致。

### 6.6 前端拼图逻辑（`frontend/js/puzzle.js`）

数据结构：

- `tiles[位置] = 拼块编号`，拼块编号 `0..n²-2` 对应原图从左到右、从上到下的切片；
- 编号 `n²-1` 是空格（图片右下角缺失一块）；
- 完成条件：对所有位置 `tiles[i] === i`。

打乱算法：

- 不是随机排列，而是从**已完成状态**执行 `n² × 26 + 60` 次合法移动（3×3=294、4×4=476、5×5=710 步）；
- 随机方向时排除立即反向，避免原地来回；
- 因此每一局一定可解；若极端情况下打乱后回到完成态，会重新打乱。

交互：

- 点击与空格相邻的拼块 → 该拼块滑入空格，`moves++`；
- 方向键：把空格某方向上的相邻拼块移过来（上下左右映射见 `game-page.js` 的 `KEY_DIRECTIONS`）；
- 第一次成功移动触发 `onFirstMove`，开始计时（`performance.now()`，每 100ms 刷新显示 `mm:ss.t`）；
- 完成时停止计时、`onSolved({ moves })` 回调，游戏页四舍五入得到 `durationMs` 并自动提交。

渲染：

- 每块是绝对定位的 `<button class="tile">`，`width/height = calc(100% / var(--size))`；
- 背景用同一张 SVG，`background-size: n×100%`，`background-position` 按拼块原始行列百分比裁切；
- 位置用 `transform: translate(col*100%, row*100%)` 表示，带 0.16s 过渡，实现滑动动画；
- 空格块加 `.blank`（无背景、无指针事件）；编号开关只切换 `.show-numbers`。

### 6.7 游戏页时序与竞态保护（`frontend/js/game-page.js`）

1. `requireUser()` 校验登录，失败跳转 `index.html?next=...`；
2. `mountNav(user)` 渲染用户名/退出；
3. `loadStats()` 拉取 `/api/records/me`，建立 `size → stats` 的 Map，更新“本难度最佳 / 我的排名”；
4. `newGame()` 重置计时/步数、递增 `roundId`、重建 `PuzzleGame` 并打乱；
5. 完成 → `stopTimer()` → 弹层显示“正在保存” → `POST /api/records`；
6. 提交成功：更新本地 stats、最佳/名次、弹层显示名次与是否新纪录；
7. 提交失败：弹层显示错误（可“再来一局”重开，**没有单独的重试按钮**）；
8. 若提交期间玩家已点“再来一局/重新打乱”，响应返回后通过 `roundId` 判断并**不再弹出旧成绩弹层**，但仍会更新最佳/名次缓存；
9. 切换难度或图片会直接开新局（不弹确认框，当前进度丢失）。

### 6.8 安全措施汇总

| 风险 | 处理 |
| --- | --- |
| 密码泄露 | bcrypt 哈希，永不返回 `password_hash` |
| SQL 注入 | 所有用户输入走参数化查询（`pool.execute`/占位符）；`LIMIT` 只用常量 |
| XSS | 前端一律 `textContent` / `createElement`，不拼接用户名等用户内容到 HTML |
| 会话固定 | 登录/注册后 `session.regenerate()` |
| 暴力尝试 | 注册/登录 IP 限流（60 次/10 分钟） |
| 账号枚举 | 登录统一错误文案 |
| 开放重定向 | `safeNextPage()` 仅允许 `game.html` / `profile.html` / `leaderboard.html` |
| 过期登录态 | 每次 `/api/me` 校验用户是否存在，用户被删则清理 Session |
| 缓存旧登录态 | API 响应 `Cache-Control: no-store` |

> 尚未实现：CSRF Token、HTTPS 下的 `secure` Cookie、持久化 Session Store、验证码。

---

## 7. 当前开发进度与未完成事项

### 7.1 完成度

| 实验要求 | 状态 | 对应实现 |
| --- | --- | --- |
| 1. 注册用户，用户名 + 密码登录 | ✅ 完成 | `POST /api/register`、`POST /api/login`、`index.html`，bcrypt + Session |
| 2. 修改密码 | ✅ 完成 | `POST /api/password`、`profile.html` 修改密码表单 |
| 3. 记录完成时间，查看本人排名 | ✅ 完成 | `POST /api/records`、`GET /api/records/me`；游戏页与个人中心显示最佳/名次 |
| 4. 最终用户排行榜 | ✅ 完成 | `GET /api/leaderboard`、`leaderboard.html`，三档难度、前 20 名、本人高亮 |

附加完成：3×3/4×4/5×5 难度、两张 SVG 拼图、计时/步数、原图参考、编号提示、方向键、MySQL 建表/自检/演示数据脚本、39 项接口测试、桌面与移动端响应式界面。

**没有被中断的开发项；当前没有进行到一半的代码。**

### 7.2 验证证据（本次交付前实际执行）

| 验证 | 结果 |
| --- | --- |
| `GET /api/health` | `{ database: true, mysql: "8.0.46" }` |
| `npm run db:check` | MySQL 8.0.46，`login_demo`，utf8mb4，`users` 4 行 / `puzzle_records` 0 行 |
| `npm run smoke` | **39 项全部通过**（注册、重复注册、弱密码、登录态、成绩、最佳成绩、排行榜排序、本人标记、改密、旧密码失效、退出、页面 200） |
| 拼图逻辑测试（临时脚本） | 3×3/4×4/5×5 各随机打乱 300 局，共 900 局全部为合法排列且可解；移动/步数/首次计时/完成回调/完成后禁止移动均正确（脚本未保留） |
| MySQL 约束 | size=7、moves=0、duration=-1 均被 `ER_CHECK_CONSTRAINT_VIOLATED` 拒绝；user_id=999999 被外键拒绝 |
| 界面 | 1440×1000 桌面与 390px 手机宽度检查，无溢出；截图仅用于 QA，未写入项目 |

数据库当前状态：`users` 4 行（原账号保留，密码未改动）、`puzzle_records` 0 行（干净状态）。演示数据已清除。

### 7.3 运行命令

```bash
cd "网站\backend"

npm install          # 首次/换机时安装依赖（当前 node_modules 已就绪）
npm run setup-db     # 建库建表、补齐 CHECK 约束（当前已执行）
npm run db:check     # 确认 MySQL 连接与表状态

npm start            # 启动服务，访问 http://localhost:3000
```

可选命令：

```bash
npm run smoke                     # 39 项接口测试（必须先启动服务）
node seed-demo.js                 # 生成 6 个演示账号/成绩（密码 demo123456）
node seed-demo.js --clear         # 清除演示账号及其成绩
node change-password.js 用户名 新密码   # 重置密码（可绕过旧密码）
```

> 注意：所有命令都要在 `网站/backend` 目录执行；`npm run smoke` 依赖服务已启动。

### 7.4 未完成 / 可继续改进的事项（按优先级）

1. **Session 持久化**：当前 MemoryStore，服务重启后所有人需重新登录。可接 `express-mysql-session`（新建 sessions 表）或 Redis。
2. **服务端防作弊**：成绩由前端上报，服务端只做范围校验，无法证明真的完成了拼图。可改为服务端生成/校验打乱种子、或记录开局与完成时间戳比对。
3. **排行榜分页/全量**：接口固定返回前 20 名；若要“完整榜单”，增加 `page`/`limit` 参数并保留 `me`。
4. **CSRF 防护**：可加双提交 Cookie 或 CSRF Token（当前依赖 SameSite=Lax + JSON 请求）。
5. **邮箱流程**：没有邮箱验证、找回密码、邮箱唯一性的用户友好提示。
6. **HTTPS 部署**：`cookie.secure` 目前为 `false`，上线需改 `true` 并配置反代/`trust proxy`。
7. **自动化测试体系**：目前只有冒烟脚本，且依赖运行中的服务；可引入 `vitest`/`node:test` 做纯函数与路由单测，并把拼图逻辑测试固化（当前临时测试已删除）。
8. **小问题**：
   - `package-lock.json` 根部版本仍是 `1.0.0`（`package.json` 为 2.0.0），执行一次 `npm install` 可同步；
   - 根目录 `.vscode/launch.json` 指向不存在的 `网站/public/index.html`，应改为打开 `http://localhost:3000` 或删除；
   - 无 Git 仓库，改动前建议先 `git init` 或备份；
   - 移动端输入框字号 15px，iOS 聚焦时可能自动放大，可改为 16px。

### 7.5 接手注意事项（Do / Don't）

- **Do**：保持 `users` 表结构与既有 4 个账号不变；所有新表通过 `setup-db.js`/`schema.sql` 创建。
- **Do**：保持 API 响应字段与前端约定一致（改字段需同步 `frontend/js/*.js`）。
- **Do**：数据库操作使用 `mysql2` 参数化查询；新增 SQL 时注意 MySQL 8 语法（本项目依赖窗口函数）。
- **Don't**：不要替换为 SQLite 或其它数据库；不要把密码/`password_hash` 返回给前端；不要在日志里打印密码。
- **Don't**：不要直接双击 HTML 用 `file://` 打开（模块、Cookie、接口都会失效），必须通过 `http://localhost:3000`。

### 7.6 关键文件速查

| 想知道什么 | 看哪里 |
| --- | --- |
| 服务入口、中间件、静态托管 | [`网站/backend/server.js`](网站/backend/server.js) |
| MySQL 连接配置 | [`网站/backend/db.js`](网站/backend/db.js) |
| 表结构与约束 | [`网站/backend/schema.sql`](网站/backend/schema.sql) |
| 注册/登录/改密逻辑 | [`网站/backend/routes/auth.js`](网站/backend/routes/auth.js) |
| 成绩/排行榜接口 | [`网站/backend/routes/records.js`](网站/backend/routes/records.js) |
| 排名 SQL 与个人汇总 | [`网站/backend/services/ranking.js`](网站/backend/services/ranking.js) |
| 校验规则与用户序列化 | [`网站/backend/utils/validate.js`](网站/backend/utils/validate.js) |
| 拼图核心算法 | [`网站/frontend/js/puzzle.js`](网站/frontend/js/puzzle.js) |
| 游戏页时序/计时/提交 | [`网站/frontend/js/game-page.js`](网站/frontend/js/game-page.js) |
| 前端请求封装 | [`网站/frontend/js/api.js`](网站/frontend/js/api.js) |
| 全站样式与响应式 | [`网站/frontend/css/style.css`](网站/frontend/css/style.css) |
| 建库/自检/测试/演示数据 | `setup-db.js`、`db-check.js`、`tests/smoke-test.js`、`seed-demo.js` |
| 面向使用者的说明 | [`README.md`](README.md) |
