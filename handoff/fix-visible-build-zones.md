# Visible dry-state build zones

Status: done

## Goal

Make plots readable when dry and preserve a clear distinction between unsealed build sites and sealed sites that need unsealing.

## Done

- Dry soil and asphalt plots now show a shallow ground-matched tint; selection strengthens the tint.
- Longer green corner marks identify open build plots; amber corner marks identify sealed plots that need unsealing.
- Markers remain terrain-conforming and disappear after infrastructure is built.

## Checks

- Build, lint, 107 unit tests, and the focused all-level browser check pass.
- The rendered screenshot was reviewed; the marking is visible without any raised side faces.

## Next

- No follow-up needed. Ready for the standard privacy check, commit, merge to `main`, and push.
