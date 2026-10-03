# Contextual game audio

State: verifying.

Goal: integrate @aureaphi's eight uploaded WAV files by filename context and organise project assets.

Done: moved all root WAV files into public/audio with descriptive names; added config/audio.ts and src/game/audio.ts; wired successful construction, water transfers, maximum absorption and weather to sound. Pause, hidden tabs and outcomes stop playback; M and the header Sound button toggle mute. Added the shared CitySound type and documented the layout, source and decision.

Next: run formatter, unit tests, production build, browser checks and documentation/privacy guards; review, commit, merge into main and push under standing authorization.

Known limits: sound provenance/licence beyond the team upload is not recorded. No audio dependencies added. Existing sandbox modules remain reusable foundation code as described in docs/design.md.
