# Level builder visibility and safe history

State: implementation and verification are complete on `feat/level-builder-safe-history`; final privacy check and Git save/share steps remain.

Done: editor markers now sample terrain using world coordinates transformed from the active scenery pose. Drafts save in browser storage, Test play stays in memory, Apply explicitly updates the generated saved level after recording the previous state, and Restore can reinstate any of the last 30 snapshots. The dev-only Vite API stores snapshots in `config/built-levels/history/`; restoring the initial built-in state removes that level's override.

Verified: 129 unit tests, production build, 3 targeted Playwright builder tests, `scripts/doc-check.sh`, and `git diff --check` pass. Existing Vite import-extension and large-chunk warnings remain.

Next: run `bash scripts/hack-guard.sh --staged`, commit on this feature branch, then follow the repository's standing authorization to share the verified change with the team.

Resume prompt: Continue the level builder safe-history change from `feat/level-builder-safe-history`; run the staged privacy guard, commit, and share the verified change with the team.
