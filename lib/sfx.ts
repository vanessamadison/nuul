export function playChime() {
  if (typeof window === "undefined") return;
  const audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 440;
  gain.gain.value = 0.0001;

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);

  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.02);
  oscillator.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
  oscillator.stop(audioCtx.currentTime + 0.52);
}

export function playHover() {
  if (typeof window === "undefined") return;
  const audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
  const osc = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc2.type = "sine";
  osc.frequency.value = 780;
  osc2.frequency.value = 1170;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc2.start();
  gain.gain.exponentialRampToValueAtTime(0.03, audioCtx.currentTime + 0.04);
  osc.frequency.exponentialRampToValueAtTime(520, audioCtx.currentTime + 0.12);
  osc2.frequency.exponentialRampToValueAtTime(840, audioCtx.currentTime + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.22);
  osc.stop(audioCtx.currentTime + 0.24);
  osc2.stop(audioCtx.currentTime + 0.24);
}

export function playReveal() {
  if (typeof window === "undefined") return;
  const audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
  const osc = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc2.type = "sine";
  osc.frequency.value = 320;
  osc2.frequency.value = 480;
  gain.gain.value = 0.0001;
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc2.start();
  gain.gain.exponentialRampToValueAtTime(0.07, audioCtx.currentTime + 0.08);
  osc.frequency.exponentialRampToValueAtTime(540, audioCtx.currentTime + 0.38);
  osc2.frequency.exponentialRampToValueAtTime(720, audioCtx.currentTime + 0.38);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.62);
  osc.stop(audioCtx.currentTime + 0.64);
  osc2.stop(audioCtx.currentTime + 0.64);
}

let sharedAudioCtx: AudioContext | null = null;
let droneNodes: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (sharedAudioCtx) return sharedAudioCtx;
  const AudioCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  sharedAudioCtx = new AudioCtor();
  return sharedAudioCtx;
}

export async function resumeAudio() {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
}

export function startDrone() {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  if (droneNodes) {
    if (droneNodes.gain.context.state !== "closed") {
      droneNodes.gain.gain.cancelScheduledValues(audioCtx.currentTime);
      droneNodes.gain.gain.setValueAtTime(Math.max(droneNodes.gain.gain.value, 0.018), audioCtx.currentTime);
    }
    return;
  }
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc1.type = "sine";
  osc2.type = "sine";
  osc1.frequency.value = 54;
  osc2.frequency.value = 81;
  gain.gain.value = 0.0001;
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(audioCtx.destination);
  osc1.start();
  osc2.start();
  gain.gain.exponentialRampToValueAtTime(0.025, audioCtx.currentTime + 1.2);
  droneNodes = { osc1, osc2, gain };
}

export function stopDrone() {
  if (!droneNodes) return;
  const { osc1, osc2, gain } = droneNodes;
  const ctx = gain.context;
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);
  osc1.stop(ctx.currentTime + 1.1);
  osc2.stop(ctx.currentTime + 1.1);
  droneNodes = null;
}
