import * as THREE from "three";
import { BASE_TOP, SPHERE_Y } from "./baiterek-dims";

const FOV = 30;
const INTRO_FOV = 46; // wide and close at the podium, narrowing as the camera pulls back
const INTRO_S = 4.2;
const LOOK_AT = new THREE.Vector3(0, 4.35, 0);
const FRAME_H = 9.3; // model height (~8.4) plus breathing room
const FRAME_W = 4.4; // podium diameter (4.3); the plaza fades out anyway
const CAMERA_Y = 1.6; // below the look-at point: slightly low angle, the tower feels tall
const ORBIT = THREE.MathUtils.degToRad(45); // scroll-linked orbit when the hero leaves the viewport
const ORBIT_RISE = 2.6;
const ELEVATOR_END = 2 / 3; // the curve reaches the deck at this progress (third of four keyframes)

// Exponential ease-out, normalised to hit exactly 1.
const expoOut = (t: number) => (t >= 1 ? 1 : (1 - Math.pow(2, -4 * t)) / (1 - Math.pow(2, -4)));

const around = (angle: number, r: number, y: number) => new THREE.Vector3(Math.sin(angle) * r, y, Math.cos(angle) * r);

export interface CameraRig {
  camera: THREE.PerspectiveCamera;
  /** Refits the final framing to the canvas size. */
  fit(width: number, height: number): void;
  /** Advances the intro and applies scroll orbit (0..1); returns the elevator height in metres. */
  update(dt: number, scroll: number): number;
  /** Jumps to the final frame (reduced motion). */
  skip(): void;
  /** Podium top and deck as fractions of the canvas height from the top, in the final frame. */
  anchors: { bottom: number; top: number };
}

// The elevator ride: spiral up close to the trunk, past the crown, then pull back to the hero frame.
const introPath = (finalPos: THREE.Vector3) =>
  new THREE.CatmullRomCurve3(
    [around(-1.05, 2.5, 0.6), around(-0.6, 2.8, 4.3), around(-0.22, 3.3, 8.9), finalPos],
    false,
    "centripetal",
  );

// Where the podium top and the deck land on screen in the final frame (fractions from the top).
function measureAnchors(camera: THREE.PerspectiveCamera, finalPos: THREE.Vector3) {
  camera.position.copy(finalPos);
  camera.lookAt(LOOK_AT);
  camera.updateMatrixWorld();
  const toFrac = (y: number) => (1 - new THREE.Vector3(0, y, 0).project(camera).y) / 2;
  return { bottom: toFrac(BASE_TOP), top: toFrac(SPHERE_Y) };
}

export function createCameraRig(): CameraRig {
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 120);
  let path = introPath(new THREE.Vector3(0, CAMERA_Y, 17));
  const targets = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3.1, 0),
    new THREE.Vector3(0, 5.9, 0),
    new THREE.Vector3(0, SPHERE_Y - 0.1, 0),
    LOOK_AT.clone(),
  ]);
  let time = 0;
  let orbit = 0;
  const anchors = { bottom: 0.9, top: 0.14 };
  const target = new THREE.Vector3();

  function fit(width: number, height: number) {
    camera.aspect = width / Math.max(height, 1);
    camera.fov = FOV;
    camera.updateProjectionMatrix();
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const finalPos = new THREE.Vector3(0, CAMERA_Y, Math.max(FRAME_H / (2 * t), FRAME_W / (2 * t * camera.aspect)));
    path = introPath(finalPos);
    Object.assign(anchors, measureAnchors(camera, finalPos));
    update(0, orbit);
  }

  function update(dt: number, scroll: number): number {
    time = THREE.MathUtils.clamp(time + dt, 0, INTRO_S);
    orbit += (scroll - orbit) * (1 - Math.exp(-8 * dt));
    const p = expoOut(time / INTRO_S);
    path.getPoint(p, camera.position);
    targets.getPoint(p, target);
    camera.position.applyAxisAngle(THREE.Object3D.DEFAULT_UP, orbit * ORBIT);
    camera.position.y += orbit * ORBIT_RISE;
    target.y += orbit * ORBIT_RISE * 0.25;
    camera.fov = THREE.MathUtils.lerp(INTRO_FOV, FOV, Math.min(p / ELEVATOR_END, 1) ** 0.6);
    camera.updateProjectionMatrix();
    camera.lookAt(target);
    const ride = Math.min(p / ELEVATOR_END, 1);
    return 97 * (1 - (1 - ride) ** 2);
  }

  return {
    camera,
    fit,
    update,
    skip() {
      time = INTRO_S;
    },
    anchors,
  };
}
