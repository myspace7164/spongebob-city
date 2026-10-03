# T16 Progressive tools
Status: done
Done: level 1 offers absorb/spray/karate/rain gardens; trees unlock in level 2, roofs/shade in level 3, ponds/tanks in level 4. Gray locked slots overlay a lock and remaining-level count. Guide shows available tools first and hides locked-use instructions. Shared rule validates clicks, keyboard and server actions. Short mission checklist retains full advancement requirements; heat/flood targets remain in safety readings.
Checks: all 66 unit/API tests and 21 browser cases pass; both flat and real-terrain legal strategies complete four levels. Browser verifies gray locks, disabled selection and keyboard rejection. Production build passes.
Latest integration: entrance drying is removed; roof-route goals remain only in the final level.
Next: done; config/progression.ts controls unlock order.

Final shared-ground integration: build and all 66 unit/API tests pass; all seven affected browser checks pass (missions/progression/retry, full gameplay/reset, imported ground/map, co-op and progressive tools). Earlier full 21-case browser coverage retained; shared ground and mission cleanup preserved. Privacy and documentation checks pass.
