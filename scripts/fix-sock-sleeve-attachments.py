"""Repair sock and shoulder-sleeve weights on the existing live Blender rig."""
import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector

SOCK_MATERIALS = {'sock', 'red ring', 'blue ring'}
SLEEVE_MATERIALS = {'Sleeve Left Blue', 'Sleeve Right Red'}
SOCK_FOOT_BLEND_DEPTH = 0.24
SHOULDER_BLEND_LIMITS = (3.28, 3.5)
SHOULDER_UPPER_ARM_WEIGHTS = (0.18, 0.38)

root = Path(__file__).resolve().parents[1]
scene = bpy.context.scene
rig = bpy.data.objects['Character Rig']
body = bpy.data.objects['Body Cube']
arms = bpy.data.objects['Cube']
assert bpy.context.mode == 'OBJECT'
assert len([o for o in scene.objects if o.type == 'ARMATURE']) == 1
assert {a.name for a in bpy.data.actions} == {'Idle', 'Walk'}

backup = root / '.hack/backups/before-sock-sleeve-repair.blend'
backup.parent.mkdir(parents=True, exist_ok=True)
if not backup.exists():
    bpy.ops.wm.save_as_mainfile(filepath=str(backup), copy=True)

old_action = rig.animation_data.action if rig.animation_data else None
old_slot = rig.animation_data.action_slot if rig.animation_data else None
old_frame = scene.frame_current
old_shape_values = {}
shape_meshes = [o for o in scene.objects if o.type == 'MESH' and o.data.shape_keys]
for obj in shape_meshes:
    keys = obj.data.shape_keys.key_blocks
    old_shape_values[obj.name] = {k.name: k.value for k in keys if k.name in {'Dry', 'WaterFull'}}
old_pose = {p.name: p.matrix_basis.copy() for p in rig.pose.bones}
view_area = next(a for a in bpy.context.screen.areas if a.type == 'VIEW_3D')
old_view_distance = view_area.spaces.active.region_3d.view_distance


def material_vertices(obj, wanted):
    indices = set()
    for poly in obj.data.polygons:
        if poly.material_index < len(obj.data.materials):
            material = obj.data.materials[poly.material_index]
            if material and material.name in wanted:
                indices.update(poly.vertices)
    return indices


def clear_groups(obj, vertex_index):
    memberships = {assignment.group for assignment in obj.data.vertices[vertex_index].groups}
    for group in obj.vertex_groups:
        if group.index in memberships:
            group.remove([vertex_index])


def evaluated_points(obj):
    bpy.context.view_layer.update()
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    return [evaluated.matrix_world @ v.co for v in evaluated.data.vertices]


def capture(path):
    bpy.ops.wm.redraw_timer(type='DRAW_WIN_SWAP', iterations=1)
    with bpy.context.temp_override(area=view_area):
        bpy.ops.screen.screenshot_area(filepath=str(path))


def set_state(dry, water):
    for obj in shape_meshes:
        keys = obj.data.shape_keys.key_blocks
        if 'Dry' in keys:
            keys['Dry'].value = dry
        if 'WaterFull' in keys:
            keys['WaterFull'].value = water


def set_action(action_name, frame):
    action = bpy.data.actions[action_name]
    rig.animation_data_create()
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]
    scene.frame_set(frame)
    bpy.context.view_layer.update()


def finite_geometry():
    counts = {}
    largest = 0.0
    for obj in (body, arms):
        points = evaluated_points(obj)
        counts[obj.name] = len(points)
        for p in points:
            if not all(math.isfinite(c) for c in p):
                raise RuntimeError('Non-finite vertex in ' + obj.name)
            largest = max(largest, p.length)
    return counts, largest


report = {'sock_vertices': 0, 'sleeve_seam_vertices': 0, 'tests': {}, 'actions': sorted(a.name for a in bpy.data.actions)}
try:
    # Socks and their colored bands are regions of Body Cube, not separate objects.
    sock_vertices = material_vertices(body, SOCK_MATERIALS)
    shin_groups = {s: body.vertex_groups.get('Shin_' + s) or body.vertex_groups.new(name='Shin_' + s) for s in ('L', 'R')}
    foot_groups = {s: body.vertex_groups.get('Foot_' + s) or body.vertex_groups.new(name='Foot_' + s) for s in ('L', 'R')}
    ankle_z = {s: (rig.matrix_world @ rig.data.bones['Foot_' + s].head_local).z for s in ('L', 'R')}
    sock_wrong_side = 0
    for index in sock_vertices:
        world = body.matrix_world @ body.data.vertices[index].co
        side = 'L' if world.x > 0 else 'R'
        other = 'R' if side == 'L' else 'L'
        vertex_groups = {body.vertex_groups[g.group].name: g.weight for g in body.data.vertices[index].groups}
        if any(vertex_groups.get(name, 0) > 1e-5 for name in ('Shin_' + other, 'Foot_' + other, 'Thigh_' + other)):
            sock_wrong_side += 1
        # Keep the sock shaft on its shin; blend only the bottom edge onto its foot.
        foot_weight = max(0.0, min(1.0, (ankle_z[side] - world.z) / SOCK_FOOT_BLEND_DEPTH))
        clear_groups(body, index)
        shin_groups[side].add([index], 1.0 - foot_weight, 'REPLACE')
        if foot_weight > 0:
            foot_groups[side].add([index], foot_weight, 'REPLACE')
    report['sock_vertices'] = len(sock_vertices)
    report['sock_cross_side_vertices_before'] = sock_wrong_side
    report['sock_side_weights'] = 'Shin_L/Shin_R by world side; Foot_L/Foot_R blend at ankle only'
    wrong_side_after = 0
    for index in sock_vertices:
        world = body.matrix_world @ body.data.vertices[index].co
        side = 'L' if world.x > 0 else 'R'
        other = 'R' if side == 'L' else 'L'
        assigned = {body.vertex_groups[g.group].name: g.weight for g in body.data.vertices[index].groups}
        if assigned.get('Shin_' + other, 0) > 1e-5 or assigned.get('Foot_' + other, 0) > 1e-5:
            wrong_side_after += 1
    report['sock_cross_side_vertices_after'] = wrong_side_after
    if wrong_side_after:
        raise RuntimeError('Sock region retains opposite-leg influence')

    # Blend the chest-anchored inner shoulder seam slightly into its own upper arm.
    sleeve_vertices = material_vertices(arms, SLEEVE_MATERIALS)
    chest_group = arms.vertex_groups.get('Chest')
    if chest_group is None:
        raise RuntimeError('Cube is missing its Chest vertex group')
    upper_groups = {s: arms.vertex_groups.get('UpperArm_' + s) for s in ('L', 'R')}
    if any(group is None for group in upper_groups.values()):
        raise RuntimeError('Cube is missing an existing UpperArm vertex group')
    seam_changed = []
    sleeve_wrong_side_before = 0
    for index in sleeve_vertices:
        world = arms.matrix_world @ arms.data.vertices[index].co
        side = 'L' if world.x > 0 else 'R'
        other = 'R' if side == 'L' else 'L'
        groups = {arms.vertex_groups[g.group].name: g.weight for g in arms.data.vertices[index].groups}
        if groups.get('UpperArm_' + other, 0) > 1e-5:
            sleeve_wrong_side_before += 1
            if arms.vertex_groups['UpperArm_' + other].index in {g.group for g in arms.data.vertices[index].groups}:
                arms.vertex_groups['UpperArm_' + other].remove([index])
        same_weight = groups.get('UpperArm_' + side, 0)
        chest_weight = groups.get('Chest', 0)
        abs_x = abs(world.x)
        if same_weight < 1e-5 and chest_weight > 0.99 and abs_x < SHOULDER_BLEND_LIMITS[1]:
            upper_weight = (SHOULDER_UPPER_ARM_WEIGHTS[0]
                            if abs_x < SHOULDER_BLEND_LIMITS[0]
                            else SHOULDER_UPPER_ARM_WEIGHTS[1])
            chest_weight = 1.0 - upper_weight
            chest_group.add([index], chest_weight, 'REPLACE')
            upper_groups[side].add([index], upper_weight, 'REPLACE')
            seam_changed.append(index)
    report['sleeve_vertices'] = len(sleeve_vertices)
    report['sleeve_wrong_side_vertices_before'] = sleeve_wrong_side_before
    report['sleeve_seam_vertices'] = len(seam_changed)
    report['sleeve_seam_blend'] = 'Chest/side-specific UpperArm blend on chest-only inner seam vertices'

    # Sample the existing Idle and Walk under Normal, Dry and WaterFull.
    for action, frames in (('Idle', (1, 30, 60)), ('Walk', (1, 8, 16, 23, 30))):
        for state, dry, water in (('Normal', 0.0, 0.0), ('Dry', 1.0, 0.0), ('WaterFull', 0.0, 1.0)):
            set_state(dry, water)
            sample_counts = []
            sample_max_radius = 0.0
            sock_reference = None
            sock_motion = {'L': 0.0, 'R': 0.0}
            for frame in frames:
                set_action(action, frame)
                counts, radius = finite_geometry()
                sample_counts.append(counts)
                sample_max_radius = max(sample_max_radius, radius)
                if action == 'Walk':
                    points = evaluated_points(body)
                    if frame == 1:
                        sock_reference = {side: {i: points[i] for i in sock_vertices if ('L' if (body.matrix_world @ body.data.vertices[i].co).x > 0 else 'R') == side} for side in ('L','R')}
                    elif frame in (8, 23):
                        for side in ('L','R'):
                            for index, point in sock_reference[side].items():
                                sock_motion[side] = max(sock_motion[side], (points[index] - point).length)
                    if frame == 8:
                        capture(Path(f'/private/tmp/attachments-walk-{state.lower()}.png'))
                elif frame == 30:
                    capture(Path(f'/private/tmp/attachments-idle-{state.lower()}.png'))
            if any(count != sample_counts[0] for count in sample_counts):
                raise RuntimeError(f'Topology/vertex count changed in {action}-{state}')
            result = {'finite': True, 'vertex_counts_stable': True, 'max_world_radius': round(sample_max_radius, 4)}
            if action == 'Walk':
                result['sock_max_motion_by_side'] = {side: round(distance, 4) for side, distance in sock_motion.items()}
                if any(distance < 0.01 for distance in sock_motion.values()):
                    raise RuntimeError(f'Sock did not follow the leg in Walk-{state}')
            report['tests'][action + '-' + state] = result

    # Exercise large arm lifts and elbow bends without creating keyframes/actions.
    set_state(0.0, 0.0)
    rig.animation_data.action = None
    for pose_bone in rig.pose.bones:
        pose_bone.matrix_basis = Matrix.Identity(4)

    def world_axis_rotation(name, world_axis, degrees):
        pose_bone = rig.pose.bones[name]
        local_axis = (pose_bone.bone.matrix_local.to_3x3().inverted() @ Vector(world_axis)).normalized()
        return Quaternion(local_axis, math.radians(degrees))

    for side, down, elbow in (('L', 12.0, -28.0), ('R', -12.0, 28.0)):
        for pose_bone in rig.pose.bones:
            pose_bone.matrix_basis = Matrix.Identity(4)
        rig.pose.bones['UpperArm_L'].rotation_mode = 'QUATERNION'
        rig.pose.bones['UpperArm_L'].rotation_quaternion = world_axis_rotation('UpperArm_L', (0, 1, 0), 72)
        rig.pose.bones['Forearm_L'].rotation_mode = 'QUATERNION'
        rig.pose.bones['Forearm_L'].rotation_quaternion = world_axis_rotation('Forearm_L', (0, 1, 0), -12)
        rig.pose.bones['UpperArm_R'].rotation_mode = 'QUATERNION'
        rig.pose.bones['UpperArm_R'].rotation_quaternion = world_axis_rotation('UpperArm_R', (0, 1, 0), -72)
        rig.pose.bones['Forearm_R'].rotation_mode = 'QUATERNION'
        rig.pose.bones['Forearm_R'].rotation_quaternion = world_axis_rotation('Forearm_R', (0, 1, 0), 12)
        rig.pose.bones['UpperArm_' + side].rotation_mode = 'QUATERNION'
        rig.pose.bones['UpperArm_' + side].rotation_quaternion = world_axis_rotation('UpperArm_' + side, (0, 1, 0), down)
        rig.pose.bones['Forearm_' + side].rotation_mode = 'QUATERNION'
        rig.pose.bones['Forearm_' + side].rotation_quaternion = world_axis_rotation('Forearm_' + side, (0, 1, 0), elbow)
        bpy.context.view_layer.update()
        counts, radius = finite_geometry()
        report['tests']['raised-arm-' + side] = {'finite': True, 'vertex_counts_stable': True, 'max_world_radius': round(radius, 4)}
        capture(Path('/private/tmp/attachments-raised-' + side.lower() + '.png'))

    # Check that each sleeve face set shares mesh connectivity with its arm surface.
    face_by_vertex = {}
    for poly in arms.data.polygons:
        for vi in poly.vertices:
            face_by_vertex.setdefault(vi, set()).add(poly.index)
    connectivity = {}
    for material_name, side in (('Sleeve Left Blue', 'R'), ('Sleeve Right Red', 'L')):
        starts = {p.index for p in arms.data.polygons if arms.data.materials[p.material_index] and arms.data.materials[p.material_index].name == material_name}
        visited = set(starts)
        queue = list(starts)
        while queue:
            current = queue.pop()
            for vi in arms.data.polygons[current].vertices:
                for neighbor in face_by_vertex.get(vi, ()):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)
        sponge_faces = sum(1 for fi in visited if arms.data.materials[arms.data.polygons[fi].material_index] and arms.data.materials[arms.data.polygons[fi].material_index].name == 'sponge')
        connectivity[side] = {'sleeve_faces_reach_arm_surface': sponge_faces > 0, 'connected_arm_surface_faces': sponge_faces}
    report['arm_sleeve_connectivity'] = connectivity

finally:
    # Restore shape state, action, slot, frame and pose exactly; no keys are inserted.
    for obj in shape_meshes:
        keys = obj.data.shape_keys.key_blocks
        for key_name, value in old_shape_values.get(obj.name, {}).items():
            keys[key_name].value = value
    rig.animation_data_create()
    rig.animation_data.action = old_action
    rig.animation_data.action_slot = old_slot
    if old_action is None:
        for pose_bone in rig.pose.bones:
            pose_bone.matrix_basis = old_pose[pose_bone.name]
    scene.frame_set(old_frame)
    view_area.spaces.active.region_3d.view_distance = old_view_distance
    bpy.context.view_layer.update()

assert {a.name for a in bpy.data.actions} == {'Idle', 'Walk'}
assert all(report['tests'][name]['finite'] for name in ('Idle-Normal','Idle-Dry','Idle-WaterFull','Walk-Normal','Walk-Dry','Walk-WaterFull','raised-arm-L','raised-arm-R'))
assert all(item['sleeve_faces_reach_arm_surface'] for item in report['arm_sleeve_connectivity'].values())
assert all(o.data.shape_keys.key_blocks['Dry'].value == 0 and o.data.shape_keys.key_blocks['WaterFull'].value == 0 for o in shape_meshes)
assert scene.frame_current == old_frame and rig.animation_data.action.name == 'Idle'
(root / '.hack/locomotion-tests/attachment-repair-report.json').write_text(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(root / 'assets/blender/spongebob.blend'))
print(json.dumps(report))
