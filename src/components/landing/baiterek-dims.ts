// The real monument: 97 m to the observation deck, golden sphere Ø 22 m. 1 unit ≈ 13.6 m.
export const BASE_TOP = 0.36; // top of the stepped podium
export const SPHERE_R = 0.9;
export const SPHERE_Y = 7.5; // sphere centre = deck level, 97 m above the podium
export const TIP_Y = 8.2; // highest crown tips; seen from below they rise just over the sphere

/** Height in metres above the podium → model y. */
export const metresToY = (m: number) => BASE_TOP + (m / 97) * (SPHERE_Y - BASE_TOP);
