"""Bind the current sponge character without changing its mesh or materials."""

import hashlib
import json

import bpy


def mesh_fingerprint(obj):
    """Include geometry and materials, excluding the new binding data."""
    content = {
        "vertices": [list(v.co) for v in obj.data.vertices],
        "edges": [list(e.vertices) for e in obj.data.edges],
        "faces": [(list(p.vertices), p.material_index) for p in obj.data.polygons],
        "materials": [s.material.name if s.material else None for s in obj.material_slots],
    }
    return hashlib.sha256(json.dumps(content, sort_keys=True).encode()).hexdigest()


def evaluated_positions(obj):
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    return [evaluated.matrix_world @ v.co for v in evaluated.data.vertices]


def smooth(value, low, high):
    amount = max(0.0, min(1.0, (value - low) / (high - low)))
    return amount * amount * (3 - 2 * amount)


def blend(first, second, amount):
    return {first: 1 - amount, second: amount}


def body_weights(position):
    """Blend the torso vertically; restrict leg influences to hip/leg regions."""
    x = position.x - center_x
    z = position.z
    if z < -3.1 and 0.25 < abs(x) < 1.65:
        side = "L" if x > 0 else "R"
        knee = 1 - smooth(z, -4.5, -3.9)
        ankle = 1 - smooth(z, -5.5, -5.05)
        leg = {
            f"Thigh_{side}": (1 - knee) * (1 - ankle),
            f"Shin_{side}": knee * (1 - ankle),
            f"Foot_{side}": ankle,
        }
        hip = 1 - smooth(z, -3.6, -3.1)
        return {"Pelvis": 1 - hip, **{name: weight * hip for name, weight in leg.items()}}
    if z < -1.7:
        return blend("Pelvis", "Body", smooth(z, -2.8, -1.7))
    return blend("Body", "Chest", smooth(z, -1.4, -0.6))


def arm_weights(position):
    """Anchor sleeve roots to the chest and isolate left/right arm chains."""
    x = position.x - center_x
    side = "L" if x > 0 else "R"
    distance = abs(x)
    shoulder = smooth(distance, 3.4, 4.15)
    elbow = smooth(distance, 4.95, 5.65)
    wrist = smooth(distance, 6.95, 7.45)
    return {
        "Chest": 1 - shoulder,
        f"UpperArm_{side}": shoulder * (1 - elbow),
        f"Forearm_{side}": shoulder * elbow * (1 - wrist),
        f"Hand_{side}": shoulder * elbow * wrist,
    }


def bind_mesh(obj, weights):
    existing = [m for m in obj.modifiers if m.type == "ARMATURE"]
    if len(existing) > 1:
        raise RuntimeError(f"Duplicate Armature modifiers on {obj.name}")
    modifier = existing[0] if existing else obj.modifiers.new("Character skin", "ARMATURE")
    modifier.object = rig
    modifier.use_vertex_groups = True
    modifier.use_bone_envelopes = False
    modifier.use_deform_preserve_volume = True
    # Deform the control mesh before subdivision, preserving the existing stack.
    index = list(obj.modifiers).index(modifier)
    obj.modifiers.move(index, 0)
    groups = {}
    for vertex in obj.data.vertices:
        values = {name: weight for name, weight in weights(obj.matrix_world @ vertex.co).items() if weight > 1e-8}
        total = sum(values.values())
        if total <= 0:
            raise RuntimeError(f"Unweighted vertex in {obj.name}")
        for name, weight in values.items():
            if name not in groups:
                groups[name] = obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name)
            groups[name].add([vertex.index], weight / total, "REPLACE")
    world = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = "OBJECT"
    obj.matrix_world = world


def attach_rigid(obj, bone_name):
    world = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    bpy.context.view_layer.update()
    obj.matrix_world = world
    bpy.context.view_layer.update()


def anchor_shirt_colors():
    """Keep the existing procedural split attached to the deforming fabric."""
    attribute_name = "basel_shirt_rest_x"
    shirt_names = {"Shirt Left Red", "Shirt Right Blue"}
    for obj in meshes:
        if not any(s.material and s.material.name in shirt_names for s in obj.material_slots):
            continue
        attribute = obj.data.attributes.get(attribute_name)
        if attribute is None:
            attribute = obj.data.attributes.new(attribute_name, "FLOAT", "POINT")
        for vertex in obj.data.vertices:
            attribute.data[vertex.index].value = (obj.matrix_world @ vertex.co).x - center_x
    for name in shirt_names:
        material = bpy.data.materials[name]
        compare = next(node for node in material.node_tree.nodes if node.type == "MATH" and node.operation == "GREATER_THAN")
        attribute = material.node_tree.nodes.new("ShaderNodeAttribute")
        attribute.attribute_name = attribute_name
        attribute.label = "Original fabric X; follows skin deformation"
        material.node_tree.links.new(attribute.outputs["Fac"], compare.inputs[0])


scene = bpy.context.scene
rigs = [obj for obj in scene.objects if obj.type == "ARMATURE"]
if len(rigs) != 1:
    raise RuntimeError("Expected exactly one existing armature")
rig = rigs[0]
required = {"Pelvis", "Body", "Chest", "Eye_L", "Eye_R"}
required.update(f"{part}_{side}" for side in ("L", "R") for part in ("UpperArm", "Forearm", "Hand", "Thigh", "Shin", "Foot"))
if not required.issubset({b.name for b in rig.data.bones if b.use_deform}):
    raise RuntimeError("Expected existing deform bones not found")
if bpy.context.mode != "OBJECT":
    raise RuntimeError("Switch to Object Mode before binding")
if any(abs(p.matrix_basis[i][j] - (1 if i == j else 0)) > 1e-7 for p in rig.pose.bones for i in range(4) for j in range(4)):
    raise RuntimeError("Rig must be neutral before binding")
meshes = [obj for obj in scene.objects if obj.type == "MESH"]
if any(obj.vertex_groups or obj.parent or any(m.type == "ARMATURE" for m in obj.modifiers) for obj in meshes):
    raise RuntimeError("Existing binding found; inspect before replacing any weights")
before = {obj.name: mesh_fingerprint(obj) for obj in meshes}
rest_positions = {obj.name: evaluated_positions(obj) for obj in meshes}
center_x = scene.objects["Body Cube"].matrix_world.translation.x

bind_mesh(scene.objects["Body Cube"], body_weights)
bind_mesh(scene.objects["Cube"], arm_weights)
# Two eyes share one object: unit weights preserve each eye's rigid shape.
bind_mesh(scene.objects["Sphere"], lambda p: {"Eye_L" if p.x > center_x else "Eye_R": 1.0})
attachments = {
    "Shoe cube": "Foot_L",
    "Shoe cube.001": "Foot_R",
    "Cube.005": "Chest",
    "Sphere.001": "Chest",
    "Cube.001": "Chest",
    "Cube.002": "Chest",
    "Tie Cube": "Body",
}
for name, bone in attachments.items():
    attach_rigid(scene.objects[name], bone)
anchor_shirt_colors()
bpy.context.view_layer.update()
movement = {}
for obj in meshes:
    assert mesh_fingerprint(obj) == before[obj.name], f"Geometry/material changed: {obj.name}"
    points = evaluated_positions(obj)
    previous = rest_positions[obj.name]
    assert len(points) == len(previous)
    movement[obj.name] = max((a - b).length for a, b in zip(points, previous))
    if movement[obj.name] > 0.0002:
        raise RuntimeError(f"Rest shape changed on {obj.name}: {movement[obj.name]}")
report = {"rig": rig.name, "deforming": ["Body Cube", "Cube"], "rigid_eye_weights": "Sphere", "bone_parented": attachments, "max_rest_movement": movement, "geometry_material_fingerprints": before}
print(json.dumps(report, indent=2))
