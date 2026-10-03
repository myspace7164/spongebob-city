# Hat collection and performance

Status: done

Done: hats charge once and offer free selection; ownership and selection survive losses, retries and levels. Solo collections persist across browser reloads; co-op collections belong to the room and purchases use the server wallet. Removed repeated recursive city matrix updates and requested the high-performance GPU. Updated the stale equipment-test tool order. Standing branch cleanup preference recorded in AGENTS.md.

Verification: production build and TypeScript pass; six focused browser checks pass (collection/reload, transform benchmark, imported/fallback equipment, buddy visuals/audio). The 120-update animation benchmark reduced redundant recursive visits from 304,320 to zero and elapsed time from 51 ms to 7.2 ms; this is CPU animation work, not an end-to-end FPS measurement. Unit/API and strict doc checks pass.

Next: no implementation work remains. Co-op collections are room-scoped; solo persistence depends on browser storage.
