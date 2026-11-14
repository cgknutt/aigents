// aigents: animated bodies for an ai helper, made of light. each one flies to what it's explaining, thinks in its
// own way, and lands softly. plain typescript + gsap: no framework, nothing about the page it lives on.
//
//   const a = createAigent({ body: "mae", color: "var(--me)", home: () => document.querySelector(".ask-spark") });
//   await a.flyTo(card); a.think(); ... a.think(false); await a.goHome();
//
//   mountMark(span, { body: "firefly", color: "#4f86b8" })   // a small one that thinks in place
export { createAigent, beside, type Aigent, type AigentOptions } from "./core";
export { mountMark, type Mark, type MarkOptions } from "./mark";
export { BODIES, BODY_NAMES, isBodyName, type BodyName } from "./bodies";
export type { BodyDef, BodyInstance, Host, Look, Pt, State, Tick } from "./types";
