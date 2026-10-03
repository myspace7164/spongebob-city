# Idle and Walk locomotion base

Created looping 30 FPS Actions Idle (1-60) and Walk (1-30) in the existing
Character Rig. Neutral arms point down and outward naturally with slight elbow
bend; legs are relaxed. Walk is in-place, alternates legs and opposite arm
swing, and holds shoe height within about 0.20 Blender units across the cycle.
No Run/Jump/action animations created.

Both actions were checked with Normal, Dry, and WaterFull. Evaluated mesh points
remained finite and subdivision/mirror output stable; no major breaks seen.
Idle shoe-height variation was below 0.003. Water keys are zero, frame is 1,
Idle active, scene is neutral, and exactly two Actions exist. No rest bones,
shape-key geometry, topology, weights, or parenting were changed.

Saved assets/blender/spongebob.blend. Local backup and screenshots/reports are
in .hack/backups/before-locomotion.blend and .hack/locomotion-tests/.
The game GLB remains static with its water morph targets; animation export is
later work. Script: scripts/create-locomotion-actions.py.
