// air you can see (debo, 2026-11-14: 'these things fly through the air'). thousands of faint motes, like dust in a
// sunbeam, moved by the graphics chip (webgpu). the air drifts slowly on its own; anything that moves through it (a
// body flying, a pointer, a finger) pushes it aside and leaves a curling wake, and the motes settle calm again.
//
// performance, the rules:
// - every mote is moved and drawn on the graphics chip; the page's own code only sends a few numbers a frame.
// - it runs only while something stirs it, and for a few seconds after, then stops. the last frame stays on the
//   screen, so a still page costs nothing at all.
// - nothing while the page is hidden. no webgpu, or reduced motion: no air (createAir gives null), and the page
//   looks exactly as it did before.
import { isLight, resolve } from "./color";
import { onThemeChange } from "./theme";

export type AirOptions = {
  /** where the canvas goes (default: the page body). it's fixed to the screen, behind the page (z -1), and never
   *  takes a tap */
  within?: HTMLElement;
  zIndex?: number;
  /** the motes' color: any css color. default: the page's --ink */
  color?: string;
  /** how many motes. default: 5000 on a computer, 3000 on a touch screen */
  count?: number;
  /** how far down the screen the light reaches, 0 to 1 (a sunbeam from the top). default 1: everywhere */
  band?: number;
  /** how strong it shows, 0 to 1. default 0.5 */
  strength?: number;
  /** a pointer or finger stirs it. default true */
  pointer?: boolean;
  /** the sky it's in (debo, 2026-11-14: 'time of day and weather'): sunbeams 0 to 1 and their slant in degrees
   *  (90 is straight down), their color as 0-1 rgb, the wind in px a second, and rain or snow 0 to 1 */
  sky?: { beams?: number; angle?: number; warm?: [number, number, number]; wind?: [number, number]; rain?: number };
};
export type Air = {
  /** something moved through the air: where, how fast (px a second), how strongly (0 to 1), how wide (px) */
  stir(x: number, y: number, vx: number, vy: number, power?: number, radius?: number): void;
  set(o: Partial<AirOptions>): void;
  destroy(): void;
};

const SHADER = /* wgsl */ `
struct P { pos: vec2f, vel: vec2f };
struct U {
  size: vec2f, time: f32, dt: f32,
  color: vec4f,
  amb: f32, band: f32, alpha: f32, dark: f32,
  count: u32, nstir: u32, rain: f32, beamk: f32,
  wind: vec2f, beam: vec2f,
  warm: vec4f,
  stirs: array<vec4f, 32>,
};
@group(0) @binding(1) var<uniform> u: U;

fn ambient(p: vec2f, t: f32) -> vec2f {
  let a = sin(p.x * 0.0061 + t * 0.53) + sin(p.y * 0.0047 - t * 0.41 + 1.7) + sin((p.x - p.y) * 0.0033 + t * 0.29);
  let b = cos(p.y * 0.0058 + t * 0.47) + cos(p.x * 0.0052 + t * 0.37 + 0.6) + cos((p.x + p.y) * 0.0029 - t * 0.33);
  return vec2f(a, b) / 3.0;
}

@group(0) @binding(0) var<storage, read_write> ps: array<P>;
@compute @workgroup_size(64) fn step(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= u.count) { return; }
  var p = ps[i];
  // the real wind where you are, and rain or snow pulling the motes down
  var want = ambient(p.pos, u.time) * u.amb + u.wind + vec2f(0.0, u.rain * 38.0);
  for (var s = 0u; s < u.nstir; s++) {
    let a = u.stirs[s * 2u];
    let b = u.stirs[s * 2u + 1u];
    let d = p.pos - a.xy;
    let r2 = dot(d, d);
    let f = exp(-r2 / (b.y * b.y)) * b.x;
    // carried along with it, and curled round behind it: a wake
    want += a.zw * f * 0.85;
    let len = sqrt(r2) + 10.0;
    let side = sign(a.z * d.y - a.w * d.x);
    want += vec2f(-d.y, d.x) / len * length(a.zw) * f * 0.55 * side;
  }
  // some motes are heavier than others, so they don't move as one sheet
  let w = 0.6 + fract(f32(i) * 0.6180339) * 1.4;
  p.vel += (want - p.vel) * (1.0 - exp(-u.dt * 2.0 / w));
  p.pos += p.vel * u.dt;
  p.pos = ((p.pos % u.size) + u.size) % u.size;
  ps[i] = p;
}
`;

const DRAW = /* wgsl */ `
struct P { pos: vec2f, vel: vec2f };
struct U {
  size: vec2f, time: f32, dt: f32,
  color: vec4f,
  amb: f32, band: f32, alpha: f32, dark: f32,
  count: u32, nstir: u32, rain: f32, beamk: f32,
  wind: vec2f, beam: vec2f,
  warm: vec4f,
  stirs: array<vec4f, 32>,
};
@group(0) @binding(0) var<storage, read> ps: array<P>;
@group(0) @binding(1) var<uniform> u: U;
struct VO { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) a: f32, @location(2) lit: f32 };

@vertex fn vs(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> VO {
  let p = ps[i];
  var corners = array<vec2f, 6>(vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1));
  let c = corners[v];
  let h = fract(f32(i) * 0.7548776);
  let size = 0.6 + h * 1.1;
  let px = p.pos + c * size;
  var o: VO;
  o.pos = vec4f(px.x / u.size.x * 2.0 - 1.0, 1.0 - px.y / u.size.y * 2.0, 0.0, 1.0);
  o.uv = c;
  // a sunbeam from the top; a slow twinkle; brighter while it's moving
  let band = 1.0 - smoothstep(u.band * 0.55, u.band, p.pos.y / u.size.y);
  let twinkle = 0.55 + 0.45 * sin(u.time * (0.6 + h * 1.8) + h * 40.0);
  let sp = min(length(p.vel) / 70.0, 1.0);
  // barely there at rest; it shows as it moves (debo: subtle, so they feel it, then 'damn')
  o.a = u.alpha * band * (0.35 + 0.65 * twinkle) * (0.22 + sp * 1.1);
  // sunbeams: a few soft slanted shafts; a mote inside one catches the warm light
  let q = dot(p.pos, u.beam);
  let shaft = pow(0.5 + 0.5 * sin(q * 0.0045 + u.time * 0.04), 7.0) * pow(0.5 + 0.5 * sin(q * 0.0017 + 1.3), 2.0);
  o.lit = shaft * u.beamk;
  o.a = o.a * (1.0 + o.lit * 3.0);
  return o;
}
// the beams themselves: a faint warm haze in slanted shafts from the top, drawn once under the motes
struct SO { @builtin(position) pos: vec4f };
@vertex fn vsky(@builtin(vertex_index) v: u32) -> SO {
  var tri = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  var o: SO;
  o.pos = vec4f(tri[v], 0.0, 1.0);
  return o;
}
@fragment fn fsky(i: SO) -> @location(0) vec4f {
  let p = i.pos.xy / u.warm.w;
  let q = dot(p, u.beam);
  let shaft = pow(0.5 + 0.5 * sin(q * 0.0045 + u.time * 0.04), 3.0) * pow(0.5 + 0.5 * sin(q * 0.0017 + 1.3), 2.0);
  let fall = 1.0 - smoothstep(0.05, 0.8, p.y / u.size.y);
  let a = shaft * u.beamk * fall * select(0.2, 0.11, u.dark > 0.5);
  return vec4f(u.warm.rgb * a, a);
}

@fragment fn fs(i: VO) -> @location(0) vec4f {
  let d = dot(i.uv, i.uv);
  if (d > 1.0) { discard; }
  let a = (1.0 - d) * i.a;
  let c = mix(u.color.rgb, u.warm.rgb, clamp(i.lit * 1.6, 0.0, 1.0));
  return vec4f(c * a, a);
}
`;

// webgpu's own types aren't in every project's typescript setup, and this file is compiled by the apps that use it,
// so it speaks to the graphics chip through a loose type and the spec's numbers for buffer use
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Gpu = any;
const USE = { STORAGE: 0x80, UNIFORM: 0x40, COPY_DST: 0x08 };

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export async function createAir(opts: AirOptions = {}): Promise<Air | null> {
  if (typeof navigator === "undefined" || !("gpu" in navigator) || reducedMotion()) return null;
  const gpu: Gpu = (navigator as unknown as { gpu: Gpu }).gpu;
  const adapter: Gpu = await gpu.requestAdapter({ powerPreference: "low-power" }).catch(() => null);
  if (!adapter) return null;
  const device: Gpu = await adapter.requestDevice().catch(() => null);
  if (!device) return null;

  let o: AirOptions = { band: 0.7, strength: 0.5, pointer: true, ...opts };
  const touch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const count = o.count ?? (touch ? 3000 : 5000);

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: String(o.zIndex ?? -1) });
  (o.within ?? document.body).prepend(canvas);
  const ctx = canvas.getContext("webgpu") as Gpu;
  if (!ctx) {
    canvas.remove();
    return null;
  }
  const format: string = gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: "premultiplied" });

  let W = innerWidth, H = innerHeight;
  const size = () => {
    W = innerWidth;
    H = innerHeight;
    const dpr = Math.min(1.5, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  };
  size();

  // the motes: position and velocity, spread over the screen
  const init = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    init[i * 4] = Math.random() * W;
    init[i * 4 + 1] = Math.random() * H;
  }
  const motes = device.createBuffer({ size: init.byteLength, usage: USE.STORAGE | USE.COPY_DST });
  device.queue.writeBuffer(motes, 0, init);
  const ubuf = new ArrayBuffer(608), uf = new Float32Array(ubuf), uu = new Uint32Array(ubuf);
  const uniforms = device.createBuffer({ size: 608, usage: USE.UNIFORM | USE.COPY_DST });

  const stepPipe = device.createComputePipeline({ layout: "auto", compute: { module: device.createShaderModule({ code: SHADER }), entryPoint: "step" } });
  const stepGroup = device.createBindGroup({ layout: stepPipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: motes } }, { binding: 1, resource: { buffer: uniforms } }] });
  const drawModule = device.createShaderModule({ code: DRAW });
  const drawPipe = (additive: boolean) =>
    device.createRenderPipeline({
      layout: "auto",
      vertex: { module: drawModule, entryPoint: "vs" },
      fragment: {
        module: drawModule,
        entryPoint: "fs",
        targets: [{ format, blend: { color: { srcFactor: "one", dstFactor: additive ? "one" : "one-minus-src-alpha" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" } } }],
      },
      primitive: { topology: "triangle-list" },
    });
  const pipes = { light: drawPipe(false), dark: drawPipe(true) };
  const skyPipe = device.createRenderPipeline({
    layout: "auto",
    vertex: { module: drawModule, entryPoint: "vsky" },
    fragment: { module: drawModule, entryPoint: "fsky", targets: [{ format, blend: { color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }, alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" } } }] },
    primitive: { topology: "triangle-list" },
  });
  const skyGroup = device.createBindGroup({ layout: skyPipe.getBindGroupLayout(0), entries: [{ binding: 1, resource: { buffer: uniforms } }] });
  const groups = {
    light: device.createBindGroup({ layout: pipes.light.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: motes } }, { binding: 1, resource: { buffer: uniforms } }] }),
    dark: device.createBindGroup({ layout: pipes.dark.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: motes } }, { binding: 1, resource: { buffer: uniforms } }] }),
  };

  // colors, read now and then (a theme change)
  let rgb: [number, number, number] = [0.2, 0.18, 0.16], dark = false;
  const readColor = () => {
    const ink = resolve("var(--ink, #2e2924)", canvas.parentElement ?? document.body);
    dark = isLight(ink);
    const c = resolve(o.color ?? "var(--ink, #2e2924)", canvas.parentElement ?? document.body);
    rgb = [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];
  };
  readColor();
  const offTheme = onThemeChange(() => {
    readColor();
    wake();
  });

  // what's stirring it: recent pushes, fading over a moment
  type Stir = { x: number; y: number; vx: number; vy: number; power: number; radius: number; t: number };
  let stirs: Stir[] = [];
  const t0 = performance.now();
  let raf = 0, last = 0, lastStir = performance.now(), running = false;
  const AFTER = 5000; // keeps drifting this long after the last stir, then rests

  function frame(now: number) {
    raf = 0;
    if (document.hidden) return void (running = false);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    const live = stirs.filter((s) => now - s.t < 900).slice(-16);
    stirs = live;
    // calm settles to a slow drift, then stops
    const calm = Math.max(0, Math.min(1, (now - lastStir) / AFTER));
    uf[0] = W;
    uf[1] = H;
    uf[2] = (now - t0) / 1000;
    uf[3] = dt;
    uf.set([rgb[0], rgb[1], rgb[2], 1], 4);
    uf[8] = 16 * (1 - calm * 0.6);
    uf[9] = o.band ?? 1;
    // a light page needs a little more to be felt at all (debo: 'too shy' on light); dark stays as it was
    uf[10] = (o.strength ?? 0.5) * (dark ? 0.75 : 0.85);
    uf[11] = dark ? 1 : 0;
    uu[12] = count;
    uu[13] = live.length;
    const sky = o.sky ?? {};
    uf[14] = sky.rain ?? 0;
    uf[15] = sky.beams ?? 0;
    uf[16] = sky.wind?.[0] ?? 0;
    uf[17] = sky.wind?.[1] ?? 0;
    const ang = ((sky.angle ?? 60) * Math.PI) / 180;
    // the shafts run along the slant: the stripes vary across it
    uf.set([-Math.sin(ang), Math.cos(ang)], 18);
    uf.set([...(sky.warm ?? [1, 0.82, 0.55]), canvas.width / W], 20);
    live.forEach((s, i) => {
      const fade = Math.exp(-(now - s.t) / 300);
      uf.set([s.x, s.y, s.vx, s.vy], 24 + i * 8);
      uf.set([s.power * fade, s.radius, 0, 0], 28 + i * 8);
    });
    device.queue.writeBuffer(uniforms, 0, ubuf);
    const enc = device.createCommandEncoder();
    const cp = enc.beginComputePass();
    cp.setPipeline(stepPipe);
    cp.setBindGroup(0, stepGroup);
    cp.dispatchWorkgroups(Math.ceil(count / 64));
    cp.end();
    const rp = enc.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } }] });
    if ((sky.beams ?? 0) > 0.01) {
      rp.setPipeline(skyPipe);
      rp.setBindGroup(0, skyGroup);
      rp.draw(3);
    }
    rp.setPipeline(dark ? pipes.dark : pipes.light);
    rp.setBindGroup(0, dark ? groups.dark : groups.light);
    rp.draw(6, count);
    rp.end();
    device.queue.submit([enc.finish()]);
    if (now - lastStir < AFTER) raf = requestAnimationFrame(frame);
    else running = false;
  }
  const wake = () => {
    if (running || document.hidden) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  };

  const air: Air = {
    stir(x, y, vx, vy, power = 1, radius = 90) {
      const now = performance.now();
      const prev = stirs[stirs.length - 1];
      // many small pushes in a row become one moving push
      if (prev && now - prev.t < 40 && Math.hypot(prev.x - x, prev.y - y) < radius) Object.assign(prev, { x, y, vx, vy, power, radius, t: now });
      else stirs.push({ x, y, vx, vy, power, radius, t: now });
      lastStir = now;
      wake();
    },
    set(n) {
      o = { ...o, ...n };
      readColor();
      wake();
    },
    destroy() {
      cancelAnimationFrame(raf);
      offTheme();
      removeEventListener("pointermove", onPointer);
      removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisible);
      canvas.remove();
      motes.destroy();
      uniforms.destroy();
      device.destroy();
    },
  };

  // a pointer or finger moving stirs it, gently
  let lp: { x: number; y: number; t: number } | null = null;
  const onPointer = (e: PointerEvent) => {
    if (!o.pointer) return;
    const now = performance.now();
    if (lp && now - lp.t < 120) {
      const dt = Math.max(8, now - lp.t) / 1000;
      const vx = (e.clientX - lp.x) / dt, vy = (e.clientY - lp.y) / dt;
      if (Math.hypot(vx, vy) > 30) air.stir(e.clientX, e.clientY, vx * 0.6, vy * 0.6, 0.7, e.pointerType === "mouse" ? 60 : 80);
    }
    lp = { x: e.clientX, y: e.clientY, t: now };
  };
  const onResize = () => {
    size();
    wake();
  };
  const onVisible = () => !document.hidden && wake();
  addEventListener("pointermove", onPointer, { passive: true });
  addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisible);
  device.lost.then(() => canvas.remove());
  // a first breath, so it's there when the page opens
  lastStir = performance.now() - AFTER + 1800;
  wake();
  return air;
}
