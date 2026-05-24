/** Forced ringtone + vibrate when Ops triggers direct agency call. */
export function playAgencyCallAlarm(): void {
  try {
    const w = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AC = AudioContext ?? w.webkitAudioContext;
    if (AC) {
      const ctx = new AC();
      for (let i = 0; i < 5; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = i % 2 === 0 ? 880 : 660;
        o.type = "square";
        const t = ctx.currentTime + i * 0.28;
        g.gain.setValueAtTime(0.14, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        o.start(t);
        o.stop(t + 0.25);
      }
    }
  } catch {
    /* ignore */
  }
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate([500, 150, 500, 150, 700, 150, 900]);
    }
  } catch {
    /* ignore */
  }
}

/** Loop alarm until dismissed (agency call overlay). */
export function startAgencyCallAlarmLoop(onTick: () => void): () => void {
  playAgencyCallAlarm();
  onTick();
  const id = window.setInterval(() => {
    playAgencyCallAlarm();
    onTick();
  }, 2800);
  return () => window.clearInterval(id);
}
