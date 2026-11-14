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
import type { BodyInstance, Flight, Look, Pt, State, Tick } from "./types";

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
  set(o: Partial<Omit<AigentOptions, "zIndex">>): void;
  /** what it's doing now */
  state(): State;
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

// a smooth curve through points (catmull-rom), so every flight bends
function curve(pts: Pt[], t: number): Pt {
  const n = pts.length - 1, seg = Math.min(n - 1, Math.floor(t * n)), u = t * n - seg;
  const p0 = pts[Math.max(seg - 1, 0)]!, p1 = pts[seg]!, p2 = pts[seg + 1]!, p3 = pts[Math.min(seg + 2, n)]!;
  const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u * u * u);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

export function createAigent(opts: AigentOptions): Aigent {
  ensureStyle();
  let o = { homeScale: 0.42, flyScale: 0.72, ...opts };
  const layer = document.createElement("div");
  layer.className = "ag-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.style.zIndex = String(opts.zIndex ?? 60);
  const canvas = document.createElement("canvas");
  canvas.className = "ag-canvas";
  const anchor = document.createElement("div");
  anchor.className = "ag-anchor";
  layer.append(canvas, anchor);
  document.body.appendChild(layer);
  const ctx = canvas.getContext("2d")!;
  gsap.set(anchor, { xPercent: -50, yPercent: -50, x: -200, y: -200, scale: o.homeScale });

  // ---------- size and colors ----------
  let W = 0, H = 0;
  const size = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth;
    H = innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  const colorTimer = setInterval(readColors, 2000);

  // ---------- motion ----------
  const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  let reduce = reducedMotion();
  const onMq = () => void (reduce = reducedMotion());
  mq?.addEventListener("change", onMq);
  const still = () => !!o.still || reduce;

  // ---------- the body ----------
  let body: BodyInstance = BODIES[o.body].create({ anchor, layer, mini: false });
  let bodyName = o.body;

  const S = { busy: false, out: false, thinking: false, state: "rest" as State, since: performance.now() };
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

  // ---------- every frame ----------
  let last = cur(), drew = false;
  const t0 = performance.now();
  const tick = (_time: number, dtMs: number) => {
    const f = Math.min(3, dtMs / 16.67), dt = Math.min(0.05, dtMs / 1000);
    // riding along with something the page moves
    if (o.follow) {
      const at = o.follow();
      if (at) gsap.set(anchor, { x: at.x, y: at.y, scale: at.scale });
      show(!!at);
    }
    // at home, it rides along with its spot (the page scrolls, the layout moves)
    else if (!S.out && !S.busy) {
      const h = homePt();
      if (h) gsap.set(anchor, { x: h.x, y: h.y, scale: o.homeScale });
      show(!!h);
    }
    const q = cur(), dx = q.x - last.x, dy = q.y - last.y;
    last = q;
    if (drew) ctx.clearRect(0, 0, W, H);
    drew = false;
    if (!shown) return;
    const k: Tick = {
      x: q.x, y: q.y, dx, dy, scale: Number(gsap.getProperty(anchor, "scale")), state: S.state, st: (performance.now() - S.since) / 1000,
      dt, f, t: (performance.now() - t0) / 1000, look, still: still(), W, H,
    };
    drew = body.draw(ctx, k);
  };
  gsap.ticker.add(tick);

  // it arrives: a little pop at home
  if (!still() && !o.follow) {
    const h = homePt();
    // a gentle grow with only a hint of give (debo, 2026-11-14: the overshoots were way too strong)
    if (h) gsap.fromTo(anchor, { scale: 0, autoAlpha: 0 }, { scale: o.homeScale, autoAlpha: 1, duration: 0.7, delay: 0.4, ease: "back.out(1.2)" });
  }

  // ---------- flying ----------
  async function glide(to: Pt, scale: number) {
    S.out = true;
    // already there: nothing to fly (it would rise and drop back)
    const here = cur();
    if (shown && Math.hypot(to.x - here.x, to.y - here.y) < 4) {
      gsap.to(anchor, { scale, duration: 0.3, ease: "sine.inOut" });
      return;
    }
    if (still()) {
      gsap.set(anchor, { x: to.x, y: to.y, scale });
      show(true);
      return;
    }
    // with no home on the page, it appears where it's going
    if (!shown) {
      gsap.set(anchor, { x: to.x, y: to.y, scale: 0 });
      show(true);
      await gsap.to(anchor, { scale, duration: 0.6, ease: "back.out(1.2)" });
      return;
    }
    const from = cur();
    const dx = to.x - from.x, dist = Math.hypot(dx, to.y - from.y);
    // a low arc: a high one read as rising past the spot and settling back down on a phone
    const lift = Math.min(60, 16 + dist * 0.12);
    const mid = { x: (from.x + to.x) / 2 + rand(-40, 40), y: Math.max(30, Math.min(from.y, to.y) - lift) };
    // now and then a small quirk on the way: a slow half turn, or a blink as it lands. no drift past the spot and
    // back: that read as an overshoot (debo, 2026-11-14)
    const r = Math.random(), quirk: Flight["quirk"] = r < 0.3 ? (r < 0.15 ? "turn" : "blink") : "";
    const d = clamp(0.9, 1.6, 0.7 + dist / 900);
    const path = [from, mid, to];
    const along = (pts: Pt[], vars: gsap.TweenVars) => {
      const p = { t: 0 };
      return gsap.to(p, { t: 1, ...vars, onUpdate: () => void gsap.set(anchor, curve(pts, p.t)) });
    };
    const tl = gsap.timeline();
    tl.add(along(path, { duration: d, ease: "sine.inOut" }), 0).to(anchor, { scale, duration: d, ease: "sine.inOut" }, 0);
    const flight: Flight = { tl, dx, d, quirk };
    body.fly?.(flight);
    setState("fly");
    await tl;
    setState(S.thinking ? "think" : "rest");
    body.landed?.(flight);
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
        if (h) await glide(h, o.homeScale);
        else if (!still()) await gsap.to(anchor, { scale: 0, duration: 0.4, ease: "sine.in" });
        if (!h) show(false);
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
    state: () => S.state,
    busy: () => S.busy,
    destroy() {
      gsap.ticker.remove(tick);
      clearInterval(colorTimer);
      removeEventListener("resize", size);
      mq?.removeEventListener("change", onMq);
      body.destroy();
      gsap.killTweensOf(anchor);
      layer.remove();
    },
  };
}
