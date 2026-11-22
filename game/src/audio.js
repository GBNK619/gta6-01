// audio.js — all sound is synthesized with WebAudio: engine hum, police
// siren, punches, pickups, mission jingles and a slow sunset bassline.
// No audio files. Everything is created lazily after the first key/click
// so the browser's autoplay rules are respected.

const AudioSys = {
  ctx: null, master: null, engineOsc: null, engineGain: null,
  sirenOsc: null, sirenGain: null, musicStep: 0, musicAt: 0,

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = S.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },

  setMuted(m) { if (this.master) this.master.gain.value = m ? 0 : 0.5; },

  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noise(dur, vol, freq) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, (dur * this.ctx.sampleRate) | 0);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 800;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },

  punch() { this.noise(0.09, 0.5, 500); this.tone(90, 0.08, 'sine', 0.4, 45); },
  crash(big) { this.noise(big ? 0.35 : 0.18, big ? 0.6 : 0.35, 900); },
  pickup() { this.tone(660, 0.09, 'square', 0.15); setTimeout(() => this.tone(990, 0.12, 'square', 0.15), 70); },
  cash() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'triangle', 0.22), i * 80)); },
  fail() { this.tone(220, 0.25, 'sawtooth', 0.18, 110); },
  door() { this.noise(0.06, 0.25, 1200); this.tone(140, 0.07, 'sine', 0.2, 90); },

  // Continuous voices (engine + siren) are created once and steered per frame.
  update(dt, drivingSpeed, nearestCopDist) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (drivingSpeed !== null) {
      if (!this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        this.engineOsc.type = 'sawtooth';
        const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
        this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master);
        this.engineGain.gain.value = 0;
        this.engineOsc.start();
      }
      const sp = Math.abs(drivingSpeed);
      this.engineOsc.frequency.setTargetAtTime(55 + sp * 0.55, t, 0.08);
      this.engineGain.gain.setTargetAtTime(0.05 + Math.min(0.1, sp / 3000), t, 0.1);
    } else if (this.engineOsc) {
      this.engineGain.gain.setTargetAtTime(0, t, 0.1);
    }
    if (nearestCopDist !== null && nearestCopDist < 700) {
      if (!this.sirenOsc) {
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenGain = this.ctx.createGain();
        this.sirenOsc.type = 'triangle';
        this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
        this.sirenGain.gain.value = 0;
        this.sirenOsc.start();
      }
      const wail = 660 + Math.sin(t * 4.2) * 190;
      this.sirenOsc.frequency.setTargetAtTime(wail, t, 0.03);
      this.sirenGain.gain.setTargetAtTime(0.06 * (1 - nearestCopDist / 700), t, 0.1);
    } else if (this.sirenOsc) {
      this.sirenGain.gain.setTargetAtTime(0, t, 0.1);
    }
    // Sunset bassline: a lazy 8-step loop, only while playing.
    if (S.mode === 'play' && t >= this.musicAt) {
      const bass = [55, 0, 55, 65.4, 0, 55, 82.4, 73.4];
      const f = bass[this.musicStep % bass.length];
      if (f) this.tone(f, 0.34, 'triangle', 0.16);
      if (this.musicStep % 4 === 0) this.tone(220, 0.5, 'sine', 0.05);
      this.musicStep++;
      this.musicAt = t + 0.42;
    }
  },
};
