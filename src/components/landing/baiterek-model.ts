import * as THREE from "three";

export interface BaiterekColors {
  gold: THREE.Color;
  branch: THREE.Color; // warm white of the trunk and branches
  stone: THREE.Color; // cooler light stone of the base
}

// The real monument is 97 m tall with a 22 m golden sphere; 1 unit ≈ 12 m, total ≈ 8 units.
export const SPHERE_R = 0.9;
export const SPHERE_Y = 7.1;
const BASE_STEPS: [radius: number, height: number][] = [
  [1.75, 0.12],
  [1.45, 0.12],
  [1.15, 0.12],
];
const BASE_TOP = BASE_STEPS.reduce((h, [, dh]) => h + dh, 0);
const BRANCHES = 22;
const TWIST = 0.45; // radians the branch ring turns from foot to crown, makes rotation readable

// Branch bundle radius by height: flared foot, slender waist, crown cupping the sphere like a poplar.
const PROFILE: [y: number, r: number][] = [
  [BASE_TOP, 0.36],
  [1.4, 0.24],
  [3.4, 0.17],
  [4.9, 0.22],
  [5.7, 0.4],
  [6.3, 0.78],
  [6.9, 1.06],
  [7.35, 1.16],
];

// Deterministic per-branch variation in [-1, 1] (golden-angle sine, no RNG).
const wobble = (i: number, k: number) => Math.sin(i * 2.399963 + k * 1.7);

function branchCurve(i: number): THREE.CatmullRomCurve3 {
  const a0 = (i / BRANCHES) * Math.PI * 2 + wobble(i, 0) * 0.04;
  // Alternate taller and shorter tips so the crown reads as feathered, not a bowl.
  const tipLift = (i % 2 === 0 ? 0.18 : -0.08) + wobble(i, 1) * 0.06;
  const tipSpread = 1 + wobble(i, 2) * 0.05;
  const points = PROFILE.map(([y, r], k) => {
    const crown = k >= PROFILE.length - 2;
    const yy = crown ? y + tipLift * (k === PROFILE.length - 1 ? 1 : 0.5) : y;
    const rr = crown ? r * tipSpread : r;
    const a = a0 + TWIST * (yy / SPHERE_Y);
    return new THREE.Vector3(rr * Math.cos(a), yy, rr * Math.sin(a));
  });
  return new THREE.CatmullRomCurve3(points, false, "centripetal");
}

function buildBase(stone: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  let y = 0;
  for (const [radius, height] of BASE_STEPS) {
    const step = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 72), stone);
    step.position.y = y + height / 2;
    y += height;
    group.add(step);
  }
  return group;
}

function buildTrunk(white: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const trunkH = SPHERE_Y - SPHERE_R + 0.15 - BASE_TOP;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.12, trunkH, 20), white);
  trunk.position.y = BASE_TOP + trunkH / 2;
  group.add(trunk);
  for (let i = 0; i < BRANCHES; i++) {
    group.add(new THREE.Mesh(new THREE.TubeGeometry(branchCurve(i), 72, 0.04, 6), white));
  }
  // Collar where the crown takes the sphere's weight.
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.035, 8, 64), white);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 6.28;
  group.add(collar);
  return group;
}

function buildSphere(gold: THREE.Color): THREE.Group {
  const group = new THREE.Group();
  group.position.y = SPHERE_Y;
  const glass = new THREE.MeshPhysicalMaterial({
    color: gold,
    metalness: 0.85,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(SPHERE_R, 64, 48), glass));
  // Thin triangulated frame over the glass, as on the real orb.
  const frame = new THREE.IcosahedronGeometry(SPHERE_R * 1.012, 4);
  const lattice = new THREE.LineSegments(
    new THREE.EdgesGeometry(frame, 1),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32 }),
  );
  frame.dispose();
  group.add(lattice);
  return group;
}

/** Procedural Baiterek, base on y = 0, ~8 units tall, centred on the Y axis. */
export function createBaiterekModel(colors: BaiterekColors): THREE.Group {
  const white = new THREE.MeshStandardMaterial({ color: colors.branch, roughness: 0.45, metalness: 0 });
  const stone = new THREE.MeshStandardMaterial({ color: colors.stone, roughness: 0.8, metalness: 0 });
  const model = new THREE.Group();
  model.name = "Baiterek";
  model.add(buildBase(stone), buildTrunk(white), buildSphere(colors.gold));
  return model;
}

/** Frees every geometry, material and texture under the group (shared ones once). */
export function disposeModel(group: THREE.Object3D): void {
  const seen = new Set<{ dispose(): void }>();
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments)) return;
    seen.add(obj.geometry);
    const materials: THREE.Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of materials) {
      seen.add(m);
      if ("map" in m && m.map instanceof THREE.Texture) seen.add(m.map);
    }
  });
  seen.forEach((d) => d.dispose());
}
