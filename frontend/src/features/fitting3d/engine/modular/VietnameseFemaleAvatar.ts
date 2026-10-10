import * as THREE from "three";

/**
 * Tạo texture khuôn mặt người phụ nữ Việt Nam độ phân giải cao bằng HTML5 Canvas
 */
export function createVietnameseFaceTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // 1. Màu da nền Á Đông sáng hồng mịn màng
  const bgGrad = ctx.createRadialGradient(size / 2, size * 0.45, 50, size / 2, size * 0.45, size * 0.6);
  bgGrad.addColorStop(0, "#ffefe5");
  bgGrad.addColorStop(0.5, "#fde5d8");
  bgGrad.addColorStop(1, "#f3cebf");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // 2. Gò má ửng hồng dịu dàng (Blush)
  const drawCheekBlush = (cx: number, cy: number) => {
    const blush = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120);
    blush.addColorStop(0, "rgba(244, 114, 130, 0.35)");
    blush.addColorStop(0.6, "rgba(244, 114, 130, 0.12)");
    blush.addColorStop(1, "rgba(244, 114, 130, 0)");
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();
  };
  drawCheekBlush(size * 0.28, size * 0.54);
  drawCheekBlush(size * 0.72, size * 0.54);

  // 3. Đôi chân mày lá liễu thanh tú (Eyebrows)
  const drawEyebrow = (startX: number, startY: number, peakX: number, peakY: number, endX: number, endY: number) => {
    ctx.save();
    ctx.strokeStyle = "#271c19";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(peakX, peakY, endX, endY);
    ctx.stroke();

    // Lớp dặm mềm
    ctx.strokeStyle = "rgba(45, 30, 25, 0.45)";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(peakX, peakY, endX, endY);
    ctx.stroke();
    ctx.restore();
  };
  // Chân mày trái & phải
  drawEyebrow(size * 0.22, size * 0.36, size * 0.34, size * 0.32, size * 0.44, size * 0.37);
  drawEyebrow(size * 0.78, size * 0.36, size * 0.66, size * 0.32, size * 0.56, size * 0.37);

  // 4. Đôi mắt bồ câu đen láy Á Đông (Eyes)
  const drawAlmondEye = (cx: number, cy: number, flip: boolean) => {
    ctx.save();
    ctx.translate(cx, cy);
    if (flip) ctx.scale(-1, 1);

    // Mí mắt & lòng trắng
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(-75, 0);
    ctx.bezierCurveTo(-40, -38, 40, -38, 75, 0);
    ctx.bezierCurveTo(40, 32, -40, 32, -75, 0);
    ctx.closePath();
    ctx.fill();

    // Viền mắt đen
    ctx.strokeStyle = "#1a1210";
    ctx.lineWidth = 5;
    ctx.stroke();

    // Mống mắt nâu đen láy (Iris)
    const irisGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 36);
    irisGrad.addColorStop(0, "#110b0a");
    irisGrad.addColorStop(0.65, "#3b241c");
    irisGrad.addColorStop(0.9, "#211511");
    irisGrad.addColorStop(1, "#110b0a");
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.fill();

    // Con ngươi (Pupil)
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    // Đốm sáng long lanh trong mắt (Catchlight)
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-8, -10, 6, 0, Math.PI * 2);
    ctx.arc(9, 6, 3, 0, Math.PI * 2);
    ctx.fill();

    // Hàng lông mi cong mềm (Eyelashes)
    ctx.strokeStyle = "#1a1210";
    ctx.lineWidth = 4;
    for (let i = -50; i <= 60; i += 18) {
      ctx.beginPath();
      ctx.moveTo(i, -26);
      ctx.lineTo(i + 8, -42);
      ctx.stroke();
    }

    // Nếp mí trên (Double eyelid line)
    ctx.strokeStyle = "rgba(120, 80, 70, 0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-65, -34);
    ctx.quadraticCurveTo(0, -50, 65, -34);
    ctx.stroke();

    ctx.restore();
  };
  drawAlmondEye(size * 0.33, size * 0.44, false);
  drawAlmondEye(size * 0.67, size * 0.44, true);

  // 5. Sống mũi thanh thoát (Nose)
  ctx.save();
  ctx.strokeStyle = "rgba(180, 120, 105, 0.28)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(size * 0.48, size * 0.44);
  ctx.lineTo(size * 0.48, size * 0.60);
  ctx.stroke();

  // Đầu mũi & cánh mũi nhỏ nhắn
  ctx.fillStyle = "rgba(220, 140, 130, 0.25)";
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.62, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(140, 85, 75, 0.45)";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(size * 0.45, size * 0.625, 8, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size * 0.55, size * 0.625, 8, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();
  ctx.restore();

  // 6. Đôi môi hồng đào chúm chím (Lips)
  ctx.save();
  const lipGrad = ctx.createLinearGradient(0, size * 0.70, 0, size * 0.81);
  lipGrad.addColorStop(0, "#d94f62");
  lipGrad.addColorStop(0.5, "#ec6a7c");
  lipGrad.addColorStop(1, "#c83b4e");

  // Môi trên
  ctx.fillStyle = lipGrad;
  ctx.beginPath();
  ctx.moveTo(size * 0.36, size * 0.74);
  ctx.quadraticCurveTo(size * 0.44, size * 0.71, size * 0.47, size * 0.725);
  ctx.quadraticCurveTo(size * 0.5, size * 0.74, size * 0.53, size * 0.725);
  ctx.quadraticCurveTo(size * 0.56, size * 0.71, size * 0.64, size * 0.74);
  ctx.quadraticCurveTo(size * 0.5, size * 0.77, size * 0.36, size * 0.74);
  ctx.fill();

  // Môi dưới căng mọng
  ctx.beginPath();
  ctx.moveTo(size * 0.37, size * 0.745);
  ctx.quadraticCurveTo(size * 0.5, size * 0.825, size * 0.63, size * 0.745);
  ctx.quadraticCurveTo(size * 0.5, size * 0.765, size * 0.37, size * 0.745);
  ctx.fill();

  // Bóng sáng căng bóng giữa môi (Lip gloss highlight)
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.778, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

/**
 * Xây dựng Mái Tóc Đen Vấn Gọn Gàng / Búi Tóc Đoan Trang Truyền Thống Phụ Nữ Việt Nam
 * (Đảm bảo không phủ xuống lưng làm xuyên thủng tà áo)
 */
export function createVietnameseHairGroup(): THREE.Group {
  const hairGroup = new THREE.Group();
  hairGroup.name = "Vietnamese_Female_Hair";

  const hairMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#0c0b0d"),
    roughness: 0.32,
    metalness: 0.08,
    sheen: 0.75,
    sheenRoughness: 0.3,
    sheenColor: new THREE.Color("#4a3e3d"),
    side: THREE.DoubleSide,
  });

  // 1. Mái tóc đỉnh đầu ôm sát trọn vòm đầu tự nhiên
  const crownGeo = new THREE.SphereGeometry(0.086, 32, 24);
  const crownMesh = new THREE.Mesh(crownGeo, hairMaterial);
  crownMesh.scale.set(0.96, 1.08, 1.04);
  crownMesh.position.set(0, 0.038, -0.01);
  hairGroup.add(crownMesh);

  // 2. Mái tóc hai bên mang tai (Side bangs gọn gàng)
  const leftBangCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.065, 0.045, 0.02),
    new THREE.Vector3(-0.076, 0.0, 0.015),
    new THREE.Vector3(-0.072, -0.05, 0.005),
  ]);
  const leftBangMesh = new THREE.Mesh(new THREE.TubeGeometry(leftBangCurve, 16, 0.014, 10, false), hairMaterial);
  hairGroup.add(leftBangMesh);

  const rightBangCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.065, 0.045, 0.02),
    new THREE.Vector3(0.076, 0.0, 0.015),
    new THREE.Vector3(0.072, -0.05, 0.005),
  ]);
  const rightBangMesh = new THREE.Mesh(new THREE.TubeGeometry(rightBangCurve, 16, 0.014, 10, false), hairMaterial);
  hairGroup.add(rightBangMesh);

  // 3. Búi tóc đoan trang phía sau gáy (Chignon Bun kiểu phụ nữ Việt Nam truyền thống)
  const bunGeo = new THREE.SphereGeometry(0.042, 24, 18);
  const bunMesh = new THREE.Mesh(bunGeo, hairMaterial);
  bunMesh.scale.set(1.15, 0.95, 0.85);
  bunMesh.position.set(0, 0.02, -0.088);
  hairGroup.add(bunMesh);

  return hairGroup;
}

/**
 * Xây dựng Bàn Tay Búp Măng Thon Nuột Nà của Phụ Nữ Việt Nam (Có đủ 5 ngón tay)
 */
export function createRealisticHand(isLeft: boolean): THREE.Group {
  const handGroup = new THREE.Group();
  handGroup.name = isLeft ? "Realistic_Hand_L" : "Realistic_Hand_R";

  const skinMat = new THREE.MeshStandardMaterial({
    color: "#ffefe5",
    roughness: 0.42,
    metalness: 0.02,
  });

  const sign = isLeft ? 1 : -1;

  // 1. Mu bàn tay thon thả
  const palmGeo = new THREE.BoxGeometry(0.035, 0.045, 0.014);
  const palm = new THREE.Mesh(palmGeo, skinMat);
  palm.position.set(0, -0.02, 0);
  handGroup.add(palm);

  // 2. Các ngón tay thon dài (Ngón cái, trỏ, giữa, áp út, út)
  const fingerData = [
    { name: "thumb", x: 0.022 * sign, len: 0.028, r: 0.0035, rotZ: 0.45 * sign },
    { name: "index", x: 0.012 * sign, len: 0.042, r: 0.0032, rotZ: 0.08 * sign },
    { name: "middle", x: 0.002 * sign, len: 0.046, r: 0.0033, rotZ: 0.0 },
    { name: "ring", x: -0.008 * sign, len: 0.041, r: 0.0031, rotZ: -0.06 * sign },
    { name: "pinky", x: -0.017 * sign, len: 0.032, r: 0.0028, rotZ: -0.14 * sign },
  ];

  fingerData.forEach((f) => {
    const fingerGeo = new THREE.CylinderGeometry(f.r * 0.75, f.r, f.len, 12);
    const finger = new THREE.Mesh(fingerGeo, skinMat);
    finger.position.set(f.x, -0.042 - f.len * 0.45, 0.002);
    finger.rotation.z = f.rotZ;
    finger.rotation.x = 0.08; // Hơi co nhẹ tự nhiên
    handGroup.add(finger);
  });

  return handGroup;
}
