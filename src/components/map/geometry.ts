// Schematic Astana, not geography: five districts around the Esil, like a transit-map sketch.
import type { DistrictId } from "@/lib/types";

type Point = readonly [number, number];

export const VIEW_BOX = "0 0 480 320";

// River centreline west → east; banks sit half a river-width above and below it.
const RIVER: Point[] = [[10, 178], [100, 164], [190, 178], [300, 160], [390, 152], [470, 164]];
const HALF_RIVER = 7;
const north = (i: number): Point => [RIVER[i][0], RIVER[i][1] - HALF_RIVER];
const south = (i: number): Point => [RIVER[i][0], RIVER[i][1] + HALF_RIVER];

const fmt = (p: Point) => `${Math.round(p[0] * 10) / 10},${Math.round(p[1] * 10) / 10}`;

function towards(from: Point, to: Point, r: number): Point {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  const k = Math.min(r, len / 2) / len;
  return [from[0] + dx * k, from[1] + dy * k];
}

/** Polyline with every corner cut by a quadratic curve of radius r; closed paths round all corners. */
export function roundedPath(points: Point[], r: number, closed = true): string {
  const n = points.length;
  const corners = closed ? points.map((_, i) => i) : points.slice(1, -1).map((_, i) => i + 1);
  const parts = corners.map((i, k) => {
    const p = points[i];
    const a = towards(p, points[(i - 1 + n) % n], r);
    const b = towards(p, points[(i + 1) % n], r);
    return `${k === 0 && closed ? "M" : "L"}${fmt(a)} Q${fmt(p)} ${fmt(b)}`;
  });
  return closed ? `${parts.join(" ")} Z` : `M${fmt(points[0])} ${parts.join(" ")} L${fmt(points[n - 1])}`;
}

interface Shape {
  path: string;
  label: Point; // centre of the name / value block
}

const shape = (points: Point[], label: Point): Shape => ({ path: roundedPath(points, 10), label });

export const DISTRICT_SHAPES: Record<DistrictId, Shape> = {
  // Right bank
  saryarka: shape([[24, 96], [60, 46], [196, 30], north(2), north(1), north(0)], [105, 104]),
  baikonur: shape([[196, 30], [250, 18], [304, 28], north(3), north(2)], [247, 96]),
  almaty: shape([[304, 28], [400, 40], [462, 92], north(5), north(4), north(3)], [382, 98]),
  // Left bank
  nura: shape([south(0), south(1), south(2), [214, 296], [80, 300], [30, 250]], [112, 236]),
  esil: shape([south(2), south(3), south(4), south(5), [440, 240], [360, 290], [214, 296]], [322, 226]),
};

// Drawn a bit past the city on both ends so the river runs off the sheet.
export const RIVER_PATH = roundedPath([[-10, 182], ...RIVER, [490, 160]], 40, false);
