/**
 * 滑块拼图核心逻辑（与界面无关的部分尽量保持纯粹）
 *
 * 数据结构：tiles[位置] = 拼块编号
 *   - 拼块编号 0 ~ n²-2 对应原图从左到右、从上到下的切片
 *   - 编号 n²-1 为空格
 *   - 当且仅当 tiles[i] === i 时拼图完成
 */
export class PuzzleGame {
  constructor({ board, size = 3, imageUrl, onFirstMove, onMove, onSolved } = {}) {
    this.board = board;
    this.size = size;
    this.imageUrl = imageUrl;
    this.onFirstMove = onFirstMove;
    this.onMove = onMove;
    this.onSolved = onSolved;

    this.tiles = [];
    this.moves = 0;
    this.solved = false;
    this.started = false;
    this.elements = new Map();

    this.board.style.setProperty("--size", String(size));
  }

  get total() {
    return this.size * this.size;
  }

  get blankPiece() {
    return this.total - 1;
  }

  /** 开始新的一局：重置状态、随机打乱并渲染 */
  newGame() {
    this.solved = false;
    this.started = false;
    this.moves = 0;
    this.tiles = Array.from({ length: this.total }, (_, index) => index);
    this.shuffle();
    this.build();
    this.syncPositions(false);
  }

  /** 用随机合法走法打乱，保证一定有解（不会出现无解的随机排列） */
  shuffle() {
    const steps = this.total * 26 + 60;
    let blank = this.tiles.indexOf(this.blankPiece);
    let previous = -1;

    for (let step = 0; step < steps; step += 1) {
      const options = this.neighbors(blank).filter((position) => position !== previous);
      const target = options[Math.floor(Math.random() * options.length)];

      this.tiles[blank] = this.tiles[target];
      this.tiles[target] = this.blankPiece;

      previous = blank;
      blank = target;
    }

    // 极小概率打乱后仍是完成状态，重新打乱
    if (this.isSolved()) this.shuffle();
  }

  neighbors(position) {
    const size = this.size;
    const row = Math.floor(position / size);
    const col = position % size;
    const result = [];

    if (row > 0) result.push(position - size);
    if (row < size - 1) result.push(position + size);
    if (col > 0) result.push(position - 1);
    if (col < size - 1) result.push(position + 1);

    return result;
  }

  positionOf(piece) {
    return this.tiles.indexOf(piece);
  }

  isSolved() {
    return this.tiles.every((piece, position) => piece === position);
  }

  /** 尝试把某个位置上的拼块滑入空格 */
  move(position) {
    if (this.solved) return false;

    const blankPosition = this.tiles.indexOf(this.blankPiece);
    if (!this.neighbors(blankPosition).includes(position)) return false;

    this.tiles[blankPosition] = this.tiles[position];
    this.tiles[position] = this.blankPiece;
    this.moves += 1;

    if (!this.started) {
      this.started = true;
      this.onFirstMove?.();
    }

    this.syncPositions(true);
    this.onMove?.(this.moves);

    if (this.isSolved()) {
      this.solved = true;
      this.onSolved?.({ moves: this.moves });
    }

    return true;
  }

  setShowNumbers(show) {
    this.board.classList.toggle("show-numbers", Boolean(show));
  }

  /** 生成拼块 DOM：每块用 background-position 截取原图的一部分 */
  build() {
    this.board.replaceChildren();
    this.elements.clear();

    const denominator = this.size - 1;

    for (let piece = 0; piece < this.total; piece += 1) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "tile";
      element.dataset.piece = String(piece);

      if (piece === this.blankPiece) {
        element.classList.add("blank");
        element.setAttribute("aria-hidden", "true");
        element.tabIndex = -1;
      } else {
        const col = piece % this.size;
        const row = Math.floor(piece / this.size);

        element.style.backgroundImage = `url("${this.imageUrl}")`;
        element.style.backgroundSize = `${this.size * 100}% ${this.size * 100}%`;
        element.style.backgroundPosition = `${(col / denominator) * 100}% ${(row / denominator) * 100}%`;
        element.setAttribute("aria-label", `拼块 ${piece + 1}`);

        const number = document.createElement("span");
        number.className = "tile-num";
        number.textContent = String(piece + 1);
        element.append(number);
      }

      this.elements.set(piece, element);
      this.board.append(element);
    }
  }

  /** 根据 tiles 更新每块的位置（translate 百分比相对自身宽高，正好一格） */
  syncPositions(animate = true) {
    if (!animate) {
      for (const element of this.elements.values()) {
        element.classList.add("no-anim");
      }
    }

    for (const [piece, element] of this.elements) {
      const position = this.tiles.indexOf(piece);
      const row = Math.floor(position / this.size);
      const col = position % this.size;
      element.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
    }

    if (!animate) {
      requestAnimationFrame(() => {
        for (const element of this.elements.values()) {
          element.classList.remove("no-anim");
        }
      });
    }
  }
}
