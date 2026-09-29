import { test } from "node:test";
import assert from "node:assert/strict";
import { freehandPath } from "../../../frontend/src/lib/freehand.js";
import { isSafePath, lineMotifSchema, defaultPattern } from "../patterns.js";
import { defaultRequest, manualLook, restoreLooks } from "../domain.js";

test("freehand samples become bounded, compact geometry accepted by server validation", () => {
  const cases = [
    [{ x: 50, y: 50 }],
    [
      { x: -100, y: 120 },
      { x: 150, y: -90 },
    ],
    [
      { x: 50, y: 10 },
      { x: 90, y: 50 },
      { x: 50, y: 90 },
      { x: 10, y: 50 },
      { x: 50, y: 10 },
    ],
    Array.from({ length: 5000 }, (_, i) => ({
      x: 50 + 48 * Math.cos(i / 30),
      y: 50 + 48 * Math.sin(i / 30),
    })),
  ];
  assert.equal(freehandPath([]), "");
  assert.equal(
    freehandPath([
      { x: NaN, y: 0 },
      { x: 1, y: Infinity },
    ]),
    "",
  );
  for (const points of cases) {
    const path = freehandPath(points);
    assert.ok(path.length <= 900);
    assert.ok(isSafePath(path), path);
    assert.ok(
      lineMotifSchema.safeParse({ name: "Nét vẽ", paths: [path] }).success,
    );
  }
});
test("hand-drawn motif and its color and thickness survive wardrobe restoration", () => {
  const paths = [
    freehandPath([
      { x: 50, y: 15 },
      { x: 20, y: 45 },
      { x: 50, y: 90 },
      { x: 80, y: 45 },
      { x: 50, y: 15 },
    ]),
  ];
  const look = manualLook({
    ...defaultRequest,
    pattern: {
      ...defaultPattern,
      motifId: "custom",
      custom: { name: "Cánh hoa tự vẽ", paths },
      color: "#BC4749",
      strokeWidth: 1.8,
      opacity: 1,
    },
  });
  const restored = restoreLooks([look])[0];
  assert.deepEqual(restored.pattern, look.pattern);
  assert.equal(restored.id, look.id);
});
