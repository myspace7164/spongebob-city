# Existing character skinning

State: done locally; bound source and static export saved and verified.

Goal: bind the existing character to Character Rig without remodeling,
cleanup, additional armatures, shape keys, Actions or keyframes.

Done: backed up the live scene locally; skinned Body Cube and Cube with
controlled normalized blends; assigned each eye component rigid unit weights;
bone-parented both shoes, eyelids, teeth and tie. Anchored the shirt shader's
existing color split to original fabric coordinates. Materials and geometry
remain intact. Integrated shared map/audio work without overwriting its docs.

Checks: weight audit found no unweighted vertices, abnormal totals or opposite
side influences. Both arms, elbows, legs, knees, torso and eye pose tests passed;
neutral geometry changed by less than 0.00002 units. All bones restored, zero Actions.
Production build, all 19 game tests, formatting, doc-check, Python syntax and
Three.js loading of the static snapshot passed.

Next: verify compatibility for WaterFull and Dry before creating shape keys.
No shape keys have been created. GitHub authentication was previously missing;
check push status before assuming the local work has reached GitHub.

Limits: topology defects remain. Extreme arm folds can intersect the wide body.
Jaw has no skin influence. No IK, collisions or animations. GLB remains static.

Resume: read docs/rigging.md and inspect the live rig before editing its weights.
