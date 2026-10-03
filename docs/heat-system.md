# City heat

The simulation starts at 27°C. Each fixed step combines passive warming and
sealed-plot pressure with cooling from rain, watered trees, green plots, ponds
and shade. Dr. Beton's sealing phase adds temporary production pressure; once a
plot is sealed, its asphalt contributes ongoing pressure. Campaign warming is
scaled smoothly from 0.75× on the first level to 1.35× on the last, with the
intermediate values distributed across however many levels the campaign has.
The multiplier affects warming only, so cooling keeps its full strength.
`config/city.ts` contains the rates and limits. The HUD's heat-risk percentage
is derived from 27°C to the 60°C game-over point so existing mission goals
remain comparable.

SpongeBob's existing Dry morph begins blending in above 36°C and replaces
WaterFull gradually. Fires begin above 40°C, spawn on staggered temperature-based
timers, and grow more quickly as the city warms. A fire is tied to a plot; the
existing spray action consumes stored sponge water to lower its intensity.
Temperatures over 60°C lose the current level once with an overheating reason.
