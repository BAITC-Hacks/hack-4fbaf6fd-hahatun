import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BaiterekColors } from "./baiterek-model";

// Four stone tiers up to the podium top (BASE_TOP = 0.36).
const TIERS: [radius: number, height: number][] = [
  [2.15, 0.09],
  [1.85, 0.09],
  [1.52, 0.09],
  [1.2, 0.09],
];
const PLAZA_R = 3.6;
const POSTS = 28;

function tiers(): THREE.BufferGeometry[] {
  let y = 0;
  return TIERS.map(([radius, height]) => {
    const g = new THREE.CylinderGeometry(radius, radius + 0.015, height, 96);
    g.translate(0, y + height / 2, 0);
    y += height;
    return g;
  });
}

// Pavilion ring on the top tier: slim posts under a thin roof ring around the lobby.
function pavilion(): THREE.BufferGeometry[] {
  const top = TIERS.reduce((h, [, dh]) => h + dh, 0);
  const radius = 0.98;
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < POSTS; i++) {
    const a = (i / POSTS) * Math.PI * 2;
    const post = new THREE.BoxGeometry(0.035, 0.2, 0.035);
    post.translate(radius * Math.cos(a), top + 0.1, radius * Math.sin(a));
    parts.push(post);
  }
  const roof = new THREE.CylinderGeometry(radius + 0.06, radius + 0.06, 0.03, 72, 1, true);
  roof.translate(0, top + 0.215, 0);
  parts.push(roof);
  return parts;
}

// Plaza disc whose alpha fades to zero, so the ground dissolves into the page paper.
function plaza(stone: THREE.Color): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "#fff");
    g.addColorStop(0.5, "#bbb");
    g.addColorStop(1, "#000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const material = new THREE.MeshStandardMaterial({
    color: stone,
    roughness: 0.9,
    alphaMap: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(PLAZA_R, 96), material);
  disc.rotation.x = -Math.PI / 2;
  return disc;
}

/** Round stepped podium, pavilion ring and a plaza that fades into the page. */
export function buildBase(colors: BaiterekColors): THREE.Group {
  const stoneMat = new THREE.MeshStandardMaterial({ color: colors.stone, roughness: 0.78 });
  const solid = [...tiers(), ...pavilion()];
  const merged = mergeGeometries(solid);
  solid.forEach((g) => g.dispose());
  const group = new THREE.Group();
  group.add(plaza(colors.stone), new THREE.Mesh(merged ?? new THREE.BufferGeometry(), stoneMat));
  return group;
}
