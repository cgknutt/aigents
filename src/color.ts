// colors: a page hands us any css color (a hex, rgb(), var(--ink), light-dark(...)), and a canvas needs a plain one.
// a hidden probe element works out what the page means right now; a tiny canvas turns that into #rrggbb.

let probe: HTMLSpanElement | null = null;
let norm: CanvasRenderingContext2D | null = null;

export function resolve(css: string, within: Element = document.body): string {
  if (!probe) {
    probe = document.createElement("span");
    probe.style.display = "none";
  }
  if (probe.parentElement !== within) within.appendChild(probe);
  probe.style.color = "";
  probe.style.color = css;
  const got = getComputedStyle(probe).color || css;
  norm ??= document.createElement("canvas").getContext("2d");
  if (!norm) return got;
  norm.fillStyle = "#000";
  norm.fillStyle = got;
  const out = String(norm.fillStyle);
  if (out.startsWith("#")) return out;
  // rgba(...) with alpha: keep the color, drop the alpha
  const m = out.match(/[\d.]+/g);
  return m && m.length >= 3 ? hex([+m[0]!, +m[1]!, +m[2]!]) : "#888888";
}

export const rgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hex = (c: number[]) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
export const rgba = (h: string, a: number) => {
  const [r, g, b] = rgb(h);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
};
export const mixHex = (a: string, b: string, t: number) => {
  const A = rgb(a), B = rgb(b);
  return hex(A.map((v, i) => v + (B[i]! - v) * t));
};
/** the light version of a color: what a glow's bright middle looks like */
export const light = (h: string) => mixHex(h, "#fff8e6", 0.6);
/** is this a light color? (light ink means a dark page) */
export const isLight = (h: string) => {
  const [r, g, b] = rgb(h);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
};
