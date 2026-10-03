import type { InventoryState } from "../interfaces";
import { itemConfig } from "../../config/items";

/** Render inventory only when selection, quantities or feedback change. */
export class InventoryUI {
  private hotbar = document.querySelector<HTMLElement>("#hotbar")!;
  private panel = document.querySelector<HTMLElement>("#inventory-panel")!;
  private feedback = document.querySelector<HTMLElement>("#item-status")!;
  private signature = "";
  open = false;
  constructor(private onSelect: (index: number) => void) {}
  setOpen(open: boolean): void {
    this.open = open;
    this.panel.hidden = !open;
  }
  status(message: string): void {
    this.feedback.textContent = message;
  }
  render(state: InventoryState): void {
    const signature = `${state.selected}/${state.ammo}/${state.blocks}`;
    if (signature === this.signature) return;
    this.signature = signature;
    this.hotbar.replaceChildren();
    const list = this.panel.querySelector<HTMLElement>("#inventory-list")!;
    list.replaceChildren();
    state.items.forEach((item, index) => {
      const quantity =
        item.action === "shoot"
          ? `${state.ammo}/${itemConfig.magazineSize}`
          : item.action === "place"
            ? `${state.blocks}`
            : "—";
      const button = document.createElement("button");
      button.className = "slot";
      button.setAttribute("aria-pressed", String(index === state.selected));
      button.textContent = `${index + 1} · ${item.name}  ${quantity}`;
      button.addEventListener("click", () => this.onSelect(index));
      this.hotbar.append(button);
      const detail = document.createElement("button");
      detail.className = "inventory-item";
      detail.setAttribute("aria-pressed", String(index === state.selected));
      detail.textContent = `${index + 1} · ${item.name} (${quantity}) — ${item.description}`;
      detail.addEventListener("click", () => this.onSelect(index));
      list.append(detail);
    });
  }
}
