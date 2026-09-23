import * as THREE from "three";
import { buildBase } from "./baiterek-base";
import { buildSphere } from "./baiterek-sphere";
import { buildTrunk } from "./baiterek-trunk";

export interface BaiterekColors {
  gold: THREE.Color;
  branch: THREE.Color; // warm white of the trunk and branches
  stone: THREE.Color; // cooler light stone of the base
  shaft: THREE.Color; // blue-grey steel of the elevator shaft
  glass: THREE.Color; // sky-tinted lobby glass
}

export { BASE_TOP, SPHERE_R, SPHERE_Y, TIP_Y, metresToY } from "./baiterek-dims";

/** Procedural Baiterek, plaza on y = 0, ~8.4 units tall, centred on the Y axis. */
export function createBaiterekModel(colors: BaiterekColors, envMap: THREE.Texture): THREE.Group {
  const white = new THREE.MeshStandardMaterial({ color: colors.branch, roughness: 0.38, metalness: 0.05 });
  const model = new THREE.Group();
  model.name = "Baiterek";
  model.add(buildBase(colors), buildTrunk(colors, white), buildSphere(colors, white, envMap));
  return model;
}

/** Frees every geometry, material and texture under the group (shared ones once). */
export function disposeModel(group: THREE.Object3D): void {
  const seen = new Set<{ dispose(): void }>();
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    seen.add(obj.geometry);
    const materials: THREE.Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of materials) {
      seen.add(m);
      for (const value of Object.values(m)) if (value instanceof THREE.Texture) seen.add(value);
    }
  });
  seen.forEach((d) => d.dispose());
}
