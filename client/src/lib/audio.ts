const MUTED_KEY = "HYFIT_AUDIO_MUTED";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export function isMuted(): boolean {
  return localStorage.getItem(MUTED_KEY) === "true";
}

export function setMuted(muted: boolean): void {
  localStorage.setItem(MUTED_KEY, muted ? "true" : "false");
}

function playTone(frequency: number, durationMs: number): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = frequency;
  osc.type = "sine";
  gain.gain.value = 0.3;
  gain.gain.setTargetAtTime(0, ctx.currentTime + durationMs / 1000 - 0.05, 0.02);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + durationMs / 1000);
}

export function playStartBeep(): void {
  playTone(440, 200);
}

export function playStopBeep(): void {
  playTone(880, 150);
}

export function playRaceCompleteSound(): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.value = 0.25;
    const start = ctx.currentTime + i * 0.15;
    gain.gain.setTargetAtTime(0, start + 0.12, 0.02);
    osc.start(start);
    osc.stop(start + 0.15);
  });
}

export function speakActivityName(name: string): void {
  if (isMuted()) return;
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(name);
  utterance.rate = 1.1;
  utterance.volume = 0.8;
  window.speechSynthesis.speak(utterance);
}
