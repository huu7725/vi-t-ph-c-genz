"""Blender 4.x: select the avatar armature, then run from the Text Editor.

Positions are specified in world metres; Blender world Z is up and -Y is
the default front. Bone roll/weight painting and cloth tuning remain authoring steps.
Running twice preserves existing helper chains; partial/conflicting chains are rejected.
"""
import bpy
from mathutils import Vector

COLLECTION_NAME = "AoDai_Flap_Helpers"
FRONT_WORLD = Vector((0.0, -1.0, 0.0))
FRONT_OFFSET_METRES = 0.085
BACK_OFFSET_METRES = 0.085
ANKLE_HEIGHT_METRES = 0.075  # Used only when no deform foot/ankle bone is found.
SEGMENTS = 4


def selected_armature(context):
    active = context.view_layer.objects.active
    if active and active.type == "ARMATURE" and active.select_get():
        return active
    selected = [obj for obj in context.selected_objects if obj.type == "ARMATURE"]
    if len(selected) != 1:
        raise RuntimeError("Chọn đúng một Armature hoặc đặt Armature làm đối tượng active.")
    return selected[0]


def named_hips(armature):
    matches = [bone for bone in armature.data.bones
               if bone.name.split(":")[-1].casefold() in {"hips", "pelvis"}]
    if len(matches) != 1:
        raise RuntimeError("Rig cần có đúng một bone Hips hoặc Pelvis (hỗ trợ prefix mixamorig:).")
    return matches[0]


def ankle_world_z(armature, metres_per_unit):
    names = {"leftfoot", "rightfoot", "foot.l", "foot.r", "foot_left", "foot_right",
             "ankle.l", "ankle.r", "leftankle", "rightankle"}
    feet = [b for b in armature.data.bones
            if b.use_deform and b.name.split(":")[-1].casefold() in names]
    if feet:
        return sum((armature.matrix_world @ b.head_local).z for b in feet) / len(feet)
    return ANKLE_HEIGHT_METRES / metres_per_unit


def ensure_flap_helpers(context=None):
    context = context or bpy.context
    if bpy.app.version < (4, 0, 0):
        raise RuntimeError("Script dùng Bone Collections của Blender 4.x.")
    armature = selected_armature(context)
    previous_active = context.view_layer.objects.active
    previous_mode = armature.mode
    names = [f"Flap_{side}_{index:02d}" for side in ("Front", "Back")
             for index in range(1, SEGMENTS + 1)]
    unit = context.scene.unit_settings.scale_length or 1.0
    if unit <= 0 or FRONT_WORLD.length < 1e-6:
        raise RuntimeError("Scene unit scale hoặc hướng trước không hợp lệ.")
    if abs(armature.matrix_world.determinant()) < 1e-8:
        raise RuntimeError("Armature có transform không khả nghịch (scale bằng 0).")
    forward = FRONT_WORLD.normalized()
    if abs(forward.z) > 1e-5:
        raise RuntimeError("FRONT_WORLD phải nằm trên mặt phẳng XY để chuỗi kéo thẳng theo Z âm.")
    # Leave Edit Mode before reading the definitive data-bone rest transforms.
    context.view_layer.objects.active = armature
    if armature.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    created = []
    try:
        hips = named_hips(armature)
        hips_name = hips.name
        origin = armature.matrix_world @ hips.head_local
        ankle_z = ankle_world_z(armature, unit)
        if origin.z <= ankle_z + 0.20 / unit:
            raise RuntimeError("Hips phải cao hơn mắt cá ít nhất 20 cm; kiểm tra trục và unit scale.")
        existing = [name for name in names if name in armature.data.bones]
        if existing and len(existing) != len(names):
            raise RuntimeError("Đã có một phần tên helper; đổi tên hoặc kiểm tra rig trước khi chạy lại.")
        if existing:
            for side in ("Front", "Back"):
                parent = hips_name
                for index in range(1, SEGMENTS + 1):
                    bone = armature.data.bones[f"Flap_{side}_{index:02d}"]
                    if not bone.parent or bone.parent.name != parent:
                        raise RuntimeError(f"Chuỗi {side} đã có hierarchy khác; giữ nguyên rig hiện tại.")
                    parent = bone.name
            return {"status": "exists", "armature": armature.name, "bones": names}
        world_to_local = armature.matrix_world.inverted()
        step = (origin.z - ankle_z) / SEGMENTS
        bpy.ops.object.mode_set(mode="EDIT")
        parent_hips = armature.data.edit_bones[hips_name]
        for side, sign, offset in (("Front", 1, FRONT_OFFSET_METRES),
                                   ("Back", -1, BACK_OFFSET_METRES)):
            start = origin + forward * (sign * offset / unit)
            parent = parent_hips
            for index in range(1, SEGMENTS + 1):
                name = f"Flap_{side}_{index:02d}"
                bone = armature.data.edit_bones.new(name)
                created.append(name)
                bone.head = world_to_local @ (start + Vector((0, 0, -step * (index - 1))))
                bone.tail = world_to_local @ (start + Vector((0, 0, -step * index)))
                bone.parent = parent
                bone.use_connect = index > 1
                bone.use_deform = True
                bone.roll = 0.0
                parent = bone
        bpy.ops.object.mode_set(mode="OBJECT")
        collection = armature.data.collections.get(COLLECTION_NAME)
        if collection is None:
            collection = armature.data.collections.new(COLLECTION_NAME)
            collection.is_visible = True
        for name in created:
            bone = armature.data.bones[name]
            # Assigning after leaving Edit Mode works throughout Blender 4.x.
            collection.assign(bone)
            bone["ao_dai_helper"] = True
        armature["ao_dai_flap_schema"] = "front-back-4/world-z/v1"
        return {"status": "created", "armature": armature.name, "bones": names}
    except Exception:
        # Roll back only the bones created by this invocation; existing rig is preserved.
        if created:
            if armature.mode != "EDIT":
                bpy.ops.object.mode_set(mode="EDIT")
            for name in reversed(created):
                bone = armature.data.edit_bones.get(name)
                if bone:
                    armature.data.edit_bones.remove(bone)
        raise
    finally:
        if armature.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        if previous_mode in {"EDIT", "POSE"}:
            bpy.ops.object.mode_set(mode=previous_mode)
        context.view_layer.objects.active = previous_active


if __name__ == "__main__":
    result = ensure_flap_helpers()
    print("[Ao Dai helpers]", result)
