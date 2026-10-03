# B bubble irrigation rate

State: done

Done: Holding B now delivers water through the shared spray action at 1.5× the normal rate. The multiplier is centralized in `config/city.ts`, so solo and authoritative multiplayer actions use the same behavior; regular spray is unchanged. Added a regression test for the 50% increase and water consumption.

Checks: `npm test` (128 passing), `npm run build`, `npm run lint`, and `git diff --check` pass.

Next: publish this verified change to `main`.
