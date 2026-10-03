# Level builder visibility and safe history

State: done. Implemented on `feat/level-builder-safe-history` and merged into `main` as `b4a5717`.

Done: editor markers now sample terrain using world coordinates transformed from the active scenery pose. Drafts save in browser storage, Test play stays in memory, Apply explicitly updates the generated saved level after recording the previous state, and Restore can reinstate any of the last 30 snapshots. The dev-only Vite API stores snapshots in `config/built-levels/history/`; restoring the initial built-in state removes that level's override.

Verified: 129 unit tests, production build, 3 targeted Playwright builder tests, `scripts/doc-check.sh`, and `git diff --check` pass. Existing Vite import-extension and large-chunk warnings remain.

Next: use `/?builder` in the dev server. Save a browser draft freely; Apply records the previous version, and Restore can bring it back. The first saved version is labelled `built-in level` and removes the builder override when restored.

Resume prompt: The level-builder safe-history change is complete. Continue from this handoff if a new builder issue comes up.
