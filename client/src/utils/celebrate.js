import confetti from "canvas-confetti";

export default function celebrate() {
  const opts = { disableForReducedMotion: true, zIndex: 9999 };
  confetti({ ...opts, particleCount: 120, spread: 80, origin: { y: 0.6 } });
  const end = Date.now() + 1200;
  (function frame() {
    confetti({ ...opts, particleCount: 4, angle: 60, spread: 55, origin: { x: 0 } });
    confetti({ ...opts, particleCount: 4, angle: 120, spread: 55, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}