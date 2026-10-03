import { hats } from "../../config/hats";
import type { HatId } from "../interfaces";

const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const previews: Record<HatId, string> = {
  trafficCone:
    '<path d="M43 69 54 22q6-12 12 0l12 47Z" fill="#f56b26" stroke="#263443" stroke-width="4"/><path d="m48 54 31 1M52 39l23 1" stroke="#fff2ce" stroke-width="7"/><path d="M35 72h52" stroke="#f56b26" stroke-width="10" stroke-linecap="round"/>',
  cowboy:
    '<path d="M19 64q41-20 82 0-4 12-41 10-35 1-41-10Z" fill="#c99b5d" stroke="#263443" stroke-width="4"/><path d="M39 62V41q2-24 21-23 19-1 21 23v21Z" fill="#e0bd82" stroke="#263443" stroke-width="4"/><path d="M39 48q21 8 42 0" fill="none" stroke="#754323" stroke-width="7"/>',
  newspaper:
    '<path d="m29 66 9-39 22-18 28 20 4 37Z" fill="#f1ead8" stroke="#263443" stroke-width="4"/><path d="m38 28 22 12 28-11M60 40v24" fill="none" stroke="#c5baa1" stroke-width="3"/><path d="M45 48h11m9-1h13m-31 8h9m8 0h12" stroke="#454844" stroke-width="3"/>',
  sailor:
    '<path d="M32 68V38q2-11 28-11t28 11v30Z" fill="#faf6e8" stroke="#263443" stroke-width="4"/><path d="M31 63h58v12H31Z" fill="#202d3b" stroke="#263443" stroke-width="4"/><path d="M60 38v19m-11-13h22m-18 16q7 10 14 0" fill="none" stroke="#147dc1" stroke-width="4" stroke-linecap="round"/>',
  wizard:
    '<path d="M25 70q35-16 70 0" fill="none" stroke="#315fa5" stroke-width="11" stroke-linecap="round"/><path d="m37 66 17-49q7-18 16 1l16 49q-25-10-49-1Z" fill="#315fa5" stroke="#263443" stroke-width="4"/><path d="m51 48 5-8 5 8 9 1-7 6 2 8-9-4-8 4 2-9-7-5Z" fill="#e0e9f5"/><path d="m72 29 4-6 4 6 7 1-5 5 1 6-7-3-6 3 1-6-5-5Z" fill="#e0e9f5"/>',
  footballCap:
    '<path d="M27 57q4-38 34-38 31 0 34 38H27Z" fill="#1e5ca8" stroke="#263443" stroke-width="4"/><path d="M61 20q-19 2-25 28l25 8Z" fill="#d8333d"/><path d="M33 58q33-16 61 1 13 8-2 12-30 8-59-1-15-6 0-12Z" fill="#d8333d" stroke="#263443" stroke-width="4"/><path d="m61 31 8 11-8 13-8-13Z" fill="#faf3e5" stroke="#263443" stroke-width="2"/><path d="m61 36 3 6-4 7-4-7Z" fill="#d8333d"/>',
};

function previewSvg(id: HatId): string {
  return `<svg viewBox="0 0 120 88" role="img" aria-label="${hats.find((hat) => hat.id === id)!.name} preview" focusable="false">${previews[id]}</svg>`;
}

/** Responsive catalogue and purchase feedback for run-only cosmetics. */
export class HatShopUI {
  private panel = element<HTMLElement>("hat-shop");
  private cards = element<HTMLElement>("hat-cards");
  private balance = element<HTMLElement>("hat-shop-balance");
  private status = element<HTMLElement>("hat-shop-status");
  private closeButton = element<HTMLButtonElement>("hat-shop-close");

  constructor(
    private coins: () => number,
    private equipped: () => HatId | null,
    private purchase: (id: HatId) => boolean,
    private close: () => void,
  ) {
    this.cards.replaceChildren(
      ...hats.map((hat) => {
        const card = document.createElement("article");
        card.className = "hat-card";
        card.dataset.hat = hat.id;
        const preview = document.createElement("div");
        preview.className = "hat-preview";
        preview.innerHTML = previewSvg(hat.id);
        const name = document.createElement("h3");
        name.textContent = hat.name;
        const price = document.createElement("p");
        price.className = "hat-price";
        price.textContent = `🪙 ${hat.price.toLocaleString("en-US")} coins`;
        const button = document.createElement("button");
        button.className = "hat-buy";
        button.type = "button";
        button.addEventListener("click", () => this.buy(hat.id));
        card.append(preview, name, price, button);
        return card;
      }),
    );
    this.closeButton.addEventListener("click", close);
    this.panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.close();
      }
    });
    this.render();
  }

  get open(): boolean {
    return !this.panel.hidden;
  }

  show(): void {
    this.status.textContent = "";
    this.render();
    this.panel.hidden = false;
    this.closeButton.focus();
  }

  hide(): void {
    this.panel.hidden = true;
  }

  render(): void {
    this.balance.textContent = this.coins().toLocaleString("en-US");
    const equipped = this.equipped();
    this.cards
      .querySelectorAll<HTMLButtonElement>(".hat-buy")
      .forEach((button) => {
        const card = button.closest<HTMLElement>(".hat-card")!;
        const hat = hats.find((item) => item.id === card.dataset.hat)!;
        const isEquipped = equipped === hat.id;
        const canAfford = this.coins() >= hat.price;
        card.toggleAttribute("data-equipped", isEquipped);
        button.disabled = isEquipped || !canAfford;
        button.textContent = isEquipped
          ? "✓ EQUIPPED"
          : canAfford
            ? `BUY · ${hat.price.toLocaleString("en-US")}`
            : "NOT ENOUGH COINS";
        button.setAttribute(
          "aria-label",
          isEquipped
            ? `${hat.name} equipped`
            : canAfford
              ? `Buy ${hat.name} for ${hat.price} coins`
              : `Not enough coins for ${hat.name}`,
        );
      });
  }

  private buy(id: HatId): void {
    if (this.purchase(id)) {
      this.status.textContent = `${hats.find((hat) => hat.id === id)!.name} equipped for this run!`;
    } else {
      this.status.textContent = "Not enough coins for that hat.";
    }
    this.render();
  }
}
