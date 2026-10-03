Place Blender `.glb` exports here. Files are served as `/models/<filename>.glb`.
See the project README for export settings and configuration.

`spongebob.glb` is the current Blender character export, 1.9 units tall,
with its feet centred at the origin, Y up and front facing +Z. It preserves
the red/blue shirt, swapped sleeves and collar, and restored original tie. Camera and light
are excluded. `Sphere.001` is included: its origin is distant, but its geometry
is beside the face. The game loads this Blender character from `/models/spongebob.glb`. Its Dry and
WaterFull shape keys are exported as glTF morph targets; the game moves between
Dry, Normal and WaterFull based on the sponge's stored water.

Editable source: `assets/blender/spongebob.blend`. To save a new source
version and regenerate the export, run `scripts/export-blender-character.py`
inside Blender's Python console with the character scene open:

```python
from pathlib import Path
script = Path(bpy.data.filepath).parents[2] / "scripts/export-blender-character.py"
exec(compile(script.read_text(), str(script), "exec"), {"__file__": str(script)})
```

The export uses evaluated copies of the meshes and solid-view material colors;
original scene objects and transforms are preserved. The shader split is
represented by the existing shirt face assignments for glTF compatibility.

The Blender source contains `Character Rig`, a bound 19-bone armature
with torso, arm, leg, eye and jaw bones. Anatomical left is +X. The body and arms
are skinned; eyes have rigid unit weights, and other accessories are bone-parented.
The game GLB contains evaluated neutral-pose geometry plus Dry and WaterFull
morph targets, with no armature or Blender animation clips. The game adds Idle
and Walk motion through runtime pivots in `src/game/locomotion.ts`. Export ignores
the Blender `Idle` and `Walk` Actions and restores them in the editable source.
`scripts/create-character-armature.py` records the initial bone placement;
it refuses to add a second armature.

`scripts/bind-character.py` records the non-destructive binding and refuses to
overwrite an existing binding. `scripts/verify-character-binding.py` runs
temporary pose tests, writes local diagnostics in `.hack/rig-tests`, and restores
every bone's previous transform without Actions or keyframes. See `docs/rigging.md`.

`basel-city.glb` is derived from the supplied `3D_Stadtmodell.obj`. Its full
remaining building geometry is split into 100 m tiles. Each vertex carries a
`_BUILDING` attribute (stable style seed, building base height, bridge flag for
`Bru_` materials and for unlabelled objects with no vertex within 1.5 m of the
swissALTI3D terrain, such as the span over Riehenring; kind 2 marks hand-picked
landmarks in the converter's `LANDMARKS`, e.g. the Messe Basel hall), which the game's procedural facade shader reads
(`src/game/building-style.ts`, values in `config/buildings.ts`). Coordinates are converted from source east/north/height
to local east/up/south in metres before storing float32 positions.
The origin is the dataset's horizontal bounding-box centre, with the median
nearby building-base elevation as ground. This is not a surveyed Barfüsserplatz
alignment. Ten buildings touching the fictional mission clearance rectangle
were omitted; original terrain, textures and building collisions are absent.
Facade colours, window types and roof materials are illustrative, not surveyed.

Regenerate using Python 3 (standard library only):

```sh
python3 scripts/convert-basel-map.py /path/to/3D_Stadtmodell.obj public/models/basel-city.glb
python3 tests/test_basel_map.py
```

The terrain grid (`public/maps/basel-terrain.*`) must exist for floating-span
detection; without it only `Bru_` bridges are flagged.

The converter targets this supplied model, whose materials are all the same grey.
The source OBJ stays outside the repository. See `docs/SOURCES.md` for provenance,
licence and attribution. The converted GLB embeds the attribution and licence URL.
