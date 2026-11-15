// the bodies dancing in the background (debo, 2026-11-14: a sign-in screen with 'the aigents subtly dancing in
// the background, not distracting'). each one drifts from spot to spot through its own current, small and faint,
// and keeps away from a quiet middle (where a sign-in box sits). they stir the air if there is any.
//
// light on purpose: a few bodies, drawn at film speed (24 a second), and nothing at all with reduced motion or
// while the page is hidden.
import { createAigent, type Aigent } from "./core";
import type { Air } from "./air";
import type { BodyName } from "./bodies";

export type DanceOptions = {
  bodies?: BodyName[];
  /** the person's (or the page's) color */
  color?: string;
  /** behind the page's content by default */
  zIndex?: number;
  /** how see-through, 0 to 1. default 0.55 */
  opacity?: number;
  /** a middle area to keep clear, as fractions of the screen: [left, top, right, bottom]. default the center third */
  clear?: [number, number, number, number];
  air?: () => Air | null;
};

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function startDance(o: DanceOptions = {}): () => void {
  if (reducedMotion()) return () => {};
  const bodies = o.bodies ?? ["mae", "firefly", "stardust", "orb"];
  const clear = o.clear ?? [0.3, 0.22, 0.7, 0.78];
  let alive = true;
  // a spot out of the quiet middle, in the band near the edges
  const spot = () => {
    for (let i = 0; i < 20; i++) {
      const fx = rand(0.06, 0.94), fy = rand(0.08, 0.92);
      if (fx > clear[0] && fx < clear[2] && fy > clear[1] && fy < clear[3]) continue;
      return { x: fx * innerWidth, y: fy * innerHeight };
    }
    return { x: innerWidth * 0.1, y: innerHeight * 0.15 };
  };
  const dancers: Aigent[] = bodies.map((body) => {
    return createAigent({ body, color: o.color, zIndex: o.zIndex ?? 0, fps: 24, compact: true, air: o.air, flyScale: rand(0.38, 0.5), opacity: o.opacity ?? 0.55 });
  });
  // each takes its own unhurried path: fly somewhere, linger and drift there a while, fly on
  dancers.forEach(async (a, i) => {
    await new Promise((r) => setTimeout(r, 400 + i * 900));
    while (alive) {
      await a.flyTo(spot(), { scale: rand(0.34, 0.5) });
      if (!alive) break;
      if (Math.random() < 0.3) a.think(true);
      await new Promise((r) => setTimeout(r, rand(3500, 8000)));
      a.think(false);
    }
  });
  // your pointer coming close: that one drifts away, unhurried, like a firefly would (the air's already stirring)
  const shy = new WeakSet<Aigent>();
  const onPointer = (e: PointerEvent) => {
    for (const a of dancers) {
      const w = a.where();
      if (shy.has(a) || Math.hypot(w.x - e.clientX, w.y - e.clientY) > 110) continue;
      shy.add(a);
      const away = Math.atan2(w.y - e.clientY, w.x - e.clientX), d = rand(140, 220);
      const to = { x: Math.max(30, Math.min(innerWidth - 30, w.x + Math.cos(away) * d)), y: Math.max(30, Math.min(innerHeight - 30, w.y + Math.sin(away) * d)) };
      void a.flyTo(to).then(() => setTimeout(() => shy.delete(a), 1500));
    }
  };
  addEventListener("pointermove", onPointer, { passive: true });
  return () => {
    alive = false;
    removeEventListener("pointermove", onPointer);
    dancers.forEach((a) => a.destroy());
  };
}
