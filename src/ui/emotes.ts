import { emoteConfig } from "../../config/emotes.ts";
/** Choices appear only while the emote chord is held. */
export class EmoteUI {
  private panel = document.createElement("aside");
  constructor() {
    this.panel.id = "emote-choices";
    this.panel.hidden = true;
    this.panel.innerHTML = `<strong>HOLD G · PICK A MOVE</strong><span>${emoteConfig.items.map((item) => `<b>${item.key} · ${item.name}</b>`).join(" ")}</span>`;
    document.body.append(this.panel);
  }
  update(chord: boolean, name?: string) {
    this.panel.hidden = !chord && !name;
    this.panel.dataset.playing = name ?? "";
    this.panel.querySelector("strong")!.textContent = name
      ? `${name.toUpperCase()} · MOVE TO STOP`
      : "HOLD G · PICK A MOVE";
  }
}
