export class BreakoutGame {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    // 回调函数
    this.onScoreUpdate = callbacks.onScoreUpdate || (() => {});
    this.onLevelUp = callbacks.onLevelUp || (() => {});
    this.onGameOver = callbacks.onGameOver || (() => {});

    this.level = 1;
    this.score = 0;
    this.isPlaying = false;
    this.isGameOver = false;
    this.isCountdown = false;

    this.paddle = { width: 100, height: 10, x: (canvas.width - 100) / 2 };
    this.ball = {
      x: canvas.width / 2,
      y: canvas.height - 30,
      radius: 8,
      dx: 2,
      dy: -2,
    };

    this.bricks = [];
    this.brickConfig = {
      rowCount: 4,
      colCount: 8,
      width: 80,
      height: 20,
      padding: 10,
      offsetTop: 40,
      offsetLeft: 35,
    };

    this.baseSpeed = 2; // 基础速度

    this.initBricks();
    this.bindEvents();
  }

  initBricks() {
    this.bricks = [];
    for (let c = 0; c < this.brickConfig.colCount; c++) {
      this.bricks[c] = [];
      for (let r = 0; r < this.brickConfig.rowCount; r++) {
        this.bricks[c][r] = {
          x: 0,
          y: 0,
          status: 1,
          points: (this.brickConfig.rowCount - r) * 5,
        };
      }
    }
  }

  bindEvents() {
    this.mouseMoveHandler = (e) => {
      if (this.isCountdown || !this.isPlaying) return;
      const rect = this.canvas.getBoundingClientRect();
      // 适配画布缩放
      const scaleX = this.canvas.width / rect.width;
      const relativeX = (e.clientX - rect.left) * scaleX;

      if (relativeX > 0 && relativeX < this.canvas.width) {
        this.paddle.x = relativeX - this.paddle.width / 2;
      }
    };
    document.addEventListener("mousemove", this.mouseMoveHandler);
  }

  start() {
    this.isPlaying = true;
    this.isGameOver = false;
    this.level = 1;
    this.score = 0;
    this.ball.dx = this.baseSpeed;
    this.ball.dy = -this.baseSpeed;
    this.resetBallAndPaddle();
    this.initBricks();
    this.onScoreUpdate(this.score, this.level, this.getTargetScore());
    this.loop();
  }

  resetBallAndPaddle() {
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.canvas.height - 30;
    this.paddle.x = (this.canvas.width - this.paddle.width) / 2;
  }

  getTargetScore() {
    // 目标分：第一关50，之后每关加30
    return 50 + (this.level - 1) * 30;
  }

  levelUp() {
    this.isPlaying = false;
    this.isCountdown = true;
    this.onLevelUp(this.level);

    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        this.drawCountdownUI(count);
      } else {
        clearInterval(countdownInterval);
        this.startNextLevel();
      }
    }, 1000);
  }

  startNextLevel() {
    this.level++;
    // 速度递增
    this.ball.dx = this.baseSpeed * (1 + (this.level - 1) * 0.15);
    this.ball.dy = -this.baseSpeed * (1 + (this.level - 1) * 0.15);

    this.resetBallAndPaddle();
    this.initBricks();
    this.isCountdown = false;
    this.isPlaying = true;
    this.onScoreUpdate(this.score, this.level, this.getTargetScore());
    this.loop();
  }

  drawCountdownUI(count) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBricks();
    this.drawBall();
    this.drawPaddle();
    this.ctx.font = "40px sans-serif";
    this.ctx.fillStyle = "#667eea";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "过关！",
      this.canvas.width / 2,
      this.canvas.height / 2 - 40,
    );
    this.ctx.font = "30px sans-serif";
    this.ctx.fillStyle = "#ffcc00";
    this.ctx.fillText(
      `下一关 ${count} 秒后开始...`,
      this.canvas.width / 2,
      this.canvas.height / 2 + 40,
    );
  }

  collisionDetection() {
    for (let c = 0; c < this.brickConfig.colCount; c++) {
      for (let r = 0; r < this.brickConfig.rowCount; r++) {
        let b = this.bricks[c][r];
        if (b.status === 1) {
          if (
            this.ball.x > b.x &&
            this.ball.x < b.x + this.brickConfig.width &&
            this.ball.y > b.y &&
            this.ball.y < b.y + this.brickConfig.height
          ) {
            this.ball.dy = -this.ball.dy;
            b.status = 0;
            this.score += b.points;
            this.onScoreUpdate(this.score, this.level, this.getTargetScore());

            if (this.score >= this.getTargetScore()) {
              this.levelUp();
              return;
            }
          }
        }
      }
    }
  }

  drawBall() {
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = "#ffcc00";
    this.ctx.fill();
    this.ctx.closePath();
  }

  drawPaddle() {
    this.ctx.beginPath();
    this.ctx.rect(
      this.paddle.x,
      this.canvas.height - this.paddle.height,
      this.paddle.width,
      this.paddle.height,
    );
    this.ctx.fillStyle = "#667eea";
    this.ctx.fill();
    this.ctx.closePath();
  }

  drawBricks() {
    for (let c = 0; c < this.brickConfig.colCount; c++) {
      for (let r = 0; r < this.brickConfig.rowCount; r++) {
        if (this.bricks[c][r].status === 1) {
          let brickX =
            c * (this.brickConfig.width + this.brickConfig.padding) +
            this.brickConfig.offsetLeft;
          let brickY =
            r * (this.brickConfig.height + this.brickConfig.padding) +
            this.brickConfig.offsetTop;
          this.bricks[c][r].x = brickX;
          this.bricks[c][r].y = brickY;
          this.ctx.beginPath();
          this.ctx.rect(
            brickX,
            brickY,
            this.brickConfig.width,
            this.brickConfig.height,
          );
          this.ctx.fillStyle = `hsl(${c * 40}, 80%, 60%)`;
          this.ctx.fill();
          this.ctx.closePath();
        }
      }
    }
  }

  loop() {
    if (!this.isPlaying) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBricks();
    this.drawBall();
    this.drawPaddle();
    this.collisionDetection();

    if (!this.isPlaying) return; // 如果刚好过关了，停止更新

    // 墙壁碰撞
    if (
      this.ball.x + this.ball.dx > this.canvas.width - this.ball.radius ||
      this.ball.x + this.ball.dx < this.ball.radius
    ) {
      this.ball.dx = -this.ball.dx;
    }
    if (this.ball.y + this.ball.dy < this.ball.radius) {
      this.ball.dy = -this.ball.dy;
    } else if (
      this.ball.y + this.ball.dy >
      this.canvas.height - this.ball.radius
    ) {
      // 挡板碰撞
      if (
        this.ball.x > this.paddle.x &&
        this.ball.x < this.paddle.x + this.paddle.width
      ) {
        let hitPos =
          (this.ball.x - (this.paddle.x + this.paddle.width / 2)) /
          (this.paddle.width / 2);
        this.ball.dx = hitPos * 5;
        this.ball.dy = -Math.abs(this.ball.dy);
      } else {
        // 失败
        this.isPlaying = false;
        this.isGameOver = true;
        this.onGameOver(this.level);
        return;
      }
    }

    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    requestAnimationFrame(() => this.loop());
  }
}
