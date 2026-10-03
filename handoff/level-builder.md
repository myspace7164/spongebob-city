# Level builder v2 (local test branch)

Status: done

Branch: local `main` includes the level-builder work and current team `origin/main` through `81001dc`. The final local merge is ready to push.

Done: builder ported onto current main (data layer, per-level spawn/facing/characters, free-mouse editor, area map, save endpoint merged into main's vite.config.ts via ssrLoadModule). Safety: loads only in `npm run dev` with VITE_LEVEL_BUILDER=1 or `?builder`; refused/closed in an online room (`network.room`); not in production bundle. Without saved levels the game is unchanged (test). Usability: status feedback for every click, 🗑 delete button, clickable spot list. Node 24 needed (~/.local/node-24/bin).

Verified against latest main: 124 unit tests pass on Node 24; production build passes; the browser smoke test passes for default-off behavior, editor opening, spot selection and co-op refusal. Custom builder character coordinates anchor the new wandering cast and Sandy's workshop. Build reports a Vite import-extension warning in the generated built-level index and a large client chunk warning. Earlier browser checks covered placement/deletion, undo and test play.

Usage: run `npm run dev` and open `/?builder`. Save writes validated level data to `config/built-levels/index.ts`; inspect that generated file before using it in a shared commit. The editor stays off in production and refuses to open in an online room. README documents the workflow.
