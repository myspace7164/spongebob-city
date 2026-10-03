"""Run in Blender to save the source and export the assembled character."""

from pathlib import Path

import bpy
from mathutils import Matrix, Vector


root = Path(__file__).resolve().parents[1]
source_path = root / "assets/blender/spongebob.blend"
export_path = root / "public/models/spongebob.glb"
source_path.parent.mkdir(parents=True, exist_ok=True)
export_path.parent.mkdir(parents=True, exist_ok=True)

original_scene = bpy.context.scene
original_names = {obj.name for obj in original_scene.objects}
parts = [
    obj for obj in original_scene.objects
    if obj.type == "MESH"
]
if not parts or original_scene.objects.get("Body Cube") is None:
    raise RuntimeError("Expected assembled sponge character not found")
if bpy.context.mode != "OBJECT":
    raise RuntimeError("Switch to Object Mode before exporting")

# Normalize copies only: keep the editable scene's transforms intact.
depsgraph = bpy.context.evaluated_depsgraph_get()
bounds = [
    obj.matrix_world @ vertex.co
    for obj in parts
    for vertex in obj.evaluated_get(depsgraph).data.vertices
]
minimum = Vector(tuple(min(point[i] for point in bounds) for i in range(3)))
maximum = Vector(tuple(max(point[i] for point in bounds) for i in range(3)))
height = maximum.z - minimum.z
if height <= 0:
    raise RuntimeError("Character has no height")
feet = Vector(((minimum.x + maximum.x) / 2, (minimum.y + maximum.y) / 2, minimum.z))
normalize = Matrix.Scale(1.9 / height, 4) @ Matrix.Translation(-feet)

temporary_scene = bpy.data.scenes.new("Character export temporary")
copies = []
meshes = []
materials = {}
try:
    for obj in parts:
        duplicate = obj.copy()
        duplicate.data = bpy.data.meshes.new_from_object(
            obj.evaluated_get(depsgraph),
            preserve_all_data_layers=True,
            depsgraph=depsgraph,
        )
        duplicate.modifiers.clear()
        duplicate.parent = None
        duplicate.matrix_world = normalize @ obj.matrix_world
        temporary_scene.collection.objects.link(duplicate)
        copies.append(duplicate)
        meshes.append(duplicate.data)
        for index, material in enumerate(obj.data.materials):
            if material is None:
                continue
            if material.name not in materials:
                # Solid-view colors are exported as portable PBR colors.
                # The shirt's procedural split is already assigned by face.
                portable = bpy.data.materials.new(material.name + " export")
                portable.diffuse_color = material.diffuse_color
                portable.use_nodes = True
                shader = next(node for node in portable.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
                shader.inputs["Base Color"].default_value = material.diffuse_color
                shader.inputs["Roughness"].default_value = 0.65
                materials[material.name] = portable
            duplicate.data.materials[index] = materials[material.name]

    bpy.context.window.scene = temporary_scene
    bpy.ops.export_scene.gltf(
        filepath=str(export_path),
        export_format="GLB",
        use_active_scene=True,
        export_apply=True,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_extras=False,
    )
finally:
    bpy.context.window.scene = original_scene
    for obj in copies:
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in meshes:
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for material in materials.values():
        if material.users == 0:
            bpy.data.materials.remove(material)
    bpy.data.scenes.remove(temporary_scene)

assert {obj.name for obj in original_scene.objects} == original_names
bpy.ops.wm.save_as_mainfile(filepath=str(source_path))
print({"source": str(source_path), "export": str(export_path), "parts": [obj.name for obj in parts], "height": 1.9})
