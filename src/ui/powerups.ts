import { powerupConfig } from "../../config/powerups";
import type { CityState } from "../interfaces";
/** One slot: carried charge, active countdown, or empty. */
export class PowerupUI {
  private buttons: HTMLButtonElement[] = [];
  constructor(activate: () => void) {
    for (const id of ["powerup-bag", "powerup-guide"]) {
      const button = document.createElement("button");
      button.className = "pickup-slot";
      button.onclick = activate;
      document.getElementById(id)!.append(button);
      this.buttons.push(button);
    }
  }
  render(s: CityState): void {
    const id = s.powerups.held ?? s.powerups.active,
      item = powerupConfig.items.find((item) => item.id === id);
    for (const button of this.buttons) {
      button.disabled = s.outcome !== "playing" || !s.powerups.held;
      button.classList.toggle("boost-active", !!s.powerups.active);
      button.classList.toggle("boost-ready", !!s.powerups.held);
      button.innerHTML = `<span aria-hidden="true">${item?.icon ?? "✨"}</span><b>${item?.name ?? "NO BOOST"}</b><small>${s.powerups.held ? "Q · ACTIVATE ONCE" : s.powerups.active ? `${Math.ceil(s.powerups.remaining)}s ACTIVE` : "FIND A GROUND DROP"}</small><kbd>Q</kbd>`;
      button.title =
        item?.description ??
        "Pick up a drop. Q activates it once. A new pickup replaces the old boost.";
      button.setAttribute(
        "aria-label",
        `${item?.name ?? "No boost"}: ${s.powerups.held ? "press Q to activate" : s.powerups.active ? `${Math.ceil(s.powerups.remaining)} seconds active` : "find a ground drop"}`,
      );
    }
  }
}
