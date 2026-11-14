// a small aigent that sits in place: the thinking mark in a chat, a picker in setup. it doesn't fly; it thinks
// (or rests) right where it is, in its own way. the glow spills a little past its box, never taking a tap.
import gsap from "gsap";
import { BODIES, type BodyName } from "./bodies";
import { isLight, resolve } from "./color";
import { ensureStyle } from "./style";
import type { BodyInstance, Look, State } from "./types";

export type MarkOptions = { body: BodyName; color?: string; ink?: string; gold?: string; still?: boolean; state?: State };
export type Mark = { set(o: Partial<MarkOptions>): void; destroy(): void };

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function mountMark(el: HTMLElement, opts: MarkOptions): Mark {
  ensureStyle();
  let o = { state: "think" as State, ...opts };
  el.classList.add("ag-mark");
  const canvas = document.createElement("canvas");
  canvas.className = "ag-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const anchor = document.createElement("div");
  anchor.className = "ag-anchor";
  anchor.setAttribute("aria-hidden", "true");
  el.append(anchor, canvas);
  const ctx = canvas.getContext("2d")!;
  let W = 0, H = 0;
  const size = () => {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    if (!r.width) return;
    W = r.width;
    H = r.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const ro = new ResizeObserver(size);
  ro.observe(canvas);
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
  const usesCanvas = () => o.body !== "mae";
  canvas.style.display = usesCanvas() ? "" : "none";
  anchor.style.display = usesCanvas() ? "none" : "";
  const t0 = performance.now();
  let since = performance.now();
  const tick = (_t: number, dtMs: number) => {
    if (!el.isConnected) return;
    const still = !!o.still || reducedMotion();
    ctx.clearRect(0, 0, W, H);
    body.draw(ctx, {
      x: W / 2, y: H / 2, dx: 0, dy: 0, scale: el.offsetWidth / 44, state: o.state, st: (performance.now() - since) / 1000,
      dt: Math.min(0.05, dtMs / 1000), f: Math.min(3, dtMs / 16.67), t: (performance.now() - t0) / 1000, look, still, W, H,
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
        canvas.style.display = usesCanvas() ? "" : "none";
        anchor.style.display = usesCanvas() ? "none" : "";
      }
      readColors();
    },
    destroy() {
      gsap.ticker.remove(tick);
      clearInterval(colorTimer);
      ro.disconnect();
      body.destroy();
      anchor.remove();
      canvas.remove();
      el.classList.remove("ag-mark");
    },
  };
}
