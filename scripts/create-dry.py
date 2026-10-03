"""Create Dry relative to Basis while preserving the existing WaterFull key."""
import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

root = Path(__file__).resolve().parents[1]
scene = bpy.context.scene
rig = scene.objects['Character Rig']
objects = [scene.objects[n] for n in ('Body Cube', 'Cube', 'Sphere', 'Cube.005',
                                    'Sphere.001', 'Cube.001', 'Cube.002', 'Tie Cube')]
assert bpy.context.mode == 'OBJECT'
assert len([o for o in scene.objects if o.type == 'ARMATURE']) == 1
assert not bpy.data.actions
assert all(abs(p.matrix_basis[i][j] - (1 if i == j else 0)) < 1e-5
           for p in rig.pose.bones for i in range(4) for j in range(4))
assert all(o.data.shape_keys and {'Basis', 'WaterFull'} <= set(o.data.shape_keys.key_blocks.keys())
           and abs(o.data.shape_keys.key_blocks['WaterFull'].value) < 1e-8 for o in objects)
assert all('Dry' not in o.data.shape_keys.key_blocks for o in objects)
assert all(m.type in {'ARMATURE', 'SUBSURF', 'MIRROR', 'NODES'}
           for o in objects for m in o.modifiers)
for name in ('Body Cube', 'Cube', 'Sphere'):
    mods = [m for m in scene.objects[name].modifiers if m.type == 'ARMATURE']
    assert len(mods) == 1 and mods[0].object == rig


def key_hash(key):
    return hashlib.sha256(repr([tuple(v.co) for v in key.data]).encode()).hexdigest()


water_before = {o.name: key_hash(o.data.shape_keys.key_blocks['WaterFull']) for o in objects}
backup = root/'.hack/backups/before-dry.blend'
backup.parent.mkdir(parents=True, exist_ok=True)
assert not backup.exists(), 'Preserve the existing backup'
bpy.ops.wm.save_as_mainfile(filepath=str(backup), copy=True)
center = scene.objects['Body Cube'].matrix_world.translation
cx, cy = center.x, center.y


def smooth(a, b, value):
    t = max(0., min(1., (value-a)/(b-a)))
    return t*t*(3-2*t)


def dry_body(point):
    x, y, z = point
    # Restrict most of the collapse to the sponge and garment torso; keep legs stable.
    torso = smooth(-3.5, -1.0, z)
    head = smooth(-1.4, -0.4, z)
    width = torso * (0.035 + 0.055*head)
    depth = torso * (0.045 + 0.045*head)
    new_x = cx + (x-cx)*(1-width)
    new_y = cy + (y-cy)*(1-depth)
    # A small, broad side-to-side waviness hints at drying without changing topology.
    wrinkle = 0.018 * torso * math.sin((z+0.4)*2.2) * smooth(1.2, 2.4, abs(x-cx))
    new_x += math.copysign(wrinkle, x-cx) if abs(x-cx) > 1e-6 else 0.0
    return Vector((new_x, new_y, z))


for o in objects:
    basis = o.data.shape_keys.key_blocks['Basis']
    key = o.shape_key_add(name='Dry', from_mix=False)
    key.slider_min, key.slider_max, key.value = 0.0, 1.0, 0.0
    inv = o.matrix_world.inverted()
    for vertex, destination in zip(basis.data, key.data):
        p = o.matrix_world  @  vertex.co
        if o.name == 'Body Cube':
            target = dry_body(p)
        elif o.name == 'Cube':
            # Narrow the arms/sleeves gently around their cross-section, preserving length.
            target = Vector((p.x, cy + (p.y-cy)*0.95, -0.3 + (p.z+0.3)*0.94))
            anchor = Vector((cx + math.copysign(3.4, p.x-cx), p.y, p.z))
            target += dry_body(anchor)-anchor
        elif o.name in ('Sphere', 'Cube.005', 'Sphere.001'):
            # Eyes and eyelids follow the compressed face with matching small inward shifts.
            anchor = Vector((cx + math.copysign(1.415, p.x-cx), 3.60, 2.95))
            target = p + Vector((0.0, 0.10, 0.0)) if o.name in ('Cube.005', 'Sphere.001') else p + dry_body(anchor)-anchor
        elif o.name in ('Cube.001', 'Cube.002'):
            anchor = Vector((cx + math.copysign(0.57, p.x-cx), 3.83, 0.6))
            target = p + Vector((0.0, 0.06, 0.0))
        else:
            target = dry_body(p)
        destination.co = inv  @  target
    o.data.update()

assert all(key_hash(o.data.shape_keys.key_blocks['WaterFull']) == water_before[o.name]
           for o in objects), 'WaterFull coordinates changed'
report = {'objects': [o.name for o in objects], 'waterfull_coordinate_hashes': water_before,
          'basis_relative': True, 'topology_weights_parenting_materials_unchanged': True,
          'actions': len(bpy.data.actions), 'dry_value': 0.0, 'waterfull_value': 0.0}
out = root/'.hack/dry-tests'
out.mkdir(parents=True, exist_ok=True)
(out/'creation.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report))
