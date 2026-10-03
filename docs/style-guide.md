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
- Mission: a playful checklist and abstract four-stop route, with explicit completed checks; scroll within the bounded panel on short screens. The operation banner stays inside the panel and wraps, with no negative margin or rotation to clip it.
- Wallet: prominent gold card above the mission, large tabular coin count and explicit available-coins label. Grants bounce the wallet and scatter three coins, with a brief funding receipt and original rising chime. Reduced motion uses the receipt without movement; mute silences the chime.
- Campaign story: short, punchy English lines beside the original vector sponge; the mascot bobs during paced text and wah-wah gibberish, then settles. Start stays visible and can skip speech. Reduced motion disables bobbing; full text is available to assistive technology.
- Tool dock: raised aqua tiles, numbered corner badges, selected yellow tile and “EQUIPPED” label.
- Feedback: speech bubble; abilities: individually readable power pills.
- Player: relaxed idle arms, alternating walking limbs, faster Shift sprint, white teeth and a recognisable held miniature matching the selected tool. Equipment follows the moving right hand.
- Dr. Beton: dark angular coat/cape, red glowing eyes, slanted brows and toothed grin. Roaming cart follows the terrain; a red path, animated roller and sealing shake telegraph attacks before the plot changes. Gameplay pause freezes all actor animation.
- Guide/results: light glass panels with bold headings and illustrated metric cards.

Tone: enthusiastic, corny and concise. Keep instructions factual; “I'm ready!” can be playful, but tool names and costs remain clear. Use original vector/CSS artwork; no imported cartoon art or external fonts.

Accessibility: target at least 4.5:1 body-text contrast, use visible keyboard focus, hide ornaments from assistive technology, and respect reduced-motion settings. Selection uses a label and outline as well as colour. Small windows compact the chrome; pointer-lock gameplay remains desktop only.

Living reference: `docs/design/style-sample.html`, served locally by Vite at `/docs/design/style-sample.html`, reads the same theme and component CSS. The running mission is the interactive reference.

Current HUD: compact colorful gauges with labels and values inside; a readable gold wallet and brief three-coin funding receipt. Avoid continuous flashing or motion. Account/lobby/leaderboard copy is English; usernames are inserted as text.

Ground boosts use original miniature props with gentle bobbing. One slot distinguishes gray empty, gold held and mint active states. Q activates once; H also offers activation. New drops are sparse. Locked inventory tiles are gray with a lock and remaining-level count; only available tools are introduced as usable. Sealed plots are dark with pale markings; open plots have bright green edges.
