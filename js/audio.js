class AudioEngine {
  constructor() {
    this.ctx = null;
    this.levels = { master: 0.8, ambient: 0.8, sfx: 0.9, muted: false };
    this.birdTimer = 2;
    this.cricketTimer = 1;
    this.owlTimer = 30;
    this.state = null;
  }

  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.ambientBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.ambientBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.white = this.makeNoise('white');
    this.brown = this.makeNoise('brown');
    this.wind = this.makeLoop(this.brown, 'bandpass', 420, 0.6);
    this.windLfo = ctx.createOscillator();
    this.windLfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    this.windLfo.connect(lfoGain).connect(this.wind.filter.frequency);
    this.windLfo.start();
    this.rain = this.makeLoop(this.white, 'lowpass', 3800, 0.4);
    this.rainHigh = ctx.createBiquadFilter();
    this.rainHigh.type = 'highpass';
    this.rainHigh.frequency.value = 500;
    this.rain.filter.disconnect();
    this.rain.filter.connect(this.rainHigh).connect(this.rain.gain);
    this.water = this.makeLoop(this.brown, 'lowpass', 520, 0.7);
    this.waterLfo = ctx.createOscillator();
    this.waterLfo.frequency.value = 0.35;
    const waterLfoGain = ctx.createGain();
    waterLfoGain.gain.value = 0.35;
    this.waterMod = ctx.createGain();
    this.waterMod.gain.value = 0.65;
    this.water.gain.disconnect();
    this.water.gain.connect(this.waterMod).connect(this.ambientBus);
    this.waterLfo.connect(waterLfoGain).connect(this.waterMod.gain);
    this.waterLfo.start();
    this.applyLevels();
  }

  makeNoise(kind) {
    const length = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      } else {
        data[i] = w;
      }
    }
    return buffer;
  }

  makeLoop(buffer, filterType, frequency, q) {
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = Math.random();
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(this.ambientBus);
    source.start(0, Math.random());
    return { source, filter, gain };
  }

  setLevels(levels) {
    Object.assign(this.levels, levels);
    this.applyLevels();
  }

  applyLevels() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.levels.muted ? 0 : this.levels.master, t, 0.05);
    this.ambientBus.gain.setTargetAtTime(this.levels.ambient, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.levels.sfx, t, 0.05);
  }

  setPaused(paused) {
    if (!this.ctx) return;
    this.ambientBus.gain.setTargetAtTime(paused ? this.levels.ambient * 0.25 : this.levels.ambient, this.ctx.currentTime, 0.3);
  }

  update(dt, s) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const cold = s.biome === BIOME.SNOW || s.biome === BIOME.TAIGA;
    const windLevel = 0.03 + (s.wind - 0.6) * 0.035 + (cold ? 0.04 : 0) + clamp01((s.altitude - 12) / 30) * 0.05 + s.dust * 0.08;
    this.wind.gain.gain.setTargetAtTime(Math.max(0.01, windLevel + (s.tornado || 0) * 0.3 + (s.blizzard || 0) * 0.12), t, 0.8);
    this.rain.gain.gain.setTargetAtTime(s.rain * 0.22, t, 0.8);
    this.water.gain.gain.setTargetAtTime(s.waterNearby * 0.16, t, 0.8);

    const lively = s.biome === BIOME.FOREST || s.biome === BIOME.MEADOW || s.biome === BIOME.TAIGA || s.biome === BIOME.SAVANNA;
    this.birdTimer -= dt;
    if (this.birdTimer <= 0) {
      this.birdTimer = (s.biome === BIOME.FOREST ? 1.2 : 2.5) + Math.random() * 4;
      if (lively && s.daylight > 0.4 && s.rain < 0.3) this.birdSong(0.6 + Math.random() * 0.4);
    }
    this.cricketTimer -= dt;
    if (this.cricketTimer <= 0) {
      this.cricketTimer = 0.8 + Math.random() * 0.8;
      const insects = (s.biome === BIOME.SAVANNA || s.biome === BIOME.MEADOW ? 1 : s.biome === BIOME.FOREST ? 0.6 : 0) * (s.night * 0.9 + (s.biome === BIOME.SAVANNA ? 0.25 : 0));
      if (insects > 0.1 && s.rain < 0.4) this.cricket(insects);
    }
    this.owlTimer -= dt;
    if (this.owlTimer <= 0) {
      this.owlTimer = 25 + Math.random() * 40;
      if (s.night > 0.7 && (s.biome === BIOME.FOREST || s.biome === BIOME.TAIGA)) this.owl();
    }
  }

  envelope(gainNode, start, attack, peak, decay) {
    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(peak, start + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  }

  noiseBurst({ type = 'bandpass', frequency = 1500, q = 0.8, duration = 0.08, gain = 0.2, delay = 0, sweepTo = null, buffer = null, pan = 0 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer || this.white;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, t);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + duration);
    filter.Q.value = q;
    const g = this.ctx.createGain();
    this.envelope(g, t, 0.005, gain, duration);
    let node = source.connect(filter).connect(g);
    if (pan && this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      node = node.connect(panner);
    }
    node.connect(this.sfxBus);
    source.start(t, Math.random() * 1.5);
    source.stop(t + duration + 0.05);
  }

  tone({ type = 'sine', from = 440, to = null, duration = 0.2, gain = 0.1, delay = 0, attack = 0.005, pan = 0, bus = null }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + duration);
    const g = this.ctx.createGain();
    this.envelope(g, t, attack, gain, duration);
    let node = osc.connect(g);
    if (pan && this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      node = node.connect(panner);
    }
    node.connect(bus || this.sfxBus);
    osc.start(t);
    osc.stop(t + attack + duration + 0.05);
  }

  birdSong(volume) {
    const pan = Math.random() * 1.6 - 0.8;
    const base = 2200 + Math.random() * 2000;
    const notes = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < notes; i++) {
      const f = base * (1 + (Math.random() - 0.4) * 0.3);
      this.tone({ from: f, to: f * (1.2 + Math.random() * 0.4), duration: 0.05 + Math.random() * 0.05, gain: 0.03 * volume, delay: i * (0.09 + Math.random() * 0.05), pan, bus: this.ambientBus });
    }
  }

  cricket(volume) {
    const pan = Math.random() * 1.4 - 0.7;
    for (let i = 0; i < 3; i++) this.tone({ from: 4400 + Math.random() * 300, duration: 0.018, gain: 0.012 * volume, delay: i * 0.045, pan, bus: this.ambientBus });
  }

  owl() {
    const pan = Math.random() * 1.2 - 0.6;
    this.tone({ from: 390, to: 360, duration: 0.3, gain: 0.05, attack: 0.05, pan, bus: this.ambientBus });
    this.tone({ from: 380, to: 340, duration: 0.45, gain: 0.05, attack: 0.05, delay: 0.5, pan, bus: this.ambientBus });
  }

  footstep(surface, run) {
    const g = run ? 1.25 : 1;
    switch (surface) {
      case 'sand':
        this.noiseBurst({ type: 'lowpass', frequency: 900, q: 0.5, duration: 0.11, gain: 0.16 * g });
        break;
      case 'snow':
        this.noiseBurst({ type: 'bandpass', frequency: 1300, q: 1.1, duration: 0.12, gain: 0.16 * g });
        this.noiseBurst({ type: 'highpass', frequency: 3200, q: 0.6, duration: 0.05, gain: 0.05 * g, delay: 0.03 });
        break;
      case 'rock':
        this.noiseBurst({ type: 'highpass', frequency: 1600, q: 0.7, duration: 0.035, gain: 0.12 * g });
        this.tone({ from: 150, to: 90, duration: 0.05, gain: 0.08 * g });
        break;
      case 'wood':
        this.tone({ from: 190, to: 120, duration: 0.07, gain: 0.12 * g });
        this.noiseBurst({ type: 'bandpass', frequency: 800, q: 1.2, duration: 0.05, gain: 0.08 * g });
        break;
      case 'water':
        this.noiseBurst({ type: 'lowpass', frequency: 1500, q: 0.6, duration: 0.16, gain: 0.16 * g, sweepTo: 500 });
        this.tone({ from: 420, to: 880, duration: 0.07, gain: 0.03, delay: 0.04 });
        break;
      case 'dry':
        this.noiseBurst({ type: 'bandpass', frequency: 2600, q: 0.9, duration: 0.07, gain: 0.13 * g });
        this.noiseBurst({ type: 'highpass', frequency: 4000, q: 0.5, duration: 0.03, gain: 0.05 * g, delay: 0.02 });
        break;
      default:
        this.noiseBurst({ type: 'bandpass', frequency: 1800, q: 0.7, duration: 0.07, gain: 0.12 * g });
        this.noiseBurst({ type: 'bandpass', frequency: 3000, q: 0.8, duration: 0.03, gain: 0.04 * g, delay: 0.025 });
    }
  }

  jump() {
    this.noiseBurst({ type: 'bandpass', frequency: 500, sweepTo: 1400, q: 0.8, duration: 0.14, gain: 0.07 });
  }

  land(impact) {
    const g = clamp01(impact / 14);
    this.tone({ from: 120, to: 50, duration: 0.14, gain: 0.2 * g + 0.04 });
    this.noiseBurst({ type: 'lowpass', frequency: 700, q: 0.5, duration: 0.12, gain: 0.12 * g + 0.03 });
  }

  splash(size = 1) {
    this.noiseBurst({ type: 'lowpass', frequency: 2400, sweepTo: 350, q: 0.5, duration: 0.5 * size, gain: 0.28 * Math.min(1.3, size) });
    this.tone({ from: 500, to: 1200, duration: 0.08, gain: 0.04, delay: 0.1 });
  }

  distantSplash(distance) {
    const g = clamp01(1 - distance / 40);
    this.noiseBurst({ type: 'lowpass', frequency: 1800, sweepTo: 400, q: 0.5, duration: 0.3, gain: 0.12 * g, pan: Math.random() - 0.5 });
  }

  flutter() {
    for (let i = 0; i < 6; i++) this.noiseBurst({ type: 'bandpass', frequency: 1100 + Math.random() * 500, q: 1.5, duration: 0.04, gain: 0.06, delay: i * 0.045 });
  }

  rustle() {
    for (let i = 0; i < 5; i++) this.noiseBurst({ type: 'bandpass', frequency: 3200 + Math.random() * 1500, q: 0.9, duration: 0.05, gain: 0.05, delay: i * 0.06 });
  }

  chime(notes = [1047, 1319, 1568, 2093]) {
    notes.forEach((f, i) => this.tone({ type: 'triangle', from: f, duration: 1.1, gain: 0.07, delay: i * 0.09 }));
  }

  click() {
    this.tone({ from: 900, duration: 0.03, gain: 0.05 });
  }
}
