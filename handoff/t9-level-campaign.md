# T9 — Basel level campaign

Status: done

Goal: implement the supplied arrival, four neighbourhood chapters and ending with automatic achievement-based progression and replaceable placeholder layouts.

Done: recorded design/plan before coding; added shared level/campaign contracts, the complete supplied German narrative, neighbourhood goals and escalating weather, conserved runoff connections, protected entrance markers, recycling, automatic progression, entry checkpoints and paused story/ending screens. Existing tools/audio/scenery remain in use. Fixed the Sound button's pointer handling and bounded the mission checklist above the dock on short screens.

Verification: production/type build, formatting, documentation and whitespace checks pass. 26 unit tests cover a legal strategy through all four production levels, conserved water, incomplete achievement gates, retained upgrades/funds, route validation, entrances, shade connectivity and recycling. All 11 browser checks are verified: the full ten-test regression suite passed, then all three campaign checks passed after adding the level-two failure/retry check. Browser progression uses zero-threshold fixture goals to exercise the real game loop; production goals are covered by the legal simulation strategy. Inspected story, ending and short-screen screenshots in /tmp/sponge-campaign-_.png and /tmp/sponge-aero-_.png.

Next: replace placeholder coordinates/entrances when actual level topology/geography is supplied; preserve stable plot IDs for carried improvements and retest goals/routing. Demo preparation remains proposed in the plan.

Limits: all four levels currently reuse the sixteen-plot grid. Existing Basel model is background scenery; roofs are ground-level props and runoff is illustrative. Entrance goals check present surface water after surviving a storm, rather than surveyed inundation throughout it. No persistence or dependencies added.

Resume: Read docs/plan.md T9, docs/design.md, config/levels.ts and this handoff before replacing level layouts or extending the campaign.
