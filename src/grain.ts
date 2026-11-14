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

/** the whole 1970s film look over a page (debo, 2026-11-14: 'old school 70's grainy, or not do it'): heavy grain,
 *  bigger and clumpier, a warm kodak cast, a vignette, and the projector lamp's faint flicker. all overlays the
 *  graphics chip moves; none of it takes a tap. still for reduced motion (no shimmer, no flicker). */
export function seventies(o: { zIndex?: number; within?: HTMLElement } = {}): () => void {
  const z = o.zIndex ?? 9999, host = o.within ?? document.body;
  if (!document.getElementById("aigents-70s")) {
    const s = document.createElement("style");
    s.id = "aigents-70s";
    s.textContent = `@keyframes ag-flicker { 0%,100%{opacity:1} 12%{opacity:.92} 14%{opacity:1} 47%{opacity:.96} 49%{opacity:1} 78%{opacity:.9} 80%{opacity:1} }
.ag-70s-warm { position: fixed; inset: 0; pointer-events: none; background: rgba(255, 150, 60, 0.13); mix-blend-mode: multiply; }
.ag-70s-fade { position: fixed; inset: 0; pointer-events: none; background: rgba(255, 236, 200, 0.07); mix-blend-mode: screen; }
.ag-70s-vignette { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse at center, transparent 55%, rgba(40, 18, 4, 0.42) 100%); animation: ag-flicker 2.3s steps(1) infinite; }
@media (prefers-reduced-motion: reduce) { .ag-70s-vignette { animation: none; } }`;
    document.head.appendChild(s);
  }
  const parts = ["ag-70s-warm", "ag-70s-fade", "ag-70s-vignette"].map((c) => {
    const el = document.createElement("div");
    el.className = c;
    el.setAttribute("aria-hidden", "true");
    el.style.zIndex = String(z);
    host.appendChild(el);
    return el;
  });
  // clumpier grain: the same tile, drawn bigger, and stronger
  const grain = filmGrain({ strength: 0.2, zIndex: z, within: host });
  const g = host.lastElementChild as HTMLElement | null;
  if (g?.classList.contains("ag-grain")) g.style.backgroundSize = "190px 190px";
  return () => {
    grain();
    parts.forEach((p) => p.remove());
  };
}
