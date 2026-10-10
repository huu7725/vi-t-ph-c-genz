import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { FittingOutfit } from "@domain";
import { adultProfiles, modelReferenceHeight } from "../anatomy";
import { createFittingModel, garmentTexture, type FittingModel } from "../model";
import { ModularWardrobe } from "./ModularWardrobe";
import {
  createVietnameseFaceTexture,
  createVietnameseHairGroup,
  createRealisticHand,
} from "./VietnameseFemaleAvatar";

export interface GltfFittingModel extends FittingModel {
  sync(outfit: FittingOutfit, mannequin: boolean): Promise<void>;
  inspect(): { bones: number; skinnedMeshes: number; wireframe: boolean };
}

/** Original local GLB assets. Body, trousers and every robe share the same A-pose rig. */
export async function createGltfFittingModel(
  initial: FittingOutfit,
  mannequin = false,
): Promise<GltfFittingModel> {
  const wardrobe = new ModularWardrobe(new GLTFLoader());
  const folder = `/models/fitting/${initial.gender}`;
  try {
    await wardrobe.loadBaseAvatar(`${folder}/base_avatar.glb`);
  } catch (error) {
    wardrobe.dispose();
    throw error;
  }
  const root = wardrobe.root;
  root.traverse((n) => {
    if ((n as THREE.Mesh).isMesh) {
      const m = (n as THREE.Mesh).material;
      for (const mat of Array.isArray(m) ? m : [m]) {
        mat.side = THREE.DoubleSide;
        (mat as THREE.MeshStandardMaterial).wireframe = false;
      }
    }
  });
  root.scale.setScalar(adultProfiles[initial.gender].height / modelReferenceHeight);

  // NÂNG CẤP MẪU NỮ: KHUÔN MẶT Á ĐÔNG, BÚI TÓC ĐOAN TRANG, BÀN TAY THON THẢ
  if (initial.gender === "nu" && !mannequin) {
    // Ẩn vĩnh viễn đầu và bàn tay khối cũ trong ModularWardrobe
    wardrobe.setBodyPartEnabled("head", false);
    wardrobe.setBodyPartEnabled("hands", false);

    // 1. Khuôn mặt Á Đông với mắt bồ câu, môi hồng, sống mũi thanh tú
    const faceTex = createVietnameseFaceTexture();
    const headBone = wardrobe.bones.get("Head");
    if (headBone) {
      const headMat = new THREE.MeshStandardMaterial({
        map: faceTex,
        roughness: 0.42,
        metalness: 0.02,
      });
      const headGeo = new THREE.SphereGeometry(0.082, 32, 28);
      headGeo.scale(0.92, 1.14, 1.0);
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.set(0, 0.035, 0.008);
      headMesh.rotation.y = -Math.PI / 2;
      headMesh.castShadow = true;
      headBone.add(headMesh);

      // 2. Mái tóc đoan trang gọn gàng sau gáy
      const hair = createVietnameseHairGroup();
      hair.traverse((n) => {
        if ((n as THREE.Mesh).isMesh) (n as THREE.Mesh).castShadow = true;
      });
      headBone.add(hair);
    }

    // 3. Đôi bàn tay ngọc búp măng 5 ngón thon nuột nà
    const handLBone = wardrobe.bones.get("Hand.L");
    if (handLBone) {
      const handL = createRealisticHand(true);
      handLBone.add(handL);
    }
    const handRBone = wardrobe.bones.get("Hand.R");
    if (handRBone) {
      const handR = createRealisticHand(false);
      handRBone.add(handR);
    }
  }

  let disposed = false,
    current = initial,
    study = mannequin;
  let texture: THREE.CanvasTexture | null = null;
  let decorationModel: FittingModel | null = null;
  let accessorySignature = "",
    artSignature = "";
  const anchors = new Map<THREE.Object3D, THREE.Matrix4>();
  const rest = new Map<string, { q: THREE.Quaternion; p: THREE.Vector3 }>();
  wardrobe.bones.forEach((bone, name) =>
    rest.set(name, { q: bone.quaternion.clone(), p: bone.position.clone() }),
  );
  const allFabric = [
    "Fabric_Main",
    "Fabric_Pattern",
    "Fabric_Trim",
    "Fabric_Pants",
    "Fabric_Lining",
  ];

  async function equip(
    slot: string,
    file: string,
    hidden: readonly ("torso" | "legs" | "arms")[],
  ) {
    const url = `${folder}/${file}.glb`;
    if (wardrobe.getItemUrl(slot) === url) return;
    await wardrobe.equipItem(slot, url, {
      hiddenBodyParts: hidden,
      materialNames: allFabric,
      sheen: 0.4,
      roughness: 0.5,
    });
  }

  function updateMaterials(outfit: FittingOutfit) {
    const props = {
      silk: [0.5, 0.42, 0.65],
      gauze: [0.65, 0.22, 0.8],
      brocade: [0.55, 0.32, 0.72],
      satin: [0.38, 0.52, 0.58],
    }[outfit.fabric];
    for (const slot of wardrobe.equippedSlots) {
      for (const m of wardrobe.getPhysicalMaterials(slot)) {
        m.wireframe = false;
        m.flatShading = false;
        m.side = THREE.DoubleSide;
        m.roughness = props[0];
        m.sheen = props[1];
        m.sheenRoughness = props[2];
        m.metalness = 0;
        m.clearcoat = 0;
        m.sheenColor.set(outfit.colors.main);
        const name = m.name.split(".")[0];
        m.color.set(
          name === "Fabric_Pants"
            ? outfit.colors.pants
            : name === "Fabric_Lining"
              ? outfit.colors.lining
              : name === "Fabric_Trim"
                ? outfit.colors.pattern
                : outfit.colors.main,
        );
      }
    }
    const signature = JSON.stringify([
      outfit.pattern,
      outfit.colors.main,
      outfit.colors.pattern,
      outfit.fabric,
    ]);
    if (artSignature !== signature) {
      texture?.dispose();
      texture = garmentTexture(
        outfit.pattern,
        outfit.colors.main,
        outfit.colors.pattern,
        outfit.fabric,
      );
      artSignature = signature;
    }
    const item = wardrobe.getItem("garment");
    item?.traverse((n) => {
      if (!(n as THREE.Mesh).isMesh) return;
      const mesh = n as THREE.Mesh;
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const m of mats)
        if (
          (m as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial &&
          m.name.startsWith("Fabric_Pattern")
        ) {
          const p = m as THREE.MeshPhysicalMaterial;
          p.map = texture;
          p.color.set("#FFFFFF");
          p.needsUpdate = true;
        }
    });
  }

  function setAccessories(outfit: FittingOutfit) {
    const signature = JSON.stringify([
      outfit.accessories,
      outfit.layers.head,
      outfit.layers.accessories,
      outfit.colors,
    ]);
    if (signature === accessorySignature) return;
    anchors.forEach((_, object) => object.removeFromParent());
    anchors.clear();
    decorationModel?.dispose();
    const reference = createFittingModel(
      { ...outfit, pose: "stand" },
      { quality: "game", authoringPose: true },
    );
    reference.root.scale.setScalar(1);
    reference.root.updateMatrixWorld(true);
    const selected: THREE.Object3D[] = [];
    reference.root.traverse((n) => {
      if (n.userData.accessoryAnchor) selected.push(n);
    });
    for (const object of selected) {
      const bone = wardrobe.bones.get(object.userData.accessoryAnchor);
      if (!bone) continue;
      if (
        object.userData.accessoryAnchor === "Hand.L" ||
        object.userData.accessoryAnchor === "Hand.R"
      ) {
        const wrist = bone.getWorldPosition(new THREE.Vector3());
        object.getWorldPosition(new THREE.Vector3());
        const delta =
          object.userData.accessoryAnchor === "Hand.L"
            ? new THREE.Vector3(-0.015, -0.05, 0.055)
            : new THREE.Vector3(0.02, -0.09, 0.04);
        const mat = object.matrixWorld.clone();
        mat.setPosition(wrist.clone().add(delta));
        anchors.set(object, mat);
      } else anchors.set(object, object.matrixWorld.clone());
      root.add(object);
    }
    decorationModel = reference;
    accessorySignature = signature;
  }

  async function sync(outfit: FittingOutfit, mannequin: boolean) {
    if (disposed) return;
    current = outfit;
    study = mannequin;
    if (study) {
      for (const slot of wardrobe.equippedSlots) wardrobe.unequipItem(slot);
      anchors.forEach((_, n) => {
        n.visible = false;
      });
    } else {
      // 1. Mặc Quần Lụa & Sửa Lỗi Quần Lộ Qua Khe Xẻ Tà Áo
      if (outfit.layers.base) {
        await equip("pants", "pants", ["legs"]);
        const pantsItem = wardrobe.getItem("pants");
        pantsItem?.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            mesh.renderOrder = 0;
            const pos = mesh.geometry.attributes.position;
            if (pos && !mesh.userData.pantsAdjusted) {
              mesh.userData.pantsAdjusted = true;
              for (let i = 0; i < pos.count; i++) {
                const y = pos.getY(i);
                // Vùng eo và hông trên: thu gọn vào trong để không bao giờ bị xẻ tà đâm xuyên ra ngoài
                if (y > 0.70) {
                  const factor = Math.max(0.68, 1 - (y - 0.70) * 1.15);
                  pos.setX(i, pos.getX(i) * factor);
                  pos.setZ(i, pos.getZ(i) * 0.82);
                }
              }
              pos.needsUpdate = true;
              mesh.geometry.computeVertexNormals();
            }
          }
        });
      } else {
        wardrobe.unequipItem("pants");
      }

      if (outfit.layers.lining) await equip("lining", "lining", ["torso"]);
      else wardrobe.unequipItem("lining");

      // 2. Mặc Áo Dài Chính & Bật Polygon Offset để Áo Luôn Phủ Lên Quần
      if (outfit.layers.garment) {
        await equip(
          "garment",
          outfit.garmentId,
          outfit.garmentId === "doi_kham" ? ["arms"] : ["torso", "arms"],
        );
        const garmentItem = wardrobe.getItem("garment");
        garmentItem?.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            mesh.renderOrder = 1;
            const mats = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material];
            mats.forEach((m) => {
              m.polygonOffset = true;
              m.polygonOffsetFactor = -2;
              m.polygonOffsetUnits = -2;
              m.depthWrite = true;
            });
          }
        });
      } else {
        wardrobe.unequipItem("garment");
      }

      if (disposed) return;
      updateMaterials(outfit);
      setAccessories(outfit);
      anchors.forEach((_, n) => {
        n.visible = true;
      });
    }
    animate(0, false);
    wardrobe.updateBounds();
  }

  function animate(time: number, moving: boolean) {
    if (disposed) return;
    wardrobe.bones.forEach((bone, name) => {
      const original = rest.get(name)!;
      bone.quaternion.copy(original.q);
      bone.position.copy(original.p);
    });
    const rotate = (name: string, x: number, y: number, z: number) => {
      const b = wardrobe.bones.get(name);
      if (!b) return;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
      b.quaternion.premultiply(q);
    };
    if (!study) {
      // Dáng đứng tự nhiên, cánh tay buông thả mềm mại
      rotate("UpperArm.L", 0, 0, -Math.PI / 4.5 + 0.02);
      rotate("UpperArm.R", 0, 0, Math.PI / 4.5 - 0.02);
      if (current.pose === "fan") {
        rotate("LowerArm.L", -0.72, 0, -0.36);
        rotate("Head", 0, -0.06, 0.04);
      }
      const walk = moving && current.pose === "walk";
      if (walk) {
        const swing = Math.sin(time * 2.6) * 0.055;
        rotate("UpperLeg.L", swing, 0, 0);
        rotate("UpperLeg.R", -swing, 0, 0);
        rotate("UpperArm.L", -swing, 0, 0);
        rotate("UpperArm.R", swing, 0, 0);
      }
      for (const side of ["Front", "Back"])
        for (let i = 1; i <= 4; i++)
          rotate(
            `Flap_${side}_${String(i).padStart(2, "0")}`,
            walk ? Math.sin(time * 2.6 + i * 0.4) * 0.018 : 0,
            0,
            0,
          );
    }
    root.updateMatrixWorld(true);
    wardrobe.avatarSkeleton?.update();
    anchors.forEach((restWorld, object) => {
      const bone = wardrobe.bones.get(object.userData.accessoryAnchor)!;
      const i = wardrobe.avatarSkeleton!.bones.indexOf(bone);
      const deformation = new THREE.Matrix4().multiplyMatrices(
        bone.matrixWorld,
        wardrobe.avatarSkeleton!.boneInverses[i],
      );
      object.matrix.multiplyMatrices(deformation, restWorld);
      object.matrixWorld.copy(object.matrix);
      object.matrixAutoUpdate = false;
    });
  }

  return {
    root,
    sync,
    animate,
    inspect() {
      let skinnedMeshes = 0;
      root.traverse((n) => {
        if ((n as THREE.SkinnedMesh).isSkinnedMesh) skinnedMeshes++;
      });
      return {
        bones: wardrobe.bones.size,
        skinnedMeshes,
        wireframe: false,
      };
    },
    dispose() {
      disposed = true;
      anchors.clear();
      texture?.dispose();
      decorationModel?.dispose();
      wardrobe.dispose();
    },
  };
}
