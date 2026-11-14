// stardust: a cloud of tiny lights that moves like a flock of starlings. it streams out behind when it flies,
// spins into a little galaxy while it thinks, and blooms open when it's done. a few always wander off and come back.
import type { BodyDef } from "../types";
import { light, rgba } from "../color";
import { flat, glow, orbGlow, rand, sizeOf } from "./draw";

type Mote = { x: number; y: number; vx: number; vy: number; o: number; r: number; tw: number; k: number; n: number; off: number };

export const stardust: BodyDef = {
  id: "stardust",
  name: "stardust",
  about: "a little flock of lights. it spins into a galaxy while it thinks.",
  create(host) {
    const n = host.mini ? 40 : 110;
    let m: Mote[] | null = null;
    return {
      draw(c, k) {
        const s = sizeOf(k.scale);
        m ??= Array.from({ length: n }, () => ({ x: k.x + rand(-12, 12) * s, y: k.y + rand(-12, 12) * s, vx: 0, vy: 0, o: rand(0, 6.28), r: Math.pow(Math.random(), 0.7) * 20 + 2, tw: rand(0, 6), k: rand(5, 16), n: rand(0, 100), off: 0 }));
        const think = k.state === "think", bloom = k.state === "done" && k.st < 1.2;
        const dt = Math.min(0.033, k.dt);
        for (const p of m) {
          if (k.still) {
            p.x = k.x + Math.cos(p.o) * p.r * s;
            p.y = k.y + Math.sin(p.o) * p.r * s * 0.85;
            continue;
          }
          p.o += dt * (think ? 2.6 * (26 / (p.r + 6)) : 0.6 * (14 / (p.r + 6)));
          // now and then one wanders off, then gets pulled home
          if (!p.off && Math.random() < dt * 0.04) p.off = rand(1.2, 2.4);
          if (p.off) p.off = Math.max(0, p.off - dt);
          const R = (think ? p.r * 1.3 : bloom ? p.r * 2.8 : p.r) * s * (p.off ? 2.2 : 1);
          const tx = k.x + Math.cos(p.o) * R, ty = k.y + Math.sin(p.o) * R * (think ? 0.42 : 0.85);
          // soft springs (each its own), plus a smooth drifting current, so they swirl and lag instead of sitting on rails
          const kk = p.k, d = 2 * 0.45 * Math.sqrt(kk);
          const fx = Math.sin(p.n + k.t * 1.7 + p.y * 0.05) * 40 * s, fy = Math.cos(p.n * 1.3 + k.t * 1.4 + p.x * 0.05) * 40 * s;
          p.vx += ((tx - p.x) * kk - p.vx * d + fx) * dt;
          p.vy += ((ty - p.y) * kk - p.vy * d + fy) * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
        const t = k.still ? 0 : k.t;
        glow(c, k.look.dark);
        orbGlow(c, k.x, k.y, 26 * s, k.look.color, 0.2);
        for (const p of m) {
          const tw = 0.5 + 0.5 * Math.sin(t * 3.4 + p.tw), sp = Math.hypot(p.vx, p.vy), bright = p.r < 9;
          const col = bright ? light(k.look.color) : k.look.color;
          // fast motes streak a little in the way they're going
          if (sp > 40) {
            c.strokeStyle = rgba(col, 0.5 * tw);
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(p.x, p.y);
            c.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
            c.stroke();
          }
          c.fillStyle = rgba(col, 0.9 * tw);
          c.beginPath();
          c.arc(p.x, p.y, (bright ? 1.5 : 1.1) * Math.min(1, 0.5 + s * 0.5), 0, 7);
          c.fill();
        }
        flat(c);
        return true;
      },
      destroy() {},
    };
  },
};
