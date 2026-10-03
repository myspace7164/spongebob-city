# Level builder v2 (local test branch)

Status: in progress

Branch: local `test/level-builder-v2` (from main 172d03f, with co-op). Not pushed; the participant decides.

Done: builder ported onto current main (data layer, per-level spawn/facing/characters, free-mouse editor, area map, save endpoint merged into main's vite.config.ts via ssrLoadModule). Safety: loads only in `npm run dev` with VITE_LEVEL_BUILDER=1 or `?builder`; refused/closed in an online room (`network.room`); not in production bundle. Without saved levels the game is unchanged (test). Usability: status feedback for every click, 🗑 delete button, clickable spot list. Node 24 needed (~/.local/node-24/bin).

Verified: 108 unit tests incl. co-op on Node 24, build; browser: no builder without flag; with ?builder: list select, delete button, click place, right-click delete, undo, test play.

Next: participant tries it at http://localhost:5173/?builder; co-op browser check with a room open; README builder section (old text not yet ported); decide on pushing.
