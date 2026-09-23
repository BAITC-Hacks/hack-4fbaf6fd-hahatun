import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BASE_TOP, SPHERE_R, SPHERE_Y, TIP_Y } from "./baiterek-dims";
import type { BaiterekColors } from "./baiterek-model";

const BRANCHES = 48; // 16 legs of 3 members each at the foot
const PER_LEG = 3;
const TWIST = 0.42; // radians each crown family turns; opposite families cross into a lattice
const SEGMENTS = 110;
const RADIAL = 5;

// Bundle radius by height, read off photos: flared foot, long slender waist, poplar crown.
const PROFILE: [y: number, r: number][] = [
  [BASE_TOP, 0.74],
  [1.0, 0.6],
  [2.0, 0.51],
  [3.2, 0.46],
  [4.3, 0.45],
  [5.1, 0.5],
  [5.8, 0.72],
  [6.5, 1.06],
  [7.0, 1.3],
  [7.5, 1.45],
  [TIP_Y, 1.52],
];

/** Bundle radius at height y (linear between profile points). */
export function profileRadius(y: number): number {
  for (let k = 1; k < PROFILE.length; k++) {
    const [y1, r1] = PROFILE[k];
    const [y0, r0] = PROFILE[k - 1];
    if (y <= y1) return THREE.MathUtils.lerp(r0, r1, THREE.MathUtils.clamp((y - y0) / (y1 - y0), 0, 1));
  }
  return PROFILE[PROFILE.length - 1][1];
}

// Deterministic per-branch variation in [-1, 1] (golden-angle sine, no RNG).
const wobble = (i: number, k: number) => Math.sin(i * 2.399963 + k * 1.7);

function branchCurve(i: number): THREE.CatmullRomCurve3 {
  const even = (i / BRANCHES) * Math.PI * 2;
  const legCentre = (Math.floor(i / PER_LEG) * PER_LEG + 1) * ((Math.PI * 2) / BRANCHES);
  const family = i % 2 === 0 ? 1 : -1;
  // Alternate taller and shorter tips so the crown reads as feathered, not a bowl.
  const tipLift = (i % 3 === 0 ? 0.06 : i % 3 === 1 ? -0.3 : -0.14) + wobble(i, 1) * 0.05;
  const points = PROFILE.map(([y, r], k) => {
    const last = k === PROFILE.length - 1;
    const yy = last ? y + tipLift : y;
    // Members of one leg fan out from a single blade at the foot to an even ring above the waist.
    const spread = 0.25 + 0.75 * THREE.MathUtils.smoothstep(yy, BASE_TOP, 3.4);
    const crown = THREE.MathUtils.smoothstep(yy, 4.4, TIP_Y);
    const a = legCentre + (even - legCentre) * spread + family * TWIST * crown + wobble(i, 0) * 0.015 * crown;
    const rr = r * (1 + wobble(i, 2) * 0.04 * crown) * (last ? 1 + (tipLift + 0.3) * 0.25 : 1);
    return new THREE.Vector3(rr * Math.cos(a), yy, rr * Math.sin(a));
  });
  return new THREE.CatmullRomCurve3(points, false, "centripetal");
}

// TubeGeometry with a radius that tapers along the curve: blades at the foot, needles at the tips.
function taperedTube(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number): THREE.BufferGeometry {
  const tube = new THREE.TubeGeometry(curve, SEGMENTS, 1, RADIAL, false);
  const pos = tube.getAttribute("position");
  const centre = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    curve.getPointAt(t, centre);
    const r = THREE.MathUtils.lerp(r0, r1, Math.pow(t, 0.7));
    for (let j = 0; j <= RADIAL; j++) {
      const idx = i * (RADIAL + 1) + j;
      v.fromBufferAttribute(pos, idx).sub(centre).multiplyScalar(r).add(centre);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  return tube;
}

function ring(y: number, radius: number, thickness: number): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(radius, thickness, 4, 72);
  g.rotateX(Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

// Horizontal braces: dense along the waist (the banding seen on photos), a few in the crown.
function braces(): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (let y = 1.3; y <= 5.2; y += 0.34) out.push(ring(y, profileRadius(y) - 0.012, 0.016));
  for (const y of [5.9, 6.55]) out.push(ring(y, profileRadius(y) - 0.01, 0.014));
  out.push(ring(SPHERE_Y - SPHERE_R * 0.78, SPHERE_R * 0.66, 0.035)); // collar under the sphere
  return out;
}

// Cup that carries the sphere: the shaft flares into a cone under it.
function cup(): THREE.BufferGeometry {
  const h = 0.55;
  const g = new THREE.CylinderGeometry(SPHERE_R * 0.62, 0.2, h, 32, 1, true);
  g.translate(0, SPHERE_Y - SPHERE_R * 0.72 - h / 2, 0);
  return g;
}

function buildShaft(colors: BaiterekColors): THREE.Mesh[] {
  const top = SPHERE_Y - SPHERE_R * 0.9;
  const shaftGeo = new THREE.CylinderGeometry(0.17, 0.22, top - BASE_TOP, 24);
  shaftGeo.translate(0, BASE_TOP + (top - BASE_TOP) / 2, 0);
  const steel = new THREE.MeshStandardMaterial({ color: colors.shaft, roughness: 0.35, metalness: 0.35 });
  const lobbyGeo = new THREE.CylinderGeometry(0.5, 0.56, 0.42, 48);
  lobbyGeo.translate(0, BASE_TOP + 0.21, 0);
  const glass = new THREE.MeshPhysicalMaterial({ color: colors.glass, roughness: 0.08, metalness: 0.2, clearcoat: 1 });
  return [new THREE.Mesh(shaftGeo, steel), new THREE.Mesh(lobbyGeo, glass)];
}

/** Central shaft + 48 tapered branches + braces, merged into one draw call for the white steel. */
export function buildTrunk(colors: BaiterekColors, white: THREE.Material): THREE.Group {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < BRANCHES; i++) parts.push(taperedTube(branchCurve(i), 0.05, 0.012));
  parts.push(...braces(), cup());
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  const group = new THREE.Group();
  group.add(new THREE.Mesh(merged ?? new THREE.BufferGeometry(), white), ...buildShaft(colors));
  return group;
}
