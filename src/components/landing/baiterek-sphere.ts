import * as THREE from "three";
import { SPHERE_R, SPHERE_Y } from "./baiterek-dims";
import type { BaiterekColors } from "./baiterek-model";

const DECK_Y = -0.14 * SPHERE_R; // observation deck floor, just under the equator

// Unique edges of a geodesic sphere: the triangulated steel grid over the glass.
function geodesicEdges(radius: number, detail: number): [THREE.Vector3, THREE.Vector3][] {
  const ico = new THREE.IcosahedronGeometry(radius, detail);
  const pos = ico.getAttribute("position");
  const key = (v: THREE.Vector3) => `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
  const edges = new Map<string, [THREE.Vector3, THREE.Vector3]>();
  for (let f = 0; f < pos.count; f += 3) {
    const tri = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, f + k));
    for (let k = 0; k < 3; k++) {
      const [a, b] = [tri[k], tri[(k + 1) % 3]];
      const [ka, kb] = [key(a), key(b)];
      edges.set(ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`, [a, b]);
    }
  }
  ico.dispose();
  return [...edges.values()];
}

// One InstancedMesh of thin 4-sided struts: ~750 mullions in a single draw call.
function buildMullions(white: THREE.Material): THREE.InstancedMesh {
  const edges = geodesicEdges(SPHERE_R * 1.006, 4);
  const strut = new THREE.CylinderGeometry(1, 1, 1, 4, 1, true);
  const mesh = new THREE.InstancedMesh(strut, white, edges.length);
  const up = new THREE.Vector3(0, 1, 0);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const dir = new THREE.Vector3();
  edges.forEach(([a, b], i) => {
    dir.subVectors(b, a);
    q.setFromUnitVectors(up, dir.clone().normalize());
    m.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(0.0065, dir.length(), 0.0065));
    mesh.setMatrixAt(i, m);
  });
  return mesh;
}

// Deck floor and railing inside the glass: warm light that reads through the gold and catches bloom.
function buildDeck(colors: BaiterekColors): THREE.Mesh[] {
  const warm = colors.gold.clone().lerp(colors.branch, 0.55);
  const lit = new THREE.MeshStandardMaterial({ color: warm, emissive: warm, emissiveIntensity: 2.5, roughness: 0.6 });
  const floorR = Math.sqrt(SPHERE_R ** 2 - DECK_Y ** 2) * 0.93;
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(floorR, floorR * 0.9, 0.05, 64), lit);
  floor.position.y = DECK_Y;
  const rail = new THREE.Mesh(new THREE.TorusGeometry(floorR * 0.97, 0.012, 4, 64), lit);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = DECK_Y + 0.1;
  return [floor, rail];
}

/** Golden glass sphere: tinted shell, dark inner wall, deck, geodesic mullions. */
export function buildSphere(colors: BaiterekColors, white: THREE.Material, envMap: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  group.position.y = SPHERE_Y;
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: colors.gold,
    metalness: 0.72,
    roughness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    emissive: colors.gold,
    emissiveIntensity: 0.22,
    envMap, // own env map: brighter reflections than the scene-wide environmentIntensity
    envMapIntensity: 1.6,
    transparent: true,
    opacity: 0.84,
  });
  const innerMat = new THREE.MeshStandardMaterial({
    color: colors.gold.clone().lerp(colors.shaft, 0.55),
    roughness: 0.7,
    side: THREE.BackSide,
  });
  const inner = new THREE.Mesh(new THREE.SphereGeometry(SPHERE_R * 0.975, 48, 32), innerMat);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(SPHERE_R, 96, 64), shellMat);
  shell.renderOrder = 1; // after the deck and inner wall, so they show through the tinted glass
  group.add(inner, ...buildDeck(colors), shell, buildMullions(white));
  return group;
}
