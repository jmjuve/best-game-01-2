// Synthesised sound for Stormwright: no audio files, everything is built
// with the Web Audio API when the player first interacts. Wind is filtered
// noise, rain is pattering noise, thunder is a low rumble, harvest is a
// little pentatonic chime, and a slow pad hums underneath the valley.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let padNodes = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch { return false; }
    return true;
  }
  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    startPad();
  }
  function setMuted(value) {
    muted = value;
    if (master) master.gain.value = muted ? 0 : 0.5;
  }
  function isMuted() { return muted; }

  function noiseBuffer(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    return buf;
  }
  function burstNoise(duration, filterFreq, type, gainValue, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(duration + 0.1);
    const filter = ctx.createBiquadFilter();
    filter.type = type; filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter); filter.connect(gain); gain.connect(master);
    src.start(t); src.stop(t + duration + 0.05);
  }
  function tone(freq, duration, type, gainValue, when = 0, slideTo = null) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(gainValue, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain); gain.connect(master);
    osc.start(t); osc.stop(t + duration + 0.05);
  }
  function startPad() {
    if (!ctx || padNodes || muted) return;
    try {
      const gain = ctx.createGain();
      gain.gain.value = 0.035;
      gain.connect(master);
      const freqs = [110, 164.81, 220];
      const oscs = freqs.map((f, i) => {
        const o = ctx.createOscillator();
        o.type = i === 2 ? 'sine' : 'triangle';
        o.frequency.value = f;
        o.connect(gain); o.start();
        return o;
      });
      padNodes = { gain, oscs };
    } catch { /* pad is ambience, never fatal */ }
  }
  function stopPad() {
    if (!padNodes) return;
    try { padNodes.oscs.forEach((o) => o.stop()); } catch { /* already stopped */ }
    padNodes = null;
  }

  const CHIME = [523.25, 587.33, 659.25, 783.99, 880.0];
  return {
    unlock, setMuted, isMuted,
    click() { tone(660, 0.08, 'sine', 0.12); },
    draw() { burstNoise(0.18, 900, 'bandpass', 0.05); },
    rainTick() { burstNoise(0.12, 2400, 'highpass', 0.03); },
    harvest(combo) {
      const n = Math.min(combo, 5);
      for (let i = 0; i < n; i += 1) tone(CHIME[(combo + i) % CHIME.length], 0.22, 'sine', 0.14, i * 0.05);
    },
    thunder() {
      burstNoise(1.4, 160, 'lowpass', 0.5);
      tone(52, 1.1, 'sine', 0.35, 0, 28);
    },
    blight() { tone(196, 0.4, 'sawtooth', 0.08, 0, 110); },
    wither() { tone(330, 0.5, 'triangle', 0.1, 0, 165); },
    seasonClear() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.4, 'sine', 0.14, i * 0.09));
    },
    seasonFail() {
      [392, 329.63, 261.63].forEach((f, i) => tone(f, 0.5, 'triangle', 0.12, i * 0.12));
    },
    charm() { tone(880, 0.3, 'sine', 0.12); tone(1318.5, 0.4, 'sine', 0.1, 0.08); },
    victory() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, 0.6, 'sine', 0.14, i * 0.12));
    },
    stopPad,
  };
}
