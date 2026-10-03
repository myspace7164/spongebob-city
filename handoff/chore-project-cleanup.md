# Project cleanup

Status: done

Done: removed the unmounted T2 placeholder inventory/shooting/block-placement prototype and its dedicated tests/contracts; kept the active city construction UI. Removed confirmed unused locals/imports, made companion interaction labels appear only nearby, consolidated the duplicated sources register, and corrected historical docs.

Deleted: `config/items.ts`, `src/game/inventory.ts`, `src/game/sandbox.ts`, `src/ui/inventory.ts`, `tests/inventory.test.ts`, `tests/sandbox.test.ts`.

Verification: all 98 unit tests pass, TypeScript/lint and production build pass, Prettier and strict doc checks pass. The browser city smoke test renders the initial city screenshot but times out later during a canvas screenshot under the configured software-rendering browser; the same canvas-screenshot timeout was recorded before this task. The focused hat-shop browser test also timed out after the browser session closed during a text assertion; its captured page showed all six cards and prices. No hat-shop code changed.

Next: none for cleanup. Local Blender files remain untracked and were not staged.
