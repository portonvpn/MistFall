export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private fireGain: GainNode | null = null;
  private nightGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  public initialized = false;
  public masterVolume = 0.8;

  public init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1.0;
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.6;
      this.reverbNode = this.ctx.createConvolver();
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.15;
      this.createReverbIR();
      this.sfxGain.connect(this.masterGain);
      this.sfxGain.connect(this.reverbNode!);
      this.reverbNode!.connect(this.reverbGain!);
      this.reverbGain!.connect(this.masterGain);
      this.ambientGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
      this.startRainLoop();
      this.startFireLoop();
      this.startNightLoop();
      this.startWindLoop();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {
      console.warn("Web Audio not available", e);
    }
  }

  private createReverbIR() {
    if (!this.ctx || !this.reverbNode) return;
    const len = this.ctx.sampleRate * 1.5;
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
      }
    }
    this.reverbNode.buffer = buf;
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.1);
    }
  }

  public updateEnvironment(rain: number, isNight: boolean, nearFire: boolean) {
    if (!this.initialized || !this.ctx) return;
    if (this.rainGain) this.rainGain.gain.setTargetAtTime(rain > 0.05 ? 0.08 + rain * 0.35 : 0, this.ctx.currentTime, 0.5);
    if (this.fireGain) this.fireGain.gain.setTargetAtTime(nearFire ? 0.5 : 0, this.ctx.currentTime, 0.5);
    if (this.nightGain) this.nightGain.gain.setTargetAtTime(isNight ? 0.2 : 0.01, this.ctx.currentTime, 1.0);
    if (this.windGain) this.windGain.gain.setTargetAtTime(0.04 + rain * 0.08, this.ctx.currentTime, 0.8);
  }

  private makeNoise(dur: number, type: 'white' | 'pink' | 'brown'): AudioBuffer | null {
    if (!this.ctx) return null;
    const n = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { d[i] = (last + 0.02 * w) / 1.02; last = d[i]; d[i] *= 3.5; }
      else if (type === 'pink') { d[i] = w * 0.5 + last * 0.5; last = d[i]; }
      else d[i] = w * 0.5;
    }
    return buf;
  }

  private startRainLoop() {
    if (!this.ctx || !this.ambientGain) return;
    const buf = this.makeNoise(5, 'pink');
    if (!buf) return;
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    const f2 = this.ctx.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 200;
    this.rainGain = this.ctx.createGain(); this.rainGain.gain.value = 0;
    src.connect(f); f.connect(f2); f2.connect(this.rainGain); this.rainGain.connect(this.ambientGain);
    src.start();
  }

  private startFireLoop() {
    if (!this.ctx || !this.ambientGain) return;
    const buf = this.makeNoise(3, 'brown');
    if (!buf) return;
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 1.5;
    this.fireGain = this.ctx.createGain(); this.fireGain.gain.value = 0;
    src.connect(f); f.connect(this.fireGain); this.fireGain.connect(this.ambientGain);
    src.start();
    setInterval(() => {
      if (this.fireGain && this.fireGain.gain.value > 0.1) this.playCracklePop();
    }, 300 + Math.random() * 200);
  }

  private startNightLoop() {
    if (!this.ctx || !this.ambientGain) return;
    this.nightGain = this.ctx.createGain(); this.nightGain.gain.value = 0.01;
    this.nightGain.connect(this.ambientGain);
    [4200, 4800, 5400].forEach(freq => {
      const osc = this.ctx!.createOscillator(); osc.type = 'triangle'; osc.frequency.value = freq;
      const g = this.ctx!.createGain(); g.gain.value = 0.03;
      const lfo = this.ctx!.createOscillator(); lfo.frequency.value = 8 + Math.random() * 6;
      const lfoG = this.ctx!.createGain(); lfoG.gain.value = 0.03;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      osc.connect(g); g.connect(this.nightGain!); osc.start(); lfo.start();
    });
    setInterval(() => {
      if (this.nightGain && this.nightGain.gain.value > 0.05) this.playOwlHoot();
    }, 8000 + Math.random() * 12000);
  }

  private startWindLoop() {
    if (!this.ctx || !this.ambientGain) return;
    const buf = this.makeNoise(8, 'brown');
    if (!buf) return;
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 300; f.Q.value = 0.5;
    this.windGain = this.ctx.createGain(); this.windGain.gain.value = 0.04;
    src.connect(f); f.connect(this.windGain); this.windGain.connect(this.ambientGain);
    src.start();
  }

  private playOwlHoot() {
    if (!this.ctx || !this.ambientGain) return;
    const osc = this.ctx.createOscillator(); const g = this.ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = 380;
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.15);
    g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(350, this.ctx.currentTime + 0.4);
    osc.connect(g); g.connect(this.ambientGain); osc.start(); osc.stop(this.ctx.currentTime + 0.7);
  }

  public playCracklePop() {
    if (!this.ctx || !this.sfxGain) return;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(800 + Math.random() * 800, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.04);
    g.gain.setValueAtTime(0.04, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.04);
    o.connect(g); g.connect(this.sfxGain); o.start(); o.stop(this.ctx.currentTime + 0.05);
  }

  public playChop() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(80, t + 0.08);
    g.gain.setValueAtTime(0.3, t); g.gain.linearRampToValueAtTime(0, t + 0.12);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + 0.15);
    const noise = this.makeNoise(0.05, 'white');
    if (noise) {
      const src = this.ctx.createBufferSource(); src.buffer = noise;
      const ng = this.ctx.createGain(); ng.gain.setValueAtTime(0.15, t); ng.gain.linearRampToValueAtTime(0, t + 0.05);
      const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2000;
      src.connect(f); f.connect(ng); ng.connect(this.sfxGain); src.start(t);
    }
  }

  public playMine() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.06);
    g.gain.setValueAtTime(0.2, t); g.gain.linearRampToValueAtTime(0, t + 0.1);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + 0.12);
  }

  public playHit() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(400, t); o.frequency.exponentialRampToValueAtTime(100, t + 0.08);
    g.gain.setValueAtTime(0.25, t); g.gain.linearRampToValueAtTime(0, t + 0.12);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + 0.15);
  }

  public playPickup() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(500, t); o.frequency.linearRampToValueAtTime(900, t + 0.1);
    g.gain.setValueAtTime(0.15, t); g.gain.linearRampToValueAtTime(0, t + 0.15);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + 0.2);
  }

  public playCraft() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    [400, 500, 700].forEach((freq, i) => {
      const o = this.ctx!.createOscillator(); const g = this.ctx!.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t + i * 0.08);
      g.gain.linearRampToValueAtTime(0.12, t + i * 0.08 + 0.03);
      g.gain.linearRampToValueAtTime(0, t + i * 0.08 + 0.15);
      o.connect(g); g.connect(this.sfxGain!); o.start(t); o.stop(t + 0.5);
    });
  }

  public playSizzle() {
    if (!this.ctx || !this.sfxGain) return;
    const noise = this.makeNoise(0.5, 'white');
    if (!noise) return;
    const src = this.ctx.createBufferSource(); src.buffer = noise;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.15, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 2;
    src.connect(f); f.connect(g); g.connect(this.sfxGain); src.start();
  }

  public playLevelUp() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = this.ctx!.createOscillator(); const g = this.ctx!.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t + i * 0.1);
      g.gain.linearRampToValueAtTime(0.15, t + i * 0.1 + 0.05);
      g.gain.linearRampToValueAtTime(0, t + i * 0.1 + 0.3);
      o.connect(g); g.connect(this.sfxGain!); o.start(t); o.stop(t + 1);
    });
  }

  public playStep(wet: boolean = false) {
    if (!this.ctx || !this.sfxGain) return;
    const noise = this.makeNoise(0.05, 'brown');
    if (!noise) return;
    const src = this.ctx.createBufferSource(); src.buffer = noise;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.06, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.05);
    const f = this.ctx.createBiquadFilter();
    f.type = wet ? 'lowpass' : 'highpass'; f.frequency.value = wet ? 400 : 800;
    src.connect(f); f.connect(g); g.connect(this.sfxGain); src.start();
  }

  public playBlockBreak() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const noise = this.makeNoise(0.2, 'white');
    if (!noise) return;
    const src = this.ctx.createBufferSource(); src.buffer = noise;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.25, t); g.gain.linearRampToValueAtTime(0, t + 0.2);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1000; f.Q.value = 1;
    src.connect(f); f.connect(g); g.connect(this.sfxGain); src.start();
  }

  public playZombieAlert() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(100, t); o.frequency.linearRampToValueAtTime(60, t + 0.5);
    g.gain.setValueAtTime(0.2, t); g.gain.linearRampToValueAtTime(0, t + 0.8);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + 1);
  }

  public playZombieGrowl() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 70 + Math.random() * 30;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.1);
    g.gain.linearRampToValueAtTime(0, t + 0.4);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + 0.5);
  }
}

export const sounds = new SoundManager();
