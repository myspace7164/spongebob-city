# Blender character source and export

State: done locally on main; GitHub push pending authentication.

Goal: keep the edited Blender project and its GLB output in the repository.

Done: saved assets/blender/spongebob.blend and public/models/spongebob.glb;
restored Tie Cube from the original file while preserving shirt and sleeve
colors; swapped the collar to blue on the left and red on the right.
Added a repeatable export script, source/output documentation,
backup ignores and standing authorization for automatic fast-forward pulls.
Created the approved 19-bone Character Rig with the torso, arms, legs, eyes
and jaw hierarchy. Mesh snapshots before and after armature creation matched.
Subsequent binding is recorded in handoff/feat-character-skinning.md and docs/rigging.md.

Checks: build, 19 tests, formatting, doc-check and git diff --check passed.
GLB loads with Three.js at 1.9 units tall with feet at the origin. Mesh snapshots
match before and after armature creation. Local setup is now complete.

Next: follow the skinning handoff for the current binding state. The original
topology defects remain and should be reviewed before shape-key creation.
First finish sharing: sign in to GitHub using a local Git client, then run
`git push origin main`. The attempted push failed because HTTPS credentials
were unavailable; no repository changes were uploaded. All work is committed.

Notes: Sphere.001 has a distant origin but geometry beside the face; the export
now includes it. Camera, light and the armature are excluded from the static GLB.
Portable materials use existing shirt face assignments. The game still
uses its procedural character until its optional character URL is configured.

Resume: inspect these files and the live Blender scene before regenerating assets.
