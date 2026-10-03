import { arrivalStory, cityLevels, endingStory } from "../../config/levels";
import { currentLevel } from "../game/campaign";
import type { CityState } from "../interfaces";
import { StorySpeech } from "./story-speech";

const element = (id: string) => document.getElementById(id)!;
/** German narrative and abstract route map; no geographic placement is implied. */
export class CampaignUI {
  private panel = element("campaign-story");
  private speech = new StorySpeech(element("story-mascot"));
  constructor() {
    const mascot = document
      .querySelector(".hero-sponge")!
      .cloneNode(true) as SVGElement;
    element("story-mascot").append(mascot);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.speech.stop();
    });
    this.panel.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const body = element("story-body"),
        start = element("story-start");
      event.preventDefault();
      (document.activeElement === body ? start : body).focus();
    });
  }
  get open(): boolean {
    return !this.panel.hidden;
  }
  hide(): void {
    this.speech.stop();
    this.panel.hidden = true;
  }
  setMuted(muted: boolean): void {
    this.speech.setMuted(muted);
  }
  show(s: CityState): void {
    element("story-status").textContent = "";
    const level = currentLevel(s)!;
    const arrival =
      s.campaign!.level === 0 && s.campaign!.completed.length === 0;
    element("story-title").textContent =
      `${s.campaign!.level + 1}. ${level.location} — ${level.title}`;
    const paragraphs = [
      ...(arrival ? arrivalStory.paragraphs : []),
      ...level.story,
    ];
    element("story-fulltext").textContent = paragraphs.join(" ");
    element("story-objective").textContent = level.objective;
    element("story-body").scrollTop = 0;
    this.renderRoute(s, element("story-route"));
    this.panel.hidden = false;
    this.speech.speak(element("story-copy"), paragraphs);
    element("story-start").focus({ preventScroll: true });
  }
  render(s: CityState): void {
    const level = currentLevel(s);
    if (!level) return;
    element("mission-level").textContent =
      `LEVEL ${s.campaign!.level + 1}/${cityLevels.length} · ${level.location}`;
    element("mission-title").textContent = level.title;
    element("mission-layout").textContent = level.site
      ? `Real street: ${level.site.street}`
      : "Placeholder layout · geography pending";
    this.renderRoute(s, element("campaign-route"));
    if (s.outcome === "won") {
      element("result-title").textContent = endingStory.title;
      element("result-reason").textContent =
        "Fläche für Fläche. Level für Level.";
      const ending = element("campaign-ending");
      if (!ending.childElementCount) {
        for (const text of endingStory.paragraphs) {
          const p = document.createElement("p");
          p.textContent = text;
          ending.append(p);
        }
      }
      ending.hidden = false;
    } else {
      element("campaign-ending").hidden = true;
      element("campaign-ending").replaceChildren();
    }
    element("restart").textContent =
      s.outcome === "lost" ? "Retry this level ↻" : "Play the campaign again ↻";
  }
  private renderRoute(s: CityState, container: HTMLElement): void {
    container.replaceChildren(
      ...cityLevels.map((level, i) => {
        const step = document.createElement("li");
        const completed = s.campaign!.completed.includes(level.id);
        step.textContent = `${completed ? "✓" : i + 1} ${level.location.split(" · ")[0]}`;
        step.title = level.location;
        if (i === s.campaign!.level) step.setAttribute("aria-current", "step");
        step.classList.toggle("complete", completed);
        return step;
      }),
    );
  }
}
