"""Bake evaluated Blender meshes while retaining Dry and WaterFull morph targets."""
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

root = Path(__file__).resolve().parents[1]
source_path = root / "assets/blender/spongebob.blend"
export_path = root / "public/models/spongebob.glb"
source_path.parent.mkdir(parents=True, exist_ok=True)
export_path.parent.mkdir(parents=True, exist_ok=True)

original_scene = bpy.context.scene
if bpy.context.mode != "OBJECT":
    raise RuntimeError("Switch to Object Mode before exporting")
parts = [obj for obj in original_scene.objects if obj.type == "MESH"]
if not parts or original_scene.objects.get("Body Cube") is None:
    raise RuntimeError("Expected assembled sponge character not found")
if bpy.data.actions:
    raise RuntimeError("Export the character without animation Actions")

shape_objects = [obj for obj in parts if obj.data.shape_keys]
if not shape_objects:
    raise RuntimeError("Expected Basis, Dry and WaterFull shape keys")
for obj in shape_objects:
    keys = obj.data.shape_keys.key_blocks
    if not {"Basis", "Dry", "WaterFull"}.issubset(keys.keys()):
        raise RuntimeError(f"Missing water-state keys on {obj.name}")
    if keys["Dry"].value != 0 or keys["WaterFull"].value != 0:
        raise RuntimeError(f"Reset {obj.name} to its normal state before exporting")

original_names = {obj.name for obj in original_scene.objects}
original_values = {
    obj.name: {key.name: key.value for key in obj.data.shape_keys.key_blocks}
    for obj in shape_objects
}
rig = next((obj for obj in original_scene.objects if obj.type == "ARMATURE"), None)
if rig and any(
    abs(p.matrix_basis[i][j] - (1 if i == j else 0)) > 1e-5
    for p in rig.pose.bones
    for i in range(4)
    for j in range(4)
):
    raise RuntimeError("Return the Blender rig to neutral before exporting")

def set_state(obj, dry, water):
    if not obj.data.shape_keys:
        return
    keys = obj.data.shape_keys.key_blocks
    keys["Dry"].value = dry
    keys["WaterFull"].value = water
    bpy.context.view_layer.update()


def evaluated_mesh(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    return bpy.data.meshes.new_from_object(
        obj.evaluated_get(depsgraph),
        preserve_all_data_layers=True,
        depsgraph=depsgraph,
    )


# Determine normalization from the evaluated normal-state character.
normal_meshes = []
try:
    for obj in parts:
        set_state(obj, 0, 0)
        normal_meshes.append((obj, evaluated_mesh(obj)))
    bounds = [
        obj.matrix_world @ vertex.co
        for obj, mesh in normal_meshes
        for vertex in mesh.vertices
    ]
finally:
    for obj, mesh in normal_meshes:
        bpy.data.meshes.remove(mesh)
    for obj in shape_objects:
        for name, value in original_values[obj.name].items():
            obj.data.shape_keys.key_blocks[name].value = value
    bpy.context.view_layer.update()

minimum = Vector(tuple(min(point[i] for point in bounds) for i in range(3)))
maximum = Vector(tuple(max(point[i] for point in bounds) for i in range(3)))
height = maximum.z - minimum.z
if height <= 0:
    raise RuntimeError("Character has no height")
feet = Vector(((minimum.x + maximum.x) / 2, (minimum.y + maximum.y) / 2, minimum.z))
normalize = Matrix.Scale(1.9 / height, 4) @ Matrix.Translation(-feet)

temporary_scene = bpy.data.scenes.new("Character morph export temporary")
copies = []
baked_meshes = []
evaluated_meshes = []
materials = {}

def portable_material(material):
    if material is None:
        return None
    if material.name not in materials:
        portable = bpy.data.materials.new(material.name + " export")
        portable.diffuse_color = material.diffuse_color
        portable.use_nodes = True
        shader = next(node for node in portable.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
        shader.inputs["Base Color"].default_value = material.diffuse_color
        shader.inputs["Roughness"].default_value = 0.65
        materials[material.name] = portable
    return materials[material.name]

try:
    for obj in parts:
        states = [(0, 0)]
        if obj.data.shape_keys:
            states = [(0, 0), (1, 0), (0, 1)]
        meshes = []
        try:
            for dry, water in states:
                set_state(obj, dry, water)
                mesh = evaluated_mesh(obj)
                evaluated_meshes.append(mesh)
                meshes.append(mesh)
            reference = meshes[0]
            signature = (
                len(reference.vertices),
                tuple(tuple(poly.vertices) for poly in reference.polygons),
                tuple(tuple(edge.vertices) for edge in reference.edges),
            )
            for mesh in meshes[1:]:
                other = (
                    len(mesh.vertices),
                    tuple(tuple(poly.vertices) for poly in mesh.polygons),
                    tuple(tuple(edge.vertices) for edge in mesh.edges),
                )
                if other != signature:
                    raise RuntimeError(f"Modifier topology differs across states on {obj.name}")

            baked = reference.copy()
            baked.name = obj.name + " morph export"
            baked_meshes.append(baked)
            duplicate = obj.copy()
            duplicate.data = baked
            duplicate.modifiers.clear()
            duplicate.parent = None
            duplicate.matrix_world = normalize @ obj.matrix_world
            temporary_scene.collection.objects.link(duplicate)
            copies.append(duplicate)
            duplicate.data.materials.clear()
            for material in obj.data.materials:
                duplicate.data.materials.append(portable_material(material))

            if obj.data.shape_keys:
                basis = duplicate.shape_key_add(name="Basis", from_mix=False)
                basis.value = 1.0
                for vertex, source in zip(basis.data, reference.vertices):
                    vertex.co = source.co
                for state_index, key_name in ((1, "Dry"), (2, "WaterFull")):
                    key = duplicate.shape_key_add(name=key_name, from_mix=False)
                    key.value = 0.0
                    for vertex, source in zip(key.data, meshes[state_index].vertices):
                        vertex.co = source.co
                duplicate.data.update()
        finally:
            for mesh in meshes:
                bpy.data.meshes.remove(mesh)
                if mesh in evaluated_meshes:
                    evaluated_meshes.remove(mesh)
        set_state(obj, 0, 0)

    bpy.context.window.scene = temporary_scene
    bpy.ops.export_scene.gltf(
        filepath=str(export_path),
        export_format="GLB",
        use_active_scene=True,
        use_selection=False,
        export_apply=False,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_skins=False,
        export_morph=True,
        export_morph_animation=False,
        export_extras=True,
    )
finally:
    bpy.context.window.scene = original_scene
    for obj in shape_objects:
        for name, value in original_values[obj.name].items():
            obj.data.shape_keys.key_blocks[name].value = value
    bpy.context.view_layer.update()
    for obj in copies:
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in baked_meshes:
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for mesh in evaluated_meshes:
        bpy.data.meshes.remove(mesh)
    for material in materials.values():
        if material.users == 0:
            bpy.data.materials.remove(material)
    bpy.data.scenes.remove(temporary_scene)

assert {obj.name for obj in original_scene.objects} == original_names
bpy.ops.wm.save_as_mainfile(filepath=str(source_path))
print({"source": str(source_path), "export": str(export_path),
       "morph_objects": [obj.name for obj in shape_objects],
       "states": ["Basis", "Dry", "WaterFull"], "height": 1.9})
