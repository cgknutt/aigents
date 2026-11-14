// mae: the real one, from d{ai}sy (site/ui/mae.ts). ink petals round a gold center, with her glow.
// named for debo's sister, daisy mae.
//
// what she does, all as in daisy: she breathes, each petal sways on its own, and she blinks now and then (her center
// squints and a ripple runs round her petals). her petals turn slowly, faster while she thinks. when she flies fast
// they break loose, each with its own personality (clingy, eager, dancer, showoff, lazy, wanderer, bouncer, shy),
// trail behind her on springs, and find their way home when she settles. sparks fall off her when she moves fast.
import gsap from "gsap";
import type { BodyDef, BodyInstance, Flight, Host, Tick } from "../types";
import { KINDS, knobsFor } from "./mae-tune";

const SVGNS = "http://www.w3.org/2000/svg";
const PETAL = { cy: -13.33, rx: 4.22, ry: 6.67 }; // the logo's petal, in her units (40 across)
/** daisy's default dial: 25 out of 100, between subtle and crazy */
const CRAZY = 0.25;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export const mae: BodyDef = {
  id: "mae",
  name: "mae",
  about: "ink petals and a gold center. her petals come loose when she flies, and find their way home.",
  create(host: Host): BodyInstance {
    const { anchor, layer, mini } = host;
    anchor.innerHTML =
      `<span class="ag-squash"><span class="ag-halo-wrap"><span class="ag-halo"></span></span>` +
      `<span class="ag-body"><svg viewBox="-20 -20 40 40" aria-hidden="true"><g class="ag-petals">` +
      [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<g transform="rotate(${i * 45})"><ellipse class="ag-petal" cx="0" cy="${PETAL.cy}" rx="${PETAL.rx}" ry="${PETAL.ry}"/></g>`).join("") +
      `</g><circle class="ag-center" r="7.33"/></svg></span></span>`;
    const squash = anchor.querySelector<HTMLElement>(".ag-squash")!;
    const body = anchor.querySelector<HTMLElement>(".ag-body")!;
    const petals = anchor.querySelector<SVGGElement>(".ag-petals")!;
    const center = anchor.querySelector<SVGCircleElement>(".ag-center")!;
    const halo = anchor.querySelector<HTMLElement>(".ag-halo")!;
    const petalEls = [...petals.querySelectorAll("ellipse")];
    gsap.set(center, { transformOrigin: "50% 50%" });
    gsap.set(petalEls, { transformOrigin: "50% 100%" });

    const knobs = knobsFor(CRAZY), kinds = KINDS;
    const S = { spin: 0.25, rot: 0, lean: 0 };
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => (timers.delete(id), fn()), ms);
      timers.add(id);
    };

    // ---------- always a little alive ----------
    const idle: gsap.core.Tween[] = [
      gsap.to(body, { scale: 1.07, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 }),
      gsap.to(halo, { opacity: 0.95, scale: 1.25, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 }),
      // each petal sways a little, out of step with the others, hinged at its base
      ...petalEls.map((el) => gsap.fromTo(el, { rotation: -rand(3, 7) }, { rotation: rand(3, 7), duration: rand(1.4, 2.4), ease: "sine.inOut", yoyo: true, repeat: -1, delay: -rand(0, 2) })),
    ];
    // her sway and breathing don't run on their own timers: she moves them along each time she's drawn, so at rest
    // (a few times a second) they cost a few updates a second, not 60
    for (const t of idle) t.pause();
    let stillNow = false;
    const holdStill = (still: boolean) => void (stillNow = still);
    // a slow, soft blink you can actually see: she squints shut, holds a beat, opens, and her petals ripple round
    const blink = () => {
      gsap.timeline().to(center, { scaleY: 0.12, duration: 0.16, ease: "sine.in" }).to(center, { scaleY: 1, duration: 0.22, ease: "sine.out" }, "+=0.12");
      gsap.timeline()
        .to(petalEls, { scale: 0.84, duration: 0.18, ease: "sine.inOut", stagger: 0.045 })
        .to(petalEls, { scale: 1, duration: 0.26, ease: "sine.inOut", stagger: 0.045 }, "-=0.2");
    };
    const blinker = () => {
      if (!stillNow && !document.hidden) blink();
      later(blinker, rand(2600, 6500));
    };
    later(blinker, 2000);

    // ---------- sparks: a trail when she moves fast ----------
    type Spark = { x: number; y: number; vx: number; vy: number; life: number; d: number; r: number; c: "gold" | "ink" | "color" };
    const sparks: Spark[] = [];
    const emit = (x: number, y: number, n: number, dx = 0, dy = 0, spread = 0.7) => {
      for (let i = 0; i < n && sparks.length < 500; i++)
        sparks.push({
          x: x + rand(-5, 5), y: y + rand(-5, 5),
          vx: -dx * 0.06 + rand(-spread, spread), vy: -dy * 0.06 + rand(-spread, spread),
          life: 1, d: rand(0.012, 0.03), r: rand(1, 2.8),
          c: Math.random() < 0.65 ? "gold" : Math.random() < 0.7 ? "ink" : "color",
        });
    };
    let last: Tick | null = null;
    const burst = (n = 18) => last && !last.still && emit(last.x, last.y, Math.round(n * mix(0.4, 1.4, CRAZY)), 0, 0, 2.2);

    // ---------- petals that fall off and rejoin (only a flying mae: a small mark stays whole) ----------
    let pointer = { x: -9999, y: -9999 };
    const onPointer = (e: PointerEvent) => void (pointer = { x: e.clientX, y: e.clientY });
    if (layer) addEventListener("pointermove", onPointer, { passive: true });
    const loose = layer
      ? kinds.map((_, i) => {
          const el = document.createElementNS(SVGNS, "svg");
          el.setAttribute("viewBox", `${-PETAL.rx} ${-PETAL.ry} ${PETAL.rx * 2} ${PETAL.ry * 2}`);
          el.setAttribute("class", "ag-loose");
          el.setAttribute("aria-hidden", "true");
          el.innerHTML = `<ellipse class="ag-petal" rx="${PETAL.rx}" ry="${PETAL.ry}"/>`;
          layer.appendChild(el);
          gsap.set(el, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
          return { el, i, x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, dir: Math.random() < 0.5 ? -1 : 1, wa: rand(0, 6.28), back: 0 };
        })
      : [];
    let detached = false, calm = 0;
    const slot = (i: number, x: number, y: number, u: number, base: number) => {
      const a = ((i * 45 + base) * Math.PI) / 180, d = -PETAL.cy * u;
      return { x: x + Math.sin(a) * d, y: y - Math.cos(a) * d, r: i * 45 + base };
    };
    const rejoin = () => {
      detached = false;
      for (const l of loose) gsap.set(l.el, { autoAlpha: 0 });
      gsap.set(petals, { opacity: 1 });
    };
    function petalsFly(k: Tick) {
      const T = knobs, v = Math.hypot(k.dx, k.dy), { x, y, W, H } = k;
      const u = 1.1 * k.scale, base = S.rot + Number(gsap.getProperty(squash, "rotation"));
      if (!detached && v > T.breakAt && !k.still && loose.length) {
        // they come loose with her momentum, plus a push outward. the loosely held ones get flung harder
        detached = true;
        calm = 0;
        for (const l of loose) {
          const K = kinds[l.i]!, s = slot(l.i, x, y, u, base), a = ((l.i * 45 + base) * Math.PI) / 180;
          const kick = (2 + (1 - Math.min(1, K.k * 8)) * 6) * T.fling;
          Object.assign(l, { x: s.x, y: s.y, r: s.r, vx: k.dx * 0.5 + Math.sin(a) * kick, vy: k.dy * 0.5 - Math.cos(a) * kick, vr: l.dir * K.spin * T.spin, back: 0 });
          gsap.set(l.el, { autoAlpha: 1 });
        }
        gsap.set(petals, { opacity: 0 });
      }
      if (!detached) return;
      if (k.still) return rejoin();
      calm = v < 2.5 ? calm + 1 : 0;
      const homing = calm > 6, g = Math.min(2, k.f);
      let done = homing;
      for (const l of loose) {
        const K = kinds[l.i]!, s = slot(l.i, x, y, u, base);
        // once she settles, every spring stiffens toward the same strength. clingy ones are home first, lazy ones last
        l.back = homing ? Math.min(1, l.back + (0.012 + K.k * 0.25) * g) : Math.max(0, l.back - 0.02 * g);
        const play = (1 - l.back) * T.quirks;
        const k0 = K.k / T.loose, d0 = K.d * T.drag;
        // every spring gets at least this much damping, so a petal swings out and settles back instead of boinging
        const zMin = Math.min(0.75, 0.32 * T.drag);
        const kk = k0 + (0.22 - k0) * l.back, d = Math.max(d0 + (0.7 - d0) * l.back, 2 * zMin * Math.sqrt(kk));
        let ax = (s.x - l.x) * kk - l.vx * d, ay = (s.y - l.y) * kk - l.vy * d;
        if (K.grav) ay += K.grav * play;
        if (K.flutter) ax += Math.sin(k.t * 4 + l.i) * 0.35 * K.flutter * play;
        if (K.orbit) {
          const ox = l.x - s.x, oy = l.y - s.y, len = Math.hypot(ox, oy) || 1;
          ax += (-oy / len) * K.orbit * l.dir * play;
          ay += (ox / len) * K.orbit * l.dir * play;
        }
        if (K.wander) {
          l.wa += rand(-0.35, 0.35) * g;
          ax += Math.cos(l.wa) * K.wander * play;
          ay += Math.sin(l.wa) * K.wander * play;
        }
        if (K.shy) {
          const sx = l.x - pointer.x, sy = l.y - pointer.y, sd = Math.hypot(sx, sy);
          if (sd > 0 && sd < 160) {
            const push = (1 - sd / 160) * 1.6 * K.shy * play;
            ax += (sx / sd) * push;
            ay += (sy / sd) * push;
          }
        }
        l.vx += ax * g;
        l.vy += ay * g;
        l.x += l.vx * g;
        l.y += l.vy * g;
        // a leash: past about a sixth of the screen from its place, a petal can't drift any farther, and gets reeled in
        {
          const lx = l.x - s.x, ly = l.y - s.y, ld = Math.hypot(lx, ly), R = Math.max(160, 0.16 * Math.hypot(W, H)) * Math.max(0.6, T.loose) * (1 - l.back * 0.5);
          if (ld > R) {
            const nx = lx / ld, ny = ly / ld, out = l.vx * nx + l.vy * ny;
            if (out > 0) (l.vx -= out * nx), (l.vy -= out * ny);
            const pull = Math.min(ld - R, (ld - R) * 0.35 * g);
            l.x -= nx * pull;
            l.y -= ny * pull;
          }
        }
        if (K.bounce) {
          const m = 8;
          if (l.x < m) (l.x = m), (l.vx = Math.abs(l.vx) * K.bounce);
          if (l.x > W - m) (l.x = W - m), (l.vx = -Math.abs(l.vx) * K.bounce);
          if (l.y < m) (l.y = m), (l.vy = Math.abs(l.vy) * K.bounce);
          if (l.y > H - m) (l.y = H - m), (l.vy = -Math.abs(l.vy) * K.bounce);
        }
        const speed = Math.hypot(l.vx, l.vy);
        if (l.back < 0.6) {
          // its own twirl, plus more turn the faster it goes (a leaf turning in the wind)
          l.vr += (l.dir * K.spin * T.spin - l.vr) * 0.05 * g;
          l.r += (l.vr + l.dir * speed * 0.3) * g + (K.flutter ? Math.sin(k.t * 6 + l.i) * K.flutter * 3 * play : 0);
        } else {
          const diff = ((((s.r - l.r) % 360) + 540) % 360) - 180;
          l.r += diff * Math.min(1, 0.25 * g);
          if (Math.abs(diff) > 2) done = false;
        }
        if (l.back < 1 || Math.hypot(s.x - l.x, s.y - l.y) > 0.8 || speed > 0.5) done = false;
        gsap.set(l.el, { x: l.x, y: l.y, rotation: l.r, scale: u });
      }
      if (done) rejoin();
    }

    let dirty = false;
    return {
      draw(ctx, k) {
        last = k;
        holdStill(k.still);
        if (!k.still) for (const t of idle) t.totalTime(t.totalTime() + k.dt);
        // her petals turn slowly, faster while she thinks (in daisy: while claude works)
        const target = k.still ? 0 : k.state === "think" ? 1.6 : 0.25;
        S.spin += (target - S.spin) * 0.03 * k.f;
        S.rot += S.spin * k.f;
        gsap.set(petals, { rotation: S.rot, svgOrigin: "0 0" });
        // she leans into the way the current carries her, and eases upright as it slows
        if (!k.still) {
          S.lean += (Math.max(-12, Math.min(12, k.dx * 1.4)) - S.lean) * Math.min(1, 0.12 * k.f);
          gsap.set(body, { rotation: S.lean });
        }
        if (mini) return false;
        const v = Math.hypot(k.dx, k.dy);
        if (v > 3.5 && !k.still) emit(k.x, k.y, Math.round(Math.min(5, v / 5) * mix(0.3, 1.6, CRAZY)), k.dx, k.dy);
        petalsFly(k);
        if (!sparks.length && !dirty) return false;
        const col = { gold: k.look.gold, ink: k.look.ink, color: k.look.color };
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i]!;
          s.x += s.vx * k.f;
          s.y += s.vy * k.f;
          s.vx *= 0.97;
          s.vy = s.vy * 0.97 - 0.004 * k.f;
          s.life -= s.d * k.f;
          if (s.life <= 0) {
            sparks.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = s.life * 0.9;
          ctx.fillStyle = col[s.c];
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * (0.5 + s.life * 0.5), 0, 6.283);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        dirty = sparks.length > 0;
        return true;
      },
      // her tour flight: leaning a little into it, and now and then a slow half turn of her petals on the way
      fly(f: Flight) {
        f.tl.to(body, { rotation: Math.max(-10, Math.min(10, f.dx / 40)), duration: f.d * 0.4, ease: "sine.out" }, 0)
          .to(body, { rotation: 0, duration: f.d * 0.6, ease: "sine.inOut" }, f.d * 0.4);
        if (f.quirk === "turn") f.tl.to(squash, { rotation: "+=180", duration: f.d * 0.8, ease: "sine.inOut" }, 0.1);
      },
      landed(f: Flight) {
        if (f.quirk === "blink") blink();
      },
      async happy() {
        burst(30);
        await gsap.timeline()
          .to(anchor, { y: "-=14", duration: 0.25, ease: "power2.out" })
          .to(squash, { rotation: "+=360", duration: 0.6, ease: "power2.inOut" }, "<")
          .to(anchor, { y: "+=14", duration: 0.5, ease: "bounce.out" });
      },
      hop() {
        gsap.timeline().to(anchor, { y: "-=6", duration: 0.22, ease: "power2.out" }).to(anchor, { y: "+=6", duration: 0.45, ease: "bounce.out" });
      },
      destroy() {
        timers.forEach((t) => clearTimeout(t));
        idle.forEach((t) => t.kill());
        gsap.killTweensOf([anchor, squash, body, center, halo, petals, ...petalEls]);
        removeEventListener("pointermove", onPointer);
        loose.forEach((l) => l.el.remove());
        anchor.innerHTML = "";
      },
    };
  },
};
