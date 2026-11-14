// the few styles the bodies need, put on the page once, so a project only imports the code.
// every class starts with ag- so nothing clashes with the page's own.

const CSS = `
.ag-layer { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
.ag-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.ag-anchor { position: absolute; left: 0; top: 0; width: 44px; height: 44px; will-change: transform; }
.ag-squash, .ag-body { position: absolute; inset: 0; display: block; }
.ag-body svg { width: 100%; height: 100%; overflow: visible; display: block;
  filter: drop-shadow(0 0 7.4px color-mix(in oklab, var(--ag-gold) 75%, transparent)); }
.ag-petal { fill: var(--ag-ink); opacity: 0.85; }
.ag-center { fill: var(--ag-gold); }
.ag-halo-wrap { position: absolute; inset: -16px; opacity: 0.6; }
.ag-halo { position: absolute; inset: 0; border-radius: 50%; opacity: 0.45;
  background: radial-gradient(circle, color-mix(in oklab, var(--ag-gold) 50%, transparent), transparent 65%); }
.ag-loose { position: absolute; left: 0; top: 0; width: 8.44px; height: 13.33px; overflow: visible; }
.ag-mark { position: relative; display: inline-block; vertical-align: middle; }
.ag-mark > .ag-anchor { width: 100%; height: 100%; }
.ag-mark > .ag-canvas { inset: auto; left: -75%; top: -75%; width: 250%; height: 250%; pointer-events: none; }
.ag-mark .ag-body svg { filter: drop-shadow(0 0 3px color-mix(in oklab, var(--ag-gold) 70%, transparent)); }
.ag-mark .ag-halo-wrap { inset: -30%; }
`;

export function ensureStyle() {
  if (typeof document === "undefined" || document.getElementById("aigents-style")) return;
  const s = document.createElement("style");
  s.id = "aigents-style";
  s.textContent = CSS;
  document.head.appendChild(s);
}
