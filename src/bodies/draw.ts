// small drawing helpers the glowing bodies share
import { rgba } from "../color";

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
/** on a dark page, light adds up (it glows); on a light page it paints normally */
export const glow = (c: CanvasRenderingContext2D, dark: boolean) => void (c.globalCompositeOperation = dark ? "lighter" : "source-over");
export const flat = (c: CanvasRenderingContext2D) => void (c.globalCompositeOperation = "source-over");
export function orbGlow(c: CanvasRenderingContext2D, x: number, y: number, R: number, col: string, a: number) {
  if (R <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.4, rgba(col, a * 0.35));
  g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, R, 0, 7);
  c.fill();
}
export function star(c: CanvasRenderingContext2D, x: number, y: number, R: number, r: number, rot: number) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r : R;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}
/** a glowing body's size: at scale 1 it's about as big as mae's 44px flower */
export const sizeOf = (scale: number) => scale * 1.5;
