# Pipeline GLB cho nhân vật nữ và modular outfit

Phòng 3D hiện có hai lớp chạy song song:

- `engine/model.ts` dựng hình minh họa bằng Three.js để demo luôn chạy khi chưa có asset.
- `engine/modular/ModularWardrobe.ts` nhận `base_avatar.glb` và các outfit GLB đã được rig theo cùng skeleton. Đây là pipeline dành cho asset sản xuất, tách khỏi fallback procedural.

## Tài liệu tham khảo thị giác

- [Vietnamese Ao Dai Woman – LittleShirt263](https://sketchfab.com/3d-models/vietnamese-ao-dai-woman-3d-model-9d75210513b944f8961a4d0a7a20731a)
- [DongPhuc_Nam_PA1 – C1_DDT](https://sketchfab.com/3d-models/dongphuc-nam-pa1-63a34621c0cc4a9aa2ff0c0aa9ba6cf6)

Các trang trên chỉ được dùng để tham khảo dáng. Dự án không tải, nhúng hoặc sao chép mesh/texture của các tác giả; asset đưa vào pipeline phải có quyền sử dụng riêng.

## Quy cách asset sản xuất

### Base avatar

- Đơn vị là mét, trục Z hướng lên, mặc định quay về -Y.
- Chiều cao nữ mục tiêu 1,66 m; nam 1,78 m. Nhân vật nữ có khoảng 7,5–8 đầu và A-pose với hai cánh tay mở 45°.
- Game-ready: 30k–50k triangles cho toàn avatar; cinematic: khoảng 100k triangles. Dùng game-ready cho mobile và bản portfolio khi cần cận mặt.
- Armature phải có một skeleton canonical. Tên xương dùng prefix tùy chọn nhưng phần cuối phải ổn định: `Hips`, `Spine`, `Head`, `UpperArm.L/R`, `LowerArm.L/R`, `Hand.L/R`, `UpperLeg.L/R`, `LowerLeg.L/R`, `Foot.L/R`.
- Body chia mesh hoặc `Object3D.userData.bodyPart` thành đúng các vùng `head`, `torso`, `legs`, `arms`, `hands`, `feet`.
- Rest pose, bone hierarchy và inverse bind phải giống nhau giữa avatar và mọi item. Đặt apply scale/rotation trước khi export và không đổi thứ tự bone sau khi skin.

### Áo dài và quần

- Áo chính, quần lụa, áo lót, khăn và phụ kiện là các slot độc lập. Áo có thân trước/sau, raglan, cổ, tay và hai tà; đường xẻ ở ngang eo cao. Quần là mesh riêng, ống rộng dài chấm gót.
- Giữ edge loops dày hơn tại cổ, nách, eo, đường xẻ và gốc tà. Đường may raglan cần vòng chuyển tiếp đủ để gập vai mà không kéo nhọn.
- Che phần body bị áo/quần bao phủ bằng `hiddenBodyParts`; không xóa body khỏi GLB để có thể bật lại khi tháo đồ.
- Không gộp áo và quần vào một mesh nếu chúng có slot, màu hoặc material khác nhau. Có thể gộp các mảnh cùng material sau khi kiểm tra UV để giảm draw calls.

### Vải lụa và PBR

Preset gợi ý cho áo xanh: base color `#1C3F73`–`#2E5B88`, roughness `0.45`–`0.55`, metalness `0`, sheen `0.35`–`0.60`. Quần dùng `#F5F5F0`, roughness khoảng `0.65`–`0.80` và sheen thấp hơn. Khuy bên phải có thể nằm trong normal/height map; chi tiết cứng như cúc nổi nên là geometry instanced nếu cần bắt sáng.

`ModularWardrobe` cập nhật `MeshPhysicalMaterial.color`, `.sheen` và `.roughness` tại runtime, không tải lại GLB. Normal/height/roughness map phải được đóng gói trong GLB hoặc URL asset do đội triển khai quản lý.

## Sử dụng module

```ts
import { ModularWardrobe } from "./engine/modular";

const wardrobe = new ModularWardrobe();
await wardrobe.loadBaseAvatar("/assets/base_avatar.glb");
await wardrobe.equipItem("garment", "/assets/ao-dai-xanh.glb", {
  hiddenBodyParts: ["torso", "legs"],
  color: "#1C3F73",
  sheen: 0.52,
  roughness: 0.5,
});
await wardrobe.equipItem("pants", "/assets/quan-lua.glb", {
  hiddenBodyParts: ["legs"],
  color: "#F5F5F0",
  sheen: 0.25,
});

wardrobe.updateMaterialColor("garment", "#2E5B88");
wardrobe.updateSheen("garment", 0.6);
wardrobe.unequipItem("garment");
wardrobe.dispose();
```

`loadBaseAvatar()` từ chối avatar thiếu SkinnedMesh, thiếu body region hoặc bone trùng tên. `equipItem()` kiểm tra skin index/weight, bone name, parent chain và inverse bind trước khi commit; load cũ đến muộn sẽ bị bỏ qua. Khi tháo item, geometry, material, texture và skeleton riêng của item được dispose. Skeleton avatar được giữ lại.

Item cứng như trâm hoặc túi dùng `attachmentBone: "Hand.R"` và được author trong local space của bone. Item skinned không dùng thêm `attachmentBone`: module chuyển toàn bộ `SkinnedMesh` sang skeleton canonical bằng `bind(avatarSkeleton, child.bindMatrix)` sau khi xác nhận rest pose.

## Camera và tư thế

`FittingViewport` có các preset toàn thân, cận cổ/khăn và cận tà. Khi thay asset GLB, gọi `wardrobe.updateBounds()` sau khi đổi pose/animation để cập nhật bounding sphere và giữ camera không cắt tà. Với asset sản xuất, animation mixer nên chạy từ rest A-pose sang pose đứng, cầm quạt và bước nhẹ; cloth simulation có thể thêm sau khi skinning ổn định.

Khi cần kiểm tra topology ngay trong trình duyệt, bật preset authoring:

```tsx
<FittingViewport outfit={outfit} authoringPose quality="game" onPartSelect={selectPart} />
```

`authoringPose` mở hai tay khoảng 45°; `quality="game"` giảm số vòng hình học, còn `quality="portfolio"` giữ mesh chi tiết hơn cho cận cảnh.

## Blender helper bones cho tà áo

Mở [tools/blender/ao_dai_helper_bones.py](../tools/blender/ao_dai_helper_bones.py) trong Blender 4.x, chọn Armature rồi Run Script. Script tạo Bone Collection `AoDai_Flap_Helpers` và hai chuỗi:

```text
Hips
├── Flap_Front_01 (not connected)
│   └── Flap_Front_02 → Flap_Front_04
└── Flap_Back_01 (not connected)
    └── Flap_Back_02 → Flap_Back_04
```

Các bone kéo theo trục Z âm từ mặt trước/sau hông tới cao độ mắt cá, có custom property `ao_dai_helper`. Script kiểm tra Armature, unit scale, Hips/Pelvis, chiều cao hông và rollback bone vừa tạo nếu gặp lỗi. Sau khi chạy, animator vẫn cần weight tà áo, đặt bone roll và thêm Dynamic Bone/cloth constraint theo asset cụ thể.

## Xác nhận pipeline

```powershell
npx tsx --test frontend/src/features/fitting3d/engine/modular/ModularWardrobe.test.ts
npx tsx --test frontend/src/features/fitting3d/engine/anatomy.test.ts
.tools/blender-runtime/Scripts/python.exe -c "import bpy; print(bpy.app.version_string)"
```

Mẫu test tạo skeleton nhỏ trong bộ nhớ để kiểm tra bind, clipping aggregate, material PBR, dispose và stale-load. Nó không thay thế QA asset GLB đã được duyệt trên Blender/Marvelous.
