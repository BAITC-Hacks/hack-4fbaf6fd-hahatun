import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createBaiterekModel, disposeModel, type BaiterekColors } from "./baiterek-model";
import { createSpinControls } from "./spin-controls";

const FOV = 30;
const LOOK_AT = new THREE.Vector3(0, 4.25, 0);
const FRAME_H = 9.1; // model height (~8.1) plus breathing room
const FRAME_W = 4.4; // base diameter (3.5) plus breathing room
const CAMERA_Y = 1.1; // below the look-at point: slightly low angle, the tower feels tall

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
  const [gold, card, secondary, background, foreground, sky] = cssColors([
    "--gold",
    "--card",
    "--secondary",
    "--background",
    "--foreground",
    "--sky",
  ]);
  const colors: BaiterekColors = { gold, branch: card.clone().lerp(gold, 0.06).lerp(foreground, 0.08), stone: secondary };
  return { colors, background, foreground, sky };
}

function addLights(scene: THREE.Scene, paper: THREE.Color, sky: THREE.Color) {
  scene.add(new THREE.HemisphereLight(0xffffff, paper, 0.2));
  const key = new THREE.DirectionalLight(0xfff0d8, 2); // warm, upper left
  key.position.set(-6, 9, 6);
  const rim = new THREE.DirectionalLight(sky.clone().lerp(new THREE.Color(0xffffff), 0.4), 1.8); // cool, behind
  rim.position.set(4, 6, -7);
  scene.add(key, rim);
}

// Soft contact shadow: a radial gradient on a ground plane, cheaper than a shadow map.
function createContactShadow(ink: THREE.Color): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const rgb = `${Math.round(ink.r * 255)}, ${Math.round(ink.g * 255)}, ${Math.round(ink.b * 255)}`;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(${rgb}, 0.32)`);
    g.addColorStop(0.55, `rgba(${rgb}, 0.12)`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0.002;
  return plane;
}

function fitCamera(camera: THREE.PerspectiveCamera, width: number, height: number) {
  camera.aspect = width / Math.max(height, 1);
  const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const distance = Math.max(FRAME_H / (2 * t), FRAME_W / (2 * t * camera.aspect));
  camera.position.set(0, CAMERA_Y, distance);
  camera.lookAt(LOOK_AT);
  camera.updateProjectionMatrix();
}

function createRenderer(host: HTMLElement) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
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
  scene.environmentIntensity = 1.1;
  return () => {
    envMap.dispose();
    pmrem.dispose();
  };
}

/** Mounts the interactive Baiterek into host; returns a cleanup that frees every GPU resource. */
export function mountBaiterek(host: HTMLElement): () => void {
  const { colors, background, foreground, sky } = readPalette();
  const renderer = createRenderer(host);
  const scene = new THREE.Scene();
  const disposeEnvironment = addEnvironment(renderer, scene);
  addLights(scene, background, sky);

  const root = new THREE.Group();
  root.add(createBaiterekModel(colors), createContactShadow(foreground));
  scene.add(root);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  const controls = createSpinControls(host);

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const { yaw, tilt } = controls.update(dt);
    root.rotation.set(tilt, yaw, 0);
    renderer.render(scene, camera);
  };
  const resize = new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = host;
    renderer.setSize(w, h, false);
    fitCamera(camera, w, h);
    renderer.render(scene, camera);
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
    disposeEnvironment();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}
