# Blender character source and export

State: done; assets and scripts verified and integrated with shared main.

Goal: keep the edited Blender project and its GLB output in the repository.

Done: saved assets/blender/spongebob.blend and public/models/spongebob.glb;
restored Tie Cube from the original file while preserving shirt and sleeve
colors; swapped the collar to blue on the left and red on the right.
Added a repeatable export script, source/output documentation,
backup ignores and standing authorization for automatic fast-forward pulls.
Created the approved 19-bone Character Rig with the torso, arms, legs, eyes
and jaw hierarchy. Mesh snapshots before and after match; meshes remain unbound.

Checks: build, 19 tests, formatting, doc-check and git diff --check passed.
GLB loads with Three.js at 1.9 units tall with feet at the origin. Mesh snapshots
match before and after armature creation. Local setup is now complete.

Next: bind and weight the meshes only when requested. The existing topology
issues identified in the read-only inspection still need review before deformation.

Notes: Sphere.001 has a distant origin but geometry beside the face; the export
now includes it. Camera, light and the unbound armature are excluded from GLB.
Portable materials use existing shirt face assignments. The game still
uses its procedural character until its optional character URL is configured.

Resume: inspect these files and the live Blender scene before regenerating assets.
