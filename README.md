# 网页版拼图游戏 · 登录系统与成绩排行榜

广东海洋大学《登录页面设计》实验项目。在原有“学生登录系统”代码基础上扩展为**可玩的网页版拼图游戏**，并完整实现实验报告中的四项要求。

## 一、实验要求与实现对照

| 实验要求 | 实现方式 |
| --- | --- |
| 1. 能够注册用户，通过用户名和密码登录 | `index.html` 登录 / 注册页；密码使用 bcrypt 加盐哈希存储；登录成功后写入服务端 Session |
| 2. 能够修改密码 | `profile.html` 个人中心修改密码，必须校验原密码，新旧密码不能相同 |
| 3. 能够记录用户的完成时间，并可以查看本人排名 | 拼图完成后自动提交成绩；游戏页显示本难度最佳与本人名次，个人中心汇总三档难度的最佳成绩、名次和局数 |
| 4. 能够给出最终的用户排行榜 | `leaderboard.html` 排行榜，按 3×3 / 4×4 / 5×5 分档，展示前 20 名并高亮“我”的名次 |

在要求之外还实现了：三种难度、两张拼图、实时计时与步数、原图参考、拼块编号、方向键操作、成绩校验、接口限流等。

## 二、技术栈

- **前端**：原生 HTML + CSS + ES Module，无需框架与构建工具
- **后端**：Node.js 18+、Express 5、express-session、bcrypt、mysql2
- **数据库**：MySQL 8（InnoDB / utf8mb4），通过 `mysql2` 连接池访问，**未使用 SQLite**

## 三、目录结构

```text
login-system/
├── README.md
└── 网站/
    ├── backend/
    │   ├── server.js            # 服务入口：中间件、Session、静态页面、路由挂载
    │   ├── config.js            # 难度、成绩校验范围、排行榜条数等常量
    │   ├── db.js                # MySQL 连接池（mysql2）
    │   ├── db-check.js          # MySQL 连接自检
    │   ├── schema.sql           # MySQL 8 表结构（InnoDB / utf8mb4）
    │   ├── setup-db.js          # 一键建库建表并补齐约束
    │   ├── .env.example         # 环境变量示例（MySQL 连接配置）
    │   ├── seed-demo.js         # 可选：生成 / 清除演示数据
    │   ├── change-password.js   # 可选：命令行重置密码
    │   ├── routes/
    │   │   ├── auth.js          # 注册、登录、退出、当前用户、修改密码
    │   │   └── records.js       # 提交成绩、我的成绩、排行榜
    │   ├── services/ranking.js  # 排名计算（每位用户取最佳成绩）
    │   ├── middleware/          # 登录校验、限流、404 / 错误处理
    │   ├── utils/               # Session 封装、参数校验
    │   └── tests/smoke-test.js  # 接口冒烟测试（39 项）
    └── frontend/
        ├── index.html           # 登录 / 注册
        ├── game.html            # 拼图游戏
        ├── leaderboard.html     # 排行榜
        ├── profile.html         # 个人中心 / 修改密码
        ├── css/style.css        # 全站样式（含响应式）
        ├── js/                  # 页面逻辑与拼图核心
        └── assets/              # 两张内联 SVG 拼图
```

## 四、运行步骤

### 1. 准备环境

- Node.js ≥ 18
- MySQL 8（本机已启动，默认端口 3306）

### 2. 安装依赖

```bash
cd 网站/backend
npm install
```

### 3. 配置 MySQL 连接

复制 `网站/backend/.env.example` 为 `网站/backend/.env`（项目内已有 `.env` 的可直接修改）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| DB_HOST | localhost | MySQL 地址 |
| DB_PORT | 3306 | MySQL 端口 |
| DB_USER | root | 数据库用户名 |
| DB_PASSWORD | 空 | 数据库密码 |
| DB_NAME | login_demo | 数据库名 |
| DB_POOL_SIZE | 10 | 连接池大小 |
| SESSION_SECRET | 无 | 会话签名密钥，请改成随机长字符串 |
| PORT | 3000 | 后端服务端口 |

连接池配置在 [`网站/backend/db.js`](网站/backend/db.js)，使用 `mysql2/promise`，字符集 `utf8mb4`，并启用连接保活。

### 4. 初始化 MySQL 数据库

```bash
npm run setup-db
```

该命令会连接 MySQL，创建 `login_demo` 数据库、`users` 表（已存在则保留）与 `puzzle_records` 表，并为记录表补齐 `CHECK` 约束。初始化后可验证连接：

```bash
npm run db:check
```

输出示例：

```text
│ 版本： MySQL 8.0.46
│ 数据库： login_demo（utf8mb4）
数据表：
  • puzzle_records（0 行）
  • users（4 行）
```

### 5. 启动服务

```bash
npm start
```

浏览器访问 **http://localhost:3000**。

> 必须通过该地址访问，不要直接双击 html 文件或使用 `file://`，否则 Cookie 与接口请求都会失效。

### 6. 可选命令

```bash
npm run db:check                  # 检查 MySQL 连接、数据表与行数
npm run smoke                     # 接口冒烟测试（需服务已启动）
npm run seed-demo                 # 生成 6 个演示账号与排行榜数据
node seed-demo.js --clear         # 清除演示数据
node change-password.js 用户名 新密码   # 忘记密码时重置
```

演示账号统一密码为 `demo123456`，数据仅用于演示 / 截图，可随时清除。

## 五、页面说明

| 页面 | 内容 |
| --- | --- |
| 登录 / 注册 | 登录、注册切换；注册时邮箱选填，不填自动生成站内邮箱 |
| 拼图游戏 | 3×3 / 4×4 / 5×5 三种难度、两张图片、原图参考、编号提示、计时与步数、完成后自动保存成绩并显示本人名次 |
| 排行榜 | 未登录也可查看；三档难度切换；前三名奖牌样式；高亮本人并显示“我”的排名 |
| 个人中心 | 账号信息、各难度最佳用时 / 名次 / 局数、最近 20 条成绩、修改密码 |

拼图玩法：点击与空格相邻的拼块即可滑动，也可使用方向键。第一次移动开始计时，还原整张图片后自动提交成绩。

## 六、接口一览

| 方法 | 路径 | 说明 | 登录 |
| --- | --- | --- | --- |
| POST | `/api/register` | 注册（成功后自动登录） | 否 |
| POST | `/api/login` | 用户名 + 密码登录 | 否 |
| POST | `/api/logout` | 退出登录 | 是 |
| GET | `/api/me` | 获取当前用户 | 是 |
| POST | `/api/password` | 修改密码（需原密码） | 是 |
| POST | `/api/records` | 提交一局成绩 `{ size, moves, durationMs }` | 是 |
| GET | `/api/records/me` | 我的成绩汇总与最近记录 | 是 |
| GET | `/api/leaderboard?size=3` | 指定难度排行榜（默认 3×3） | 否 |
| GET | `/api/health` | 服务与 MySQL 连接状态（含 `database`、`mysql` 版本） | 否 |

统一返回 JSON；出错时返回 `{ "error": "提示信息" }` 与对应 HTTP 状态码。

## 七、数据库设计

> 数据库为 **MySQL 8**，Schema 使用 MySQL 语法（`ENGINE=InnoDB`、`AUTO_INCREMENT`、`VARCHAR`/`TINYINT`、`TIMESTAMP`、外键与 `CHECK` 约束），后端通过 `mysql2` 连接池访问，**没有使用 SQLite**。

### users（用户表，沿用原有结构）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | INT PK | 自增主键 |
| username | VARCHAR(50) UNIQUE | 用户名，3~20 位中文 / 字母 / 数字 / 下划线 |
| email | VARCHAR(100) UNIQUE | 邮箱，注册时选填 |
| password_hash | VARCHAR(255) | bcrypt 哈希，绝不返回给前端 |
| created_at | TIMESTAMP | 注册时间 |

### puzzle_records（拼图完成记录，本次新增）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | INT PK | 自增主键 |
| user_id | INT FK | 关联 users.id，级联删除 |
| size | TINYINT | 棋盘边长 3 / 4 / 5 |
| moves | INT | 本局步数 |
| duration_ms | INT | 完成用时（毫秒） |
| completed_at | TIMESTAMP | 完成时间 |

### 索引与约束

- **外键**：`fk_puzzle_records_user` 关联 `users.id`，`ON DELETE CASCADE`（删除用户时自动删除其成绩）；
- **索引**：`(size, duration_ms)`、`(user_id, size)`、`(user_id, completed_at)`；
- **CHECK 约束**：`size IN (3,4,5)`、`moves > 0`、`duration_ms > 0`（MySQL 8.0.16+ 强制执行）。

### 排名规则

1. 每位用户在同一难度只取**最佳成绩**参与排名；
2. 用时越短越靠前；
3. 用时相同则步数少者靠前；
4. 仍相同则更早完成者靠前。

排名在 `services/ranking.js` 中使用 MySQL 8 窗口函数（`ROW_NUMBER()`）计算，个人名次与排行榜共用同一套规则。

## 八、实现要点

- **密码安全**：bcrypt（cost 10）加盐哈希；登录成功与注册成功后调用 `session.regenerate()` 防止会话固定攻击。
- **成绩校验**：服务端校验难度、步数与用时范围，非法成绩拒绝入库。
- **拼图可解性**：打乱不是随机排列，而是从完成状态执行数百次合法移动，保证每一局都一定有解。
- **拼块渲染**：每块用同一张原图配合 `background-size` / `background-position` 裁切，通过 `transform` 定位，支持响应式与滑动动画。
- **SQL 注入防护**：全部使用参数化查询，`LIMIT` 只使用校验后的常量。
- **XSS 防护**：用户名、邮箱等一律用 `textContent` 渲染，不拼接 HTML。

## 九、验证情况

- 接口冒烟测试 `npm run smoke`：**39 项全部通过**（含健康检查确认 MySQL 已连接；注册、重复注册、弱密码、登录态、成绩校验、最佳成绩、排行榜排序、本人高亮、修改密码、旧密码失效、页面可访问性等）。
- MySQL 自检 `npm run db:check`：连接到 MySQL 8.0.46，数据库 `login_demo`（utf8mb4），`users` 与 `puzzle_records` 均为 InnoDB，外键与 CHECK 约束生效。
- 拼图逻辑测试：3×3 / 4×4 / 5×5 各随机打乱 300 局，**全部为无重复合法排列且全部有解**；移动判定、步数统计、首次移动计时、完成回调、完成后禁止移动均正确。
- 界面在 1440px 桌面与 390px 手机宽度下检查，无明显溢出或错位。

## 十、实验报告写作建议

“实验过程”可按以下顺序展开并配截图：

1. 环境准备与数据库表结构（可截 Navicat / 命令行 `DESC` 结果）；
2. 注册页、注册成功提示；
3. 登录页、登录成功进入游戏；
4. 拼图游戏：切换难度、计时与步数、完成后弹窗（含本人名次）；
5. 排行榜页面（含前三名与“我”的排名）；
6. 个人中心：最佳成绩汇总与“修改密码”成功提示；
7. 关键代码说明：bcrypt 哈希、Session 保存登录态、可解性打乱、窗口函数排名。

## 十一、常见问题

| 问题 | 排查 |
| --- | --- |
| 项目是否使用 SQLite？ | 没有。数据库全部为 MySQL 8，后端使用 `mysql2` 连接池，项目中没有 SQLite 依赖或数据库文件 |
| 启动提示 `MySQL 连接失败` | 确认 MySQL 服务已启动；核对 `.env` 的账号密码；执行 `npm run setup-db` |
| 如何确认连的是 MySQL？ | 运行 `npm run db:check`，或访问 `/api/health` 查看 `database: true` 与 `mysql` 版本 |
| 页面能打开但登录报错 | 确认通过 `http://localhost:3000` 访问，且后端已启动 |
| 排行榜为空 | 还没有用户完成对应难度；先玩一局，或运行 `npm run seed-demo` |
| 端口 3000 被占用 | 修改 `.env` 的 `PORT`，访问对应端口 |
| 重启后需要重新登录 | Session 默认存在内存中，重启服务会清空，属正常现象 |
| 忘记密码 | `node change-password.js <用户名> <新密码>` |

## 十二、说明

- 数据库要求 **MySQL 8.0.16 及以上**（CHECK 约束自该版本起强制执行）。
- Session 采用内存存储，适合课程实验；正式部署建议换成 Redis / 数据库存储，并将 Cookie 的 `secure` 改为 `true`（HTTPS）。
- 排行榜默认展示前 20 名，超出部分仍会正确计算本人名次。
