// a small aigent that lives inside one box: the thinking mark in a chat, or a card in a picker. it doesn't fly across
// the page; it thinks (or rests) in its box, in its own way, and it can follow a point inside the box (a pointer on
// a computer, a finger on a phone), on a soft spring, then drift back to the middle. its glow may spill a little past
// a small box (`spill`), never taking a tap.
import gsap from "gsap";
import { BODIES, type BodyName } from "./bodies";
import { isLight, resolve } from "./color";
import { ensureStyle } from "./style";
import type { BodyInstance, Look, Pt, State } from "./types";

export type MarkOptions = {
  body: BodyName;
  color?: string;
  ink?: string;
  gold?: string;
  still?: boolean;
  state?: State;
  /** its size: 1 is the 44px flower. default: fits the box */
  scale?: number;
  /** let the glow spill past the box (a small mark in a line of text). default true */
  spill?: boolean;
};
export type Mark = {
  set(o: Partial<MarkOptions>): void;
  /** follow this point (in the box's own px), or null to drift back to the middle */
  point(p: Pt | null): void;
  destroy(): void;
};

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function mountMark(el: HTMLElement, opts: MarkOptions): Mark {
  ensureStyle();
  let o = { state: "think" as State, spill: true, ...opts };
  el.classList.add("ag-mark");
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  const canvas = document.createElement("canvas");
  canvas.className = o.spill ? "ag-canvas ag-spill" : "ag-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const anchor = document.createElement("div");
  anchor.className = "ag-anchor";
  anchor.setAttribute("aria-hidden", "true");
  el.append(anchor, canvas);
  gsap.set(anchor, { xPercent: -50, yPercent: -50 });
  const ctx = canvas.getContext("2d")!;
  // the canvas may be bigger than the box (spill): where the box's own (0,0) sits on it
  let W = 0, H = 0, offX = 0, offY = 0;
  const size = () => {
    const r = canvas.getBoundingClientRect(), b = el.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    if (!r.width) return;
    W = r.width;
    H = r.height;
    offX = b.left - r.left;
    offY = b.top - r.top;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const ro = new ResizeObserver(size);
  ro.observe(canvas);
  ro.observe(el);
  size();
  let look: Look = { color: "#b0623f", ink: "#2e2924", gold: "#c49a3a", dark: false };
  const readColors = () => {
    const ink = resolve(o.ink ?? "var(--ink, #2e2924)", el);
    look = { color: resolve(o.color ?? "var(--accent, #b0623f)", el), ink, gold: resolve(o.gold ?? "var(--chamisa, #c49a3a)", el), dark: isLight(ink) };
    el.style.setProperty("--ag-ink", look.ink);
    el.style.setProperty("--ag-gold", look.gold);
  };
  readColors();
  const colorTimer = setInterval(readColors, 2000);
  const make = () => BODIES[o.body].create({ anchor, layer: null, mini: true });
  let body: BodyInstance = make();
  // a canvas body draws itself on the canvas; mae is her flower in the anchor
  const show = () => {
    const c = o.body !== "mae";
    canvas.style.display = c ? "" : "none";
    anchor.style.display = c ? "none" : "";
  };
  show();

  // where it is in the box, on a soft spring toward where it's wanted
  let want: Pt | null = null;
  const P = { x: -1, y: -1, vx: 0, vy: 0 };
  const t0 = performance.now();
  let since = performance.now();
  // off the screen (scrolled away, a closed panel): nothing at all. resting in the middle: a few frames a second
  let visible = true, wait = 0;
  const io = typeof IntersectionObserver === "function" ? new IntersectionObserver((e) => void (visible = e.some((x) => x.isIntersecting))) : null;
  io?.observe(el);
  const tick = (_t: number, dtMs: number) => {
    if (!el.isConnected || !visible) return;
    wait += dtMs;
    const settled = !want && Math.hypot(P.vx, P.vy) < 1;
    if (o.state === "rest" && settled && wait < 1000 / 12) return;
    dtMs = wait;
    wait = 0;
    const still = !!o.still || reducedMotion();
    const bw = el.clientWidth, bh = el.clientHeight;
    const scale = o.scale ?? Math.min(bw, bh) / 44;
    const home = { x: bw / 2, y: bh / 2 };
    const to = want ?? home;
    const dt = Math.min(0.1, dtMs / 1000), f = Math.min(6, dtMs / 16.67);
    if (P.x < 0 || still) {
      P.x = to.x;
      P.y = to.y;
      P.vx = P.vy = 0;
    }
    const lx = P.x, ly = P.y;
    if (!still) {
      // a calm spring: it eases after the point, a little behind, with no bounce
      const k = 60, d = 2 * 0.95 * Math.sqrt(k);
      P.vx += ((to.x - P.x) * k - P.vx * d) * dt;
      P.vy += ((to.y - P.y) * k - P.vy * d) * dt;
      P.x += P.vx * dt;
      P.y += P.vy * dt;
    }
    gsap.set(anchor, { x: P.x, y: P.y, scale, width: 44, height: 44 });
    ctx.clearRect(0, 0, W, H);
    body.draw(ctx, {
      x: P.x + offX, y: P.y + offY, dx: P.x - lx, dy: P.y - ly, scale, state: o.state,
      st: (performance.now() - since) / 1000, dt, f, t: (performance.now() - t0) / 1000, look, still, W, H,
    });
  };
  gsap.ticker.add(tick);
  return {
    set(n) {
      const was = o.body;
      if (n.state && n.state !== o.state) since = performance.now();
      o = { ...o, ...n };
      if (o.body !== was) {
        body.destroy();
        body = make();
        show();
      }
      readColors();
    },
    point(p) {
      want = p;
    },
    destroy() {
      gsap.ticker.remove(tick);
      clearInterval(colorTimer);
      ro.disconnect();
      io?.disconnect();
      body.destroy();
      anchor.remove();
      canvas.remove();
      el.classList.remove("ag-mark");
    },
  };
}
