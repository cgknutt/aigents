// firefly: a soft light. it sheds a trail of tiny drifting sparks when it flies, pulses slowly while it thinks,
// and flashes once when it's done. (from the bodies page, debo's pick, 2026-11-14)
import type { BodyDef } from "../types";
import { light, rgba } from "../color";
import { flat, glow, orbGlow, rand, sizeOf } from "./draw";

type Mote = { x: number; y: number; vx: number; vy: number; a: number; life: number; r: number; tw: number };

export const firefly: BodyDef = {
  id: "firefly",
  name: "firefly",
  about: "a soft light that leaves a trail of sparks, and pulses while it thinks.",
  create() {
    let motes: Mote[] = [], sparks: { x: number; y: number; vx: number; vy: number; a: number }[] = [], acc = 0, flashed = false;
    return {
      draw(c, k) {
        const s = sizeOf(k.scale), vx = k.dx / Math.max(k.dt, 1 / 240), vy = k.dy / Math.max(k.dt, 1 / 240), sp = Math.hypot(vx, vy);
        if (!k.still) {
          // a trail of motes: more of them the faster it goes, each one drifting, slowing, twinkling out
          acc += k.dt * (5 + Math.min(60, sp * 0.16)) * (k.scale > 0.5 ? 1 : 0.4);
          while (acc > 1) {
            acc -= 1;
            const a = rand(0, 6.28), v = rand(4, 14) * s;
            motes.push({ x: k.x + rand(-3, 3), y: k.y + rand(-3, 3), vx: Math.cos(a) * v - vx * 0.06, vy: Math.sin(a) * v - vy * 0.06 - 4, a: 1, life: rand(0.9, 1.7), r: rand(0.7, 1.8) * Math.min(1.2, s), tw: rand(0, 6) });
          }
          for (const m of motes) {
            m.vx *= 1 - k.dt * 1.4;
            m.vy = m.vy * (1 - k.dt * 1.4) - 3 * k.dt;
            m.vx += Math.sin(k.t * 3 + m.tw) * 6 * k.dt;
            m.x += m.vx * k.dt;
            m.y += m.vy * k.dt;
            m.a -= k.dt / m.life;
          }
          motes = motes.filter((m) => m.a > 0);
          if (k.state === "done" && !flashed) {
            flashed = true;
            for (let i = 0; i < 18; i++) sparks.push({ x: k.x, y: k.y, vx: rand(-45, 45) * s, vy: rand(-75, -20) * s, a: 1 });
          }
          if (k.state !== "done") flashed = false;
          for (const p of sparks) (p.x += p.vx * k.dt), (p.y += p.vy * k.dt), (p.vy += 12 * k.dt), (p.a -= k.dt * 0.7);
          sparks = sparks.filter((p) => p.a > 0);
        }
        const t = k.still ? 0 : k.t;
        glow(c, k.look.dark);
        for (const m of motes) {
          const al = m.a * (0.6 + 0.4 * Math.sin(t * 9 + m.tw));
          orbGlow(c, m.x, m.y, m.r * 4, k.look.color, al * 0.35);
          c.fillStyle = rgba(light(k.look.color), al);
          c.beginPath();
          c.arc(m.x, m.y, m.r * (0.5 + m.a * 0.5), 0, 7);
          c.fill();
        }
        const pulse = k.state === "think" ? 0.55 + 0.45 * Math.sin(t * 2.2) : k.state === "done" ? 1 + 1.2 * Math.max(0, 1 - k.st * 1.5) : 0.8 + 0.08 * Math.sin(t * 1.3);
        orbGlow(c, k.x, k.y, 30 * s * pulse, k.look.color, 0.65);
        for (const p of sparks) {
          c.fillStyle = rgba(light(k.look.color), p.a);
          c.beginPath();
          c.arc(p.x, p.y, 1.6, 0, 7);
          c.fill();
        }
        flat(c);
        c.fillStyle = light(k.look.color);
        c.beginPath();
        c.arc(k.x, k.y, 4.5 * s, 0, 7);
        c.fill();
        return true;
      },
      destroy() {},
    };
  },
};
