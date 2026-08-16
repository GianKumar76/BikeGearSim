/**
 * Web Audio API Sound Synthesizer for Shimano STI Levers and Cycling Audio
 */

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
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

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // Shimano STI Mechanical Lever Click Sound
  playShift(type = 'rear_easier') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    if (type === 'front_up') {
      // Big Front Lever: Dual heavier mechanical ratchet clicks
      this.createClickPulse(t, 1400, 0.03, 0.25);
      this.createClickPulse(t + 0.04, 900, 0.05, 0.35);
      this.createMetallicNoise(t + 0.02, 0.06, 0.15);
    } else if (type === 'front_down') {
      // Small Front Lever: Snappy spring release clack
      this.createClickPulse(t, 2200, 0.02, 0.2);
      this.createClickPulse(t + 0.02, 1100, 0.04, 0.3);
    } else if (type === 'rear_easier') {
      // Right Big Lever (Bigger Sprocket): Ratchet sweep click
      this.createClickPulse(t, 1800, 0.02, 0.2);
      this.createClickPulse(t + 0.03, 1300, 0.03, 0.3);
      this.createMetallicNoise(t + 0.01, 0.03, 0.1);
    } else {
      // Right Small Lever (Smaller Sprocket): Very crisp high snappy release click
      this.createClickPulse(t, 2800, 0.015, 0.22);
      this.createClickPulse(t + 0.015, 1600, 0.02, 0.18);
    }
  }

  createClickPulse(startTime, frequency, duration, gainValue) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, startTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.3, startTime + duration);

    gain.gain.setValueAtTime(gainValue, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  createMetallicNoise(startTime, duration, gainValue) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, startTime);
    filter.Q.setValueAtTime(3.0, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainValue, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  // Warning Sound on Shift Penalty / Bad Cadence
  playWarningBeep() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.setValueAtTime(180, t + 0.1);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // Sound when attempting to shift while standing still / stationary
  playStationaryClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Dull dead lever clack + low warning tap
    this.createClickPulse(t, 600, 0.04, 0.2);
    this.createMetallicNoise(t, 0.05, 0.1);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Success Chime (e.g. Clean Red Light Stop, Finish Line)
  playSuccessChime() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);

      gain.gain.setValueAtTime(0.08, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.3);
    });
  }
}
