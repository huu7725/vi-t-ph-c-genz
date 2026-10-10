import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  adultProfiles,
  createFaceGeometry,
  createLimbGeometry,
  modelReferenceHeight,
  sectionAt,
  torsoSections,
} from "./anatomy";

test("adult heads have plausible height/width proportions and outward-facing finite normals", () => {
  for (const gender of ["nu", "nam"] as const) {
    const geometry = createFaceGeometry(gender === "nam");
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox!.getSize(new THREE.Vector3());
    const scale = adultProfiles[gender].height / modelReferenceHeight;
    const ratio = adultProfiles[gender].height / (bounds.y * scale);
    assert.ok(ratio >= 7 && ratio <= 8, `Adult body/head ratio: ${ratio}`);
    assert.ok(bounds.x / bounds.y > 0.55 && bounds.x / bounds.y < 0.75);
    for (const value of geometry.getAttribute("normal").array)
      assert.ok(Number.isFinite(value));
    const material = new THREE.MeshBasicMaterial();
    const head = new THREE.Mesh(geometry, material);
    const hit = new THREE.Raycaster(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ).intersectObject(head)[0];
    assert.ok(
      hit && hit.face!.normal.z > 0.5,
      "The front face must be visible from the camera",
    );
    geometry.dispose();
    material.dispose();
  }
});

test("anatomical cross-sections stay positive and change continuously at chest, waist and hip", () => {
  for (const gender of ["nam", "nu"] as const) {
    let previous = sectionAt(torsoSections[gender], 1.416);
    for (let y = 1.415; y >= 0.86; y -= 0.001) {
      const value = sectionAt(torsoSections[gender], y);
      assert.ok(value.every((v) => v > 0.07 && v < 0.2));
      assert.ok(
        Math.abs(value[0] - previous[0]) < 0.002 &&
          Math.abs(value[1] - previous[1]) < 0.002,
      );
      previous = value;
    }
  }
});

test("an elbow/forearm loft produces usable indexed geometry rather than invalid vertices", () => {
  const points = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.02, -0.12, 0.005),
    new THREE.Vector3(0.038, -0.25, 0.02),
  ];
  const geometry = createLimbGeometry(points, (t) => [
    0.052 - t * 0.019,
    0.047 - t * 0.018,
  ]);
  assert.ok(geometry.getIndex()!.count > 1000);
  for (const attribute of ["position", "normal", "uv"])
    for (const value of geometry.getAttribute(attribute).array)
      assert.ok(Number.isFinite(value));
  geometry.computeBoundingBox();
  assert.ok(
    geometry.boundingBox!.min.y < -0.24 && geometry.boundingBox!.max.y < 0.02,
  );
  geometry.dispose();
});
