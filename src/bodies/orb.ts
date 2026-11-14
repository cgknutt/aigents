// orb: a crystal ball with a small storm of light inside. its mist curls and sparks drift through it; a ring of
// light turns slowly around it. while it thinks, the inside spins into a galaxy and glows. when it's done, light
// breaks out through the glass in rays and sparkles.
import type { BodyDef } from "../types";
import { light, rgba } from "../color";
import { flat, glow, orbGlow, rand, sizeOf, star } from "./draw";

export const orb: BodyDef = {
  id: "orb",
  name: "orb",
  about: "a glass ball with light inside. it glows and spins while it thinks.",
  create() {
    const dust = Array.from({ length: 70 }, () => ({ a: rand(0, 6.28), r: rand(0.1, 0.95), z: rand(0.3, 1.3), tw: rand(0, 6) }));
    const mist = Array.from({ length: 6 }, (_, i) => ({ a: i * 1.05, r: rand(0.25, 0.55), s: rand(0.5, 1.1), size: rand(0.45, 0.7) }));
    let out: { x: number; y: number; vx: number; vy: number; a: number; tw: number }[] = [], spin = 0, heat = 0, broke = false;
    return {
      draw(c, k) {
        const S = sizeOf(k.scale), R = 15 * S, x = k.x, y = k.y;
        if (!k.still) {
          heat += ((k.state === "think" ? 1 : 0) - heat) * Math.min(1, k.dt * 2);
          spin += k.dt * (0.5 + heat * 2.4);
          for (const d of dust) {
            d.a += (k.dt * (0.3 + heat * 2.2) * d.z) / (0.3 + d.r);
            d.r = Math.max(0.08, Math.min(0.95, d.r + Math.sin(k.t * 0.8 + d.tw) * k.dt * 0.05));
          }
          if (k.state === "done" && !broke) {
            broke = true;
            for (let i = 0; i < 26; i++) {
              const a = rand(0, 6.28), v = rand(40, 110) * S;
              out.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, a: 1, tw: rand(0, 6) });
            }
          }
          if (k.state !== "done") broke = false;
          for (const o of out) (o.x += o.vx * k.dt), (o.y += o.vy * k.dt), (o.vx *= 1 - k.dt * 1.8), (o.vy = o.vy * (1 - k.dt * 1.8) - 8 * k.dt), (o.a -= k.dt * 0.6);
          out = out.filter((o) => o.a > 0);
        }
        const t = k.still ? 0 : k.t, h = heat, col = k.look.color, dark = k.look.dark;
        const done = k.state === "done" ? Math.max(0, 1 - k.st * 0.7) : 0;
        // aura and rays
        glow(c, dark);
        orbGlow(c, x, y, R * (2.1 + h * 0.4 + done), col, 0.16 + h * 0.14 + done * 0.3);
        if (done > 0) {
          for (let i = 0; i < 10; i++) {
            const a = i * 0.628 + t * 0.2, L = R * (1.4 + done * 2.2);
            const g = c.createLinearGradient(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L);
            g.addColorStop(0, rgba(light(col), 0.5 * done));
            g.addColorStop(1, rgba(col, 0));
            c.strokeStyle = g;
            c.lineWidth = 2.2;
            c.beginPath();
            c.moveTo(x + Math.cos(a) * R * 0.9, y + Math.sin(a) * R * 0.9);
            c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L);
            c.stroke();
          }
        }
        // the ring of light, tilted, turning round it
        c.save();
        c.translate(x, y);
        c.rotate(-0.35);
        c.scale(1, 0.28);
        c.strokeStyle = rgba(col, 0.22 + h * 0.2);
        c.lineWidth = 1.4;
        c.beginPath();
        c.arc(0, 0, R * 1.5, 0, 7);
        c.stroke();
        for (let i = 0; i < 3; i++) {
          const a = spin * 0.8 + i * 2.09;
          if (Math.sin(a) < 0) continue;
          c.fillStyle = rgba(light(col), 0.9);
          c.beginPath();
          c.arc(Math.cos(a) * R * 1.5, Math.sin(a) * R * 1.5, 2, 0, 7);
          c.fill();
        }
        c.restore();
        flat(c);
        // the glass and what's inside it
        c.save();
        c.beginPath();
        c.arc(x, y, R, 0, 7);
        c.clip();
        const glass = c.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.1, x, y, R);
        glass.addColorStop(0, rgba(col, 0.08));
        glass.addColorStop(0.75, rgba(col, 0.2));
        glass.addColorStop(1, rgba(col, 0.45));
        c.fillStyle = glass;
        c.fillRect(x - R, y - R, R * 2, R * 2);
        glow(c, dark);
        for (const m of mist) {
          const a = m.a + spin * m.s;
          orbGlow(c, x + Math.cos(a) * m.r * R, y + Math.sin(a * 1.3) * m.r * R * 0.75, m.size * R, col, 0.3 + h * 0.2);
        }
        for (const d of dust) {
          const tw = 0.5 + 0.5 * Math.sin(t * 5 + d.tw);
          c.fillStyle = rgba(light(col), tw * (0.5 + 0.5 * d.z));
          c.beginPath();
          c.arc(x + Math.cos(d.a) * d.r * R, y + Math.sin(d.a) * d.r * R * (0.55 + h * 0.1), 0.6 + d.z * 0.6, 0, 7);
          c.fill();
        }
        orbGlow(c, x, y, R * (0.35 + h * 0.25 + done * 0.6), light(col), 0.5 + h * 0.3);
        flat(c);
        c.restore();
        // rim light and highlights: a bright edge, a soft window glint
        const rim = c.createLinearGradient(x, y - R, x, y + R);
        rim.addColorStop(0, rgba(light(col), 0.75));
        rim.addColorStop(0.5, rgba(col, 0.25));
        rim.addColorStop(1, rgba(light(col), 0.55));
        c.strokeStyle = rim;
        c.lineWidth = 1.3;
        c.beginPath();
        c.arc(x, y, R, 0, 7);
        c.stroke();
        c.fillStyle = "rgba(255,255,255,.6)";
        c.beginPath();
        c.ellipse(x - R * 0.4, y - R * 0.46, R * 0.24, R * 0.11, -0.6, 0, 7);
        c.fill();
        glow(c, dark);
        for (const o of out) {
          const tw = 0.5 + 0.5 * Math.sin(t * 10 + o.tw);
          c.fillStyle = rgba(light(col), o.a * tw);
          star(c, o.x, o.y, 2.6 * o.a + 0.6, 0.9, 0);
          c.fill();
        }
        flat(c);
        return true;
      },
      destroy() {},
    };
  },
};
