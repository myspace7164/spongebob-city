# Character binding

The existing 19-bone Character Rig controls the original ten character meshes.
No vertex positions, edges, faces, proportions, material slots or object names
were changed. No topology cleanup, joining, shape keys or animation were added.

## Bindings

| Object | Method | Bones |
|---|---|---|
| Body Cube | Armature deformation before subdivision | Pelvis, Body, Chest, Thigh/Shin/Foot on each side |
| Cube | Armature deformation before subdivision | Chest at sleeve roots; UpperArm/Forearm/Hand on each side |
| Sphere | Armature deformation with unit weights for each eye component | Eye_L, Eye_R |
| Shoe cube | Bone parenting preserving the rest transform | Foot_L |
| Shoe cube.001 | Bone parenting preserving the rest transform | Foot_R |
| Cube.005, Sphere.001 | Bone parenting | Chest |
| Cube.001, Cube.002 | Bone parenting | Chest |
| Tie Cube | Bone parenting | Body |

Weights are normalized spatial blends with left/right isolation. They avoid
heat weighting on degenerate geometry. Sleeve roots remain attached to Chest;
elbows, wrists, hips, knees and ankles use transition bands. Eyes retain rigid
shapes while following their individual bones. Jaw exists but has no skin
influence yet; facial pieces follow Chest.

The existing red/blue shirt materials retain their names, colors and face
assignments. Their shader split now reads a point attribute containing original
fabric X coordinates, so the split follows skinning instead of sliding across
the deformed cloth. No new material was created.

## Verification

All vertices in the three weighted meshes have normalized usable weights.
There are no opposite-side influences, empty groups, duplicate Armature
modifiers or additional armatures. Neutral evaluated vertex positions agree
with the pre-binding state within 0.00002 Blender units.

Temporary tests cover both 60-degree shoulder raises, 70-degree forward elbow
bends, each thigh at 20 degrees with a 25-degree knee bend, both knees,
a 12-degree torso bend plus 8-degree chest twist, and 15-degree eye turns.
All bones return to their previous neutral transforms, with zero Actions.

Degenerate geometry remains unchanged. It did not prevent this controlled
binding, but should be reviewed during shape-key verification. Strong arm
folds toward the wide body can intersect its surface; there is no collision
constraint or IK system. This binding does not claim collision-free arbitrary
poses. WaterFull and Dry must still be verified before creation.

Run the binding/verification scripts inside Blender using the same script
execution pattern documented in public/models/README.md. The backup and pose
diagnostics stay local in .hack/. The GLB is a static evaluated snapshot;
skeletal export is a separate task.
