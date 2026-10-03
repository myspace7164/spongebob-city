const key = "sponge-city-hats";

/** Remove legacy persisted cosmetics when a run ends; hats are run-only. */
export function clearSavedHatCollection(
  storage: Pick<Storage, "removeItem">,
): void {
  try {
    storage.removeItem(key);
  } catch {
    /* Storage may be unavailable; the run state is still cleared in memory. */
  }
}
