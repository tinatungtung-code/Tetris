/**
 * Tetris Canvas Renderer & Visual FX (Particles, Ghost, Flashes, Floating Texts)
 */

import { COLS, ROWS, BUFFER_ROWS, TOTAL_ROWS, TETROMINOES } from './tetris-engine.js';

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  add(x, y, color, count = 8, speed = 3, size = 3) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = (Math.random() * 0.7 + 0.3) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 1, // slight upward bias
        size: Math.random() * size + 1.5,
        color,
        alpha: 1,
        life: 1,
        decay: Math.random() * 0.02 + 0.025,
      });
    }
  }

  addBlockDisintegration(col, row, cellSize, color) {
    const x = col * cellSize + cellSize / 2;
    const y = (row - BUFFER_ROWS) * cellSize + cellSize / 2;
    this.add(x, y, color, 10, 4, 3.5);
  }

  addHardDropImpact(col, row, cellSize, color) {
    const x = col * cellSize + cellSize / 2;
    const y = (row - BUFFER_ROWS) * cellSize + cellSize;
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const velocity = Math.random() * 3 + 1.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.random() * 2.5 + 1.5,
        color,
        alpha: 1,
        life: 1,
        decay: 0.035,
      });
    }
  }

  update(dt) {
    const gravity = 4.5 * dt;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;
      p.vy += gravity;
      p.alpha -= p.decay * 60 * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }
}

export class FloatingTextManager {
  constructor() {
    this.texts = [];
  }

  add(text, x, y, color = '#fbbf24', scale = 1) {
    this.texts.push({
      text,
      x,
      y,
      vy: -1.2,
      color,
      scale,
      alpha: 1,
      life: 1,
      decay: 0.018,
    });
  }

  update(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.y += t.vy * 60 * dt;
      t.alpha -= t.decay * 60 * dt;
      if (t.alpha <= 0) {
        this.texts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.font = `bold ${Math.round(18 * t.scale)}px "Chakra Petch", "Noto Sans TC", sans-serif`;
      
      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillText(t.text, t.x + 1, t.y + 1);

      // Main text
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }
}

/**
 * Main Board Canvas Renderer
 */
export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = 32;
    this.particles = new ParticleSystem();
    this.floatingTexts = new FloatingTextManager();
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.clearingLines = [];
    this.clearAnimationTimer = 0;

    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
    this.cellSize = rect.width / COLS;
  }

  shake(intensity = 6, duration = 0.2) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  triggerLineClear(lines, onComplete) {
    this.clearingLines = [...lines];
    this.clearAnimationTimer = 0.22; // 220ms flash effect
    this.onClearComplete = onComplete;
  }

  update(dt) {
    this.particles.update(dt);
    this.floatingTexts.update(dt);

    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
      }
    }

    if (this.clearAnimationTimer > 0) {
      this.clearAnimationTimer -= dt;
      if (this.clearAnimationTimer <= 0) {
        this.clearingLines = [];
        if (this.onClearComplete) {
          this.onClearComplete();
          this.onClearComplete = null;
        }
      }
    }
  }

  drawBlock(ctx, x, y, size, color, accent, shadow, isGhost = false) {
    if (isGhost) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
      ctx.restore();
      return;
    }

    ctx.save();
    // Base tile
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);

    // Bevel Top & Left (Accent / Highlight)
    ctx.fillStyle = accent || 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x + size - 3, y + 3);
    ctx.lineTo(x + 3, y + 3);
    ctx.lineTo(x + 3, y + size - 3);
    ctx.lineTo(x, y + size);
    ctx.closePath();
    ctx.fill();

    // Bevel Bottom & Right (Shadow)
    ctx.fillStyle = shadow || 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.moveTo(x + size, y);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x + 3, y + size - 3);
    ctx.lineTo(x + size - 3, y + size - 3);
    ctx.lineTo(x + size - 3, y + 3);
    ctx.closePath();
    ctx.fill();

    // Center subtle inner fill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x + 5, y + 5, size - 10, size - 10);

    // Subtle dark outer border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

    ctx.restore();
  }

  render(engine) {
    const ctx = this.ctx;
    const width = this.canvas.getBoundingClientRect().width;
    const height = this.canvas.getBoundingClientRect().height;
    const cellSize = this.cellSize;

    ctx.save();

    // Screen shake offset
    if (this.shakeDuration > 0) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(offsetX, offsetY);
    }

    // Clear background
    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellSize, 0);
      ctx.lineTo(c * cellSize, height);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellSize);
      ctx.lineTo(width, r * cellSize);
      ctx.stroke();
    }

    // Draw placed blocks (skip buffer rows 0 and 1)
    for (let r = BUFFER_ROWS; r < TOTAL_ROWS; r++) {
      const isClearing = this.clearingLines.includes(r);
      for (let c = 0; c < COLS; c++) {
        const cell = engine.board[r][c];
        if (cell) {
          const drawX = c * cellSize;
          const drawY = (r - BUFFER_ROWS) * cellSize;

          if (isClearing) {
            // Flash white during line clear
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(drawX, drawY, cellSize, cellSize);
          } else {
            this.drawBlock(ctx, drawX, drawY, cellSize, cell.color, cell.accent, cell.shadow);
          }
        }
      }
    }

    // Draw Ghost piece
    if (engine.currentPiece && !engine.isGameOver && this.clearAnimationTimer <= 0) {
      const ghost = engine.getGhostPosition();
      if (ghost && ghost.y !== engine.currentPiece.y) {
        const gMatrix = ghost.matrix;
        const gSize = gMatrix.length;
        for (let r = 0; r < gSize; r++) {
          for (let c = 0; c < gSize; c++) {
            if (!gMatrix[r][c]) continue;
            const drawRow = ghost.y + r - BUFFER_ROWS;
            if (drawRow >= 0) {
              const drawX = (ghost.x + c) * cellSize;
              const drawY = drawRow * cellSize;
              this.drawBlock(ctx, drawX, drawY, cellSize, ghost.color, null, null, true);
            }
          }
        }
      }
    }

    // Draw Current active piece
    if (engine.currentPiece && !engine.isGameOver && this.clearAnimationTimer <= 0) {
      const { x, y, matrix, color, accent, shadow } = engine.currentPiece;
      const size = matrix.length;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!matrix[r][c]) continue;
          const drawRow = y + r - BUFFER_ROWS;
          if (drawRow >= 0) {
            const drawX = (x + c) * cellSize;
            const drawY = drawRow * cellSize;
            this.drawBlock(ctx, drawX, drawY, cellSize, color, accent, shadow);
          }
        }
      }
    }

    // Draw particles and floating texts
    this.particles.draw(ctx);
    this.floatingTexts.draw(ctx);

    ctx.restore();
  }
}

/**
 * Preview Mini-Canvas Renderer (for Next Piece queue and Hold box)
 */
export function drawMiniPiece(canvas, shapeType) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
  }
  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, rect.width, rect.height);

  if (!shapeType) return;

  const data = TETROMINOES[shapeType];
  if (!data) return;

  const matrix = data.matrix;
  const size = matrix.length;

  // Compute bounding box for perfect visual centering
  let minR = size, maxR = -1, minC = size, maxC = -1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }

  const pieceWidthCells = maxC - minC + 1;
  const pieceHeightCells = maxR - minR + 1;

  const cellSize = Math.min(
    (rect.width - 16) / Math.max(pieceWidthCells, 3),
    (rect.height - 16) / Math.max(pieceHeightCells, 3),
    22
  );

  const startX = (rect.width - pieceWidthCells * cellSize) / 2;
  const startY = (rect.height - pieceHeightCells * cellSize) / 2;

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (matrix[r][c]) {
        const x = startX + (c - minC) * cellSize;
        const y = startY + (r - minR) * cellSize;

        // Beveled block
        ctx.fillStyle = data.color;
        ctx.fillRect(x, y, cellSize, cellSize);

        // Highlight
        ctx.fillStyle = data.accent || 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + cellSize, y);
        ctx.lineTo(x + cellSize - 2, y + 2);
        ctx.lineTo(x + 2, y + 2);
        ctx.lineTo(x + 2, y + cellSize - 2);
        ctx.lineTo(x, y + cellSize);
        ctx.closePath();
        ctx.fill();

        // Shadow
        ctx.fillStyle = data.shadow || 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.moveTo(x + cellSize, y);
        ctx.lineTo(x + cellSize, y + cellSize);
        ctx.lineTo(x, y + cellSize);
        ctx.lineTo(x + 2, y + cellSize - 2);
        ctx.lineTo(x + cellSize - 2, y + cellSize - 2);
        ctx.lineTo(x + cellSize - 2, y + 2);
        ctx.closePath();
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
      }
    }
  }
}
