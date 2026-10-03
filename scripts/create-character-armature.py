"""Run inside Blender to add the approved unbound character skeleton."""

import bpy


scene = bpy.context.scene
if bpy.context.mode != "OBJECT":
    raise RuntimeError("Switch to Object Mode before creating the armature")
if any(obj.type == "ARMATURE" for obj in scene.objects):
    raise RuntimeError("An armature already exists; inspect it before creating another")
body = scene.objects.get("Body Cube")
if body is None:
    raise RuntimeError("Expected Body Cube not found")

# Coordinates match the current Z-up character, facing -Y.
# Anatomical left is +X; arm chains start at the sleeve openings.
center_x = body.matrix_world.translation.x
center_y = body.matrix_world.translation.y


def point(x, y, z):
    return (center_x + x, center_y + y, z)


bones = [
    ("Root", point(0, 0, -6.055), point(0, 0, -5.355), None, False),
    ("Pelvis", point(0, 0, -3.0), point(0, 0, -2.1), "Root", False),
    ("Body", point(0, 0, -2.1), point(0, 0, 0.3), "Pelvis", True),
    ("Chest", point(0, 0, 0.3), point(0, 0, 3.0), "Body", True),
]
for suffix, sign in (("L", 1), ("R", -1)):
    bones.extend([
        (f"UpperArm_{suffix}", point(sign * 3.4, 0, -0.3), point(sign * 5.3, 0, -0.3), "Chest", False),
        (f"Forearm_{suffix}", point(sign * 5.3, 0, -0.3), point(sign * 7.2, 0, -0.3), f"UpperArm_{suffix}", True),
        (f"Hand_{suffix}", point(sign * 7.2, 0, -0.3), point(sign * 8.0, 0, -0.3), f"Forearm_{suffix}", True),
        (f"Thigh_{suffix}", point(sign * 0.98, 0, -3.0), point(sign * 0.98, 0, -4.2), "Pelvis", False),
        (f"Shin_{suffix}", point(sign * 0.98, 0, -4.2), point(sign * 0.98, 0, -5.25), f"Thigh_{suffix}", True),
        (f"Foot_{suffix}", point(sign * 0.98, 0, -5.25), point(sign * 0.98, -1.35, -5.7), f"Shin_{suffix}", True),
    ])
bones.extend([
    ("Eye_L", (1.426, 4.055, 2.950), (1.426, 3.055, 2.950), "Chest", False),
    ("Eye_R", (-1.402, 4.055, 2.950), (-1.402, 3.055, 2.950), "Chest", False),
    ("Jaw", point(0, -0.6, 0.9), point(0, -1.45, 0.25), "Chest", False),
])

armature = bpy.data.armatures.new("Character Armature")
rig = bpy.data.objects.new("Character Rig", armature)
scene.collection.objects.link(rig)
rig.show_in_front = True
armature.display_type = "OCTAHEDRAL"
for obj in bpy.context.selected_objects:
    obj.select_set(False)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
try:
    for name, head, tail, parent, connected in bones:
        bone = armature.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        bone.use_deform = name != "Root"
        if parent:
            bone.parent = armature.edit_bones[parent]
            bone.use_connect = connected
finally:
    bpy.ops.object.mode_set(mode="OBJECT")

assert len(armature.bones) == 19
print({"armature": rig.name, "bones": [bone.name for bone in armature.bones], "bound": False})
