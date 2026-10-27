import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TetrisEngine,
  BagGenerator,
  rotateMatrix,
  COLS,
  ROWS,
  TOTAL_ROWS,
  SHAPE_KEYS,
} from './tetris-engine.js';

test('BagGenerator produces all 7 distinct pieces in one full cycle', () => {
  const bag = new BagGenerator();
  const pieces = [];
  for (let i = 0; i < 7; i++) {
    pieces.push(bag.next());
  }
  const uniquePieces = new Set(pieces);
  assert.equal(uniquePieces.size, 7);
  for (const shape of SHAPE_KEYS) {
    assert.ok(uniquePieces.has(shape));
  }
});

test('TetrisEngine initializes properly', () => {
  const engine = new TetrisEngine();
  assert.equal(engine.board.length, TOTAL_ROWS);
  assert.equal(engine.board[0].length, COLS);
  assert.equal(engine.score, 0);
  assert.equal(engine.lines, 0);
  assert.equal(engine.level, 1);
  assert.equal(engine.isGameOver, false);
  assert.ok(engine.currentPiece !== null);
  assert.equal(engine.nextQueue.length, 4);
});

test('rotateMatrix rotates a 3x3 matrix correctly', () => {
  const matrix = [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ];
  const cw = rotateMatrix(matrix, true);
  assert.deepEqual(cw, [
    [0, 1, 1],
    [0, 1, 0],
    [0, 1, 0],
  ]);
  const ccw = rotateMatrix(cw, false);
  assert.deepEqual(ccw, matrix);
});

test('Movement: Left, Right and boundaries', () => {
  const engine = new TetrisEngine();
  const startX = engine.currentPiece.x;
  
  // Move left
  const movedLeft = engine.moveLeft();
  assert.equal(movedLeft, true);
  assert.equal(engine.currentPiece.x, startX - 1);

  // Move right twice
  engine.moveRight();
  engine.moveRight();
  assert.equal(engine.currentPiece.x, startX + 1);

  // Move far left until boundary
  for (let i = 0; i < 15; i++) {
    engine.moveLeft();
  }
  const minX = engine.currentPiece.x;
  const cannotMoveFurther = engine.moveLeft();
  assert.equal(cannotMoveFurther, false);
  assert.equal(engine.currentPiece.x, minX);
});

test('Ghost position and Hard Drop', () => {
  const engine = new TetrisEngine();
  const ghost = engine.getGhostPosition();
  assert.ok(ghost);
  assert.equal(ghost.x, engine.currentPiece.x);
  assert.ok(ghost.y >= engine.currentPiece.y);

  const prevScore = engine.score;
  const dropResult = engine.hardDrop();
  assert.ok(dropResult.droppedCells > 0);
  assert.equal(engine.score, prevScore + dropResult.droppedCells * 2);
  // After hard drop, a new piece must be spawned
  assert.ok(engine.currentPiece !== null);
});

test('Hold piece functionality', () => {
  const engine = new TetrisEngine();
  const firstPieceType = engine.currentPiece.type;
  
  // First hold succeeds
  const held = engine.hold();
  assert.equal(held, true);
  assert.equal(engine.holdPiece, firstPieceType);

  // Cannot hold twice in the same turn
  const secondHeld = engine.hold();
  assert.equal(secondHeld, false);

  // After hard dropping, hold is unlocked for next piece
  engine.hardDrop();
  assert.equal(engine.canHold, true);
});

test('Line clearing and scoring', () => {
  const engine = new TetrisEngine();
  
  // Manually fill bottom row except 1 cell at index 0
  const bottomRow = TOTAL_ROWS - 1;
  for (let c = 1; c < COLS; c++) {
    engine.board[bottomRow][c] = { color: '#ffffff' };
  }

  // Position piece to fill cell 0
  engine.board[bottomRow][0] = { color: '#ffffff' };

  const clearedLines = [];
  for (let r = 0; r < TOTAL_ROWS; r++) {
    if (engine.board[r].every((cell) => cell !== null)) {
      clearedLines.push(r);
    }
  }
  assert.equal(clearedLines.length, 1);
  assert.equal(clearedLines[0], bottomRow);
});

test('Game over condition triggers when board is full to the spawn row', () => {
  const engine = new TetrisEngine();
  
  // Fill rows from buffer row 1 to bottom
  for (let r = 1; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      engine.board[r][c] = { color: '#ffffff' };
    }
  }

  // Next spawn should collide and trigger isGameOver
  const canSpawn = engine.spawnPiece('O');
  assert.equal(canSpawn, false);
  assert.equal(engine.isGameOver, true);
});

