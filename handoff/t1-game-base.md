# T1 — Webgame foundation

State: implementation complete; build, type and movement checks pass. Browser visual verification blocked by the execution environment.

Done: modular Three.js/TypeScript sandbox with camera-relative walking, sprint, jumping, recycled ground, pointer-lock pause, reset, lazy Blender model loading and README. Dependencies installed and locked; production output generated in dist/.

Verified: npm test (5 movement tests), npm run lint, npm run build, formatting and bash scripts/doc-check.sh. Starter JS is approximately 145 KB gzip; optional GLTFLoader chunk approximately 13.5 KB gzip.

Browser check: npm run test:browser starts Chromium after resolving the host's Nix libraries. Both default SwiftShader and software-only SwiftShader fail to create a WebGL context (BindToCurrentSequence failed). No successful visual or pointer-lock verification is claimed. The test covers rendering, input, reset and pause, and remains runnable on a supported desktop host.

Next: npm run dev, then manually verify movement, jump, camera, reset and pause in a desktop WebGL 2 browser. Add GLB paths in config/game.ts when exports are available. Local hack-start setup is awaiting the GitHub username; no profile, commit or push created.

Limits: desktop controls, flat ground collision only; imported level meshes have no collision; exported animations are not yet played. Browser test reports are gitignored.
