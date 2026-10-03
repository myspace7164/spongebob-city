"""Inspect Dry stages and rig poses, then restore both states and the neutral rig."""
import hashlib
import json
import math
from pathlib import Path
import bpy
from mathutils import Vector, Quaternion

root = Path(__file__).resolve().parents[1]
out = root/'.hack/dry-tests'
out.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
rig = scene.objects['Character Rig']
meshes = [o for o in scene.objects if o.type == 'MESH']
morphs = [o for o in meshes if o.data.shape_keys and 'Dry' in o.data.shape_keys.key_blocks]
expected = ['Body Cube','Cube','Sphere','Cube.005','Sphere.001','Cube.001','Cube.002','Tie Cube']
assert {o.name for o in morphs} == set(expected)
morphs.sort(key=lambda o:expected.index(o.name))
assert len(bpy.data.actions)==0
assert all({'Basis','Dry','WaterFull'} <= set(o.data.shape_keys.key_blocks.keys()) for o in morphs)
previous={p.name:(p.rotation_mode,p.matrix_basis.copy()) for p in rig.pose.bones}
original_values={o.name:(o.data.shape_keys.key_blocks['Dry'].value,o.data.shape_keys.key_blocks['WaterFull'].value) for o in morphs}

def digest(key):return hashlib.sha256(repr([tuple(v.co) for v in key.data]).encode()).hexdigest()
water_hash={o.name:digest(o.data.shape_keys.key_blocks['WaterFull']) for o in morphs}
area=next(a for a in bpy.context.screen.areas if a.type=='VIEW_3D')
region=next(r for r in area.regions if r.type=='WINDOW')
space=area.spaces.active
old_overlays=space.overlay.show_overlays
for o in scene.objects:o.select_set(o==rig)
bpy.context.view_layer.objects.active=rig
with bpy.context.temp_override(area=area,region=region):bpy.ops.view3d.view_axis(type='FRONT',align_active=False)

def set_state(dry,water):
    for o in morphs:
        o.data.shape_keys.key_blocks['Dry'].value=dry
        o.data.shape_keys.key_blocks['WaterFull'].value=water
    bpy.context.view_layer.update()

def points():
    graph=bpy.context.evaluated_depsgraph_get(); result={}
    for o in meshes:
        e=o.evaluated_get(graph)
        result[o.name]=[e.matrix_world @ v.co for v in e.data.vertices]
        assert all(math.isfinite(c) for v in result[o.name] for c in v)
    return result

def bounds(obj):
    ps=points()[obj]
    return [min(p[i] for p in ps) for i in range(3)]+[max(p[i] for p in ps) for i in range(3)]

def capture(name):
    bpy.ops.wm.redraw_timer(type='DRAW_WIN_SWAP',iterations=1)
    with bpy.context.temp_override(area=area):bpy.ops.screen.screenshot_area(filepath=str(out/(name+'.png')))

def restore_pose():
    for p in rig.pose.bones:
        mode,matrix=previous[p.name]; p.rotation_mode=mode; p.matrix_basis=matrix
    bpy.context.view_layer.update()

def rotate(name,axis,degrees):
    p=rig.pose.bones[name]
    local=p.bone.matrix_local.to_3x3().inverted() @ Vector(axis)
    p.rotation_mode='QUATERNION';p.rotation_quaternion=Quaternion(local.normalized(),math.radians(degrees))

results=[]
try:
    set_state(0,0); normal=points(); normal_box=bounds('Body Cube')
    for value in (0,.25,.5,.75,1):
        set_state(value,0); current=points()
        assert all(len(current[n])==len(normal[n]) for n in normal), {n:(len(normal[n]),len(current[n])) for n in normal if len(current[n])!=len(normal[n])}
        displacement={n:max((a-b).length for a,b in zip(current[n],normal[n])) for n in normal}
        assert max(displacement.values())<3
        capture('dry-'+str(value))
        results.append({'dry':value,'water':0,'max_displacement':displacement,'body_bounds':bounds('Body Cube')})
    dry_box=bounds('Body Cube')
    dry_dims=[dry_box[i+3]-dry_box[i] for i in range(3)]
    normal_dims=[normal_box[i+3]-normal_box[i] for i in range(3)]
    assert dry_dims[0]<normal_dims[0] and dry_dims[1]<normal_dims[1]
    assert abs(dry_dims[2]-normal_dims[2])<0.05
    capture('state-dry')
    # Verify mutually exclusive gameplay states and stable combined-key evaluation.
    for name,dry,water in [('state-normal',0,0),('state-waterfull',0,1),('state-combined-inspection',1,1)]:
        set_state(dry,water); current=points()
        assert all(len(current[n])==len(normal[n]) for n in normal), {n:(len(normal[n]),len(current[n])) for n in normal if len(current[n])!=len(normal[n])}
        assert max(max((a-b).length for a,b in zip(current[n],normal[n])) for n in current)<3
        capture(name)
        results.append({'state':name,'dry':dry,'water':water,'stable':True})
    # Arm/elbow, knees and torso while fully dry.
    pose_cases=[('left-arm',[('UpperArm_L',(0,1,0),-20),('Forearm_L',(0,0,1),-35)]),
                ('right-arm',[('UpperArm_R',(0,1,0),20),('Forearm_R',(0,0,1),35)]),
                ('knees',[('Shin_L',(1,0,0),15),('Shin_R',(1,0,0),15)]),
                ('torso',[('Body',(0,1,0),8),('Chest',(0,0,1),5)])]
    set_state(1,0);dry_base=points()
    for name,moves in pose_cases:
        restore_pose()
        for bone,axis,degrees in moves:rotate(bone,axis,degrees)
        bpy.context.view_layer.update(); current=points()
        disp={n:max((a-b).length for a,b in zip(current[n],dry_base[n])) for n in current}
        assert max(disp.values())<10
        if 'arm' in name:assert disp['Cube']>.1
        if name=='knees':assert all(disp[n]>.1 for n in ('Body Cube','Shoe cube','Shoe cube.001'))
        if name=='torso':assert all(disp[n]>.1 for n in ('Body Cube','Cube','Sphere','Tie Cube'))
        capture('pose-'+name);results.append({'pose':name,'max_displacement':disp})
finally:
    restore_pose();set_state(0,0);space.overlay.show_overlays=old_overlays
    with bpy.context.temp_override(area=area,region=region):bpy.ops.view3d.view_axis(type='FRONT',align_active=False)

assert all(abs(o.data.shape_keys.key_blocks['Dry'].value)<1e-8 and abs(o.data.shape_keys.key_blocks['WaterFull'].value)<1e-8 for o in morphs)
assert all(digest(o.data.shape_keys.key_blocks['WaterFull'])==water_hash[o.name] for o in morphs)
assert len(bpy.data.actions)==0
assert all(abs(p.matrix_basis[i][j]-previous[p.name][1][i][j])<1e-6 for p in rig.pose.bones for i in range(4) for j in range(4))
result={'tests':results,'normal_body_dimensions':normal_dims,'dry_body_dimensions':dry_dims,'waterfull_coordinates_unchanged':True,'neutral_restored':True,'actions':0,'final_dry':0.0,'final_waterfull':0.0}
(out/'verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
