# T10 — Short talking briefings and fresh levels

Status: done

Done: saved design/plan first; shortened German briefings and ending, reused the original vector mascot with timed bobbing/word reveal and synthesised wah-wah voice, bounded speech at 12 seconds, connected mute/start/hidden-tab cleanup. Levels reset all city state and move player, NPC interactions, props and scenery to distinct locations/layouts, including the team’s real Riehenring street. Mission banner now wraps inside its scroll panel.

Verification: build/types, 28 unit tests and all 12 browser tests pass, including four independent winning strategies, fresh state/location assertions, bounded speech and audio cleanup, mute/unmute, early start, reduced motion and banner visibility across three desktop sizes. Formatter and documentation checks pass.

Next: replace remaining fictional geography when available.

Limits: geography for levels 2–4 remains pending; backdrop assets are reused around each fictional stage. Voice is original synthesis, not a character recording. No dependencies added.

Integration: preserved Blender model/water states and real Riehenring street. Current integration is covered by 36 unit and 13 browser checks in T11; speech is tested with lightweight character fallback to keep timing predictable in software rendering.
