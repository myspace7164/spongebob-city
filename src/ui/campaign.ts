import { arrivalStory, cityLevels, endingStory } from "../../config/levels";
import { currentLevel } from "../game/campaign";
import type { CityState } from "../interfaces";

const element = (id: string) => document.getElementById(id)!;
/** German narrative and abstract route map; no geographic placement is implied. */
export class CampaignUI {
  private panel = element("campaign-story");
  constructor() {
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
    this.panel.hidden = true;
  }
  show(s: CityState): void {
    element("story-status").textContent = "";
    const level = currentLevel(s)!;
    const arrival =
      s.campaign!.level === 0 && s.campaign!.completed.length === 0;
    element("story-title").textContent =
      `${s.campaign!.level + 1}. ${level.location} — ${level.title}`;
    const body = element("story-body");
    body.replaceChildren();
    if (arrival) {
      const heading = document.createElement("h3");
      heading.textContent = arrivalStory.title;
      body.append(heading);
    }
    for (const text of [
      ...(arrival ? arrivalStory.paragraphs : []),
      ...level.story,
    ]) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      body.append(paragraph);
    }
    const objective = document.createElement("p");
    objective.className = "story-objective";
    objective.textContent = `Levelziel: ${level.objective}`;
    body.append(objective);
    body.scrollTop = 0;
    this.renderRoute(s, element("story-route"));
    this.panel.hidden = false;
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
        "Basel wird Schwammstadt – Fläche für Fläche.";
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
