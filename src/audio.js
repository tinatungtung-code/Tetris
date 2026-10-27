/**
 * Procedural Web Audio API Sound Synthesizer for Tetris
 * No external dependencies or audio assets required.
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.masterGain = null;
    this.bgmGain = null;

    // Load mute preference
    try {
      this.isMuted = localStorage.getItem('tetris_muted') === 'true';
    } catch {
      this.isMuted = false;
    }
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('tetris_muted', String(this.isMuted));
    } catch {}
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  playTone(freq, type = 'sine', duration = 0.1, startTime = 0, gainLevel = 0.5) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime + startTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(gainLevel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  playMove() {
    this.playTone(280, 'square', 0.04, 0, 0.15);
  }

  playRotate() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.06);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  playHold() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(740, t + 0.12);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playDrop() {
    this.playTone(130, 'triangle', 0.06, 0, 0.2);
  }

  playHardDrop() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Bass punch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);

    // Subtle click on top
    this.playTone(880, 'square', 0.02, 0, 0.15);
  }

  playLineClear(count = 1, isTetris = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    if (isTetris) {
      // Fanfare for Tetris 4 lines!
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
      notes.forEach((freq, idx) => {
        this.playTone(freq, 'sawtooth', 0.18, idx * 0.06, 0.35);
        this.playTone(freq * 0.5, 'triangle', 0.2, idx * 0.06, 0.25);
      });
    } else {
      // Standard line clear chords
      const chords = {
        1: [523.25, 659.25],
        2: [523.25, 659.25, 783.99],
        3: [523.25, 659.25, 783.99, 1046.5],
      };
      const notes = chords[count] || [523.25, 659.25];
      notes.forEach((freq, idx) => {
        this.playTone(freq, 'triangle', 0.14, idx * 0.05, 0.3);
      });
    }
  }

  playLevelUp() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'square', 0.12, idx * 0.07, 0.25);
    });
  }

  playGameOver() {
    const notes = [392, 349.23, 311.13, 261.63, 196];
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'sawtooth', 0.2, idx * 0.12, 0.3);
    });
  }

  // Chiptune background music loop (Korobeiniki / Russian Dance Theme)
  startBGM() {
    if (this.bgmPlaying) return;
    this.init();
    this.bgmPlaying = true;
    this.bgmStep = 0;

    // Melody notes: [freq in Hz, duration in 16th notes]
    // Standard tempo: ~135 BPM -> 16th note = ~110ms
    const sixteenth = 0.115;
    const melody = [
      // Bar 1
      [659.25, 2], [493.88, 1], [523.25, 1], [587.33, 2], [523.25, 1], [493.88, 1],
      // Bar 2
      [440.00, 2], [440.00, 1], [523.25, 1], [659.25, 2], [587.33, 1], [523.25, 1],
      // Bar 3
      [493.88, 3], [523.25, 1], [587.33, 2], [659.25, 2],
      // Bar 4
      [523.25, 2], [440.00, 2], [440.00, 4],
      // Bar 5
      [587.33, 2], [698.46, 1], [880.00, 2], [783.99, 1], [698.46, 1],
      // Bar 6
      [659.25, 3], [523.25, 1], [659.25, 2], [587.33, 1], [523.25, 1],
      // Bar 7
      [493.88, 2], [493.88, 1], [523.25, 1], [587.33, 2], [659.25, 2],
      // Bar 8
      [523.25, 2], [440.00, 2], [440.00, 4],
    ];

    let noteIndex = 0;

    const playNextNote = () => {
      if (!this.bgmPlaying) return;
      if (this.isMuted || !this.ctx || this.ctx.state !== 'running') {
        this.bgmTimer = setTimeout(playNextNote, 200);
        return;
      }

      const [freq, len] = melody[noteIndex];
      const duration = len * sixteenth;
      const t = this.ctx.currentTime;

      // Synth melody
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.9);

      osc.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(t);
      osc.stop(t + duration * 0.95);

      // Bass note
      if (noteIndex % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(freq * 0.25, t);
        bassGain.gain.setValueAtTime(0.12, t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + duration * 1.5);
        bassOsc.connect(bassGain);
        bassGain.connect(this.bgmGain);
        bassOsc.start(t);
        bassOsc.stop(t + duration * 1.5);
      }

      noteIndex = (noteIndex + 1) % melody.length;
      this.bgmTimer = setTimeout(playNextNote, duration * 1000);
    };

    playNextNote();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const sound = new SoundManager();
