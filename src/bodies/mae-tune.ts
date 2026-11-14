// mae's numbers: her petals' personalities, and the 'subtle ↔ crazy ass' dial that sets how wild she gets.
// shared by her engine (mae.ts) and the settings panel (dials.tsx), so both read the same defaults.

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** one petal's personality. they all live by the same physics: a spring pulling it to its place on her (k),
 *  air drag (d), momentum, and its own twirl (spin). the rest are its one quirk, a nudge of its own. */
export type Kind = {
  name: string;
  about: string;
  k: number;
  d: number;
  spin: number;
  orbit?: number;
  grav?: number;
  flutter?: number;
  wander?: number;
  bounce?: number;
  shy?: number;
};

export const KINDS: Kind[] = [
  { name: "clingy", about: "barely lets go", k: 0.16, d: 0.22, spin: 1.5 },
  { name: "eager", about: "overshoots and wobbles, always close", k: 0.07, d: 0.09, spin: 4 },
  { name: "dancer", about: "pirouettes the whole way", k: 0.04, d: 0.08, spin: 15 },
  { name: "showoff", about: "loops circles around her", k: 0.025, d: 0.05, spin: 7, orbit: 0.7 },
  { name: "lazy", about: "sinks and see-saws like a falling leaf", k: 0.012, d: 0.035, spin: 1.2, grav: 0.14, flutter: 1.4 },
  { name: "wanderer", about: "drifts off on a path of its own", k: 0.008, d: 0.03, spin: 2.5, wander: 0.45 },
  { name: "bouncer", about: "flung wide, bounces off the screen edges", k: 0.01, d: 0.012, spin: 6, bounce: 0.85 },
  { name: "shy", about: "ducks away from your cursor", k: 0.03, d: 0.08, spin: 2, shy: 1 },
];

/** the quirks a petal can have: [label, min, max, step] */
export const QUIRKS: Record<string, [string, number, number, number]> = {
  orbit: ["loops", 0, 2, 0.05],
  grav: ["sink", 0, 0.5, 0.01],
  flutter: ["sway", 0, 4, 0.1],
  wander: ["wander", 0, 1.5, 0.05],
  bounce: ["bounce", 0, 1, 0.05],
  shy: ["shyness", 0, 3, 0.1],
};

/** knobs for all the petals at once */
export type Knobs = { loose: number; drag: number; fling: number; spin: number; quirks: number; breakAt: number; zoom: number };

/** the big dial, 0 subtle to 1 crazy ass, sets every knob. the knob sliders then fine-tune from there. */
export const knobsFor = (c: number): Knobs => ({
  loose: +mix(0.45, 2.2, c).toFixed(2),
  drag: +mix(2.4, 0.6, c).toFixed(2),
  fling: +mix(0.1, 2.2, c).toFixed(2),
  spin: +mix(0.1, 2, c).toFixed(2),
  quirks: +mix(0.05, 2, c).toFixed(2),
  breakAt: Math.round(mix(20, 6, c)),
  zoom: +mix(4.2, 2.3, c).toFixed(1),
});

/** a word for where the dial sits */
export const crazyWord = (c: number) =>
  c < 0.15 ? "calm" : c < 0.35 ? "gentle" : c < 0.55 ? "playful" : c < 0.75 ? "lively" : c < 0.92 ? "wild" : "crazy ass";
