import { MathUtils } from "three";

const AUTO_SPEED = 0.25; // rad/s idle rotation
const RESUME_DELAY = 2; // s after the last touch before auto-rotation comes back
const RESUME_EASE = 1.5; // s to ease auto-rotation back to full speed
const DRAG_SPEED = 0.008; // rad per dragged pixel
const MAX_TILT = MathUtils.degToRad(10);
const KEY_IMPULSE = 1.6; // rad/s added per arrow key press
const FRICTION = 3; // inertia decay rate, 1/s

export interface SpinState {
  yaw: number;
  tilt: number;
}

export interface SpinControls {
  update(dt: number): SpinState;
  dispose(): void;
}

interface Spin extends SpinState {
  vel: number;
  idle: number; // s since the last interaction
  dragging: boolean;
}

// Inertia decays, auto-rotation eases back in after RESUME_DELAY unless reduced motion is on.
function coast(s: Spin, dt: number, reducedMotion: boolean) {
  if (s.dragging) return;
  s.idle += dt;
  s.vel *= Math.exp(-FRICTION * dt);
  const ease = MathUtils.smoothstep(s.idle, RESUME_DELAY, RESUME_DELAY + RESUME_EASE);
  s.yaw += (s.vel + (reducedMotion ? 0 : AUTO_SPEED * ease)) * dt;
  s.tilt *= Math.exp(-1.2 * dt);
}

/** Drag-to-rotate with inertia, arrow keys, and auto-rotation that pauses around interaction. */
export function createSpinControls(el: HTMLElement): SpinControls {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  // idle starts at the delay so the first auto-rotation eases in instead of snapping.
  const s = { yaw: 0.6, tilt: 0, vel: 0, idle: RESUME_DELAY, dragging: false, x: 0, y: 0, t: 0 };

  function onDown(e: PointerEvent) {
    if (e.button !== 0) return;
    Object.assign(s, { dragging: true, vel: 0, idle: 0, x: e.clientX, y: e.clientY, t: e.timeStamp });
    el.setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
  }
  function onMove(e: PointerEvent) {
    if (!s.dragging) return;
    const dx = e.clientX - s.x;
    const dt = Math.max((e.timeStamp - s.t) / 1000, 1 / 240);
    s.yaw += dx * DRAG_SPEED;
    s.tilt = MathUtils.clamp(s.tilt + (e.clientY - s.y) * DRAG_SPEED * 0.5, -MAX_TILT, MAX_TILT);
    s.vel = MathUtils.lerp(s.vel, (dx * DRAG_SPEED) / dt, 0.5);
    Object.assign(s, { x: e.clientX, y: e.clientY, t: e.timeStamp });
  }
  function onUp(e: PointerEvent) {
    if (!s.dragging) return;
    // Held still before letting go: no flick.
    if (e.timeStamp - s.t > 80) s.vel = 0;
    Object.assign(s, { dragging: false, idle: 0 });
    el.style.cursor = "";
  }
  function onKey(e: KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    s.vel += (e.key === "ArrowLeft" ? -1 : 1) * KEY_IMPULSE;
    s.idle = 0;
  }

  const pointer = { pointerdown: onDown, pointermove: onMove, pointerup: onUp, pointercancel: onUp };
  for (const [type, fn] of Object.entries(pointer)) el.addEventListener(type as "pointerdown", fn);
  el.addEventListener("keydown", onKey);
  return {
    update(dt) {
      coast(s, dt, reduced.matches);
      return s;
    },
    dispose() {
      for (const [type, fn] of Object.entries(pointer)) el.removeEventListener(type as "pointerdown", fn);
      el.removeEventListener("keydown", onKey);
    },
  };
}
