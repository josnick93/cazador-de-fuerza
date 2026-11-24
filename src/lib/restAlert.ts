/**
 * Aviso de fin de descanso: vibración (Android) + pitido (Web Audio).
 * iOS no deja vibrar desde la web y solo suena si el audio se desbloqueó con un toque:
 * por eso `unlockRestAlert` se llama al marcar una serie como hecha.
 */
let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

/** Llamar dentro de un gesto del usuario (toque) para que el navegador permita sonar después. */
export function unlockRestAlert(): void {
  try {
    const ac = audioContext();
    if (ac?.state === "suspended") void ac.resume();
  } catch {
    // Sin audio: queda la vibración.
  }
}

function beep(ac: AudioContext, start: number, freq: number): void {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + 0.3);
}

export function playRestAlert(): void {
  try {
    navigator.vibrate?.([300, 150, 300, 150, 500]);
  } catch {
    // Sin vibración.
  }
  try {
    const ac = audioContext();
    if (!ac || ac.state !== "running") return;
    const t = ac.currentTime;
    beep(ac, t, 880);
    beep(ac, t + 0.35, 880);
    beep(ac, t + 0.7, 1320);
  } catch {
    // Sin audio.
  }
}
