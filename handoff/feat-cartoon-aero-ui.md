# Cartoon / Frutiger Aero UI

State: done; ready for automatic commit, merge and push from feat/cartoon-aero-ui.

Goal: replace the plain dark HUD with a playful SpongeBob-inspired cartoon and glossy aqua interface.

Done: sponge-yellow welcome card and outlined lettering, original inline SVG mascot and flower mask, glossy glass HUD/meters/tool dock, speech bubbles, selected-tool badges, power pills, brighter guide/results, keyboard focus, completed-goal labels and reduced-motion support. Light surfaces use dark text; checked representative contrast pairs at 4.97:1 or higher. Short windows compact the welcome/mission, and the guide scrolls tools while keeping its close control visible. Updated README, sources, design and docs/style-guide.md; local component sample in docs/design/style-sample.html. No dependencies or gameplay/model changes.

Verification: production/type build, formatter, 19 unit tests and five Chromium browser tests passed. Browser checks exercise gameplay, pause/reset, layout/entry at 1440×900, 1024×640 and 1024×600, visible guide close controls and reduced motion. Inspected welcome and guide screenshots in /tmp/sponge-aero-*.png. Documentation and diff checks pass.

Next: use npm run dev to try the new look. Automatic commit, merge and push are authorized; do not disable privacy hooks.

Notes: all artwork is original CSS/vector geometry; no external art or fonts. Preserve pointer-lock input and the existing element IDs. Keep decorative overlays from intercepting input.
