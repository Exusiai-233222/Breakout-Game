```markdown
# 交接文档（Handoff Document）· 弹珠挑战系统

> **文档用途**：记录项目重构后的架构与代码现状，供后续开发者或 AI 快速接手。
> **当前状态**：已将原始的“拼图游戏”完全重构为“弹珠撞墙(Breakout)”游戏，并通过完整测试。

## 1. 核心变更记录（从拼图到弹珠）

1. **数据库变更**：
   - `puzzle_records` 表新增 `level` (通关关卡) 字段。
   - 删除了原有的 `chk_puzzle_moves` 约束（因为弹珠游戏不需要记录步数，原约束要求 moves > 0 导致插入失败）。
2. **排名规则变更**：
   - 原规则：纯按 `duration_ms` 升序。
   - 新规则：先按 `level` 降序（关卡越高越靠前），同关卡再按 `duration_ms` 升序。
3. **前端核心重构**：
   - 移除了 `puzzle.js` 以及关于 `3x3 / 4x4 / 5x5` 的多难度切换逻辑。
   - 新增 `breakout.js`：基于 Canvas 的面向对象弹珠游戏核心类。

## 2. 核心逻辑说明

### 2.1 游戏核心 (`frontend/js/breakout.js`)

- **渲染**：通过 `requestAnimationFrame` 持续清空并重绘 Canvas。
- **控制**：监听 `mousemove` 动态改变挡板 `paddle.x` 坐标。
- **碰撞检测**：
  - 左右墙壁/顶部墙壁：反转 `dx` 或 `dy`。
  - 挡板：反弹并根据撞击点计算横向速度 `hitPos * 5`。
  - 砖块：遍历二维数组，命中则将 `status` 置 0 并加分。
- **过关机制**：`score >= targetScore` 时触发 `levelUp()`，游戏暂停 3 秒倒计时，随后重置砖块、弹珠位置，并增加基础速度。

### 2.2 成绩提交与排名 (`backend/routes/records.js` & `services/ranking.js`)

- 接口 `/api/records` 接收 `{ size: 3, level, durationMs }`。
- 接口校验：`level >= 1` 且 `durationMs > 800`（防止作弊）。
- `ranking.js` 中的 SQL 采用窗口函数，按 `size = 3` 提取每位用户的最高 `level` 及最短 `durationMs`，再使用 `ROW_NUMBER()` 生成全站排名。

## 3. 已知遗留问题与改进建议

1. **个人中心展示**：`profile.html` 里的战绩卡片目前只渲染了弹珠游戏（`size=3`）的数据，如果后续要加其他游戏，需改为动态渲染。
2. **防作弊机制较弱**：当前成绩完全由前端 `game-page.js` 计算并提交，玩家可通过控制台直接发送伪造的 POST 请求刷榜。改进方案：在服务端生成并验证一次性 token，或在服务端记录游戏开始时间进行时间差校验。
3. **游戏上限**：`breakout.js` 中速度无上限递增，当关卡极高时可能导致单帧位移过大而“穿模”。建议在 `levelUp` 中增加速度封顶逻辑（例如最大速度为初始的 3 倍）。
4. **多文件拆分**：目前 `game-page.js` 承担了 UI、计时器和接口调用的职责，若后续功能复杂，可将计时器逻辑抽离为单独模块。

## 4. 环境与启动

参考 `README.md`。注意：`.env` 和 `node_modules` 已通过 `.gitignore` 忽略，不要提交。
```
