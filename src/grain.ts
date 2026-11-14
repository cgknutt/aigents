// film grain over a page (debo, 2026-11-14: 'a film grain look, not so computer crisp'). one small tile of specks,
// made once, laid over everything at a low strength, and nudged to a new spot a dozen times a second with a css
// animation, so the graphics chip moves it and the page's own code does nothing. it never takes a tap. still for
// reduced motion (the grain stays, it just doesn't shimmer).
import { grainCanvas } from "./core";

export type GrainOptions = { strength?: number; zIndex?: number; within?: HTMLElement };

export function filmGrain(o: GrainOptions = {}): () => void {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  const url = grainCanvas().toDataURL();
  if (!document.getElementById("aigents-grain")) {
    const s = document.createElement("style");
    s.id = "aigents-grain";
    s.textContent = `@keyframes ag-grain { 0%{transform:translate(0,0)} 10%{transform:translate(-5%,-8%)} 20%{transform:translate(-12%,4%)} 30%{transform:translate(6%,-14%)} 40%{transform:translate(-4%,12%)} 50%{transform:translate(-14%,6%)} 60%{transform:translate(10%,0)} 70%{transform:translate(0,10%)} 80%{transform:translate(-10%,-4%)} 90%{transform:translate(8%,6%)} 100%{transform:translate(0,0)} }
.ag-grain { position: fixed; inset: -50%; pointer-events: none; background-size: 128px 128px; animation: ag-grain 0.9s steps(11) infinite; will-change: transform; }
@media (prefers-reduced-motion: reduce) { .ag-grain { animation: none; } }`;
    document.head.appendChild(s);
  }
  el.className = "ag-grain";
  el.style.backgroundImage = `url(${url})`;
  el.style.opacity = String(o.strength ?? 0.06);
  el.style.zIndex = String(o.zIndex ?? 9999);
  (o.within ?? document.body).appendChild(el);
  return () => el.remove();
}
