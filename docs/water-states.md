# Character water states

The editable Blender source contains Basis and WaterFull on these eight meshes:

| Object | Morph purpose |
|---|---|
| Body Cube | Wider, deeper mid-body; integrated shirt, collar and pants follow it; lower legs remain fixed |
| Cube | Both sleeves and shoulder roots follow swelling; offsets fade before the wrists |
| Sphere | Both eyes translate slightly outward and forward without inflation |
| Cube.005 | Upper eyelids and lashes follow the eyes, preserving Mirror seams |
| Sphere.001 | Lower eyelids follow the eyes, preserving Mirror seams |
| Cube.001, Cube.002 | Teeth translate to follow the expanded face |
| Tie Cube | Tie follows the shirt expansion |

Shoes have no morph. Basis equals the original normal mesh. Only shape-key
coordinates were added: base topology, weights, vertex groups, parenting,
material assignments and the existing armature/modifiers are unchanged.
The existing degenerate geometry was retained.

Set WaterFull to the same value on all eight meshes when previewing the state.
No driver, animation, Action or keyframe was created. Dry has not been created.
The saved file is neutral with every WaterFull value at zero.

## Verification

The five values 0, 0.25, 0.5, 0.75 and 1 were checked in the viewport and evaluated
for finite positions and stable vertex counts. At full swelling, temporary
20-degree shoulder raises with 35-degree forward elbow bends, 15-degree knee
bends, and an 8-degree body bend with a 5-degree chest twist were tested.
Front and side inspections found no severe clipping or detached clothing/face.
All pose matrices and rotation modes were restored. The original scene
fingerprint and unchanged Basis coordinates were verified afterward.

The pre-morph backup and diagnostic screenshots/reports remain local in .hack/.
Run scripts/create-waterfull.py only on the original unkeyed character;
it refuses to overwrite existing keys or the backup. Run
scripts/verify-waterfull.py to repeat the temporary tests.

The current GLB exporter produces a static evaluated normal-state snapshot.
WaterFull is editable in the Blender source; exporting a skeletal model with
morph targets for the game is separate work. Arbitrary extreme poses can still
intersect the broad body, as documented in rigging.md.
