# Level modifiers

Successful campaign completion of a non-final level opens the weighted wheel. The player spins once, sees the result, then continues into the next level. The four positive outcomes each have weight 1.5 and the four negative outcomes each have weight 1, producing transparent 60% / 40% odds. `config/modifiers.ts` is the single source for names, icons, effects, weights and animation timing.

The selected ID is stored as `pendingModifier` during the intermission and moved to `activeModifier` only when `startNextCampaignLevel` starts the next stage. Simulation systems calculate effective speed, water capacity, absorption, rewards and heat from base tuning multiplied by the active effect. This avoids cumulative stat mutation. Dr. Beton speed also scales his movement and action timer; `angryBeton` adds temporary visual intensity over his level-based appearance. `miniSponge` scales the complete game character group.

Any end of the affected level clears the active modifier, including a loss. A failed stage never opens the wheel. The final campaign level has no following level, so it ends normally without a wheel. Retry starts the level without a modifier that has already expired.

The wheel and its Active Level HUD chip are implemented in `src/ui/modifier-wheel.ts` and `src/ui/city.ts`. Wheel tones use Web Audio and respect the existing mute toggle.

Co-op rooms choose and apply one shared modifier on the server at completion, then advance all players together. The solo wheel remains interactive. Ground collectible effects multiply with the level modifier. All display text is English.
