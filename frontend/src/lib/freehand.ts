export type DrawPoint = { x: number; y: number };
const clamp = (n: number) => Math.min(99, Math.max(1, n));
const number = (n: number) => String(Math.round(clamp(n) * 100) / 100);
function segmentDistance(p: DrawPoint, a: DrawPoint, b: DrawPoint) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t =
    dx || dy
      ? Math.max(
          0,
          Math.min(
            1,
            ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy),
          ),
        )
      : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function simplify(points: DrawPoint[], tolerance: number): DrawPoint[] {
  if (points.length < 3) return points;
  // Iterative RDP avoids stack growth on long pen gestures.
  const keep = new Set([0, points.length - 1]),
    queue: Array<[number, number]> = [[0, points.length - 1]];
  while (queue.length) {
    const [first, last] = queue.pop()!;
    let max = tolerance,
      index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = segmentDistance(points[i], points[first], points[last]);
      if (d > max) {
        max = d;
        index = i;
      }
    }
    if (index >= 0) {
      keep.add(index);
      queue.push([first, index], [index, last]);
    }
  }
  return [...keep].sort((a, b) => a - b).map((i) => points[i]);
}
/** Returns bounded absolute M/L/Q geometry accepted by the existing motif validator. */
export function freehandPath(input: DrawPoint[]): string {
  const points = input
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map((p) => ({ x: clamp(p.x), y: clamp(p.y) }));
  if (!points.length) return "";
  let tolerance = 0.16,
    clean = simplify(points, tolerance);
  while (clean.length > 30) {
    tolerance *= 1.5;
    clean = simplify(points, tolerance);
  }
  let result = `M${number(clean[0].x)} ${number(clean[0].y)}`;
  if (clean.length === 1)
    return `${result} L${number(clean[0].x < 98 ? clean[0].x + 0.03 : clean[0].x - 0.03)} ${number(clean[0].y)}`;
  if (clean.length === 2)
    return `${result} L${number(clean[1].x)} ${number(clean[1].y)}`;
  for (let i = 1; i < clean.length - 1; i++) {
    const current = clean[i],
      next = clean[i + 1];
    result += ` Q${number(current.x)} ${number(current.y)} ${number((current.x + next.x) / 2)} ${number((current.y + next.y) / 2)}`;
  }
  const last = clean[clean.length - 1];
  return `${result} L${number(last.x)} ${number(last.y)}`;
}
