# T2 — Controls and placeholder inventory

State: implemented; 11 logic tests and production build pass. Browser input regression passes; full visual verification still requires a usable WebGL context.

Done: printed-key normalization with physical fallback, canvas focus on entry, keyboard camera controls (IJKL), three-slot hotbar and paused E inventory panel, equipped placeholder visuals, Glock ammo/cooldown/reload/tracer, shootable orange targets, grid-snapped placement preview, bounded block supply and sandbox reset. Item definitions are in config/items.ts. Shared contracts and decision log updated.

Verification: npm test covers right movement, simultaneous look and held walking, keyboard look, pause input clear, ammo/reload/cooldown, placement constraints, actual raycast scene hits, placement and reset, plus prior movement tests. npm run lint and npm run build passed. Initial browser input test reached pointer lock and confirmed D/W events, but Playwright absolute mouse motion supplied no relative deltas; the passing test uses an explicit relative movement event for mouse-look while retaining real held keyboard input. Escape explicitly clears input and exits pointer lock; it is also verified by the browser test.

Original controls: no camera-right movement math defect reproduced. The user-side cause remains unconfirmed; asked whether they use a touchpad and which browser. libinput disable-while-typing is a likely cause only if a touchpad stops until movement keys are released. The game cannot override compositor input suppression.

NixOS: shell.nix provides packaged Chromium and exposes graphics driver libraries. playwright.config.ts accepts CHROMIUM_EXECUTABLE; software rendering flags only apply when SOFTWARE_WEBGL=1. No system NixOS config was changed and nix-shell was not executed here.

Next: verify complete scene and controls on the user's desktop with npm run dev, or nix-shell followed by npm run test:browser. Confirm browser/input-device details if the original issue persists.

Limits: Panhandle has no action, reserves are unlimited, targets and blocks vanish on one hit, levels/blocks have no movement collision, no persistence. No commit or push performed; initial local profile setup still awaits the GitHub username.
