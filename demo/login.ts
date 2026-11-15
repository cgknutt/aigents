import { createAir, startDance, type Air } from "../src";
let air: Air | null = null;
const q = new URLSearchParams(location.search);
if (!q.has("noair")) void createAir({ strength: 0.5, sky: { beams: 0.6, angle: 60, wind: [5, 0] } }).then((a) => (air = a));
if (!q.has("nodance")) startDance({ color: "var(--me)", air: () => air });
