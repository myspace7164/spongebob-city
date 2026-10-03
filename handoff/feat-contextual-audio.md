# Contextual game audio

Status: done

Goal: integrate @aureaphi's eight uploaded WAV files by filename context and organise project assets.

Done: moved all root WAV files into public/audio with descriptive names; added config/audio.ts and src/game/audio.ts; wired successful construction, water transfers, maximum absorption and weather to sound. Pause, hidden tabs and outcomes stop playback; M and the header Sound button toggle mute. Added the shared CitySound type and documented the layout, source and decision.

Verification: integrated campaign/map build, formatting, 28 unit tests, all 11 browser checks (including decoding all eight sound clips and successful action/pause/mute behavior), documentation and privacy checks pass. The Sound button now accepts pointer input.

Next: try the contextual sound in the game; source/licence limits remain recorded below.

Known limits: sound provenance/licence beyond the team upload is not recorded. No audio dependencies added. Existing sandbox modules remain reusable foundation code as described in docs/design.md.
