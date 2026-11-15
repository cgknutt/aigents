// a flying aigent: one body that lives at a home spot on the page (an ask box, a logo), flies out to what it's
// explaining, thinks while you read, and flies home. the flight is mae's tour flight from d{ai}sy: one smooth arc,
// leaning into it a little, settling softly, with a small quirk now and then. no loops, no bounce.
//
// it draws in a full-screen layer that never takes a tap (pointer-events: none), so it can't block a button. where
// it lands is up to the page: `beside(el)` puts it just outside an element's top corner.
import gsap from "gsap";
import { BODIES, type BodyName } from "./bodies";
import { isLight, resolve } from "./color";
import { ensureStyle } from "./style";
import { onThemeChange } from "./theme";
import type { BodyInstance, Look, Pt, State, Tick } from "./types";

export type AigentOptions = {
  body: BodyName;
  /** the person's color: any css color, var(--x) and light-dark() too */
  color?: string;
  /** mae's petals. default: the page's --ink */
  ink?: string;
  /** mae's center and glow. default: the page's --chamisa, else gold */
  gold?: string;
  /** hold still: no flying, no motion. reduced motion turns this on by itself */
  still?: boolean;
  /** where it lives when it's not out. null: it only shows while it's out */
  home?: () => Element | null;
  /** its size at home (1 = 44px). default 0.42 */
  homeScale?: number;
  /** its size when it's out. default 0.72 */
  flyScale?: number;
  zIndex?: number;
  /** ride along with something the page moves itself (d{ai}sy's mae engine): where it is each frame, and how big
   *  (1 = 44px). null hides it. while this is set, home and flights are the page's business. */
  follow?: () => { x: number; y: number; scale: number } | null;
  /** a film look (debo, 2026-11-14): draw this many frames a second while it moves, like film's 24. the physics
   *  still runs every frame, so only the look changes. leave it out for the screen's own rate */
  fps?: number;
  /** a film shutter: each frame leaves a fading ghost of the last, so a moving body blurs along its way. true, or
   *  how long the ghost lasts, 0 to 0.9 (true is 0.7) */
  shutter?: boolean | number;
  /** film grain in the body's light, 0 to 1 (about 0.3 reads as film) */
  grain?: number;
  /** keep the canvas a small square that travels with the body, always (a background dancer): about a tenth of a
   *  full-screen canvas's memory. long trails get trimmed at its edge */
  compact?: boolean;
  /** how see-through the whole body is, 0 to 1 (a background dancer is faint). default 1 */
  opacity?: number;
  /** tap or click it and it giggles (debo, 2026-11-14). default on, off when riding along (follow): there the page
   *  owns the taps. only the body itself takes the tap, never the layer, so it never covers a button */
  tap?: boolean;
  /** the air it flies through (createAir): it pushes the motes aside and leaves a curling wake */
  air?: () => import("./air").Air | null;
};

export type Aigent = {
  /** fly to an element (it lands beside it) or a point. resolves when it has landed */
  flyTo(to: Element | Pt, o?: { scale?: number }): Promise<void>;
  /** back home (or, with no home on the page, it fades away where it is) */
  goHome(): Promise<void>;
  /** thinking on or off: each body has its own way of thinking */
  think(on?: boolean): void;
  /** a happy moment: something's done */
  done(): Promise<void>;
  hop(): void;
  /** a giggle, as if tapped */
  giggle(): Promise<void>;
  set(o: Partial<Omit<AigentOptions, "zIndex">>): void;
  /** what it's doing now */
  state(): State;
  /** where it is now, on the screen */
  where(): Pt;
  /** is it out (not at home)? */
  out(): boolean;
  busy(): boolean;
  destroy(): void;
};

/** just outside an element's top-right corner: over its edge, never on what's inside it */
export function beside(el: Element): Pt {
  const r = el.getBoundingClientRect();
  return { x: Math.max(26, Math.min(innerWidth - 26, r.right - 16)), y: Math.max(26, r.top - 10) };
}

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (a: number, b: number, v: number) => Math.max(a, Math.min(b, v));

// the current it moves in, like stirred water (debo, 2026-11-14: 'like molecules in the wind, like sugar crystals
// dancing in stirred water'). a few slow waves crossed over each other: smooth swirls that drift as time goes on.
// a direction, about -1 to 1 each way, at a point and a moment.
function current(x: number, y: number, t: number, seed: number): Pt {
  const a = Math.sin(x * 0.0061 + t * 0.53 + seed) + Math.sin(y * 0.0047 - t * 0.41 + seed * 1.7) + Math.sin((x - y) * 0.0033 + t * 0.29);
  const b = Math.cos(y * 0.0058 + t * 0.47 - seed) + Math.cos(x * 0.0052 + t * 0.37 + seed * 0.6) + Math.cos((x + y) * 0.0029 - t * 0.33);
  return { x: a / 3, y: b / 3 };
}
// film grain: one small tile of random specks, made once and reused
let grainTile: HTMLCanvasElement | null = null;
export function grainCanvas() {
  if (grainTile) return grainTile;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!, img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() < 0.5 ? 0 : 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.random() < 0.55 ? 0 : 90 + Math.random() * 165;
  }
  g.putImageData(img, 0, 0);
  return (grainTile = c);
}
const grainPatterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern | null>();
function grainPattern(ctx: CanvasRenderingContext2D) {
  if (!grainPatterns.has(ctx)) grainPatterns.set(ctx, ctx.createPattern(grainCanvas(), "repeat"));
  return grainPatterns.get(ctx) ?? null;
}

const smooth = (a: number, b: number, v: number) => {
  const t = clamp(0, 1, (v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function createAigent(opts: AigentOptions): Aigent {
  ensureStyle();
  let o = { homeScale: 0.42, flyScale: 0.72, ...opts };
  const layer = document.createElement("div");
  layer.className = "ag-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.style.zIndex = String(opts.zIndex ?? 60);
  if (opts.opacity !== undefined) layer.style.opacity = String(opts.opacity);
  // a page change (a view transition) photographs the page; the body sits out of it and shows again right after,
  // so it never lingers in the picture of a page it has already left
  layer.style.setProperty("view-transition-name", `ag-${Math.random().toString(36).slice(2, 9)}`);
  layer.style.setProperty("view-transition-class", "ag");
  const canvas = document.createElement("canvas");
  canvas.className = "ag-canvas";
  const anchor = document.createElement("div");
  anchor.className = "ag-anchor";
  layer.append(canvas, anchor);
  document.body.appendChild(layer);
  const ctx = canvas.getContext("2d")!;
  gsap.set(anchor, { xPercent: -50, yPercent: -50, x: -200, y: -200, scale: o.homeScale });

  // ---------- size and colors ----------
  // the canvas: the whole screen while it's out (flying, trails), or a small square round it while it rests at home.
  // resting, it also draws only a few times a second (debo, 2026-11-14: a full-screen canvas at 60 frames a second
  // was steady work for nothing, and on an ipad that's battery and warmth).
  const SMALL = 240, REST_FPS = 12;
  let W = 0, H = 0, dpr = 1;
  let small: { left: number; top: number } | null = null;
  const size = () => {
    // the soft glows don't need every retina pixel: 1.5 at most keeps them smooth for less work
    dpr = Math.min(1.5, devicePixelRatio || 1);
    W = innerWidth;
    H = innerHeight;
    const w = small ? SMALL : W, h = small ? SMALL : H;
    Object.assign(canvas.style, small ? { inset: "auto", left: "0", top: "0", width: `${SMALL}px`, height: `${SMALL}px` } : { inset: "0", left: "", top: "", width: "100%", height: "100%", transform: "" });
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    place();
  };
  // move a small canvas without making a new one: just where it sits, and the shift for drawing in page coordinates
  const place = () => {
    // moved with a transform, which the graphics chip handles: no layout work for the page
    if (small) canvas.style.transform = `translate(${small.left}px, ${small.top}px)`;
    ctx.setTransform(dpr, 0, 0, dpr, small ? -small.left * dpr : 0, small ? -small.top * dpr : 0);
  };
  size();
  addEventListener("resize", size);
  let look: Look = { color: "#b0623f", ink: "#2e2924", gold: "#c49a3a", dark: false };
  const readColors = () => {
    const ink = resolve(o.ink ?? "var(--ink, #2e2924)", layer);
    look = { color: resolve(o.color ?? "var(--accent, #b0623f)", layer), ink, gold: resolve(o.gold ?? "var(--chamisa, #c49a3a)", layer), dark: isLight(ink) };
    layer.style.setProperty("--ag-ink", look.ink);
    layer.style.setProperty("--ag-gold", look.gold);
  };
  readColors();
  const offTheme = onThemeChange(readColors);

  // ---------- motion ----------
  const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  let reduce = reducedMotion();
  const onMq = () => void (reduce = reducedMotion());
  mq?.addEventListener("change", onMq);
  const still = () => !!o.still || reduce;

  // ---------- the body ----------
  let body: BodyInstance = BODIES[o.body].create({ anchor, layer, mini: false });
  let bodyName = o.body;

  const S = { busy: false, out: false, thinking: false, state: "rest" as State, since: performance.now(), giggling: false };
  const setState = (s: State) => {
    if (S.state !== s) (S.state = s), (S.since = performance.now());
  };
  const cur = (): Pt => ({ x: Number(gsap.getProperty(anchor, "x")), y: Number(gsap.getProperty(anchor, "y")) });
  const homeEl = () => {
    const el = o.home?.();
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  };
  const homePt = (): Pt | null => {
    const r = homeEl();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  };
  let shown = false;
  const show = (b: boolean) => {
    if (b === shown) return;
    shown = b;
    gsap.set(anchor, { autoAlpha: b ? 1 : 0 });
  };
  show(false);

  // ---------- moving through the current ----------
  // weight and drag, a soft pull toward where it's going, and the current: strong mid-flight, a whisper near the
  // spot, plus a slow swirl round the way it's heading. no path is planned, so no two flights are alike. near the
  // spot the current fades and the pull wins, so it settles right beside the thing (never on a button), and keeps
  // stirring there a little while it waits.
  const F = { x: -200, y: -200, vx: 0, vy: 0, target: null as Pt | null, homing: false, arrive: null as (() => void) | null, deadline: 0, seed: rand(0, 10) };
  function drift(dt: number, t: number) {
    const steps = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / steps;
    for (let i = 0; i < steps; i++) {
      if (F.homing) F.target = homePt() ?? F.target;
      const T = F.target!;
      const dx = T.x - F.x, dy = T.y - F.y, dist = Math.hypot(dx, dy) || 0.001;
      const speed = Math.min(clamp(220, 640, dist * 1.6), dist * 3.2);
      let ax = ((dx / dist) * speed - F.vx) * 3.6, ay = ((dy / dist) * speed - F.vy) * 3.6;
      const mid = smooth(0, 240, dist), c = current(F.x, F.y, t, F.seed), flow = 300 * mid + 20;
      ax += c.x * flow;
      ay += c.y * flow;
      const swirl = Math.sin(t * 1.3 + F.seed) * 0.75 * mid * speed;
      ax += (-dy / dist) * swirl;
      ay += (dx / dist) * swirl;
      F.vx += ax * h;
      F.vy += ay * h;
      F.vx *= 1 - 0.5 * h;
      F.vy *= 1 - 0.5 * h;
      F.x += F.vx * h;
      F.y += F.vy * h;
    }
  }

  // ---------- every frame ----------
  let last = cur(), drew = false, ghost = 0, wait = 0, quiet = 0, wasResting = false, pageMoved = 0;
  // the page scrolling or resizing: its home moves, so it looks right away instead of at the resting pace
  const moved = () => void (pageMoved = performance.now());
  addEventListener("scroll", moved, { capture: true, passive: true });
  addEventListener("resize", moved);
  const t0 = performance.now();
  const tick = (_time: number, dtMs: number) => {
    // resting and nothing on the page has moved: don't even look where home is until the next resting frame
    // (finding it makes the browser check the page's layout)
    if (wasResting && !S.out && !S.busy && performance.now() - pageMoved > 400 && wait + dtMs < 1000 / REST_FPS) {
      wait += dtMs;
      return;
    }
    // riding along with something the page moves
    if (o.follow) {
      const at = o.follow();
      if (at) gsap.set(anchor, { x: at.x, y: at.y, scale: at.scale });
      show(!!at);
    }
    // at home, it rides along with its spot (the page scrolls, the layout moves), suspended in a slow current:
    // a pixel or two of drift, never quite still
    else if (!S.out && !S.busy) {
      const h = homePt();
      if (h) {
        const c = still() ? { x: 0, y: 0 } : current(h.x, h.y, (performance.now() - t0) / 1000 * 0.5, F.seed);
        F.x = h.x + c.x * 2.2;
        F.y = h.y + c.y * 2.2;
        F.vx = F.vy = 0;
        if (!gsap.isTweening(anchor)) gsap.set(anchor, { scale: o.homeScale });
      }
      show(!!h);
    }
    // heading home, and home is gone (the page changed under it): it fades out quietly instead of flying to where
    // home used to be
    else if (F.homing && !homePt()) {
      show(false);
      F.target = null;
      if (F.arrive) {
        const done = F.arrive;
        F.arrive = null;
        done();
      }
    }
    // out: carried by the current toward where it's going
    else if (F.target && shown) {
      if (still()) {
        F.x = F.target.x;
        F.y = F.target.y;
        F.vx = F.vy = 0;
      } else drift(Math.min(0.05, dtMs / 1000), (performance.now() - t0) / 1000);
      const sp = Math.hypot(F.vx, F.vy), dist = Math.hypot(F.target.x - F.x, F.target.y - F.y);
      if (F.arrive && ((dist < 6 && sp < 30) || still() || performance.now() > F.deadline)) {
        const done = F.arrive;
        F.arrive = null;
        done();
      }
    }
    const q = o.follow ? cur() : { x: F.x, y: F.y }, step = Math.hypot(q.x - last.x, q.y - last.y);
    // resting: at home (or still, riding along), not thinking, not moving for a moment
    quiet = step < 0.3 && !S.busy && !S.out && S.state === "rest" ? quiet + dtMs : 0;
    const resting = quiet > 600;
    wasResting = resting;
    // resting, a few frames a second is plenty; with a film look, its own rate; and nothing off the screen
    wait += dtMs;
    if (resting && wait < 1000 / REST_FPS) return;
    if (!resting && o.fps && wait < 1000 / o.fps - 1) return;
    if (!o.follow) gsap.set(anchor, { x: q.x, y: q.y });
    const offscreen = q.x < -80 || q.y < -80 || q.x > innerWidth + 80 || q.y > innerHeight + 80;
    const f = Math.min(6, wait / 16.67), dt = Math.min(0.1, wait / 1000);
    wait = 0;
    const dx = q.x - last.x, dy = q.y - last.y;
    last = q;
    // small canvas at rest (not when riding along: the page moves it, and its trail goes everywhere)
    const wantSmall = (resting && !o.follow) || !!o.compact;
    if (wantSmall && (!small || Math.abs(small.left + SMALL / 2 - q.x) > 30 || Math.abs(small.top + SMALL / 2 - q.y) > 30)) {
      const first = !small;
      if (!first) ctx.clearRect(small!.left, small!.top, SMALL, SMALL);
      small = { left: Math.round(q.x - SMALL / 2), top: Math.round(q.y - SMALL / 2) };
      first ? size() : place();
      drew = false;
    } else if (!wantSmall && small) {
      small = null;
      size();
      drew = false;
    }
    // the shutter: the last frame fades instead of vanishing, so movement smears like film. a few frames after the
    // last drawing it's gone. resting on its small canvas, a plain clear: nothing moves there
    if (o.shutter && !small && !still() && ghost > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const keep = o.shutter === true ? 0.7 : Math.max(0, Math.min(0.9, Number(o.shutter)));
      ctx.fillStyle = `rgba(0,0,0,${(1 - keep).toFixed(2)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ghost--;
    } else if (drew || ghost > 0) {
      small ? ctx.clearRect(small.left, small.top, SMALL, SMALL) : ctx.clearRect(0, 0, W, H);
      ghost = 0;
    }
    drew = false;
    if (!shown || (offscreen && !S.out)) return;
    const k: Tick = {
      x: q.x, y: q.y, dx, dy, scale: Number(gsap.getProperty(anchor, "scale")), state: S.state, st: (performance.now() - S.since) / 1000,
      dt, f, t: (performance.now() - t0) / 1000, look, still: still(), W, H,
    };
    drew = body.draw(ctx, k);
    if (drew) ghost = 24;
    // moving through the air: it pushes the motes aside, a little wider for a bigger body
    if (o.air && dt > 0) {
      const vx = dx / dt, vy = dy / dt;
      if (Math.hypot(vx, vy) > 40) o.air()?.stir(q.x, q.y, vx, vy, 0.8, 50 + 70 * k.scale);
    }
    // film grain, only in its light: noise laid over what's drawn (source-atop), shifted every frame like film stock
    if (drew && o.grain) {
      const R = 170 * Math.max(0.6, k.scale);
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = Math.min(1, o.grain);
      // twice over: once darkening, once lightening, so the specks show on a glow of any color
      ctx.globalCompositeOperation = "source-atop";
      const g = grainPattern(ctx);
      g?.setTransform(new DOMMatrix().translate(Math.random() * 128, Math.random() * 128));
      if (g) ctx.fillStyle = g;
      ctx.fillRect(q.x - R, q.y - R, R * 2, R * 2);
      ctx.restore();
    }
  };
  gsap.ticker.add(tick);

  // ---------- a giggle ----------
  // tapped: a wiggle and a squish of the whole body, a moment of its own 'done' look (firefly's flash, stardust's
  // bloom, orb's rays), mae's petals shiver; and the air puffs out round it
  async function giggle() {
    if (S.giggling || still()) return;
    S.giggling = true;
    const q = cur();
    const air = o.air?.();
    if (air) for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      air.stir(q.x + Math.cos(a) * 6, q.y + Math.sin(a) * 6, Math.cos(a) * 260, Math.sin(a) * 260, 0.9, 40);
    }
    const was = S.state;
    if (was !== "fly") setState("done");
    gsap.timeline()
      .to(anchor, { rotation: -14, duration: 0.08, ease: "sine.out" })
      .to(anchor, { rotation: 12, duration: 0.1, ease: "sine.inOut" })
      .to(anchor, { rotation: -8, duration: 0.1, ease: "sine.inOut" })
      .to(anchor, { rotation: 5, duration: 0.1, ease: "sine.inOut" })
      .to(anchor, { rotation: 0, duration: 0.18, ease: "sine.out" });
    await body.giggle?.();
    await new Promise((r) => setTimeout(r, 700));
    if (S.state === "done") setState(S.thinking ? "think" : "rest");
    S.giggling = false;
  }
  const tappable = () => (o.tap ?? !o.follow) && shown;
  const onTap = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
    void giggle();
  };
  anchor.addEventListener("click", onTap);
  const syncTap = () => {
    anchor.style.pointerEvents = tappable() ? "auto" : "none";
    anchor.style.cursor = tappable() ? "pointer" : "";
  };
  const tapTimer = setInterval(syncTap, 500);
  syncTap();

  // it arrives: a little pop at home
  if (!still() && !o.follow) {
    const h = homePt();
    // a gentle grow with only a hint of give (debo, 2026-11-14: the overshoots were way too strong)
    if (h) gsap.fromTo(anchor, { scale: 0, autoAlpha: 0 }, { scale: o.homeScale, autoAlpha: 1, duration: 0.7, delay: 0.4, ease: "back.out(1.2)" });
  }

  // ---------- flying ----------
  async function glide(to: Pt, scale: number, homing = false) {
    S.out = true;
    const here = cur();
    F.x = here.x;
    F.y = here.y;
    F.target = to;
    F.homing = homing;
    // already there: nothing to fly
    if (shown && Math.hypot(to.x - here.x, to.y - here.y) < 4) {
      gsap.to(anchor, { scale, duration: 0.3, ease: "sine.inOut" });
      return;
    }
    if (still()) {
      F.x = to.x;
      F.y = to.y;
      gsap.set(anchor, { x: to.x, y: to.y, scale });
      show(true);
      return;
    }
    // with no home on the page, it appears where it's going
    if (!shown) {
      F.x = to.x;
      F.y = to.y;
      gsap.set(anchor, { x: to.x, y: to.y, scale: 0 });
      show(true);
      await gsap.to(anchor, { scale, duration: 0.6, ease: "back.out(1.2)" });
      return;
    }
    const dist = Math.hypot(to.x - here.x, to.y - here.y);
    gsap.to(anchor, { scale, duration: clamp(0.6, 1.4, dist / 450), ease: "sine.inOut" });
    setState("fly");
    F.deadline = performance.now() + 4500;
    await new Promise<void>((r) => (F.arrive = r));
    setState(S.thinking ? "think" : "rest");
    body.landed?.({ tl: gsap.timeline(), dx: 0, d: 0, quirk: Math.random() < 0.25 ? "blink" : "" });
  }
  const run = async (fn: () => Promise<void>) => {
    while (S.busy) await new Promise((r) => setTimeout(r, 50));
    S.busy = true;
    try {
      await fn();
    } finally {
      S.busy = false;
    }
  };

  return {
    flyTo: (to, x) => run(() => glide(to instanceof Element ? beside(to) : to, x?.scale ?? o.flyScale)),
    goHome: () =>
      run(async () => {
        const h = homePt();
        if (h) await glide(h, o.homeScale, true);
        else if (!still()) await gsap.to(anchor, { scale: 0, duration: 0.4, ease: "sine.in" });
        if (!h) show(false);
        F.target = null;
        F.homing = false;
        S.out = false;
      }),
    think(on = true) {
      S.thinking = on;
      if (S.state !== "fly") setState(on ? "think" : "rest");
    },
    done: () =>
      run(async () => {
        setState("done");
        if (!still()) await body.happy?.(null as never);
        await new Promise((r) => setTimeout(r, 900));
        setState(S.thinking ? "think" : "rest");
      }),
    hop: () => void (!still() && !S.busy && body.hop?.()),
    giggle,
    set(n) {
      o = { ...o, ...n };
      if (n.body && n.body !== bodyName) {
        body.destroy();
        bodyName = n.body;
        body = BODIES[n.body].create({ anchor, layer, mini: false });
      }
      readColors();
    },
    out: () => S.out,
    where: () => cur(),
    state: () => S.state,
    busy: () => S.busy,
    destroy() {
      gsap.ticker.remove(tick);
      offTheme();
      clearInterval(tapTimer);
      anchor.removeEventListener("click", onTap);
      removeEventListener("resize", size);
      removeEventListener("scroll", moved, { capture: true });
      removeEventListener("resize", moved);
      mq?.removeEventListener("change", onMq);
      body.destroy();
      gsap.killTweensOf(anchor);
      layer.remove();
    },
  };
}
