Place Blender `.glb` exports here. Files are served as `/models/<filename>.glb`.
See the project README for export settings and configuration.

`spongebob.glb` is the current Blender character export, 1.9 units tall,
with its feet centred at the origin, Y up and front facing +Z. It preserves
the red/blue shirt, swapped sleeves and collar, and restored original tie. Camera and light
are excluded. `Sphere.001` is included: its origin is distant, but its geometry
is beside the face. The game retains its procedural character
until `character.url` in `config/game.ts` is set to `/models/spongebob.glb`.

Editable source: `assets/blender/spongebob.blend`. To save a new source
version and regenerate the export, run `scripts/export-blender-character.py`
inside Blender's Python console with the character scene open:

```python
from pathlib import Path
script = Path(bpy.data.filepath).parents[2] / "scripts/export-blender-character.py"
exec(compile(script.read_text(), str(script), "exec"), {"__file__": str(script)})
```

The export uses copies of the meshes and solid-view material colors;
original scene objects and transforms are preserved. The shader split is
represented by the existing shirt face assignments for glTF compatibility.

The Blender source also contains `Character Rig`, an unbound 19-bone armature
with torso, arm, leg, eye and jaw bones. Anatomical left is +X. No mesh is
parented or weighted to it, and the GLB remains a static mesh export.
`scripts/create-character-armature.py` records the initial bone placement;
it refuses to add a second armature.
