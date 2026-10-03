# T17 Shift sprint
Status: done
Done: recognize physical left/right Shift, logical Shift with missing codes, and modifier state held before mouse capture. Running stays 9 m/s versus 5 m/s walking; release restores walking. Footer displays RUNNING while Shift is active. Sprint also reaches the authoritative co-op server; Läckerli multiplies sprint speed.
Checks: unit input edge cases and co-op speed assertions pass. Real browser test holds Shift before capture, observes speed above 8.5 m/s, releases it and returns to 5 m/s. Main game browser verifies RUNNING indicator and release. All 66 unit/API tests, 21 browser cases and build pass.
Next: done.

Final shared-ground integration: build and all 66 unit/API tests pass; all seven affected browser checks pass (missions/progression/retry, full gameplay/reset, imported ground/map, co-op and progressive tools). Earlier full 21-case browser coverage retained; shared ground and mission cleanup preserved. Privacy and documentation checks pass.
