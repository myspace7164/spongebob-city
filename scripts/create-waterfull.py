"""Create WaterFull in the existing bound character; preserve the normal mesh."""
import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

root = Path(__file__).resolve().parents[1]
scene = bpy.context.scene
rig = scene.objects['Character Rig']
meshes = [o for o in scene.objects if o.type == 'MESH']
names = ['Body Cube', 'Cube', 'Sphere', 'Cube.005', 'Sphere.001',
         'Cube.001', 'Cube.002', 'Tie Cube']
assert bpy.context.mode == 'OBJECT'
assert len([o for o in scene.objects if o.type == 'ARMATURE']) == 1
assert len(bpy.data.actions) == 0
assert all(abs(p.matrix_basis[i][j] - (1 if i == j else 0)) < 1e-5 for p in rig.pose.bones for i in range(4) for j in range(4))
assert all(o.data.users == 1 for o in meshes)
assert all(not o.data.shape_keys for o in meshes), 'Inspect existing keys before rerunning'
assert all(m.type in {'ARMATURE', 'SUBSURF', 'MIRROR', 'NODES'} for o in meshes for m in o.modifiers)
for name in ('Body Cube', 'Cube', 'Sphere'):
    modifiers = [m for m in scene.objects[name].modifiers if m.type == 'ARMATURE']
    assert len(modifiers) == 1 and modifiers[0].object == rig


def fingerprint():
    records = []
    for o in meshes:
        records.append((o.name, [tuple(v.co) for v in o.data.vertices],
                        [tuple(e.vertices) for e in o.data.edges],
                        [(tuple(p.vertices), p.material_index) for p in o.data.polygons],
                        [[(g.group, g.weight) for g in v.groups] for v in o.data.vertices],
                        [g.name for g in o.vertex_groups],
                        [m.name if m else None for m in o.data.materials],
                        [(m.name, m.type, getattr(getattr(m, 'object', None), 'name', None)) for m in o.modifiers],
                        (getattr(o.parent, 'name', None), o.parent_type, o.parent_bone),
                        [list(row) for row in o.matrix_world]))
    records.append([(b.name, list(b.head_local), list(b.tail_local), b.use_deform,
                     getattr(b.parent, 'name', None)) for b in rig.data.bones])
    return hashlib.sha256(repr(records).encode()).hexdigest()


before = fingerprint()
backup = root / '.hack/backups/before-waterfull.blend'
backup.parent.mkdir(parents=True, exist_ok=True)
assert not backup.exists(), 'Preserve the previous backup'
bpy.ops.wm.save_as_mainfile(filepath=str(backup), copy=True)
center = scene.objects['Body Cube'].matrix_world.translation
cx, cy = center.x, center.y


def smooth(a, b, value):
    t = max(0., min(1., (value-a)/(b-a)))
    return t*t*(3-2*t)


def swell(point):
    x, y, z = point
    # Fixed feet/legs; a broad mid-body bulge softens the rectangular silhouette.
    lower = smooth(-3.5, -1.0, z)
    middle = math.exp(-((z-1.8)/3.4)**2)
    width = lower * (0.08 + 0.15*middle)
    depth = lower * (0.10 + 0.13*middle)
    return Vector((cx + (x-cx)*(1+width), cy + (y-cy)*(1+depth), z))


for name in names:
    o = scene.objects[name]
    basis = o.shape_key_add(name='Basis', from_mix=False)
    key = o.shape_key_add(name='WaterFull', from_mix=False)
    key.slider_min, key.slider_max, key.value = 0., 1., 0.
    inverse = o.matrix_world.inverted()
    for v, dst in zip(o.data.vertices, key.data):
        point = o.matrix_world @ v.co
        if name == 'Body Cube':
            target = swell(point)
        elif name == 'Cube':
            # Match swelling at sleeve roots and fade smoothly before the wrists.
            fade = 1-smooth(4.6, 7.2, abs(point.x-cx))
            shift = swell(Vector((cx + math.copysign(3.4, point.x-cx), point.y, point.z)))
            root_point = Vector((cx + math.copysign(3.4, point.x-cx), point.y, point.z))
            target = point + (shift-root_point)*fade
        elif name in ('Sphere', 'Cube.005', 'Sphere.001'):
            # Preserve eye and lid shapes with matching per-eye translations.
            eye_anchor = Vector((cx + math.copysign(1.415, point.x-cx), 3.60, 2.95))
            shift = swell(eye_anchor)-eye_anchor
            if name != 'Sphere':
                # Keep mirrored seam vertices fixed on the mirror plane.
                shift.x *= smooth(0.05, 1.0, abs(point.x-cx))
            target = point + shift
        elif name in ('Cube.001', 'Cube.002'):
            anchor = Vector((cx + math.copysign(0.57, point.x-cx), 3.83, 0.6))
            target = point + swell(anchor)-anchor
        else:
            target = swell(point)
        dst.co = inverse @ target
    o.data.update()
assert fingerprint() == before, 'Original mesh or rig changed'
report = {'keys': names, 'original_state_hash': before, 'topology_weights_parenting_preserved': True,
          'actions': len(bpy.data.actions), 'final_value': 0.0}
output = root / '.hack/waterfull-tests'
output.mkdir(parents=True, exist_ok=True)
(output/'creation.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report))
