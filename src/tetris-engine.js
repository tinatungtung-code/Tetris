/**
 * Pure Tetris Engine (ES Module)
 * Implements standard Tetris guidelines:
 * - 10x20 visible grid + 2 buffer rows (22 rows total)
 * - 7-Bag randomizer
 * - Super Rotation System (SRS) wall kicks
 * - Ghost piece calculation
 * - Hold piece with 1-swap per turn lock
 * - Lock delay handling
 * - Standard scoring (Single, Double, Triple, Tetris, Combos, Soft/Hard drop)
 * - Difficulty scaling
 */

export const COLS = 10;
export const ROWS = 20;
export const BUFFER_ROWS = 2;
export const TOTAL_ROWS = ROWS + BUFFER_ROWS;

export const TETROMINOES = {
  I: {
    color: '#00e5ff', // Cyan
    accent: '#80f2ff',
    shadow: '#009bb3',
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  J: {
    color: '#3b82f6', // Blue
    accent: '#93c5fd',
    shadow: '#1d4ed8',
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  L: {
    color: '#f97316', // Orange
    accent: '#fdba74',
    shadow: '#c2410c',
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  O: {
    color: '#eab308', // Yellow
    accent: '#fef08a',
    shadow: '#a16207',
    matrix: [
      [1, 1],
      [1, 1],
    ],
  },
  S: {
    color: '#10b981', // Emerald / Green
    accent: '#6ee7b7',
    shadow: '#047857',
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
  },
  T: {
    color: '#a855f7', // Purple
    accent: '#d8b4fe',
    shadow: '#7e22ce',
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  Z: {
    color: '#ef4444', // Red
    accent: '#fca5a5',
    shadow: '#b91c1c',
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
  },
};

export const SHAPE_KEYS = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

// SRS Wall Kick Offsets for J, L, S, T, Z (screen coords: x right +, y down +)
const JLSTZ_KICKS = {
  '0->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1->0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1->2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3->2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3->0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

// SRS Wall Kick Offsets for I piece
const I_KICKS = {
  '0->1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1->0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1->2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2->1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2->3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3->2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3->0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0->3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

/**
 * Rotate matrix clockwise or counter-clockwise
 */
export function rotateMatrix(matrix, clockwise = true) {
  const size = matrix.length;
  const result = Array.from({ length: size }, () => Array(size).fill(0));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (clockwise) {
        result[c][size - 1 - r] = matrix[r][c];
      } else {
        result[size - 1 - c][r] = matrix[r][c];
      }
    }
  }
  return result;
}

/**
 * 7-Bag generator for uniform, fair tetromino distribution
 */
export class BagGenerator {
  constructor(randomFn = Math.random) {
    this.randomFn = randomFn;
    this.bag = [];
  }

  next() {
    if (this.bag.length === 0) {
      this.bag = [...SHAPE_KEYS];
      // Fisher-Yates shuffle
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.randomFn() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop();
  }
}

/**
 * Core Tetris Engine
 */
export class TetrisEngine {
  constructor(options = {}) {
    this.randomFn = options.randomFn || Math.random;
    this.reset();
  }

  reset() {
    // 22 rows (2 buffer + 20 visible), 10 cols
    this.board = Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
    this.bag = new BagGenerator(this.randomFn);
    
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.backToBack = false;
    this.isGameOver = false;

    this.holdPiece = null;
    this.canHold = true;

    // Queue of next 4 pieces
    this.nextQueue = [
      this.bag.next(),
      this.bag.next(),
      this.bag.next(),
      this.bag.next(),
    ];

    this.currentPiece = null;
    this.spawnPiece();
  }

  spawnPiece(type = null) {
    const shapeType = type || this.nextQueue.shift();
    if (!type) {
      this.nextQueue.push(this.bag.next());
    }

    const data = TETROMINOES[shapeType];
    const matrix = data.matrix.map((row) => [...row]);
    const size = matrix.length;

    // Center piece horizontally: (10 - size) / 2
    const x = Math.floor((COLS - size) / 2);
    // Spawn just above or in the buffer rows
    const y = shapeType === 'I' ? 0 : 1;

    this.currentPiece = {
      type: shapeType,
      color: data.color,
      accent: data.accent,
      shadow: data.shadow,
      matrix,
      rotation: 0, // 0, 1, 2, 3
      x,
      y,
      lockDelayRemaining: 500, // ms
      moveResetCount: 0,
    };

    this.canHold = true;

    // Check collision on spawn -> Game Over
    if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.matrix)) {
      this.isGameOver = true;
      return false;
    }

    return true;
  }

  checkCollision(targetX, targetY, matrix) {
    const size = matrix.length;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!matrix[r][c]) continue;
        const cellX = targetX + c;
        const cellY = targetY + r;

        // Boundaries check
        if (cellX < 0 || cellX >= COLS) return true;
        if (cellY >= TOTAL_ROWS) return true;
        // Ignore negative y (above ceiling)
        if (cellY < 0) continue;

        // Board collision
        if (this.board[cellY][cellX] !== null) return true;
      }
    }
    return false;
  }

  moveLeft() {
    if (this.isGameOver || !this.currentPiece) return false;
    if (!this.checkCollision(this.currentPiece.x - 1, this.currentPiece.y, this.currentPiece.matrix)) {
      this.currentPiece.x--;
      this.handlePieceMoved();
      return true;
    }
    return false;
  }

  moveRight() {
    if (this.isGameOver || !this.currentPiece) return false;
    if (!this.checkCollision(this.currentPiece.x + 1, this.currentPiece.y, this.currentPiece.matrix)) {
      this.currentPiece.x++;
      this.handlePieceMoved();
      return true;
    }
    return false;
  }

  softDrop() {
    if (this.isGameOver || !this.currentPiece) return false;
    if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.matrix)) {
      this.currentPiece.y++;
      this.score += 1; // 1 point per soft drop cell
      this.handlePieceMoved();
      return true;
    }
    return false;
  }

  hardDrop() {
    if (this.isGameOver || !this.currentPiece) return { droppedCells: 0, clearedLines: [] };
    let dropDistance = 0;
    while (!this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.matrix)) {
      this.currentPiece.y++;
      dropDistance++;
    }
    this.score += dropDistance * 2; // 2 points per hard drop cell
    const lockResult = this.lockPiece();
    return {
      droppedCells: dropDistance,
      ...lockResult,
    };
  }

  rotate(clockwise = true) {
    if (this.isGameOver || !this.currentPiece) return false;
    if (this.currentPiece.type === 'O') return true; // O piece doesn't need kick

    const fromRot = this.currentPiece.rotation;
    const toRot = clockwise ? (fromRot + 1) % 4 : (fromRot + 3) % 4;
    const rotatedMatrix = rotateMatrix(this.currentPiece.matrix, clockwise);

    const kickKey = `${fromRot}->${toRot}`;
    const kicks = this.currentPiece.type === 'I' ? I_KICKS[kickKey] : JLSTZ_KICKS[kickKey];

    if (!kicks) return false;

    for (const [dx, dy] of kicks) {
      const testX = this.currentPiece.x + dx;
      const testY = this.currentPiece.y + dy;

      if (!this.checkCollision(testX, testY, rotatedMatrix)) {
        this.currentPiece.matrix = rotatedMatrix;
        this.currentPiece.rotation = toRot;
        this.currentPiece.x = testX;
        this.currentPiece.y = testY;
        this.handlePieceMoved();
        return true;
      }
    }

    return false;
  }

  handlePieceMoved() {
    if (this.currentPiece && this.isOnGround()) {
      if (this.currentPiece.moveResetCount < 15) {
        this.currentPiece.lockDelayRemaining = 500;
        this.currentPiece.moveResetCount++;
      }
    }
  }

  isOnGround() {
    if (!this.currentPiece) return false;
    return this.checkCollision(this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.matrix);
  }

  getGhostPosition() {
    if (!this.currentPiece) return null;
    let ghostY = this.currentPiece.y;
    while (!this.checkCollision(this.currentPiece.x, ghostY + 1, this.currentPiece.matrix)) {
      ghostY++;
    }
    return {
      x: this.currentPiece.x,
      y: ghostY,
      matrix: this.currentPiece.matrix,
      color: this.currentPiece.color,
    };
  }

  hold() {
    if (this.isGameOver || !this.canHold || !this.currentPiece) return false;

    const currentType = this.currentPiece.type;
    if (this.holdPiece === null) {
      this.holdPiece = currentType;
      this.spawnPiece();
    } else {
      const temp = this.holdPiece;
      this.holdPiece = currentType;
      this.spawnPiece(temp);
    }

    this.canHold = false;
    return true;
  }

  lockPiece() {
    if (!this.currentPiece) return { clearedLines: [], scoreEarned: 0, isTetris: false };

    const { x, y, matrix, color, accent, shadow, type } = this.currentPiece;
    const size = matrix.length;

    let hasVisibleBlock = false;
    // Transfer piece to board
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!matrix[r][c]) continue;
        const boardY = y + r;
        const boardX = x + c;
        if (boardY >= BUFFER_ROWS) {
          hasVisibleBlock = true;
        }
        if (boardY >= 0 && boardY < TOTAL_ROWS && boardX >= 0 && boardX < COLS) {
          this.board[boardY][boardX] = { color, accent, shadow, type };
        }
      }
    }

    if (!hasVisibleBlock) {
      this.isGameOver = true;
    }

    // Check line clears
    const clearedLines = [];
    for (let r = 0; r < TOTAL_ROWS; r++) {
      if (this.board[r].every((cell) => cell !== null)) {
        clearedLines.push(r);
      }
    }

    let scoreEarned = 0;
    let isTetris = false;

    if (clearedLines.length > 0) {
      // Remove cleared lines and add new empty lines on top
      for (const lineIndex of clearedLines) {
        this.board.splice(lineIndex, 1);
        this.board.unshift(Array(COLS).fill(null));
      }

      this.lines += clearedLines.length;
      this.combo++;

      // Standard Tetris scoring
      const lineScores = {
        1: 100,
        2: 300,
        3: 500,
        4: 800,
      };

      let baseScore = (lineScores[clearedLines.length] || 100) * this.level;

      if (clearedLines.length === 4) {
        isTetris = true;
        if (this.backToBack) {
          baseScore = Math.floor(baseScore * 1.5); // Back-to-Back Tetris bonus
        }
        this.backToBack = true;
      } else {
        this.backToBack = false;
      }

      // Combo bonus
      const comboBonus = this.combo > 0 ? 50 * this.combo * this.level : 0;
      scoreEarned = baseScore + comboBonus;
      this.score += scoreEarned;

      // Level progression (every 10 lines)
      const calculatedLevel = Math.floor(this.lines / 10) + 1;
      if (calculatedLevel > this.level) {
        this.level = calculatedLevel;
      }
    } else {
      this.combo = -1;
    }

    // Spawn next piece
    this.currentPiece = null;
    const canSpawn = this.spawnPiece();
    if (!canSpawn) {
      this.isGameOver = true;
    }

    return {
      clearedLines,
      scoreEarned,
      isTetris,
      combo: this.combo,
      totalLines: this.lines,
      level: this.level,
      isGameOver: this.isGameOver,
    };
  }

  /**
   * Returns gravity tick interval in milliseconds based on current level
   */
  getDropInterval() {
    // Standard guideline speed curve
    // Level 1: 800ms, Level 5: 450ms, Level 10: 150ms, Level 15+: 80ms
    const speedCurve = [
      800, 720, 630, 550, 470, 380, 300, 220, 150, 120, 100, 90, 80, 70, 60,
    ];
    const index = Math.min(this.level - 1, speedCurve.length - 1);
    return speedCurve[index];
  }
}
