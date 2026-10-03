# T11 — Prominent wallet and city funding

Status: done

Goal: make available coins obvious and reward useful actions with spendable grants, sound and animation.

Done: saved design and plan before implementation. T10 is merged and pushed, preserving the team's Blender model and real Riehenring street. Added grant ledger, productive-action rewards, prominent wallet, flying coin burst/receipt and synthesised rising chime. Each level loops its supplied stage track; rain reduced to 8%. Build and 36 unit tests pass.

Verification: build/types and all 36 unit tests pass. All 13 browser tests pass, including real-model gameplay, all four stage tracks, quiet rain, mute/pause, progression, briefing lifecycle and viewport layouts. The final wallet check additionally passes after compact spacing changes: no meter overlap at 1440×900, 1024×640 or 1024×600. Verified actual spendable grants, once-only claims, recycle/sabotage anti-farming, ledger reset, three rising chime notes, flying coin animation, mute and reduced motion. All five supplied WAVs have valid 180-second stereo PCM data; the first four decode in Chromium. Formatter/docs/whitespace checks pass. Inspected `/tmp/sponge-aero-1440-900.png` and `/tmp/sponge-funding-wallet.png`.

Next: adjust grant amounts in config/funding.ts after playtesting; replace remaining placeholder geography when available.

Limits: grants and simulation values are fictional. Each action/site grants once per level, rather than per held-input frame. Level five's supplied track is reserved because the campaign has four levels. Audio is locally synthesised for coins; supplied tracks retain their original WAV format. Actual geography for the other three levels remains pending. No dependencies added.
