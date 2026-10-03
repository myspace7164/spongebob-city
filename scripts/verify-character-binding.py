"""Temporarily pose the bound character, inspect it, and restore all poses."""

import json
import math
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


scene = bpy.context.scene
rig = scene.objects["Character Rig"]
if rig.data.pose_position != "POSE":
    raise RuntimeError("Use Pose Position so the tests evaluate actual deformation")
meshes = [obj for obj in scene.objects if obj.type == "MESH"]
output = Path(__file__).resolve().parents[1] / ".hack/rig-tests"
output.mkdir(parents=True, exist_ok=True)
previous = {p.name: (p.rotation_mode, p.matrix_basis.copy()) for p in rig.pose.bones}
actions = len(bpy.data.actions)


def audit_weights():
    audit = []
    center = scene.objects["Body Cube"].matrix_world.translation.x
    deform_names = {b.name for b in rig.data.bones if b.use_deform}
    for name in ("Body Cube", "Cube", "Sphere"):
        obj = scene.objects[name]
        modifiers = [m for m in obj.modifiers if m.type == "ARMATURE"]
        assert len(modifiers) == 1 and modifiers[0].object == rig
        counts = {group.name: 0 for group in obj.vertex_groups}
        for vertex in obj.data.vertices:
            weights = [(obj.vertex_groups[g.group].name, g.weight) for g in vertex.groups if g.weight > 1e-8]
            assert weights and abs(sum(w for _, w in weights) - 1) < 1e-5
            x = (obj.matrix_world @ vertex.co).x - center
            for bone, weight in weights:
                assert bone in deform_names and 0 < weight <= 1
                assert not (bone.endswith("_L") and x < -0.05)
                assert not (bone.endswith("_R") and x > 0.05)
                counts[bone] += 1
            if name == "Body Cube":
                assert not any(b.startswith(("UpperArm", "Forearm", "Hand")) for b, _ in weights)
            if name == "Cube":
                assert not any(b.startswith(("Thigh", "Shin", "Foot")) for b, _ in weights)
        assert all(counts.values())
        audit.append({"object": name, "vertices": len(obj.data.vertices), "groups": counts, "unweighted": 0, "wrong_side": 0})
    return audit


def reset():
    for p in rig.pose.bones:
        mode, matrix = previous[p.name]
        p.rotation_mode = mode
        p.matrix_basis = matrix
    bpy.context.view_layer.update()


def rotate(name, axis, degrees):
    p = rig.pose.bones[name]
    local_axis = p.bone.matrix_local.to_3x3().inverted() @ Vector(axis)
    p.rotation_mode = "QUATERNION"
    p.rotation_quaternion = Quaternion(local_axis.normalized(), math.radians(degrees))


def positions(obj):
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    return [evaluated.matrix_world @ v.co for v in evaluated.data.vertices]


rest = {obj.name: positions(obj) for obj in meshes}
weight_audit = audit_weights()
cases = [
    ("left-arm-raised", [("UpperArm_L", (0, 1, 0), -60)]),
    ("left-elbow-bent", [("UpperArm_L", (0, 1, 0), -60), ("Forearm_L", (0, 0, 1), -70)]),
    ("right-arm-raised", [("UpperArm_R", (0, 1, 0), 60)]),
    ("right-elbow-bent", [("UpperArm_R", (0, 1, 0), 60), ("Forearm_R", (0, 0, 1), 70)]),
    ("left-leg-bent", [("Thigh_L", (1, 0, 0), -20), ("Shin_L", (1, 0, 0), 25)]),
    ("right-leg-bent", [("Thigh_R", (1, 0, 0), -20), ("Shin_R", (1, 0, 0), 25)]),
    ("both-knees-bent", [("Shin_L", (1, 0, 0), 25), ("Shin_R", (1, 0, 0), 25)]),
    ("torso-bent", [("Body", (0, 1, 0), 12), ("Chest", (0, 0, 1), 8)]),
    ("eyes-turned", [("Eye_L", (0, 0, 1), 15), ("Eye_R", (0, 0, 1), 15)]),
]
reports = []
try:
    for case, transforms in cases:
        reset()
        for name, axis, degrees in transforms:
            rotate(name, axis, degrees)
        bpy.context.view_layer.update()
        displacements = {}
        for obj in meshes:
            points = positions(obj)
            if len(points) != len(rest[obj.name]):
                raise RuntimeError("Evaluated vertex count changed")
            if any(not math.isfinite(c) for point in points for c in point):
                raise RuntimeError(f"Non-finite positions in {obj.name}")
            distances = [(a - b).length for a, b in zip(points, rest[obj.name])]
            if max(distances) > 30:
                raise RuntimeError(f"Extreme displacement in {obj.name}")
            displacements[obj.name] = round(max(distances), 6)
        if "arm" in case or "elbow" in case:
            assert displacements["Cube"] > 0.1
            assert displacements["Body Cube"] < 0.0001
        if "leg" in case or "knees" in case:
            assert displacements["Body Cube"] > 0.1
            if case == "left-leg-bent":
                assert displacements["Shoe cube"] > 0.1
                assert displacements["Shoe cube.001"] < 0.0001
            if case == "right-leg-bent":
                assert displacements["Shoe cube.001"] > 0.1
                assert displacements["Shoe cube"] < 0.0001
        if case == "torso-bent":
            assert all(displacements[name] > 0.1 for name in ("Body Cube", "Cube", "Sphere", "Cube.005", "Sphere.001", "Tie Cube"))
        if case == "eyes-turned":
            assert displacements["Sphere"] > 0.1
        # Capture each pose without creating an Action or keyframe.
        bpy.ops.wm.redraw_timer(type="DRAW_WIN_SWAP", iterations=1)
        areas = [a for a in bpy.context.screen.areas if a.type == "VIEW_3D"]
        if areas:
            with bpy.context.temp_override(area=areas[0]):
                bpy.ops.screen.screenshot_area(filepath=str(output / (case + ".png")))
        reports.append({"test": case, "max_displacements": displacements})
finally:
    reset()

assert len(bpy.data.actions) == actions == 0
assert all(abs(p.matrix_basis[i][j] - previous[p.name][1][i][j]) < 1e-6 for p in rig.pose.bones for i in range(4) for j in range(4))
result = {"weights": weight_audit, "tests": reports, "restored_pose": True, "actions": len(bpy.data.actions)}
(output / "report.json").write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
