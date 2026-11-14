// the shapes every body and host share. a body knows how to look and move its own parts;
// the host (core.ts for a flying aigent, mark.ts for a small one that sits still) moves it around.

export type Pt = { x: number; y: number };

/** what it's doing: resting at home, flying, thinking, or just done (a happy moment) */
export type State = "rest" | "fly" | "think" | "done";

/** colors, already worked out to plain #rrggbb so a canvas can use them */
export type Look = {
  /** the person's own color */
  color: string;
  /** the page's ink (mae's petals) */
  ink: string;
  /** gold (mae's center and glow) */
  gold: string;
  /** a dark page: glowing bodies add their light instead of painting over */
  dark: boolean;
};

/** one frame, handed to the body */
export type Tick = {
  x: number;
  y: number;
  /** how far it moved since the last frame, in px (at 60 frames a second) */
  dx: number;
  dy: number;
  /** its size: 1 is the full 44px flower */
  scale: number;
  state: State;
  /** seconds since the state began */
  st: number;
  /** seconds since the last frame */
  dt: number;
  /** frames since the last frame (1 at 60 a second): what daisy's petal physics counts in */
  f: number;
  /** seconds since it started */
  t: number;
  look: Look;
  /** hold still (reduced motion, or a simple view) */
  still: boolean;
  /** the canvas size, in css px */
  W: number;
  H: number;
};

/** where a body lives */
export type Host = {
  /** the element at its center. the host moves it; mae draws her flower inside it */
  anchor: HTMLElement;
  /** the full-screen layer, for parts that fly loose (mae's petals). null for a small mark */
  layer: HTMLElement | null;
  /** a small one that sits in place (the thinking mark in a chat) */
  mini: boolean;
};

export type Flight = { tl: gsap.core.Timeline; dx: number; d: number; quirk: "" | "turn" | "blink" };

export type BodyInstance = {
  /** draw this frame on the canvas (already cleared). return true if anything was drawn */
  draw(ctx: CanvasRenderingContext2D, k: Tick): boolean;
  /** add its own touches to a flight (mae leans into it) */
  fly?(f: Flight): void;
  /** after landing */
  landed?(f: Flight): void;
  /** a happy moment, when something is done */
  happy?(k: Tick): Promise<void> | void;
  /** a small hop */
  hop?(): void;
  destroy(): void;
};

export type BodyDef = {
  id: string;
  name: string;
  about: string;
  create(host: Host): BodyInstance;
};
