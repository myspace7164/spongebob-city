# Sock and sleeve rig attachment repair

Status: done. The live `assets/blender/spongebob.blend` was backed up locally
before the targeted edits, then saved with Idle active at frame 1, Dry and
WaterFull at zero, and exactly the existing Idle and Walk Actions.

The socks are material regions of `Body Cube`, not independent objects. Their
sock and stripe vertices now follow the corresponding shin, with a foot blend
only at the ankle. Sixteen chest-only inner shoulder seam vertices in `Cube`
were blended into their matching upper-arm groups. Sleeve vertices had no
opposite-arm weights before or after; each sleeve face region remains connected
to its arm surface.

Verification sampled Idle and Walk in Normal, Dry and WaterFull, raised each
arm with an elbow bend, checked stable vertex counts and finite evaluated
geometry, and confirmed each sock region moves with its own leg during Walk.
No shape-key geometry, topology, materials, bones or Actions changed. The
backup and viewport test captures remain local under `.hack/` and `/private/tmp`.

`python3 /private/tmp/run-blender-script.py scripts/fix-sock-sleeve-attachments.py`
repeats the targeted repair and checks.
