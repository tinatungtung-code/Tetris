/**
 * Tetris Classic - Main Application Entry (Pure Vanilla JavaScript)
 * No React, No TypeScript.
 */

import { TetrisEngine } from './tetris-engine.js';
import { CanvasRenderer, drawMiniPiece } from './render.js';
import { sound } from './audio.js';

// DOM Elements
const body = document.body;
const boardCanvas = document.getElementById('board-canvas');
const holdCanvas = document.getElementById('hold-canvas');
const nextCanvas1 = document.getElementById('next-canvas-1');
const nextCanvas2 = document.getElementById('next-canvas-2');
const nextCanvas3 = document.getElementById('next-canvas-3');

const hudScore = document.getElementById('hud-score');
const hudHighScore = document.getElementById('hud-highscore');
const hudLevel = document.getElementById('hud-level');
const hudLines = document.getElementById('hud-lines');
const comboBadge = document.getElementById('combo-badge');
const comboText = document.getElementById('combo-text');

// Header buttons
const btnSound = document.getElementById('btn-sound');
const iconSoundOn = document.getElementById('icon-sound-on');
const iconSoundOff = document.getElementById('icon-sound-off');
const btnPauseHeader = document.getElementById('btn-pause-header');
const btnRestartHeader = document.getElementById('btn-restart-header');

// Modals
const modalTitle = document.getElementById('modal-title');
const btnStartGame = document.getElementById('btn-start-game');
const titleBestScore = document.getElementById('title-best-score');

const modalPause = document.getElementById('modal-pause');
const btnResume = document.getElementById('btn-resume');
const btnPauseRestart = document.getElementById('btn-pause-restart');
const btnPauseMenu = document.getElementById('btn-pause-menu');
const pauseScore = document.getElementById('pause-score');
const pauseLines = document.getElementById('pause-lines');
const pauseLevel = document.getElementById('pause-level');

const modalGameOver = document.getElementById('modal-gameover');
const btnGameOverRestart = document.getElementById('btn-gameover-restart');
const btnGameOverMenu = document.getElementById('btn-gameover-menu');
const gameoverScore = document.getElementById('gameover-score');
const gameoverLines = document.getElementById('gameover-lines');
const gameoverLevel = document.getElementById('gameover-level');
const gameoverBest = document.getElementById('gameover-best');
const newHighBadge = document.getElementById('new-high-badge');

// Mobile Touch Buttons
const touchLeft = document.getElementById('touch-left');
const touchRight = document.getElementById('touch-right');
const touchDown = document.getElementById('touch-down');
const touchRotateCw = document.getElementById('touch-rotate-cw');
const touchRotateCcw = document.getElementById('touch-rotate-ccw');
const touchHardDrop = document.getElementById('touch-hard-drop');
const touchHold = document.getElementById('touch-hold');

// State & Systems
const engine = new TetrisEngine();
const renderer = new CanvasRenderer(boardCanvas);

let highScore = 0;
try {
  highScore = parseInt(localStorage.getItem('tetris_high_score') || '0', 10);
} catch {}

let gameState = 'title'; // 'title' | 'playing' | 'paused' | 'gameover'
let lastTime = 0;
let dropTimer = 0;
let comboTimeout = null;

// Keyboard DAS / ARR state
const keysDown = {};
const keyTimers = {};

function updateSoundIcon(isMuted) {
  if (isMuted) {
    iconSoundOn.classList.add('hidden');
    iconSoundOff.classList.remove('hidden');
  } else {
    iconSoundOn.classList.remove('hidden');
    iconSoundOff.classList.add('hidden');
  }
}
updateSoundIcon(sound.isMuted);

function updateHUD() {
  hudScore.textContent = engine.score.toLocaleString();
  hudHighScore.textContent = highScore.toLocaleString();
  hudLevel.textContent = engine.level;
  hudLines.textContent = engine.lines;
  titleBestScore.textContent = highScore.toLocaleString();

  // Draw Hold
  drawMiniPiece(holdCanvas, engine.holdPiece);

  // Draw Next Queue
  drawMiniPiece(nextCanvas1, engine.nextQueue[0]);
  drawMiniPiece(nextCanvas2, engine.nextQueue[1]);
  drawMiniPiece(nextCanvas3, engine.nextQueue[2]);
}

function showCombo(comboCount) {
  if (comboCount > 0) {
    comboText.textContent = `COMBO x${comboCount + 1}`;
    comboBadge.classList.remove('hidden');
    if (comboTimeout) clearTimeout(comboTimeout);
    comboTimeout = setTimeout(() => {
      comboBadge.classList.add('hidden');
    }, 1200);
  } else {
    comboBadge.classList.add('hidden');
  }
}

function setState(newState) {
  gameState = newState;
  body.dataset.state = newState;

  if (newState === 'title') {
    modalTitle.classList.remove('hidden');
    modalPause.classList.add('hidden');
    modalGameOver.classList.add('hidden');
    sound.stopBGM();
  } else if (newState === 'playing') {
    modalTitle.classList.add('hidden');
    modalPause.classList.add('hidden');
    modalGameOver.classList.add('hidden');
    sound.startBGM();
  } else if (newState === 'paused') {
    pauseScore.textContent = engine.score.toLocaleString();
    pauseLines.textContent = engine.lines;
    pauseLevel.textContent = engine.level;
    modalPause.classList.remove('hidden');
    modalTitle.classList.add('hidden');
    modalGameOver.classList.add('hidden');
  } else if (newState === 'gameover') {
    gameoverScore.textContent = engine.score.toLocaleString();
    gameoverLines.textContent = engine.lines;
    gameoverLevel.textContent = engine.level;
    gameoverBest.textContent = highScore.toLocaleString();

    if (engine.score > highScore) {
      highScore = engine.score;
      try {
        localStorage.setItem('tetris_high_score', String(highScore));
      } catch {}
      gameoverBest.textContent = highScore.toLocaleString();
      newHighBadge.classList.remove('hidden');
    } else {
      newHighBadge.classList.add('hidden');
    }

    modalGameOver.classList.remove('hidden');
    modalTitle.classList.add('hidden');
    modalPause.classList.add('hidden');
    sound.stopBGM();
  }
}

function startGame() {
  engine.reset();
  dropTimer = 0;
  setState('playing');
  updateHUD();
  sound.playRotate();
}

function pauseGame() {
  if (gameState === 'playing') {
    setState('paused');
  } else if (gameState === 'paused') {
    setState('playing');
  }
}

function handleHardDrop() {
  if (gameState !== 'playing') return;
  const currentPiece = engine.currentPiece;
  if (!currentPiece) return;

  const ghost = engine.getGhostPosition();
  const result = engine.hardDrop();

  // Impact particles at bottom
  if (ghost) {
    const size = ghost.matrix.length;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (ghost.matrix[r][c]) {
          renderer.particles.addHardDropImpact(ghost.x + c, ghost.y + r, renderer.cellSize, ghost.color);
        }
      }
    }
  }

  sound.playHardDrop();
  renderer.shake(result.isTetris ? 10 : 4, 0.18);

  handleLockResult(result);
}

function handleLockResult(result) {
  if (result.clearedLines && result.clearedLines.length > 0) {
    const count = result.clearedLines.length;
    sound.playLineClear(count, result.isTetris);

    // Floating score animation
    const textLabel = result.isTetris
      ? `+${result.scoreEarned} TETRIS!`
      : `+${result.scoreEarned} (${count} LINES)`;
    const color = result.isTetris ? '#00e5ff' : '#fbbf24';
    renderer.floatingTexts.add(textLabel, 150, 280, color, result.isTetris ? 1.3 : 1.0);

    // Disintegration particles on cleared rows
    for (const r of result.clearedLines) {
      for (let c = 0; c < 10; c++) {
        renderer.particles.addBlockDisintegration(c, r, renderer.cellSize, color);
      }
    }

    if (result.combo > 0) {
      showCombo(result.combo);
    }

    renderer.triggerLineClear(result.clearedLines, () => {
      updateHUD();
    });
  } else {
    showCombo(-1);
    updateHUD();
  }

  if (result.isGameOver) {
    sound.playGameOver();
    setState('gameover');
  }
}

// User Actions
function doMoveLeft() {
  if (gameState !== 'playing') return;
  if (engine.moveLeft()) {
    sound.playMove();
  }
}

function doMoveRight() {
  if (gameState !== 'playing') return;
  if (engine.moveRight()) {
    sound.playMove();
  }
}

function doRotate(clockwise = true) {
  if (gameState !== 'playing') return;
  if (engine.rotate(clockwise)) {
    sound.playRotate();
  }
}

function doSoftDrop() {
  if (gameState !== 'playing') return;
  if (engine.softDrop()) {
    sound.playDrop();
    updateHUD();
  }
}

function doHold() {
  if (gameState !== 'playing') return;
  if (engine.hold()) {
    sound.playHold();
    updateHUD();
  }
}

// Keyboard Event Handlers
window.addEventListener('keydown', (e) => {
  // Global keys
  if (e.key === 'm' || e.key === 'M') {
    const muted = sound.toggleMute();
    updateSoundIcon(muted);
    return;
  }

  if (gameState === 'title') {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      startGame();
    }
    return;
  }

  if (gameState === 'gameover') {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      startGame();
    }
    return;
  }

  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    pauseGame();
    return;
  }

  if (gameState === 'paused') {
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      startGame();
    }
    return;
  }

  if (gameState === 'playing') {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      if (!keysDown['left']) {
        keysDown['left'] = true;
        doMoveLeft();
        clearTimeout(keyTimers['left']);
        keyTimers['left'] = setTimeout(() => {
          keyTimers['left_repeat'] = setInterval(() => {
            if (keysDown['left']) doMoveLeft();
          }, 45);
        }, 160);
      }
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      if (!keysDown['right']) {
        keysDown['right'] = true;
        doMoveRight();
        clearTimeout(keyTimers['right']);
        keyTimers['right'] = setTimeout(() => {
          keyTimers['right_repeat'] = setInterval(() => {
            if (keysDown['right']) doMoveRight();
          }, 45);
        }, 160);
      }
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      if (!keysDown['down']) {
        keysDown['down'] = true;
        doSoftDrop();
        clearTimeout(keyTimers['down']);
        keyTimers['down'] = setInterval(() => {
          if (keysDown['down']) doSoftDrop();
        }, 50);
      }
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      doRotate(true);
    } else if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      doRotate(false);
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      handleHardDrop();
    } else if (e.key === 'c' || e.key === 'C' || e.key === 'Shift') {
      e.preventDefault();
      doHold();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      startGame();
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    keysDown['left'] = false;
    clearTimeout(keyTimers['left']);
    clearInterval(keyTimers['left_repeat']);
  } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    keysDown['right'] = false;
    clearTimeout(keyTimers['right']);
    clearInterval(keyTimers['right_repeat']);
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    keysDown['down'] = false;
    clearTimeout(keyTimers['down']);
    clearInterval(keyTimers['down_repeat']);
  }
});

window.addEventListener('blur', () => {
  // Release all keys on window blur to prevent sticking
  Object.keys(keysDown).forEach((k) => (keysDown[k] = false));
  Object.keys(keyTimers).forEach((k) => {
    clearTimeout(keyTimers[k]);
    clearInterval(keyTimers[k]);
  });
});

// UI Button Wire-ups
btnStartGame.addEventListener('click', () => {
  startGame();
});

btnSound.addEventListener('click', (e) => {
  e.currentTarget.blur();
  const muted = sound.toggleMute();
  updateSoundIcon(muted);
});

btnPauseHeader.addEventListener('click', (e) => {
  e.currentTarget.blur();
  pauseGame();
});

btnRestartHeader.addEventListener('click', (e) => {
  e.currentTarget.blur();
  startGame();
});

btnResume.addEventListener('click', () => {
  setState('playing');
});

btnPauseRestart.addEventListener('click', () => {
  startGame();
});

btnPauseMenu.addEventListener('click', () => {
  setState('title');
});

btnGameOverRestart.addEventListener('click', () => {
  startGame();
});

btnGameOverMenu.addEventListener('click', () => {
  setState('title');
});

// Mobile Touch Controls
function bindTouch(btn, action) {
  if (!btn) return;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    action();
  });
}

bindTouch(touchLeft, doMoveLeft);
bindTouch(touchRight, doMoveRight);
bindTouch(touchDown, doSoftDrop);
bindTouch(touchRotateCw, () => doRotate(true));
bindTouch(touchRotateCcw, () => doRotate(false));
bindTouch(touchHardDrop, handleHardDrop);
bindTouch(touchHold, doHold);

// Responsive Canvas Resize
window.addEventListener('resize', () => {
  renderer.resize();
  updateHUD();
});

// Game Main Loop
let needsRedraw = true;

export function requestBoardRedraw() {
  needsRedraw = true;
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const rawDt = (timestamp - lastTime) / 1000;
  const dt = Math.min(rawDt, 0.05); // clamp dt
  lastTime = timestamp;

  if (gameState === 'playing') {
    dropTimer += dt * 1000;
    const dropInterval = engine.getDropInterval();

    // Gravity step
    if (dropTimer >= dropInterval) {
      dropTimer = 0;
      if (!engine.checkCollision(engine.currentPiece.x, engine.currentPiece.y + 1, engine.currentPiece.matrix)) {
        engine.currentPiece.y++;
      } else {
        // Piece is on ground; handle lock delay
        engine.currentPiece.lockDelayRemaining -= dropInterval;
        if (engine.currentPiece.lockDelayRemaining <= 0) {
          const lockResult = engine.lockPiece();
          handleLockResult(lockResult);
        }
      }
    }

    renderer.update(dt);
    renderer.render(engine);
  } else if (needsRedraw || renderer.particles.particles.length > 0 || renderer.floatingTexts.texts.length > 0) {
    renderer.update(dt);
    renderer.render(engine);
    if (renderer.particles.particles.length === 0 && renderer.floatingTexts.texts.length === 0) {
      needsRedraw = false;
    }
  }

  requestAnimationFrame(gameLoop);
}

// Check for ?autostart=1
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('autostart') === '1') {
  startGame();
} else {
  updateHUD();
}

// Start animation loop
requestAnimationFrame(gameLoop);
