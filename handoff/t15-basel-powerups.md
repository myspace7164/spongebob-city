# T15 Basel power-ups
Status: done
Done: ten original collectible types include six Basel boosts and the four existing powers. One held/active slot; Q activates once. Another pickup cancels and replaces its previous effect. Each level starts with one Pore drop; subsequent drops appear every 60 seconds of active gameplay with at most one waiting on the ground. Patrick automatically clears nearby asphalt; Bell extends reach. Co-op claims/activation are authoritative. Water survives capacity expiry. Strong charcoal asphalt with pale markings contrasts with soil and bright green edges.
Checks: 66 unit/API/simulation tests, all 21 browser cases and production build pass on the combined game. Sparse drops, replacement, single-use effects, water conservation and co-op covered.
Next: done; use config/powerups.ts for durations/drop timing. Hosted deployment instructions in README.

Final shared-ground integration: build and all 66 unit/API tests pass; all seven affected browser checks pass (missions/progression/retry, full gameplay/reset, imported ground/map, co-op and progressive tools). Earlier full 21-case browser coverage retained; shared ground and mission cleanup preserved. Privacy and documentation checks pass.
