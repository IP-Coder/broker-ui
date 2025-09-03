export function useNotificationSound() {
  return function playChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = "sine";
      // tiny two-note chime
      const now = ctx.currentTime;
      o.frequency.setValueAtTime(880, now); // A5
      o.frequency.exponentialRampToValueAtTime(1318.5, now + 0.18); // E6

      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      o.connect(g).connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.42);
    } catch {
      // safely ignore if autoplay blocked / unsupported
    }
  };
}
