import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createCameraRig } from "./baiterek-camera";
import { createBaiterekModel, disposeModel, type BaiterekColors } from "./baiterek-model";
import { createPost } from "./baiterek-post";
import { createSpinControls } from "./spin-controls";

const MAX_DPR = 1.75;

// Resolves any CSS color syntax (hex, rgb, oklch) through a 1px canvas.
function cssColors(names: string[]): THREE.Color[] {
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const style = getComputedStyle(document.documentElement);
  return names.map((name) => {
    if (!ctx) return new THREE.Color(0xcccccc);
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = style.getPropertyValue(name).trim() || "#cccccc";
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
  });
}

function readPalette() {
  const [gold, card, secondary, background, foreground, sky, muted] = cssColors([
    "--gold",
    "--card",
    "--secondary",
    "--background",
    "--foreground",
    "--sky",
    "--muted-foreground",
  ]);
  const colors: BaiterekColors = {
    gold,
    branch: card.clone().lerp(gold, 0.05).lerp(foreground, 0.06),
    stone: secondary.clone().lerp(foreground, 0.04),
    shaft: muted.clone().lerp(foreground, 0.25),
    glass: sky.clone().lerp(foreground, 0.45),
  };
  return { colors, background, foreground, sky };
}

function addLights(scene: THREE.Scene, paper: THREE.Color, sky: THREE.Color) {
  scene.add(new THREE.HemisphereLight(0xffffff, paper, 0.3));
  const key = new THREE.DirectionalLight(0xfff0d8, 1.5); // warm, upper left
  key.position.set(-6, 9, 6);
  const rim = new THREE.DirectionalLight(sky.clone().lerp(new THREE.Color(0xffffff), 0.35), 1.6); // cool, behind
  rim.position.set(5, 7, -7);
  scene.add(key, rim);
}

// Soft contact shadow: a radial gradient on a ground plane, cheaper than a shadow map.
function createContactShadow(ink: THREE.Color): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const rgb = ink.getStyle(THREE.SRGBColorSpace).replace("rgb(", "").replace(")", "");
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(${rgb}, 0.34)`);
    g.addColorStop(0.5, `rgba(${rgb}, 0.12)`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0.37; // on the podium top, around the foot
  return plane;
}

function createRenderer(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%" });
  host.appendChild(renderer.domElement);
  return renderer;
}

// Runs the loop only while the canvas is on screen and the tab is visible.
function watchVisibility(host: HTMLElement, onChange: (running: boolean) => void) {
  let inView = false;
  const sync = () => onChange(inView && document.visibilityState === "visible");
  const io = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  });
  io.observe(host);
  document.addEventListener("visibilitychange", sync);
  return () => {
    io.disconnect();
    document.removeEventListener("visibilitychange", sync);
  };
}

// Studio reflections so the gold reads as gold; returns the disposer.
function addEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envMap = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  scene.environment = envMap;
  scene.environmentIntensity = 0.4;
  const dispose = () => {
    envMap.dispose();
    pmrem.dispose();
  };
  return { envMap, dispose };
}

// 0 while the hero is fully in view, 1 once the canvas bottom leaves the top of the viewport.
function scrollProgress(host: HTMLElement): number {
  const rect = host.getBoundingClientRect();
  const bottom = rect.bottom + window.scrollY;
  return THREE.MathUtils.clamp(window.scrollY / Math.max(bottom, 1), 0, 1);
}

export interface StageEvents {
  /** Elevator height in metres, every frame of the intro and once more at 97. */
  onLift(metres: number): void;
  /** Podium and deck positions (fractions of the canvas height) in the final frame. */
  onAnchors(bottom: number, top: number): void;
}

// Scene with lights, studio reflections, the model and its contact shadow under a turnable root.
function buildScene(renderer: THREE.WebGLRenderer) {
  const { colors, background, foreground, sky } = readPalette();
  const scene = new THREE.Scene();
  const env = addEnvironment(renderer, scene);
  addLights(scene, background, sky);
  const root = new THREE.Group();
  root.add(createBaiterekModel(colors, env.envMap), createContactShadow(foreground));
  scene.add(root);
  return { scene, root, env, background };
}

/** Mounts the interactive Baiterek into host; returns a cleanup that frees every GPU resource. */
export function mountBaiterek(host: HTMLElement, events: StageEvents): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = createRenderer(host);
  const { scene, root, env, background } = buildScene(renderer);
  const rig = createCameraRig();
  if (reduced) rig.skip();
  const post = createPost(renderer, scene, rig.camera, background);
  const controls = createSpinControls(host);

  let last = performance.now();
  let lastLift = -1;
  const frame = (now: number) => {
    // rAF timestamps can precede the performance.now() taken when the loop (re)started.
    const dt = THREE.MathUtils.clamp((now - last) / 1000, 0, 0.05);
    last = now;
    const { yaw, tilt } = controls.update(dt);
    root.rotation.set(tilt, yaw, 0);
    const lift = rig.update(dt, reduced ? 0 : scrollProgress(host));
    if (lift !== lastLift) events.onLift((lastLift = lift));
    post.render();
  };
  const resize = new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = host;
    renderer.setSize(w, h, false);
    post.setSize(w, h, renderer.getPixelRatio());
    rig.fit(w, h);
    events.onAnchors(rig.anchors.bottom, rig.anchors.top);
    post.render();
  });
  resize.observe(host);
  const stopWatching = watchVisibility(host, (running) => {
    last = performance.now();
    renderer.setAnimationLoop(running ? frame : null);
  });

  return () => {
    renderer.setAnimationLoop(null);
    stopWatching();
    resize.disconnect();
    controls.dispose();
    disposeModel(root);
    post.dispose();
    env.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}
