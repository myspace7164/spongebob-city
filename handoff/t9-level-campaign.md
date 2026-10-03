# T9 — Basel level campaign

Status: done

Follow-up: T10 supersedes the full-length briefings and carried improvements described below. Levels now reset in distinct fictional locations; see handoff/t10-level-briefings.md for current behavior.

Goal: implement the supplied arrival, four neighbourhood chapters and ending with automatic achievement-based progression and replaceable placeholder layouts.

Done: recorded design/plan before coding; added shared level/campaign contracts, the complete supplied German narrative, neighbourhood goals and escalating weather, conserved runoff connections, protected entrance markers, recycling, automatic progression, entry checkpoints and paused story/ending screens. Existing tools/audio/scenery remain in use; merged the latest team roads and aerial imagery, resolving the startup import conflict by preserving both features. Fixed the Sound button's pointer handling and bounded the mission checklist above the dock on short screens.

Verification: production/type build, formatting, documentation and whitespace checks pass. 28 unit tests (including the newly shared map layers) cover a legal strategy through all four production levels, conserved water, incomplete achievement gates, retained upgrades/funds, route validation, entrances, shade connectivity and recycling. All 11 browser checks pass together after integrating the latest shared roads and imagery, including story/pause, automatic progression/ending, level-two failure/retry, audio, controls, three viewport layouts, map loading and fallback. Browser progression uses zero-threshold fixture goals to exercise the real game loop; production goals are covered by the legal simulation strategy. Inspected story, ending and short-screen screenshots at `/tmp/sponge-campaign-story.png`, `/tmp/sponge-campaign-ending.png` and `/tmp/sponge-aero-1024-600.png`.

Next: replace placeholder coordinates/entrances when actual level topology/geography is supplied; preserve stable plot IDs for carried improvements and retest goals/routing. Demo preparation remains proposed in the plan.

Limits: all four levels currently reuse the sixteen-plot grid. Existing Basel model is background scenery; roofs are ground-level props and runoff is illustrative. Entrance goals check present surface water after surviving a storm, rather than surveyed inundation throughout it. No persistence or dependencies added.

Resume: Read docs/plan.md T9, docs/design.md, config/levels.ts and this handoff before replacing level layouts or extending the campaign.
