import * as THREE from "three";

// Design presets, not a claim that one body shape is a universal human standard.
// Working coordinates use a 1.78 m adult; the complete body/outfit is scaled together.
export const adultProfiles = {
  nu: {
    height: 1.66,
    label: "Nữ · 166 cm",
    shoulderScale: 1,
    headWidth: 0.074,
  },
  nam: {
    height: 1.78,
    label: "Nam · 178 cm",
    shoulderScale: 1.16,
    headWidth: 0.08,
  },
} as const;
export const modelReferenceHeight = 1.78;

type Section = readonly [y: number, width: number, depth: number];
export const torsoSections: Record<"nam" | "nu", readonly Section[]> = {
  nam: [
    [1.416, 0.174, 0.101],
    [1.31, 0.173, 0.108],
    [1.18, 0.152, 0.091],
    [1.095, 0.145, 0.085],
    [0.96, 0.166, 0.107],
    [0.86, 0.164, 0.106],
  ],
  nu: [
    [1.416, 0.164, 0.092],
    [1.31, 0.163, 0.111],
    [1.21, 0.146, 0.095],
    [1.105, 0.13, 0.086],
    [0.96, 0.167, 0.111],
    [0.86, 0.169, 0.107],
  ],
};
export function sectionAt(
  sections: readonly Section[],
  y: number,
): [number, number] {
  if (y >= sections[0][0]) return [sections[0][1], sections[0][2]];
  for (let i = 1; i < sections.length; i++) {
    const a = sections[i - 1],
      b = sections[i];
    if (y >= b[0]) {
      const span = a[0] - b[0],
        t = (y - b[0]) / span;
      const next = sections[Math.min(i + 1, sections.length - 1)],
        previous = sections[Math.max(i - 2, 0)];
      const interpolate = (column: 1 | 2) => {
        const lowSlope = (a[column] - next[column]) / (a[0] - next[0]);
        const highSlope = (previous[column] - b[column]) / (previous[0] - b[0]);
        const t2 = t * t,
          t3 = t2 * t;
        return Math.max(
          0.001,
          (2 * t3 - 3 * t2 + 1) * b[column] +
            (t3 - 2 * t2 + t) * span * lowSlope +
            (-2 * t3 + 3 * t2) * a[column] +
            (t3 - t2) * span * highSlope,
        );
      };
      return [interpolate(1), interpolate(2)];
    }
  }
  const last = sections[sections.length - 1];
  return [last[1], last[2]];
}

const faceSections: readonly Section[] = [
  [0.122, 0.001, 0.001],
  [0.109, 0.041, 0.048],
  [0.084, 0.063, 0.071],
  [0.047, 0.072, 0.079],
  [0.015, 0.074, 0.078],
  [-0.018, 0.074, 0.075],
  [-0.045, 0.069, 0.069],
  [-0.075, 0.06, 0.06],
  [-0.102, 0.042, 0.043],
  [-0.118, 0.019, 0.023],
];
function dimensions(y: number, male: boolean): [number, number] {
  const [x, z] = sectionAt(faceSections, y);
  return [x + (male ? 0.006 * Math.exp(-(((y + 0.045) / 0.07) ** 2)) : 0), z];
}
function gaussian(
  x: number,
  y: number,
  cx: number,
  cy: number,
  sx: number,
  sy: number,
) {
  return Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
}
export function faceFront(x: number, y: number, male: boolean) {
  const [rx, rz] = dimensions(y, male);
  const base = rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
  return (
    base +
    0.024 * Math.exp(-(((y + 0.105) / 0.045) ** 2)) +
    0.012 * gaussian(x, y, 0, 0.005, 0.013, 0.04) +
    0.018 * gaussian(x, y, 0, -0.025, 0.014, 0.014) +
    0.006 * gaussian(x, y, 0, -0.063, 0.029, 0.019) +
    0.004 * gaussian(x, y, -0.044, -0.021, 0.025, 0.021) +
    0.004 * gaussian(x, y, 0.044, -0.021, 0.025, 0.021) -
    0.006 * gaussian(x, y, -0.028, 0.014, 0.023, 0.012) -
    0.006 * gaussian(x, y, 0.028, 0.014, 0.023, 0.012)
  );
}

/** Continuous cheek, jaw, forehead and nose surfaces; no overlapping face spheres. */
export function createFaceGeometry(male: boolean, quality: "game" | "portfolio" = "portfolio") {
  const rows = quality === "game" ? 40 : 64,
    cols = quality === "game" ? 48 : 72,
    positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const y = THREE.MathUtils.lerp(0.122, -0.118, r / rows),
      [rx, rz] = dimensions(y, male);
    for (let c = 0; c <= cols; c++) {
      const angle = -Math.PI + (c / cols) * Math.PI * 2,
        x = Math.sin(angle) * rx;
      const z =
        Math.cos(angle) > 0
          ? faceFront(x, y, male)
          : Math.cos(angle) * rz +
            0.024 * Math.exp(-(((y + 0.105) / 0.045) ** 2));
      positions.push(x, y, z);
      uv.push(c / cols, 1 - r / rows);
      if (r < rows && c < cols) {
        const a = r * (cols + 1) + c,
          b = a + cols + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Smooth tapered volume following an anatomical arm centreline. */
export function createLimbGeometry(
  points: THREE.Vector3[],
  radius: (t: number) => [number, number],
  quality: "game" | "portfolio" = "portfolio",
) {
  const path = new THREE.CatmullRomCurve3(points),
    rows = quality === "game" ? 16 : 22,
    cols = quality === "game" ? 20 : 28;
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows,
      p = path.getPoint(t),
      tangent = path.getTangent(t).normalize();
    const normal = new THREE.Vector3(0, 0, 1).cross(tangent).normalize();
    const binormal = new THREE.Vector3()
      .crossVectors(tangent, normal)
      .normalize();
    const [rx, rz] = radius(t);
    for (let c = 0; c <= cols; c++) {
      const a = (c / cols) * Math.PI * 2;
      const v = p
        .clone()
        .addScaledVector(normal, Math.cos(a) * rx)
        .addScaledVector(binormal, Math.sin(a) * rz);
      positions.push(v.x, v.y, v.z);
      uv.push(c / cols, 1 - t);
      if (r < rows && c < cols) {
        const i = r * (cols + 1) + c,
          b = i + cols + 1;
        indices.push(i, i + 1, b, i + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
