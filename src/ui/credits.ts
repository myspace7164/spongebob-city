import { credits, endlessConfig } from "../../config/endless.ts";

/** Campaign credits pause on screen until the roll finishes or the player skips. */
export class CreditsUI {
  private panel = document.getElementById("credits")!;
  private timer?: ReturnType<typeof setTimeout>;
  private shown = false;

  constructor(private onFinish: () => void) {
    this.panel.style.setProperty(
      "--credits-duration",
      `${endlessConfig.creditsDurationMs}ms`,
    );
    const list = document.getElementById("credits-authors")!;
    for (const author of credits.authors) {
      const row = document.createElement("div");
      row.className = "credits-author";
      const name = document.createElement("h2");
      name.className = "credits-author-name";
      name.textContent = author.name;
      const description = document.createElement("p");
      description.className = "credits-author-quote";
      description.textContent = `"${author.quote}"`;
      row.append(name, description);
      list.append(row);
    }
    document.getElementById("credits-thanks")!.textContent = credits.thanks;
    document
      .getElementById("credits-skip")!
      .addEventListener("click", () => this.finish());
    this.panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.finish();
      if (event.key === "Tab") {
        event.preventDefault();
        document.getElementById("credits-skip")!.focus();
      }
    });
  }

  show(): void {
    if (this.shown) return;
    this.shown = true;
    this.panel.hidden = false;
    document.getElementById("credits-skip")!.focus();
    this.timer = setTimeout(
      () => this.finish(),
      endlessConfig.creditsDurationMs,
    );
  }

  reset(): void {
    clearTimeout(this.timer);
    this.panel.hidden = true;
    this.shown = false;
  }

  private finish(): void {
    clearTimeout(this.timer);
    this.panel.hidden = true;
    this.onFinish();
  }
}
