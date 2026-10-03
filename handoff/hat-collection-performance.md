# Hat collection and performance

Status: done

Done: hats charge once and offer free selection; ownership and selection survive losses, retries and levels. Solo collections persist across browser reloads; co-op collections belong to the room and purchases use the server wallet. Removed repeated recursive city matrix updates and requested the high-performance GPU. Updated the stale equipment-test tool order. Standing branch cleanup preference recorded in AGENTS.md.

Verification: production build and TypeScript pass; seven focused browser checks pass (collection/reload, transform benchmark, imported/fallback equipment, buddy visuals/audio, blended build zones). The 120-update animation benchmark reduced redundant recursive visits from 274,080 to zero and elapsed time from 55.6 ms to 4.9 ms; this is CPU animation work, not an end-to-end FPS measurement. All 110 unit/API tests and strict doc checks pass. Integrated the latest shared render-loop fix, which moves static scenery/collider refreshes out of ordinary frames.

Next: no implementation work remains. Co-op collections are room-scoped; solo persistence depends on browser storage.
