// tell me when the page's colors may have changed (light or dark, a theme switch, a palette), instead of checking on a
// timer: a body, a mark, and the air each re-read their colors only then. one watcher for the whole page, and the
// callbacks run at most once a frame.
const subs = new Set<() => void>();
let started = false, queued = false;
function fire() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    subs.forEach((f) => f());
  });
}
function start() {
  if (started || typeof document === "undefined") return;
  started = true;
  new MutationObserver(fire).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "data-look", "data-case"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", fire);
  // a theme often changes on a click; a late style (a palette settling) is caught a moment after
  addEventListener("click", () => setTimeout(fire, 400), { passive: true });
}
export function onThemeChange(f: () => void): () => void {
  start();
  subs.add(f);
  return () => void subs.delete(f);
}
