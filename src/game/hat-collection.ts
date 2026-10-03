import { hats } from "../../config/hats.ts";
import type { CityState } from "../interfaces.ts";

const key = "sponge-city-hats";

/** Restore solo cosmetics; malformed or unavailable browser storage is harmless. */
export function restoreHatCollection(
  state: CityState,
  storage: Pick<Storage, "getItem">,
): void {
  if (!state.campaign) return;
  try {
    const saved = JSON.parse(storage.getItem(key) ?? "null");
    if (!saved || !Array.isArray(saved.owned)) return;
    const owned = hats
      .filter((hat) => saved.owned.includes(hat.id))
      .map((hat) => hat.id);
    state.campaign.ownedHats = owned;
    state.campaign.equippedHat = owned.includes(saved.equipped)
      ? saved.equipped
      : null;
  } catch {
    /* Storage may be disabled or contain an older invalid value. */
  }
}

/** Store cosmetic ownership only; this never restores coins or campaign progress. */
export function saveHatCollection(
  state: CityState,
  storage: Pick<Storage, "setItem">,
): void {
  if (!state.campaign) return;
  try {
    storage.setItem(
      key,
      JSON.stringify({
        owned: state.campaign.ownedHats ?? [],
        equipped: state.campaign.equippedHat,
      }),
    );
  } catch {
    /* The collection still survives retries when storage is unavailable. */
  }
}
