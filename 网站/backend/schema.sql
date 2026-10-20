-- ============================================================
-- 弹珠游戏 · MySQL 8 数据库结构（非 SQLite）
--
-- 语法说明：InnoDB、AUTO_INCREMENT、utf8mb4、TIMESTAMP、
--           外键约束、CHECK 约束（MySQL 8.0.16+ 强制执行）
--
-- 执行方式一（推荐）：在 backend 目录运行  npm run setup-db
-- 执行方式二（手动）：
--   mysql -u root -p
--   CREATE DATABASE IF NOT EXISTS login_demo
--     DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   USE login_demo;
--   SOURCE schema.sql;
-- ============================================================

-- 用户表（如果已存在则不会改动原有数据）
CREATE TABLE IF NOT EXISTS users (
  id            INT          NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)  COLLATE utf8mb4_unicode_ci NOT NULL,
  email         VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  password_hash VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  created_at    TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY username (username),
  UNIQUE KEY email (email)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '用户表';

-- 弹珠完成记录表：一条记录 = 用户完成一局的一次成绩
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
  COMMENT = '弹珠完成记录';
