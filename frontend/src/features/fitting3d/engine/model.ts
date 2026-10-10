import * as THREE from "three";
import {
  adultProfiles,
  modelReferenceHeight,
  createFaceGeometry,
  createLimbGeometry as buildLimbGeometry,
  faceFront,
  sectionAt,
  torsoSections,
} from "./anatomy";
import { motifCatalog, type FittingOutfit, type GarmentPattern } from "@domain";

export type SemanticPart = "collar" | "garment" | "head" | "hem";
type Material = THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
type Point = [number, number, number];
export interface FittingModel {
  root: THREE.Group;
  animate: (time: number, moving: boolean) => void;
  dispose: () => void;
}

// Original stylized geometry; garment shapes are illustrative, not historical patterns.
export function createFittingModel(
  outfit: FittingOutfit,
  options: { quality?: "game" | "portfolio"; authoringPose?: boolean } = {},
): FittingModel {
  const quality = options.quality || "portfolio",
    game = quality === "game";
  const createLimbGeometry = (
    points: THREE.Vector3[],
    radii: (t: number) => [number, number],
  ) => buildLimbGeometry(points, radii, quality);
  const root = new THREE.Group();
  root.name = "viet-phuc-mannequin";
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const male = outfit.gender === "nam";
  const has = (id: string) => outfit.accessories.includes(id);
  const broad = ["ao_tac", "nhat_binh", "giao_linh", "doi_kham"].includes(
    outfit.garmentId,
  );
  const fitted = ["ao_dai", "ao_dai_cach_tan"].includes(outfit.garmentId);
  const open = outfit.garmentId === "doi_kham";
  const profile = adultProfiles[outfit.gender];
  const width = profile.shoulderScale;
  root.scale.setScalar(profile.height / modelReferenceHeight);
  const mat = (color: string, roughness = 0.55, metalness = 0): Material => {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
    });
    materials.add(material);
    return material;
  };
  const fabric = (color: string): THREE.MeshPhysicalMaterial => {
    const properties = {
      silk: [0.42, 0.6, 0.62],
      gauze: [0.65, 0.32, 0.8],
      brocade: [0.56, 0.42, 0.72],
      satin: [0.29, 0.55, 0.5],
    }[outfit.fabric];
    const material = new THREE.MeshPhysicalMaterial({
      color,
      roughness: properties[0],
      metalness: 0,
      sheen: properties[1],
      sheenRoughness: properties[2],
      sheenColor: new THREE.Color(color).lerp(new THREE.Color("#f1e7d6"), 0.25),
      clearcoat: 0,
      side: THREE.DoubleSide,
    });
    materials.add(material);
    return material;
  };
  const skin: Material = (() => {
    const material = new THREE.MeshPhysicalMaterial({
      color: male ? "#c99378" : "#e0ad91",
      roughness: 0.54,
      sheen: 0.08,
      sheenRoughness: 0.72,
      clearcoat: 0.02,
    });
    materials.add(material);
    return material;
  })();
  const skinShadow = mat("#cf9a7e", 0.72);
  const hair = mat(male ? "#272927" : "#332721", 0.6);
  const hairLight = mat("#59433a", 0.65);
  const eye = mat("#372c29", 0.45);
  const lips = mat(male ? "#b78376" : "#ad675f", 0.6);
  const pearl = mat("#eee6d2", 0.25, 0.12);
  const gold = mat("#d2b578", 0.36, 0.6);
  const silver = mat("#d0d9d1", 0.25, 0.82);
  const main = fabric(outfit.colors.main);
  const pants = fabric(outfit.colors.pants);
  const lining = fabric(outfit.colors.lining);
  const trim = fabric(outfit.colors.pattern);
  const shoe = mat(
    outfit.layers.accessories && has("acc_sneaker_trang")
      ? "#f2eee6"
      : outfit.layers.accessories && has("acc_guoc_moc")
        ? "#a57650"
        : "#37423c",
    0.64,
  );

  function mesh(
    geo: THREE.BufferGeometry,
    material: Material,
    parent: THREE.Object3D = root,
    part: SemanticPart = "garment",
  ) {
    geometries.add(geo);
    const object = new THREE.Mesh(geo, material);
    object.castShadow = true;
    object.receiveShadow = true;
    object.userData.part = part;
    parent.add(object);
    return object;
  }
  function ellipsoid(
    parent: THREE.Object3D,
    p: Point,
    size: Point,
    material: Material,
    part: SemanticPart = "garment",
  ) {
    const object = mesh(
      new THREE.SphereGeometry(1, game ? 12 : 20, game ? 8 : 16),
      material,
      parent,
      part,
    );
    object.position.set(...p);
    object.scale.set(...size);
    return object;
  }
  function bar(
    parent: THREE.Object3D,
    p: Point,
    size: Point,
    material: Material,
    part: SemanticPart = "garment",
  ) {
    const object = mesh(new THREE.BoxGeometry(...size), material, parent, part);
    object.position.set(...p);
    return object;
  }
  function link(
    parent: THREE.Object3D,
    from: Point,
    to: Point,
    r1: number,
    r2: number,
    material: Material,
    part: SemanticPart = "garment",
  ) {
    const a = new THREE.Vector3(...from),
      b = new THREE.Vector3(...to);
    const direction = new THREE.Vector3().subVectors(b, a);
    const object = mesh(
      new THREE.CylinderGeometry(
        r2,
        r1,
        direction.length(),
        game ? 12 : 20,
        game ? 3 : 5,
      ),
      material,
      parent,
      part,
    );
    object.position.copy(a).add(b).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
    return object;
  }
  function curve(
    parent: THREE.Object3D,
    points: Point[],
    radius: number,
    material: Material,
    part: SemanticPart = "garment",
  ) {
    const path = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    return mesh(
      new THREE.TubeGeometry(path, game ? 16 : 24, radius, game ? 5 : 6, false),
      material,
      parent,
      part,
    );
  }

  // Elliptical rings form a real closed 3D volume; front/back skirts have side slits.
  function clothSurface(
    parent: THREE.Object3D,
    top: number,
    bottom: number,
    radiusAt: (t: number) => [number, number],
    material: Material,
    start = -Math.PI,
    end = Math.PI,
    part: SemanticPart = "garment",
    folds = 0.004,
  ) {
    const rows = game ? 30 : 48,
      cols = game ? 40 : 64,
      positions: number[] = [],
      uv: number[] = [],
      indices: number[] = [];
    for (let r = 0; r <= rows; r++) {
      const t = r / rows,
        [rx, rz] = radiusAt(t);
      for (let c = 0; c <= cols; c++) {
        const theta = THREE.MathUtils.lerp(start, end, c / cols);
        const fold = Math.cos(theta * 12) * folds * (0.2 + 0.8 * t);
        positions.push(
          Math.sin(theta) * (rx + fold),
          THREE.MathUtils.lerp(top, bottom, t),
          Math.cos(theta) * (rz + fold),
        );
        uv.push(c / cols, 1 - t);
        if (r < rows && c < cols) {
          const a = r * (cols + 1) + c,
            b = a + cols + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return mesh(geo, material, parent, part);
  }

  const body = new THREE.Group();
  body.name = "BodyRoot";
  root.add(body);
  // The underlying mannequin remains clothed when outer layers are hidden.
  const base = new THREE.Group();
  base.name = "BodyTorso";
  base.userData.bodyPart = "torso";
  base.visible = !outfit.layers.garment || open;
  body.add(base);
  const modestBase = mat("#e2dacf", 0.9);
  clothSurface(
    base,
    outfit.layers.garment ? 1.397 : 1.445,
    0.86,
    (t) => {
      const [rx, rz] = sectionAt(
        torsoSections[outfit.gender],
        THREE.MathUtils.lerp(1.397, 0.86, t),
      );
      return [rx * width * 0.965, rz * 0.955];
    },
    outfit.layers.base ? lining : modestBase,
  );
  const legLeft = new THREE.Group(),
    legRight = new THREE.Group();
  legLeft.name = "Leg_Left";
  legRight.name = "Leg_Right";
  const legSeparation = male ? 0.094 : 0.083;
  legLeft.position.set(-legSeparation, 0.87, 0);
  legRight.position.set(legSeparation, 0.87, 0);
  body.add(legLeft, legRight);
  for (const leg of [legLeft, legRight]) {
    const trouser = clothSurface(
      leg,
      0,
      -0.755,
      (t) => [
        0.081 - 0.014 * Math.sin(t * Math.PI) - t * 0.003,
        0.082 - 0.018 * Math.sin(t * Math.PI) - t * 0.012,
      ],
      outfit.layers.base ? pants : modestBase,
      -Math.PI,
      Math.PI,
      "hem",
      0.004,
    );
    trouser.userData.part = "hem";
    trouser.name = "pants-template";
    trouser.userData.itemSlot = "pants";
    link(leg, [0, -0.765, 0], [0, -0.829, 0.02], 0.028, 0.024, skin, "hem");
    ellipsoid(leg, [0, -0.819, 0.025], [0.065, 0.035, 0.126], shoe, "hem");
    if (has("acc_guoc_moc") && outfit.layers.accessories) {
      bar(leg, [0, -0.86, 0.026], [0.13, 0.02, 0.223], shoe, "hem");
      ellipsoid(leg, [0, -0.803, 0.052], [0.057, 0.025, 0.09], skin, "hem");
      curve(
        leg,
        [
          [-0.056, -0.803, 0.052],
          [0, -0.778, 0.056],
          [0.056, -0.803, 0.052],
        ],
        0.008,
        main,
        "hem",
      );
    }
    if (has("acc_sneaker_trang") && outfit.layers.accessories) {
      bar(leg, [0, -0.86, 0.025], [0.135, 0.02, 0.22], pearl, "hem");
      for (let i = 0; i < 3; i++)
        link(
          leg,
          [-0.035, -0.75 - i * 0.008, 0.055 + i * 0.018],
          [0.035, -0.75 - i * 0.008, 0.055 + i * 0.018],
          0.002,
          0.002,
          lining,
          "hem",
        );
    }
    if (has("acc_hai") && outfit.layers.accessories) {
      curve(
        leg,
        [
          [-0.04, -0.77, 0.09],
          [0, -0.755, 0.12],
          [0.04, -0.77, 0.09],
        ],
        0.003,
        gold,
        "hem",
      );
    }
  }

  const neck = link(
    body,
    [0, 1.419, -0.01],
    [0, 1.56, -0.01],
    male ? 0.049 : 0.041,
    male ? 0.045 : 0.038,
    skin,
    "head",
  );
  neck.name = "anatomy-neck";
  const head = new THREE.Group();
  head.position.set(0, 1.656, -0.006);
  head.name = "HeadRoot";
  head.userData.bodyPart = "head";
  if (options.authoringPose) head.scale.setScalar(0.96);
  body.add(head);
  const face = mesh(createFaceGeometry(male, quality), skin, head, "head");
  face.name = "anatomy-face";
  const sclera = mat("#f4eee6", 0.42),
    iris = mat(male ? "#4d3327" : "#5c3b2f", 0.38),
    pupil = mat("#242621", 0.4);
  const detail = (x: number, y: number, extra = 0): Point => [
    x,
    y,
    faceFront(x, y, male) + extra,
  ];
  for (const side of [-1, 1]) {
    const ear = ellipsoid(
      head,
      [side * (male ? 0.081 : 0.075), -0.016, -0.009],
      [0.012, 0.027, 0.016],
      skin,
      "head",
    );
    ear.rotation.z = side * 0.1;
    ellipsoid(
      head,
      [side * (male ? 0.086 : 0.08), -0.016, 0.003],
      [0.006, 0.017, 0.004],
      skinShadow,
      "head",
    );
    const cx = side * 0.028,
      ey = 0.015;
    ellipsoid(
      head,
      detail(cx, ey, 0.002),
      [male ? 0.015 : 0.018, male ? 0.006 : 0.007, 0.0045],
      sclera,
      "head",
    );
    ellipsoid(
      head,
      detail(cx - side * 0.001, ey, 0.006),
      [male ? 0.0042 : 0.0052, male ? 0.0047 : 0.0057, 0.0015],
      iris,
      "head",
    );
    ellipsoid(
      head,
      detail(cx - side * 0.001, ey, 0.0075),
      [0.0021, 0.0027, 0.0008],
      pupil,
      "head",
    );
    ellipsoid(
      head,
      detail(cx - 0.001, ey + 0.0015, 0.0082),
      [0.0011, 0.0011, 0.0006],
      pearl,
      "head",
    );
    curve(
      head,
      [
        detail(cx - 0.014, ey, 0.004),
        detail(cx, ey + 0.0055, 0.006),
        detail(cx + 0.014, ey, 0.004),
      ],
      0.0014,
      hair,
      "head",
    );
    curve(
      head,
      [
        detail(cx - 0.018, ey + 0.012, 0.01),
        detail(cx, ey + 0.017, 0.011),
        detail(cx + 0.018, ey + 0.012, 0.01),
      ],
      male ? 0.0016 : 0.0011,
      hair,
      "head",
    );
    curve(
      head,
      [
        detail(cx - 0.013, ey - 0.001, 0.002),
        detail(cx, ey - 0.004, 0.003),
        detail(cx + 0.013, ey - 0.001, 0.002),
      ],
      0.0009,
      skinShadow,
      "head",
    );
    curve(
      head,
      [
        detail(side * 0.014, 0.036, 0.002),
        detail(side * 0.03, 0.041, 0.002),
        detail(side * 0.048, 0.034, 0.002),
      ],
      male ? 0.0027 : 0.0019,
      hair,
      "head",
    );
    ellipsoid(
      head,
      detail(side * 0.007, -0.032, 0.0005),
      [0.004, 0.0016, 0.0011],
      skinShadow,
      "head",
    );
  }
  curve(
    head,
    [
      detail(-0.017, -0.065, 0.002),
      detail(-0.007, -0.061, 0.003),
      detail(0, -0.064, 0.004),
      detail(0.007, -0.061, 0.003),
      detail(0.017, -0.065, 0.002),
    ],
    male ? 0.0017 : 0.0023,
    lips,
    "head",
  );
  if (!male) {
    curve(
      head,
      [
        detail(-0.058, 0.048, 0.014),
        detail(-0.03, 0.083, 0.017),
        detail(0.002, 0.102, 0.017),
      ],
      0.009,
      hair,
      "head",
    );
    curve(
      head,
      [
        detail(0.002, 0.102, 0.017),
        detail(0.03, 0.083, 0.017),
        detail(0.069, 0.043, 0.013),
      ],
      0.009,
      hair,
      "head",
    );
  }
  curve(
    head,
    [
      detail(-0.015, -0.066, 0.002),
      detail(0, -0.07, 0.004),
      detail(0.015, -0.066, 0.002),
    ],
    male ? 0.0019 : 0.0027,
    lips,
    "head",
  );
  const hairCap = mesh(
    new THREE.SphereGeometry(1, 48, 28, 0, Math.PI * 2, 0, Math.PI * 0.41),
    hair,
    head,
    "head",
  );
  hairCap.position.set(0, 0.025, -0.012);
  hairCap.scale.set(male ? 0.088 : 0.081, 0.111, 0.1);
  curve(
    head,
    [
      [-0.069, 0.025, 0.047],
      [-0.06, 0.077, 0.066],
      [-0.015, 0.124, 0.035],
      [0.057, 0.081, 0.055],
    ],
    0.006,
    hair,
    "head",
  );
  if (!male) {
    const hairBack = clothSurface(
      head,
      0.076,
      -0.34,
      (t) => [0.083 - t * 0.01, 0.079 - t * 0.029],
      hair,
      Math.PI * 0.46,
      Math.PI * 1.54,
      "head",
      0.001,
    );
    hairBack.name = "anatomy-long-hair";
    hair.side = THREE.DoubleSide;
    for (const side of [-1, 1]) {
      curve(
        head,
        [
          [side * 0.068, 0.038, 0.039],
          [side * 0.077, -0.077, 0.023],
          [side * 0.084, -0.227, 0.004],
          [side * 0.062, -0.318, 0.012],
        ],
        0.013,
        hair,
        "head",
      );
      curve(
        head,
        [
          [side * 0.071, 0.03, 0.049],
          [side * 0.078, -0.076, 0.039],
          [side * 0.082, -0.214, 0.018],
        ],
        0.0008,
        hairLight,
        "head",
      );
    }
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.59 + (i / 8) * Math.PI * 0.82;
      const pts: Point[] = Array.from({ length: 7 }, (_, j) => {
        const t = j / 6;
        return [
          Math.sin(a) * (0.084 - t * 0.01),
          0.06 - t * 0.385,
          Math.cos(a) * (0.081 - t * 0.029) - 0.001,
        ];
      });
      curve(head, pts, 0.0006, hairLight, "head");
    }
  }

  const sleeves: THREE.Group[] = [],
    forearms: THREE.Group[] = [],
    handSockets: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.name = side === -1 ? "Arm_Left" : "Arm_Right";
    arm.position.set(side * 0.174 * width, 1.416, 0);
    body.add(arm);
    sleeves.push(arm);
    const elbow: Point = [side * 0.039, -0.245, 0.016],
      wrist: Point = [side * 0.075, -0.488, 0.045];
    const lower = new THREE.Group();
    lower.position.set(...elbow);
    arm.add(lower);
    forearms.push(lower);
    // A rest-space socket keeps every existing accessory attached through elbow bends.
    const socket = new THREE.Group();
    socket.position.set(-elbow[0], -elbow[1], -elbow[2]);
    lower.add(socket);
    handSockets.push(socket);
    const vec = (p: Point) => new THREE.Vector3(...p);
    if (!outfit.layers.garment) {
      mesh(
        createLimbGeometry(
          [vec([0, 0, 0]), vec([side * 0.024, -0.122, 0.002]), vec(elbow)],
          (t) => [0.044 - t * 0.014, 0.04 - t * 0.011],
        ),
        skin,
        arm,
      );
      mesh(
        createLimbGeometry(
          [vec(elbow), vec([side * 0.055, -0.347, 0.023]), vec(wrist)],
          (t) => [
            0.03 + 0.005 * Math.sin(t * Math.PI) - t * 0.01,
            0.028 - t * 0.01,
          ],
        ),
        skin,
        socket,
      );
      ellipsoid(arm, elbow, [0.031, 0.033, 0.032], skin);
    }
    const hand = new THREE.Group();
    hand.name = side === -1 ? "Hand_Left" : "Hand_Right";
    hand.userData.bodyPart = "hands";
    hand.position.set(...wrist);
    hand.rotation.z = side * 0.05;
    socket.add(hand);
    ellipsoid(
      hand,
      [0, -0.049, 0.003],
      [male ? 0.035 : 0.03, 0.049, 0.015],
      skin,
    );
    const holding =
      outfit.layers.accessories &&
      ((side === -1 && has("acc_quat_tre")) ||
        (side === 1 && (has("acc_non_la") || has("acc_non_ba_tam"))));
    const fingerLengths = [0.061, 0.073, 0.068, 0.051],
      fingerNames = ["index", "middle", "ring", "little"];
    for (let f = 0; f < 4; f++) {
      const x = (f - 1.5) * 0.014,
        len = fingerLengths[f],
        r = male ? 0.0066 : 0.0058;
      const a: Point = [x, -0.087, 0.004],
        b: Point = [
          x + side * 0.003,
          -0.087 - len * 0.52,
          holding ? 0.026 : 0.012,
        ],
        c: Point = [x + side * 0.004, -0.087 - len, holding ? 0.038 : 0.018];
      const finger = link(hand, a, b, r, r * 0.9, skin);
      finger.name =
        "finger-" + (side === -1 ? "left-" : "right-") + fingerNames[f];
      link(hand, b, c, r * 0.9, r * 0.72, skin);
      ellipsoid(hand, b, [r * 0.92, r * 0.98, r * 0.92], skin);
      ellipsoid(hand, c, [r * 0.73, r * 0.8, r * 0.73], skin);
      ellipsoid(
        hand,
        [c[0], c[1] + 0.005, c[2] + r * 0.74],
        [r * 0.56, 0.004, 0.0008],
        mat("#dfb6a4", 0.55),
      );
    }
    const thumbA: Point = [-side * 0.024, -0.034, 0.004],
      thumbB: Point = [-side * 0.041, -0.063, 0.012],
      thumbC: Point = [-side * 0.038, -0.096, holding ? 0.036 : 0.021];
    const thumb = link(hand, thumbA, thumbB, 0.009, 0.0075, skin);
    thumb.name = "finger-" + (side === -1 ? "left-" : "right-") + "thumb";
    link(hand, thumbB, thumbC, 0.0075, 0.006, skin);
    ellipsoid(hand, thumbC, [0.006, 0.007, 0.006], skin);
    hand.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).castShadow = false;
    });
    if (outfit.layers.garment) {
      ellipsoid(
        arm,
        [-side * 0.01, -0.016, 0],
        [male ? 0.052 : 0.044, male ? 0.014 : 0.011, male ? 0.046 : 0.035],
        main,
      );
      const upper = mesh(
        createLimbGeometry(
          [
            vec([-side * 0.02, 0.006, 0]),
            vec([side * 0.025, -0.118, 0.005]),
            vec([side * 0.039, -0.259, 0.016]),
          ],
          (t) => [
            (male ? 0.04 : 0.034) + Math.sin(t * Math.PI) * 0.01 + t * 0.018,
            (male ? 0.039 : 0.033) + Math.sin(t * Math.PI) * 0.01 + t * 0.014,
          ],
        ),
        main,
        arm,
      );
      upper.name = "sleeve-upper";
      upper.userData.itemSlot = "garment";
      const lowerSleeve = mesh(
        createLimbGeometry(
          [
            vec([side * 0.038, -0.232, 0.016]),
            vec([side * 0.057, -0.352, 0.025]),
            vec([side * 0.073, -0.466, 0.043]),
          ],
          (t) => [
            broad ? 0.071 + t * 0.067 : 0.052 - t * 0.019,
            broad ? 0.059 + t * 0.06 : 0.047 - t * 0.018,
          ],
        ),
        main,
        socket,
      );
      lowerSleeve.name = "sleeve-lower";
      lowerSleeve.userData.itemSlot = "garment";
      ellipsoid(
        arm,
        elbow,
        [broad ? 0.071 : 0.053, broad ? 0.05 : 0.032, broad ? 0.06 : 0.048],
        main,
      );
      link(
        socket,
        [side * 0.071, -0.454, 0.042],
        [side * 0.075, -0.474, 0.044],
        broad ? 0.139 : 0.034,
        broad ? 0.14 : 0.034,
        outfit.garmentId === "nhat_binh" ? trim : lining,
      );
      if (outfit.garmentId === "nhat_binh")
        for (let i = 0; i < 3; i++)
          link(
            socket,
            [side * 0.064, -0.4 - i * 0.023, 0.033],
            [side * 0.066, -0.412 - i * 0.023, 0.035],
            0.11 + i * 0.01,
            0.118 + i * 0.01,
            [gold, lining, trim][i],
          );
    }
    if (outfit.layers.accessories && has("acc_vong_tay")) {
      const ring = mesh(
        new THREE.TorusGeometry(0.024, 0.003, 8, 32),
        silver,
        socket,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(wrist[0], -0.487, wrist[2]);
    }
  }

  const clasped =
    !male &&
    outfit.pose === "stand" &&
    !has("acc_quat_tre") &&
    !has("acc_non_la") &&
    !has("acc_non_ba_tam");
  if (clasped) {
    sleeves[0].rotation.z = 0.14;
    sleeves[1].rotation.z = -0.14;
    forearms[0].rotation.x = -0.48;
    forearms[1].rotation.x = -0.48;
    forearms[0].rotation.z = 0.56;
    forearms[1].rotation.z = -0.56;
  }
  if (options.authoringPose)
    for (let i = 0; i < sleeves.length; i++)
      sleeves[i].rotation.z =
        (i === 0 ? -1 : 1) * (Math.PI / 4 - Math.atan(0.039 / 0.245));
  const movingPanels: THREE.Mesh[] = [];
  if (outfit.layers.lining) {
    clothSurface(
      body,
      1.405,
      0.33,
      (t) => {
        const y = THREE.MathUtils.lerp(1.397, 0.33, t),
          [rx, rz] = sectionAt(torsoSections[outfit.gender], y);
        return [rx * width * 0.975, rz * 0.97];
      },
      lining,
    );
  }
  if (outfit.layers.garment) {
    const garment = new THREE.Group();
    garment.name = "GarmentRoot";
    garment.userData.itemSlot = "garment";
    body.add(garment);
    const patternMat = main.clone();
    materials.add(patternMat);
    patternMat.color.set("#ffffff");
    const texture = garmentTexture(
      outfit.pattern,
      outfit.colors.main,
      outfit.colors.pattern,
      outfit.fabric,
    );
    textures.add(texture);
    patternMat.map = texture;
    const hem =
      outfit.garmentId === "ao_dai_cach_tan"
        ? 0.54
        : fitted
          ? 0.105
          : outfit.garmentId === "ao_tac" || outfit.garmentId === "nhat_binh"
            ? 0.15
            : 0.23;
    const slitY = options.authoringPose && fitted ? 1.105 : 0.96;
    const fittedSections = torsoSections[outfit.gender];
    const looseSections: readonly (readonly [number, number, number])[] = [
      [1.416, 0.176, 0.103],
      [1.29, 0.177, 0.113],
      [1.105, 0.174, 0.105],
      [0.96, 0.188, 0.117],
    ];
    const radius = (t: number): [number, number] => {
      const [rx, rz] = sectionAt(
        fitted ? fittedSections : looseSections,
        THREE.MathUtils.lerp(1.416, slitY, t),
      );
      return [rx * width, rz];
    };
    // A connected shoulder yoke covers the inner shirt and joins neck to sleeves.
    const shoulderRadius = (t: number): [number, number] => {
      const ease = Math.sin((t * Math.PI) / 2);
      return [
        (male ? 0.049 : 0.043) +
          ease * ((male ? 0.176 : 0.155) * width - (male ? 0.049 : 0.043)),
        0.054 + ease * 0.052,
      ];
    };
    clothSurface(
      garment,
      1.456,
      1.397,
      shoulderRadius,
      main,
      open ? 0.24 : -Math.PI,
      open ? Math.PI * 2 - 0.24 : Math.PI,
    );
    if (open) {
      const robeRadius = (t: number): [number, number] => [
        (0.186 + t * 0.055) * width,
        0.115 + t * 0.029,
      ];
      clothSurface(garment, 1.414, hem, robeRadius, patternMat, 0.24, 1.46);
      clothSurface(
        garment,
        1.414,
        hem,
        robeRadius,
        main,
        1.45,
        Math.PI * 2 - 1.45,
      );
      clothSurface(
        garment,
        1.414,
        hem,
        robeRadius,
        patternMat,
        Math.PI * 2 - 1.46,
        Math.PI * 2 - 0.24,
      );
      for (const side of [-1, 1])
        curve(
          garment,
          [
            [side * 0.06, 1.445, 0.066],
            [side * 0.07, 1.27, 0.11],
            [side * 0.061, 0.83, 0.131],
            [side * 0.062, hem, 0.149],
          ],
          0.009,
          trim,
          "collar",
        );
    } else {
      const torso = clothSurface(
        garment,
        1.416,
        slitY,
        radius,
        main,
        -Math.PI,
        Math.PI,
        "garment",
        fitted ? 0.0006 : 0.002,
      );
      torso.name = "garment-shaped-torso";
      const hip = radius(1);
      const skirtRadius = (t: number): [number, number] => {
        const flare = fitted ? 0.023 : broad ? 0.048 : 0.027;
        if (options.authoringPose && fitted) {
          const y = THREE.MathUtils.lerp(slitY, hem, t),
            [rx, rz] = sectionAt(fittedSections, y);
          const f = THREE.MathUtils.clamp((0.96 - y) / (0.96 - hem), 0, 1);
          return [rx * width + Math.pow(f, 1.35) * flare, rz + f * 0.02];
        }
        return [hip[0] + Math.pow(t, 1.35) * flare, hip[1] + t * 0.02];
      };
      if (broad) {
        const skirt = clothSurface(
          garment,
          slitY + 0.005,
          hem,
          skirtRadius,
          patternMat,
          -Math.PI,
          Math.PI,
          "garment",
          0.007,
        );
        movingPanels.push(skirt);
      } else {
        const front = clothSurface(
          garment,
          slitY + 0.005,
          hem,
          skirtRadius,
          patternMat,
          -1.43,
          1.43,
          "garment",
          0.005,
        );
        const back = clothSurface(
          garment,
          slitY + 0.005,
          hem - 0.007,
          skirtRadius,
          main,
          Math.PI - 1.43,
          Math.PI + 1.43,
          "garment",
          0.006,
        );
        front.name = "Flap_Front_Mesh";
        back.name = "Flap_Back_Mesh";
        movingPanels.push(front, back);
      }
      const hemRadius = skirtRadius(1);
      const hemPoints: Point[] = Array.from({ length: 17 }, (_, i) => {
        const a = -1.43 + (i / 16) * 2.86;
        return [
          Math.sin(a) * (hemRadius[0] + 0.002),
          hem + 0.013,
          Math.cos(a) * (hemRadius[1] + 0.002),
        ];
      });
      curve(garment, hemPoints, 0.0025, trim, "hem");
      if (outfit.garmentId === "nhat_binh") {
        // Distinct rectangular front collar, deliberately an illustrative silhouette.
        bar(garment, [0, 1.265, 0.119], [0.195, 0.064, 0.01], trim, "collar");
        for (const side of [-1, 1]) {
          bar(
            garment,
            [side * 0.082, 1.357, 0.101],
            [0.042, 0.19, 0.019],
            trim,
            "collar",
          );
          curve(
            garment,
            [
              [side * 0.105, 1.445, 0.082],
              [side * 0.105, 1.27, 0.115],
              [0, 1.236, 0.125],
            ],
            0.0028,
            gold,
            "collar",
          );
          for (let i = 0; i < 5; i++)
            ellipsoid(
              garment,
              [side * 0.082, 1.28 + i * 0.036, 0.115],
              [0.004, 0.004, 0.004],
              pearl,
              "collar",
            );
        }
      } else if (outfit.garmentId === "giao_linh") {
        curve(
          garment,
          [
            [-0.055, 1.47, 0.06],
            [-0.025, 1.39, 0.106],
            [0.06, 1.3, 0.109],
            [0.135, 1.225, 0.077],
          ],
          0.017,
          lining,
          "collar",
        );
        curve(
          garment,
          [
            [0.055, 1.47, 0.065],
            [0.019, 1.402, 0.106],
            [-0.087, 1.275, 0.107],
          ],
          0.013,
          trim,
          "collar",
        );
        curve(
          garment,
          [
            [-0.16, 1.13, 0.054],
            [0, 1.124, 0.111],
            [0.163, 1.13, 0.049],
          ],
          0.019,
          trim,
        );
      } else {
        const collar = mesh(
          new THREE.CylinderGeometry(
            male ? 0.053 : 0.045,
            male ? 0.059 : 0.05,
            0.066,
            48,
            1,
            true,
          ),
          main,
          garment,
          "collar",
        );
        collar.scale.z = 0.87;
        collar.position.set(0, 1.451, 0);
        const cr = male ? 0.053 : 0.045;
        curve(
          garment,
          [
            [-cr, 1.484, 0],
            [0, 1.486, cr * 0.9],
            [cr, 1.484, 0],
          ],
          0.0018,
          lining,
          "collar",
        );
        const frontAt = (y: number, fraction: number): Point => {
          const [rx, rz] = radius(
            THREE.MathUtils.clamp((1.416 - y) / (1.416 - slitY), 0, 1),
          );
          return [
            rx * fraction,
            y,
            rz * Math.sqrt(1 - fraction * fraction) + 0.003,
          ];
        };
        const seam = [
          frontAt(1.413, 0.055),
          frontAt(1.373, 0.42),
          frontAt(1.31, 0.75),
          frontAt(1.2, 0.75),
          frontAt(1.045, 0.75),
        ];
        curve(garment, seam, 0.0015, lining, "collar");
        for (let i = 0; i < 5; i++) {
          const y = 1.385 - i * 0.074,
            p = frontAt(y, i === 0 ? 0.35 : 0.75);
          ellipsoid(garment, p, [0.0035, 0.0035, 0.003], pearl, "collar");
        }
      }
    }
  }

  const headBefore = new Set(head.children);
  if (outfit.layers.head) {
    if (has("acc_khan_van")) {
      for (let i = 0; i < 3; i++) {
        const ring = mesh(
          new THREE.TorusGeometry(0.096 + i * 0.003, 0.018, 10, 40),
          main,
          head,
          "head",
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, 0.089 + i * 0.021, -0.005);
      }
      const knot = ellipsoid(
        head,
        [0.072, 0.123, -0.055],
        [0.032, 0.023, 0.025],
        main,
        "head",
      );
      knot.rotation.z = -0.3;
    }
    if (has("acc_tram") || has("acc_kep_hoa")) {
      link(
        head,
        [-0.106, 0.033, -0.033],
        [0.048, 0.111, -0.047],
        0.003,
        0.003,
        gold,
        "head",
      );
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        ellipsoid(
          head,
          [-0.09 + Math.sin(a) * 0.017, 0.055 + Math.cos(a) * 0.017, 0.003],
          [0.013, 0.012, 0.005],
          pearl,
          "head",
        );
      }
      ellipsoid(
        head,
        [-0.09, 0.055, 0.009],
        [0.006, 0.006, 0.004],
        gold,
        "head",
      );
    }
    if (has("acc_bong_tai"))
      for (const side of [-1, 1]) {
        const hoop = mesh(
          new THREE.TorusGeometry(0.014, 0.0028, 6, 20),
          gold,
          head,
          "head",
        );
        hoop.position.set(side * 0.08, -0.049, 0.002);
        ellipsoid(
          head,
          [side * 0.08, -0.066, 0.003],
          [0.005, 0.008, 0.005],
          pearl,
          "head",
        );
      }
    if (has("acc_kinh_ram")) {
      for (const side of [-1, 1])
        ellipsoid(
          head,
          [side * 0.034, 0.006, 0.082],
          [0.026, 0.013, 0.006],
          mat("#283e39", 0.28),
          "head",
        );
      link(
        head,
        [-0.012, 0.009, 0.088],
        [0.012, 0.009, 0.088],
        0.002,
        0.002,
        gold,
        "head",
      );
    }
  }

  head.children.filter(n=>!headBefore.has(n)).forEach(n=>{n.userData.accessoryAnchor="Head";});
  const necklaceBefore = new Set(body.children);
  if (outfit.layers.head && (has("acc_kieng_bac") || has("acc_chuoi_ngoc"))) {
    const points: Point[] = Array.from({ length: 33 }, (_, i) => {
      const angle = (i * Math.PI * 2) / 32;
      return [
        Math.sin(angle) * 0.073,
        1.43 - Math.cos(angle) * 0.038,
        Math.cos(angle) * 0.077,
      ];
    });
    curve(
      body,
      points,
      has("acc_kieng_bac") ? 0.006 : 0.002,
      has("acc_kieng_bac") ? silver : gold,
      "collar",
    );
    if (has("acc_chuoi_ngoc"))
      points
        .filter((_, i) => i % 2 === 0)
        .forEach((p) =>
          ellipsoid(body, p, [0.006, 0.006, 0.006], pearl, "collar"),
        );
  }
  body.children.filter(n=>!necklaceBefore.has(n)).forEach(n=>{n.userData.accessoryAnchor="Chest";});
  const bodyAccessoriesBefore=new Set(body.children);
  if (outfit.layers.accessories) {
    const leftHand = handSockets[0],
      rightHand = handSockets[1];
    if (has("acc_quat_tre")) {
      const fan = new THREE.Group();
      fan.userData.accessoryAnchor="Hand.L";
      fan.position.set(-0.075, -0.566, 0.068);
      fan.rotation.set(-0.1, 0.15, -0.15);
      leftHand.add(fan);
      const paper = mat("#e4c589", 0.86),
        rib = mat("#a77c43", 0.8);
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      const start = -0.98,
        end = 0.98;
      for (let i = 0; i <= 24; i++) {
        const a = start + (i / 24) * (end - start);
        shape.lineTo(Math.sin(a) * 0.245, Math.cos(a) * 0.245);
      }
      shape.closePath();
      mesh(new THREE.ShapeGeometry(shape), paper, fan).material.side =
        THREE.DoubleSide;
      for (let i = 0; i <= 10; i++) {
        const a = start + (i / 10) * (end - start);
        link(
          fan,
          [0, 0, 0.002],
          [Math.sin(a) * 0.242, Math.cos(a) * 0.242, 0.002],
          0.0015,
          0.002,
          rib,
        );
      }
    }
    if (has("acc_non_la") || has("acc_non_ba_tam")) {
      const hat = new THREE.Group();
      hat.userData.accessoryAnchor="Hand.R";
      hat.position.set(0.097, -0.624, 0.042);
      hat.rotation.set(0.62, -0.14, 0.4);
      rightHand.add(hat);
      const straw = mat("#e6cc95", 0.88),
        edge = mat("#b59b65", 0.8);
      const cone = mesh(
        has("acc_non_ba_tam")
          ? new THREE.CylinderGeometry(0.192, 0.211, 0.035, 48)
          : new THREE.ConeGeometry(0.212, 0.11, 48, 1, true),
        straw,
        hat,
      );
      cone.material.side = THREE.DoubleSide;
      const rim = mesh(new THREE.TorusGeometry(0.211, 0.003, 5, 64), edge, hat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = has("acc_non_ba_tam") ? -0.02 : -0.055;
      curve(
        hat,
        [
          [-0.13, -0.035, 0],
          [-0.065, -0.21, 0.02],
          [0.074, -0.215, 0.02],
          [0.14, -0.035, 0],
        ],
        0.003,
        lining,
      );
      if (!has("acc_non_ba_tam"))
        for (let i = 0; i < 14; i++) {
          const a = (i * Math.PI * 2) / 14;
          link(
            hat,
            [0, 0.055, 0],
            [Math.sin(a) * 0.21, -0.055, Math.cos(a) * 0.21],
            0.0009,
            0.001,
            edge,
          );
        }
    }
    if (has("acc_tui_coi") || has("acc_tui_deo_cheo")) {
      const brown = mat(has("acc_tui_coi") ? "#c0a16e" : "#885b43", 0.85);
      const bag = new THREE.Group();
      bag.position.set(0.235 * width, 0.92, 0.139);
      bag.rotation.z = 0.08;
      body.add(bag);
      const object = bar(bag, [0, 0, 0], [0.142, 0.13, 0.059], brown);
      object.rotation.y = -0.14;
      bar(bag, [0, 0.04, 0.033], [0.142, 0.038, 0.009], mat("#ab815c", 0.8));
      ellipsoid(bag, [0, 0.015, 0.044], [0.009, 0.009, 0.003], gold);
      curve(
        bag,
        [
          [-0.048, 0.055, 0],
          [-0.038, 0.132, 0],
          [0.038, 0.132, 0],
          [0.048, 0.055, 0],
        ],
        0.006,
        brown,
      );
      if (has("acc_tui_deo_cheo"))
        curve(
          body,
          [
            [-0.146, 1.42, 0.081],
            [-0.04, 1.266, 0.116],
            [0.12, 1.07, 0.136],
            [0.235, 0.961, 0.148],
          ],
          0.006,
          brown,
        );
    }
    if (has("acc_ngoc_boi") || has("acc_the_bai")) {
      curve(
        body,
        [
          [0.115, 1.07, 0.095],
          [0.144, 0.94, 0.131],
          [0.145, 0.866, 0.139],
        ],
        0.002,
        gold,
      );
      if (has("acc_ngoc_boi")) {
        const jade = mesh(
          new THREE.TorusGeometry(0.021, 0.006, 8, 24),
          mat("#94b797", 0.25),
          body,
        );
        jade.position.set(0.145, 0.845, 0.14);
      } else bar(body, [0.145, 0.837, 0.14], [0.035, 0.062, 0.008], gold);
    }
  }

  body.children.filter(n=>!bodyAccessoriesBefore.has(n)).forEach(n=>{n.userData.accessoryAnchor="Hips";});
  for (const arm of sleeves)
    arm.traverse((n) => {
      if (!(n as THREE.Mesh).isMesh) return;
      const m = n as THREE.Mesh;
      if (m.material === main || m.material === lining || m.material === trim)
        m.userData.itemSlot = "garment";
    });
  main.name = "Fabric_Main";
  pants.name = "Fabric_Pants";
  lining.name = "Fabric_Lining";
  trim.name = "Fabric_Trim";
  root.traverse((n) => {
    if ((n as THREE.Mesh).isMesh) {
      const m = n as THREE.Mesh;
      if (
        (m.material as THREE.MeshPhysicalMaterial).map &&
        (m.material as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial &&
        (m.material as THREE.MeshPhysicalMaterial).map?.constructor.name ===
          "CanvasTexture"
      )
        (m.material as THREE.MeshPhysicalMaterial).name = "Fabric_Pattern";
    }
  });
  const posedFan = outfit.pose === "fan" && !options.authoringPose;
  if (posedFan) {
    sleeves[0].rotation.z = -0.1;
    forearms[0].rotation.x = -0.78;
    forearms[0].rotation.z = -0.32;
    body.rotation.z = -0.025;
    head.rotation.z = 0.06;
  }
  const originalPositions = movingPanels.map((panel) =>
    (panel.geometry.attributes.position.array as Float32Array).slice(),
  );
  let lastNormals = -1;
  return {
    root,
    animate(time, moving) {
      const walk = moving && outfit.pose === "walk";
      const phase = time * 2.6;
      legLeft.rotation.x = walk ? Math.sin(phase) * 0.055 : 0;
      legRight.rotation.x = walk ? -Math.sin(phase) * 0.055 : 0;
      body.position.y = walk ? Math.sin(phase * 2) * 0.002 : 0;
      if (!posedFan) {
        sleeves[0].rotation.x = walk ? Math.sin(phase) * 0.07 : 0;
        sleeves[1].rotation.x = walk ? -Math.sin(phase) * 0.07 : 0;
      }
      movingPanels.forEach((panel, index) => {
        const attr = panel.geometry.attributes
          .position as THREE.BufferAttribute;
        const original = originalPositions[index];
        for (let i = 0; i < attr.count; i++) {
          const y = original[i * 3 + 1];
          const amount = Math.max(0, 0.85 - y);
          attr.setZ(
            i,
            original[i * 3 + 2] +
              (walk ? Math.sin(phase + y * 2 + index) * amount * 0.014 : 0),
          );
        }
        attr.needsUpdate = true;
        if (Math.floor(time * 10) !== lastNormals)
          panel.geometry.computeVertexNormals();
      });
      lastNormals = Math.floor(time * 10);
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

/** Artwork is rasterized locally into garment UVs; no SVG markup or network requests. */
export function garmentTexture(
  pattern: GarmentPattern,
  baseColor: string,
  accent: string,
  fabric: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 1024, 1024);
  // The weave is deterministic so changing a color does not shuffle the material.
  ctx.strokeStyle = "rgba(255,255,255,.035)";
  ctx.lineWidth = 1;
  const step = fabric === "brocade" ? 8 : 4;
  for (let x = 0; x <= 1024; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  function draw(
    id: string,
    x: number,
    y: number,
    scale: number,
    rotation: number,
    color: string,
    stroke: number,
    opacity: number,
    paths?: string[],
  ) {
    const motif = paths || motifCatalog.find((m) => m.id === id)?.paths;
    if (!motif) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-50, -50);
    ctx.strokeStyle = color === "auto" ? accent : color;
    ctx.lineWidth = (stroke / scale) * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = opacity;
    for (const d of motif) ctx.stroke(new Path2D(d));
    ctx.restore();
  }
  if (pattern.placement === "free") {
    for (const item of pattern.decorations || []) {
      // The 2D editor's front panel spans x=105..215, y=195..445.
      draw(
        item.motifId,
        ((item.x - 90) / 140) * 1024,
        ((item.y - 195) / 250) * 1024,
        item.scale * 6.5,
        item.rotation,
        item.color,
        item.strokeWidth,
        item.opacity,
        item.motifId === "custom"
          ? pattern.assets?.find((a) => a.id === item.assetId)?.motif.paths
          : undefined,
      );
    }
  } else if (pattern.motifId !== "none") {
    const placements =
      pattern.placement === "hem"
        ? [
            [200, 850],
            [512, 850],
            [820, 850],
          ]
        : pattern.placement === "side"
          ? [
              [265, 140],
              [265, 375],
              [265, 610],
              [265, 845],
            ]
          : [[512, 510]];
    for (const [x, y] of placements)
      draw(
        pattern.motifId,
        x,
        y,
        pattern.scale * (pattern.placement === "center" ? 4.6 : 2.1),
        0,
        pattern.color,
        pattern.strokeWidth,
        pattern.opacity,
        pattern.custom?.paths,
      );
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
