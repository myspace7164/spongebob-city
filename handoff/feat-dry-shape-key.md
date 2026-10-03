# Dry shape key

Created Dry relative to Basis on Body Cube, Cube, Sphere, Cube.005,
Sphere.001, Cube.001, Cube.002 and Tie Cube. WaterFull data hashes matched
before/after; topology, weights, parenting, materials and rig matched the
original scene fingerprint. Details and tests: docs/water-states.md.

Dry reduces evaluated Body Cube width 8.8% and depth 8.1%, preserving height.
Limbs remain stable; arms/sleeves shrink slightly. Face parts follow inward.
Mirror seam vertex counts remain stable after using a rigid eyelid offset.
All five values, normal and WaterFull combinations, plus arm/elbow, knee and
torso poses passed. Both keys are zero, pose neutral, zero Actions/keyframes.

Saved Blender source and normal-state static GLB. Backup and captures are local
in .hack/backups/before-dry.blend and .hack/dry-tests/.

GitHub push may need interactive HTTPS authentication. Do not share credentials
in chat. Skeletal morph-target export remains separate work.
