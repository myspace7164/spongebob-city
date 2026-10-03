# Sponge City visual style

Direction: cartoon sponge adventure meets Frutiger Aero. Chosen from a flat comic direction, a pure glossy aquarium direction, and their combination; the combination expresses the user's requested cartoon, cheesy, glossy mood.

## Principles

1. Be joyfully excessive: chunky outlined titles, wonky stickers, sponge pores, flowers and bubbles.
2. Make controls feel touchable: glassy aqua surfaces, bright highlights, thick outlines and raised buttons.
3. Keep the square playable: ornaments ignore pointer input, key numbers remain obvious, dangers show text and icons, and overlays fit shorter desktop windows.

## Tokens and components

All visual values live in `src/ui/theme.css`; component rules live in `src/ui/style.css`. Body text uses `--font`; playful headings use `--font-display`. Primary text is dark `--text` on light `--panel`; `--accent` and `--sponge` supply yellow, `--aqua` supplies blue glass, and `--coral` marks heat and emergencies. The existing world palette retains its roles.

Use `--panel-gradient` for glass panels, `--button-gradient` for yellow call-to-action buttons, `--tool-gradient` for glossy tool tiles, and `--shadow-panel`/`--shadow-button` for depth. Spacing and type use the theme scale; `--outline` gives the cartoon contour.

- Logo: tilted sponge-yellow lettering with a blue outline, tiny Basel ribbon.
- Welcome: a yellow sponge-textured card, original inline vector mascot and an “I'm ready!” button.
- Meters: separate warm/cool/sponge colours, glossy tracks, large numeric values.
- Mission: a playful checklist and coin purse, with explicit completed checks.
- Tool dock: raised aqua tiles, numbered corner badges, selected yellow tile and “EQUIPPED” label.
- Feedback: speech bubble; abilities: individually readable power pills.
- Guide/results: light glass panels with bold headings and illustrated metric cards.

Tone: enthusiastic, corny and concise. Keep instructions factual; “I'm ready!” can be playful, but tool names and costs remain clear. Use original vector/CSS artwork; no imported cartoon art or external fonts.

Accessibility: target at least 4.5:1 body-text contrast, use visible keyboard focus, hide ornaments from assistive technology, and respect reduced-motion settings. Selection uses a label and outline as well as colour. Small windows compact the chrome; pointer-lock gameplay remains desktop only.

Living reference: `docs/design/style-sample.html`, served locally by Vite at `/docs/design/style-sample.html`, reads the same theme and component CSS. The running mission is the interactive reference.
