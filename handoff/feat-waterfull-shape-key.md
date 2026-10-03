# WaterFull shape key

Completed WaterFull on Body Cube, Cube, Sphere, Cube.005, Sphere.001,
Cube.001, Cube.002 and Tie Cube. The normal Basis and existing rig are unchanged.
Details and verification limits live in docs/water-states.md.

Saved assets/blender/spongebob.blend with all WaterFull values zero and neutral
bones; refreshed the static normal public/models/spongebob.glb.
Local backup: .hack/backups/before-waterfull.blend.
Local screenshots and numerical reports: .hack/waterfull-tests/.

Five morph stages plus both arms/elbows, knees and torso passed. Eyelid key
coordinates were corrected to preserve Mirror seams. No topology cleanup,
weight changes, Dry, Actions or keyframes. Final original-state fingerprint
matched the pre-morph state. Large eyelid object-origin coordinates produce
up to 0.000016 units of evaluated floating-point noise at normal restoration.

GitHub push has previously been blocked by missing HTTPS authentication.
Retry after signing in through a Git client; do not share credentials in chat.
Next: inspect/authorize Dry separately; game morph export remains separate.
