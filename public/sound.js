/**
 * FlipSound - Web Audio API Paper Flip Sound Synthesizer
 * Generates an ultra-realistic, low-latency paper rustle and page turn audio.
 */
class FlipSoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('flipbook_sound') !== 'false';
    this.volume = 0.7;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('flipbook_sound', this.enabled ? 'true' : 'false');
    return this.enabled;
  }

  play() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const duration = 0.28; // ~280ms
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = Math.floor(sampleRate * duration);

      // 1. Friction / Paper Rustle Layer (Bandpass Filtered White Noise with decay envelope)
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Natural exponential decay with micro-fluctuations
        const t = i / bufferSize;
        const decay = Math.exp(-t * 6.5);
        const flutter = 1.0 + 0.3 * Math.sin(t * 70);
        output[i] = (Math.random() * 2 - 1) * decay * flutter;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Bandpass filter centered at paper friction frequencies (1.2kHz dropping to 600Hz)
      const bpf = this.ctx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.setValueAtTime(1400, now);
      bpf.frequency.exponentialRampToValueAtTime(650, now + duration * 0.8);
      bpf.Q.setValueAtTime(1.4, now);

      // Noise gain envelope
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.45 * this.volume, now + 0.035);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noiseSource.connect(bpf);
      bpf.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      // 2. Air displacement / Soft low-frequency page snap (Sine sweep 160Hz -> 45Hz)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(170, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.16);

      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.linearRampToValueAtTime(0.22 * this.volume, now + 0.02);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      // Start nodes
      noiseSource.start(now);
      noiseSource.stop(now + duration);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {
      console.warn('Audio playback not allowed or failed:', e);
    }
  }
}

window.flipSound = new FlipSoundEngine();
