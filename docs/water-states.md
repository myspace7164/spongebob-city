# Character water states

The editable Blender source contains Basis, WaterFull and Dry on these eight meshes:

| Object             | Morph purpose                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------- |
| Body Cube          | Wider, deeper mid-body; integrated shirt, collar and pants follow it; lower legs remain fixed |
| Cube               | Both sleeves and shoulder roots follow swelling; offsets fade before the wrists               |
| Sphere             | Both eyes translate slightly outward and forward without inflation                            |
| Cube.005           | Upper eyelids and lashes follow the eyes, preserving Mirror seams                             |
| Sphere.001         | Lower eyelids follow the eyes, preserving Mirror seams                                        |
| Cube.001, Cube.002 | Teeth translate to follow the expanded face                                                   |
| Tie Cube           | Tie follows the shirt expansion; Dry draws it slightly inward                                 |

Dry uses the normal Basis as its reference. It narrows and thins the sponge,
shirt and pants in the torso region while preserving height and keeping the
lower legs and shoes stable. Arms and sleeves shrink slightly across their
cross-section. Eyes, lids and teeth move inward a small amount. The eyelid
meshes keep their existing Mirror seams by following with a rigid offset.
Dry is present on each of the eight listed meshes; shoes remain rigid.

Shoes have no morph. Basis equals the original normal mesh. Only shape-key
coordinates were added: base topology, weights, vertex groups, parenting,
material assignments and the existing armature/modifiers are unchanged.
The existing degenerate geometry was retained.

Set the same state value on all eight meshes. Keep Dry and WaterFull mutually
exclusive in gameplay. Both keys were tested at zero, independently at one,
and together at one for technical stability. The simultaneous state is not a
normal gameplay state. No driver, animation, Action or keyframe was created.
The saved file is neutral with both keys at zero.

## Verification

The five values 0, 0.25, 0.5, 0.75 and 1 were checked in the viewport and evaluated
for finite positions and stable vertex counts. At full swelling, temporary
20-degree shoulder raises with 35-degree forward elbow bends, 15-degree knee
bends, and an 8-degree body bend with a 5-degree chest twist were tested.
Front and side inspections found no severe clipping or detached clothing/face.
All pose matrices and rotation modes were restored. The original scene
fingerprint and unchanged Basis coordinates were verified afterward.

Dry reached 8.8% narrower and 8.1% thinner at value 1; evaluated height was
unchanged. The values 0, 0.25, 0.5, 0.75 and 1 passed finite-position and
stable-vertex-count checks. Both arms/elbows, knees and torso were posed with
Dry at 1. No severe clipping or detached clothing/face appeared in front and
side inspections. WaterFull coordinates, Basis, topology, weights, parenting,
materials and rig matched the pre-Dry audit. The rig and both key values were
restored to neutral; zero Actions remain.

The backups and diagnostic screenshots/reports remain local in .hack/.
Run scripts/create-waterfull.py only on the original unkeyed character. Run
scripts/create-dry.py on the verified WaterFull setup. Each refuses to overwrite
an existing backup or its own keys. Run scripts/verify-waterfull.py and
scripts/verify-dry.py to repeat their temporary tests.

The game GLB contains evaluated static geometry plus both exported morph
targets. Dry and WaterFull remain editable in Blender. The game maps stored
sponge water to three mutually exclusive
states: empty is Dry, half capacity is Normal, and full capacity is WaterFull,
with smooth morph transitions between them. The GLB contains static evaluated
geometry and morph targets; it has no armature or animation clips yet. Movement
animation can be added later from the Blender source. Arbitrary extreme poses
can still intersect the broad body, as documented in rigging.md.
