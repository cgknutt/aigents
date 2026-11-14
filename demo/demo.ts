import { BODY_NAMES, createAigent, filmGrain, mountMark, seventies, type BodyName } from "../src";
const $ = (s: string) => document.querySelector<HTMLElement>(s)!;
const COLORS = ["#b0623f", "#3f8c88", "#4f86b8", "#8a5a8c", "#c49a3a"];
let ci = 0, body: BodyName = (new URLSearchParams(location.search).get("body") as BodyName) || "mae", still = false, thinking = false;
const a = createAigent({ body, color: "var(--me)", home: () => $("#home") });
// ?bare=1: only the flying aigent, nothing else moving (for measuring)
const bare = new URLSearchParams(location.search).has("bare");
const mark = bare ? { set() {} } : mountMark($("#mark"), { body, color: "var(--me)" });
const picks = (bare ? [] : BODY_NAMES).map((n) => {
  const b = document.createElement("button"); b.className = "pick"; b.innerHTML = `<span class="m"></span><span>${n}</span>`; $("#picks").append(b);
  const m = mountMark(b.querySelector<HTMLElement>(".m")!, { body: n, color: "var(--me)", state: "rest" });
  b.onclick = () => pickBody(n);
  return { n, b, m };
});
const bar = BODY_NAMES.map((n) => { const b = document.createElement("button"); b.textContent = n; b.onclick = () => pickBody(n); $("#bodies").append(b); return b; });
function pickBody(n: BodyName) { body = n; a.set({ body: n }); mark.set({ body: n }); mark_(); }
function mark_() { bar.forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === body))); picks.forEach((p) => p.b.setAttribute("aria-pressed", String(p.n === body))); $("#still").setAttribute("aria-pressed", String(still)); }
mark_();
$("#tour").onclick = async () => { for (const id of ["#c", "#a", "#b"]) { await a.flyTo($(id)); a.think(true); await new Promise((r) => setTimeout(r, 1600)); a.think(false); } await a.goHome(); };
$("#think").onclick = () => { thinking = !thinking; a.think(thinking); };
$("#done").onclick = () => a.done();
$("#hop").onclick = () => a.hop();
$("#still").onclick = () => { still = !still; a.set({ still }); mark.set({ still }); picks.forEach((p) => p.m.set({ still })); mark_(); };
$("#theme").onclick = () => { const d = document.documentElement; d.dataset.theme = d.dataset.theme === "dark" ? "light" : "dark"; };
$("#color").onclick = () => { ci = (ci + 1) % COLORS.length; document.documentElement.style.setProperty("--me", COLORS[ci]!); };
// the film look, to try by eye
const q = new URLSearchParams(location.search);
let film = q.has("film"), bgrain = q.has("bgrain"), unGrain: (() => void) | null = null;
const filmMark = () => {
  a.set({ fps: film ? 24 : undefined, shutter: film ? 0.75 : false, grain: bgrain ? 0.85 : 0 });
  $("#film").setAttribute("aria-pressed", String(film));
  $("#bgrain").setAttribute("aria-pressed", String(bgrain));
  $("#pgrain").setAttribute("aria-pressed", String(!!unGrain));
};
$("#film").onclick = () => { film = !film; filmMark(); };
$("#bgrain").onclick = () => { bgrain = !bgrain; filmMark(); };
$("#pgrain").onclick = () => { if (unGrain) { unGrain(); unGrain = null; } else unGrain = filmGrain({ strength: 0.12 }); filmMark(); };
if (q.has("pgrain")) unGrain = filmGrain({ strength: 0.12 });
// the whole 70s package: the page look, plus film speed, the shutter, and grain in the light
let un70: (() => void) | null = null;
const set70 = (on: boolean) => {
  un70?.();
  un70 = on ? seventies() : null;
  film = on || film;
  bgrain = on || bgrain;
  if (!on) film = bgrain = false;
  $("#seventies").setAttribute("aria-pressed", String(on));
  filmMark();
};
$("#seventies").onclick = () => set70(!un70);
if (q.has("seventies")) set70(true);
filmMark();
Object.assign(window, { aigent: a });
