// every body, by name. mae comes first: she's the real one.
import type { BodyDef } from "../types";
import { firefly } from "./firefly";
import { mae } from "./mae";
import { orb } from "./orb";
import { stardust } from "./stardust";

export const BODIES = { mae, firefly, stardust, orb } satisfies Record<string, BodyDef>;
export type BodyName = keyof typeof BODIES;
export const BODY_NAMES = Object.keys(BODIES) as BodyName[];
export const isBodyName = (s: unknown): s is BodyName => typeof s === "string" && s in BODIES;
