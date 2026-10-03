# Level builder v2 (local test branch)

Status: in progress

Branch: local `test/level-builder-v2`, now includes current team `origin/main` through `4cfcd6a`. Still local and unpushed.

Done: builder ported onto current main (data layer, per-level spawn/facing/characters, free-mouse editor, area map, save endpoint merged into main's vite.config.ts via ssrLoadModule). Safety: loads only in `npm run dev` with VITE_LEVEL_BUILDER=1 or `?builder`; refused/closed in an online room (`network.room`); not in production bundle. Without saved levels the game is unchanged (test). Usability: status feedback for every click, 🗑 delete button, clickable spot list. Node 24 needed (~/.local/node-24/bin).

Verified against current main: 115 unit tests pass on Node 24; production build passes; the new browser smoke test passes for default-off behavior, editor opening, spot selection and co-op refusal. Build reports existing Vite import-extension and chunk-size warnings. Earlier browser checks on the older base covered placement/deletion, undo and test play.

Next: commit the verified changes on this branch, fast-forward current `main` to the completed feature, then push `main` to the team remote. The staged privacy guard passed; README documents local development use and generated saved-level config.
