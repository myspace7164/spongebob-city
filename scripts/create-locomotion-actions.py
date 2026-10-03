"""Create and verify relaxed Idle and in-place Walk actions in the open Blender rig."""
import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

root = Path(__file__).resolve().parents[1]
scene = bpy.context.scene
rig = scene.objects['Character Rig']
shape_objects = [o for o in scene.objects if o.type == 'MESH' and o.data.shape_keys]
expected_keys = {'Basis', 'Dry', 'WaterFull'}
assert bpy.context.mode == 'OBJECT'
assert [o.name for o in scene.objects if o.type == 'ARMATURE'] == ['Character Rig']
assert len(bpy.data.actions) == 0
assert len(shape_objects) == 8
assert all(expected_keys <= set(o.data.shape_keys.key_blocks.keys()) for o in shape_objects)
assert all(o.data.shape_keys.key_blocks['Dry'].value == 0 and
           o.data.shape_keys.key_blocks['WaterFull'].value == 0 for o in shape_objects)
backup = root/'.hack/backups/before-locomotion.blend'
backup.parent.mkdir(parents=True, exist_ok=True)
if not backup.exists():
    bpy.ops.wm.save_as_mainfile(filepath=str(backup), copy=True)
output = root/'.hack/locomotion-tests'
output.mkdir(parents=True, exist_ok=True)
meshes = [o for o in scene.objects if o.type == 'MESH']
area = next(a for a in bpy.context.screen.areas if a.type == 'VIEW_3D')
region = next(r for r in area.regions if r.type == 'WINDOW')
space = area.spaces.active
old_overlays = space.overlay.show_overlays


def identity_pose():
    for p in rig.pose.bones:
        p.rotation_mode = 'QUATERNION'
        p.matrix_basis = Matrix.Identity(4)


def local_axis(bone_name, world_axis):
    p = rig.pose.bones[bone_name]
    return (p.bone.matrix_local.to_3x3().inverted() @ Vector(world_axis)).normalized()


def q_world(bone_name, axis, degrees):
    return Quaternion(local_axis(bone_name, axis), math.radians(degrees))


def set_arm(name, down, swing=0.0, elbow=0.0):
    p = rig.pose.bones[name]
    p.rotation_quaternion = q_world(name, (1, 0, 0), swing) @ q_world(name, (0, 1, 0), down)
    side = 'L' if name.endswith('_L') else 'R'
    rig.pose.bones['Forearm_' + side].rotation_quaternion = q_world('Forearm_' + side, (0, 1, 0), elbow)


def relaxed():
    identity_pose()
    set_arm('UpperArm_L', 72, elbow=-12)
    set_arm('UpperArm_R', -72, elbow=12)
    for side in ('L', 'R'):
        rig.pose.bones['Shin_' + side].rotation_quaternion = q_world('Shin_' + side, (1, 0, 0), 1.5)
        rig.pose.bones['Foot_' + side].rotation_quaternion = q_world('Foot_' + side, (1, 0, 0), -1.5)


def set_world_position(pose_bone, target, rotation_matrix=None):
    matrix = pose_bone.matrix.copy()
    if rotation_matrix is not None:
        matrix.translation = target
        for row in range(3):
            for column in range(3):
                matrix[row][column] = rotation_matrix[row][column]
    else:
        matrix.translation = target
    pose_bone.matrix = matrix


def walk_pose(frame, neutral_foot_matrices):
    identity_pose()
    stride = {
        1: (-18, 18, 3, 12, -0.34, 0.34, 0.0, 0.0),
        8: (-2, 2, 17, 3, -0.08, 0.08, 0.10, 0.02),
        16: (18, -18, 12, 3, 0.34, -0.34, 0.0, 0.0),
        23: (2, -2, 3, 17, 0.08, -0.08, 0.02, 0.10),
        30: (-18, 18, 3, 12, -0.34, 0.34, 0.0, 0.0),
    }[frame]
    thigh_l, thigh_r, knee_l, knee_r, foot_l_y, foot_r_y, foot_l_z, foot_r_z = stride
    rig.pose.bones['Thigh_L'].rotation_quaternion = q_world('Thigh_L', (1, 0, 0), thigh_l)
    rig.pose.bones['Thigh_R'].rotation_quaternion = q_world('Thigh_R', (1, 0, 0), thigh_r)
    rig.pose.bones['Shin_L'].rotation_quaternion = q_world('Shin_L', (1, 0, 0), knee_l)
    rig.pose.bones['Shin_R'].rotation_quaternion = q_world('Shin_R', (1, 0, 0), knee_r)
    set_arm('UpperArm_L', 72, swing=13 if thigh_l < 0 else -13, elbow=-14)
    set_arm('UpperArm_R', -72, swing=-13 if thigh_r < 0 else 13, elbow=14)
    rig.pose.bones['Body'].rotation_quaternion = q_world('Body', (0, 0, 1), 2 if thigh_l < 0 else -2)
    rig.pose.bones['Chest'].rotation_quaternion = q_world('Chest', (0, 0, 1), -2 if thigh_l < 0 else 2)
    rig.pose.bones['Body'].location.y = 0.025 if frame in (8, 23) else 0.0
    bpy.context.view_layer.update()
    for side, y, z in (('L', foot_l_y, foot_l_z), ('R', foot_r_y, foot_r_z)):
        p = rig.pose.bones['Foot_' + side]
        head = p.bone.head_local
        target = Vector((head.x, head.y + y, head.z + z))
        set_world_position(p, target, neutral_foot_matrices[side].to_3x3())
    bpy.context.view_layer.update()


def idle_pose(frame):
    relaxed()
    breathe = {1: 0.0, 16: 0.018, 30: 0.0, 45: 0.018, 60: 0.0}[frame]
    sway = {1: 0.0, 16: 0.8, 30: 0.0, 45: -0.8, 60: 0.0}[frame]
    rig.pose.bones['Body'].location.y = breathe
    rig.pose.bones['Body'].rotation_quaternion = q_world('Body', (1, 0, 0), sway * 0.5)
    rig.pose.bones['Chest'].rotation_quaternion = q_world('Chest', (1, 0, 0), sway)
    delta = {1: 0.0, 16: -1.5, 30: 0.0, 45: 1.5, 60: 0.0}[frame]
    set_arm('UpperArm_L', 72 + delta, elbow=-12 - delta * 0.25)
    set_arm('UpperArm_R', -72 - delta, elbow=12 + delta * 0.25)


def make_action(name, frames, pose_builder, cycle_frame):
    action = bpy.data.actions.new(name)
    action['looping'] = True
    action['fps'] = 30
    action['cycle_end'] = cycle_frame
    slot = action.slots.new('OBJECT', rig.name)
    rig.animation_data_create()
    rig.animation_data.action = action
    rig.animation_data.action_slot = slot
    for frame in frames:
        scene.frame_set(frame)
        pose_builder(frame)
        bpy.context.view_layer.update()
        for p in rig.pose.bones:
            p.keyframe_insert(data_path='location', frame=frame, group=p.name)
            p.keyframe_insert(data_path='rotation_quaternion', frame=frame, group=p.name)
    layer = action.layers[0]
    strip = layer.strips[0]
    bag = strip.channelbag(slot)
    for curve in bag.fcurves:
        for point in curve.keyframe_points:
            point.interpolation = 'BEZIER' if name == 'Idle' else 'BEZIER'
        cycle = curve.modifiers.new(type='CYCLES')
        cycle.mode_before = 'REPEAT'
        cycle.mode_after = 'REPEAT'
        cycle.cycles_before = 0
        cycle.cycles_after = 0
    return action, slot, bag


# The arms-down pose stays a pose-space setup; the Blender rest bones are untouched.
relaxed()
bpy.context.view_layer.update()
neutral_foot_matrices = {s: rig.pose.bones['Foot_' + s].matrix.copy() for s in ('L', 'R')}
scene.render.fps = 30
scene.render.fps_base = 1.0
scene.frame_start = 1
scene.frame_end = 60
idle, idle_slot, idle_bag = make_action('Idle', (1, 16, 30, 45, 60), idle_pose, 60)
walk, walk_slot, walk_bag = make_action('Walk', (1, 8, 16, 23, 30),
                                         lambda frame: walk_pose(frame, neutral_foot_matrices), 30)


def set_shape_state(dry, water):
    for obj in shape_objects:
        obj.data.shape_keys.key_blocks['Dry'].value = dry
        obj.data.shape_keys.key_blocks['WaterFull'].value = water
    bpy.context.view_layer.update()


def evaluated_positions():
    graph = bpy.context.evaluated_depsgraph_get()
    result = {}
    for obj in meshes:
        evaluated = obj.evaluated_get(graph)
        result[obj.name] = [evaluated.matrix_world @ v.co for v in evaluated.data.vertices]
        if not all(math.isfinite(c) for point in result[obj.name] for c in point):
            raise RuntimeError('Non-finite deformation in ' + obj.name)
    return result


def capture(path):
    bpy.ops.wm.redraw_timer(type='DRAW_WIN_SWAP', iterations=1)
    with bpy.context.temp_override(area=area):
        bpy.ops.screen.screenshot_area(filepath=str(path))


def assign_action(action, slot, frame):
    rig.animation_data.action = action
    rig.animation_data.action_slot = slot
    scene.frame_set(frame)
    bpy.context.view_layer.update()


report = {'actions': {}, 'states': {}, 'actions_created': ['Idle', 'Walk']}
try:
    for action, slot, key_frames, end_frame, state_name, dry, water in (
        (idle, idle_slot, (1, 16, 30, 45, 60), 60, 'Normal', 0, 0),
        (idle, idle_slot, (1, 16, 30, 45, 60), 60, 'Dry', 1, 0),
        (idle, idle_slot, (1, 16, 30, 45, 60), 60, 'WaterFull', 0, 1),
        (walk, walk_slot, (1, 8, 16, 23, 30), 30, 'Normal', 0, 0),
        (walk, walk_slot, (1, 8, 16, 23, 30), 30, 'Dry', 1, 0),
        (walk, walk_slot, (1, 8, 16, 23, 30), 30, 'WaterFull', 0, 1),
    ):
        set_shape_state(dry, water)
        sample_displacements = []
        shoe_ground = []
        baseline = None
        for frame in key_frames:
            assign_action(action, slot, frame)
            current = evaluated_positions()
            if baseline is None:
                baseline = current
            sample_displacements.append(max(
                (a-b).length for name in current
                for a,b in zip(current[name], baseline[name])
            ))
            for shoe in ('Shoe cube', 'Shoe cube.001'):
                points = current[shoe]
                shoe_ground.append(min(p.z for p in points))
            if frame in ((16,) if action == idle else (8, 23)):
                filename = f'{action.name.lower()}-{state_name.lower()}.png'
                capture(output/filename)
        report['states'][action.name + '-' + state_name] = {
            'finite_and_stable': True,
            'max_pose_motion': max(sample_displacements),
            'shoe_min_z_span': max(shoe_ground)-min(shoe_ground),
        }
    for action, slot, bag, end in ((idle, idle_slot, idle_bag, 60), (walk, walk_slot, walk_bag, 30)):
        curves = list(bag.fcurves)
        report['actions'][action.name] = {
            'curves': len(curves),
            'all_looping': all(any(m.type == 'CYCLES' for m in c.modifiers) for c in curves),
            'first_last_match': all(abs(c.evaluate(1)-c.evaluate(end)) < 1e-5 for c in curves),
            'frame_range': [min(c.range()[0] for c in curves), max(c.range()[1] for c in curves)],
        }
    set_shape_state(0, 0)
    assign_action(idle, idle_slot, 1)
    scene.frame_end = 60
    capture(output/'idle-normal-final.png')
finally:
    set_shape_state(0, 0)
    if rig.animation_data:
        rig.animation_data.action = idle
        rig.animation_data.action_slot = idle_slot
    scene.frame_set(1)
    scene.render.fps = 30
    scene.frame_start, scene.frame_end = 1, 60
    space.overlay.show_overlays = old_overlays
    bpy.context.view_layer.update()

assert set(a.name for a in bpy.data.actions) == {'Idle', 'Walk'}
assert all(o.data.shape_keys.key_blocks['Dry'].value == 0 and
           o.data.shape_keys.key_blocks['WaterFull'].value == 0 for o in shape_objects)
assert scene.frame_current == 1 and scene.render.fps == 30
assert report['actions']['Idle']['all_looping'] and report['actions']['Idle']['first_last_match']
assert report['actions']['Walk']['all_looping'] and report['actions']['Walk']['first_last_match']
assert all(report['states'][f'{action}-{state}']['finite_and_stable']
           for action in ('Idle','Walk') for state in ('Normal','Dry','WaterFull'))
(root/'.hack/locomotion-tests/report.json').write_text(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(root/'assets/blender/spongebob.blend'))
print(json.dumps(report))
