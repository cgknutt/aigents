# aigents

animated bodies for an ai helper, made of light. each one flies to what it's explaining, thinks in its own way, and lands softly.

- **mae** — ink petals and a gold center, from d{ai}sy. her petals come loose when she flies fast and find their way home. named for daisy mae.
- **firefly** — a soft light with a trail of sparks. it pulses while it thinks.
- **stardust** — a little flock of lights. it spins into a galaxy while it thinks.
- **orb** — a glass ball with light inside. it glows and spins while it thinks.

plain typescript and gsap. no framework, and nothing about the page it lives on. used by d{ai}sy and /coody.

```ts
import { createAigent, mountMark } from "aigents";

// a flying one, living in a spot on the page
const a = createAigent({ body: "mae", color: "var(--me)", home: () => document.querySelector(".ask-spark") });
await a.flyTo(card);   // lands just outside the card's top corner, never on a button
a.think();             // its own way of thinking
a.think(false);
await a.done();        // a happy moment
await a.goHome();

// a small one that thinks in place (a chat's thinking mark)
const m = mountMark(span, { body: "firefly", color: "#4f86b8" });
```

it never takes a tap: everything draws in a layer with `pointer-events: none`. with reduced motion (or `still: true`) nothing moves: it appears where it's going and holds still.

## install

```sh
bun add github:cgknutt/aigents#v0.1.0 gsap
```

next.js needs `transpilePackages: ["aigents"]`, because it ships as typescript.

## demo

```sh
bun install && bun run demo   # http://localhost:4830
```
