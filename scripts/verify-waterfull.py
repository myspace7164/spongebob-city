"""Inspect intermediate WaterFull values and temporary poses, then restore normal."""
import json
import math
from pathlib import Path
import bpy
from mathutils import Vector, Quaternion

root = Path(__file__).resolve().parents[1]
output = root/'.hack/waterfull-tests'
output.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
rig = scene.objects['Character Rig']
meshes = [o for o in scene.objects if o.type == 'MESH']
morphs = [o for o in meshes if o.data.shape_keys and 'WaterFull' in o.data.shape_keys.key_blocks]
previous = {p.name:(p.rotation_mode,p.matrix_basis.copy()) for p in rig.pose.bones}
assert len(bpy.data.actions) == 0
area = next(a for a in bpy.context.screen.areas if a.type == 'VIEW_3D')
region = next(r for r in area.regions if r.type == 'WINDOW')
for o in scene.objects:
    o.select_set(o == rig)
bpy.context.view_layer.objects.active = rig
with bpy.context.temp_override(area=area, region=region):
    bpy.ops.view3d.view_axis(type='FRONT', align_active=False)


def set_value(value):
    for o in morphs:
        o.data.shape_keys.key_blocks['WaterFull'].value = value
    bpy.context.view_layer.update()


def restore_pose():
    for p in rig.pose.bones:
        p.rotation_mode, p.matrix_basis = previous[p.name]
    bpy.context.view_layer.update()


def positions():
    graph = bpy.context.evaluated_depsgraph_get()
    result = {}
    for o in meshes:
        e = o.evaluated_get(graph)
        result[o.name] = [e.matrix_world @ v.co for v in e.data.vertices]
        assert all(math.isfinite(c) for v in result[o.name] for c in v)
    return result


def capture(name):
    bpy.ops.wm.redraw_timer(type='DRAW_WIN_SWAP', iterations=1)
    with bpy.context.temp_override(area=area):
        bpy.ops.screen.screenshot_area(filepath=str(output/(name+'.png')))


reports = []
try:
    set_value(0)
    normal = positions()
    for value in (0., .25, .5, .75, 1.):
        set_value(value)
        points = positions()
        movement = {}
        for name in points:
            assert len(points[name]) == len(normal[name]), (name, len(normal[name]), len(points[name]))
            movement[name] = max((a-b).length for a,b in zip(points[name], normal[name]))
            assert movement[name] < 3
        capture('morph-'+str(value))
        reports.append({'value':value,'max_displacement':movement})
    full = positions()
    # Forward elbow bends avoid folding hands through the broad sponge head.
    tests = [
        ('left-arm', [('UpperArm_L',(0,1,0),-20), ('Forearm_L',(0,0,1),-35)]),
        ('right-arm', [('UpperArm_R',(0,1,0),20), ('Forearm_R',(0,0,1),35)]),
        ('knees', [('Shin_L',(1,0,0),15), ('Shin_R',(1,0,0),15)]),
        ('torso', [('Body',(0,1,0),8), ('Chest',(0,0,1),5)])]
    for name, rotations in tests:
        restore_pose()
        for bone, axis, degrees in rotations:
            p = rig.pose.bones[bone]
            local = p.bone.matrix_local.to_3x3().inverted() @ Vector(axis)
            p.rotation_mode = 'QUATERNION'
            p.rotation_quaternion = Quaternion(local.normalized(),math.radians(degrees))
        bpy.context.view_layer.update()
        points = positions()
        movement = {n:max((a-b).length for a,b in zip(points[n], full[n])) for n in points}
        assert max(movement.values()) < 10
        if 'arm' in name: assert movement['Cube'] > .1
        if name == 'knees': assert all(movement[n] > .1 for n in ('Body Cube','Shoe cube','Shoe cube.001'))
        if name == 'torso': assert all(movement[n] > .1 for n in ('Body Cube','Cube','Sphere','Tie Cube'))
        capture('pose-'+name)
        reports.append({'pose':name,'max_displacement':movement})
finally:
    restore_pose()
    set_value(0)
assert len(bpy.data.actions) == 0
assert all(abs(p.matrix_basis[i][j]-previous[p.name][1][i][j]) < 1e-6 for p in rig.pose.bones for i in range(4) for j in range(4))
final_positions = positions()
restoration_error = {n:max((a-b).length for a,b in zip(final_positions[n], normal[n])) for n in normal}
assert max(restoration_error.values()) < 0.0001, restoration_error
capture('final-normal')
result={'tests':reports,'restoration_error':restoration_error,'restored_normal':True,'actions':0,'final_value':0.0,'objects':[o.name for o in morphs]}
(output/'verification.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result))
