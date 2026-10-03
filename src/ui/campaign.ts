import { campaignLevel } from "../game/campaign.ts";
import { arrivalStory, cityLevels, endingStory } from "../../config/levels.ts";
import { currentLevel } from "../game/campaign.ts";
import type { CityState } from "../interfaces.ts";
import { StorySpeech } from "./story-speech.ts";

const element = (id: string) => document.getElementById(id)!;
/** English narrative and abstract route map; no geographic placement is implied. */
export class CampaignUI {
  private panel = element("campaign-story");
  private speech = new StorySpeech(element("story-mascot"));
  private celebration = element("campaign-celebration");
  private previousOutcome: CityState["outcome"] = "playing";
  private celebrationShown = false;
  constructor(private playVictory: () => void = () => {}) {
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
    element("celebration-dismiss").addEventListener("click", () => {
      this.celebration.hidden = true;
      element("restart").focus({ preventScroll: true });
    });
  }
  get open(): boolean {
    return !this.panel.hidden;
  }
  hide(): void {
    this.speech.stop();
    this.panel.hidden = true;
    this.celebration.hidden = true;
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
    element("mission-layout").textContent = level.mapSite
      ? `Real map: ${level.mapSite.street} · illustrative plots`
      : level.site
        ? `Real street: ${level.site.street}`
        : "Placeholder layout · geography pending";
    this.renderRoute(s, element("campaign-route"));
    if (s.outcome === "won" && !this.celebrationShown) {
      this.celebrationShown = true;
      this.celebration.hidden = false;
      this.playVictory();
      this.createConfetti();
    } else if (s.outcome !== "won") {
      this.celebrationShown = false;
      this.celebration.hidden = true;
    }
    if (s.outcome === "won") {
      element("result-title").textContent = endingStory.title;
      element("result-reason").textContent = "Plot by plot. Level by level.";
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
  private createConfetti(): void {
    const layer = this.celebration.querySelector<HTMLElement>(
      ".celebration-confetti",
    )!;
    layer.replaceChildren();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#ffcf33", "#f45b50", "#24b8c5", "#60bd69", "#9f76e8"];
    for (let i = 0; i < 72; i++) {
      const piece = document.createElement("i");
      piece.style.setProperty("--confetti-x", `${(i * 47) % 100}vw`);
      piece.style.setProperty("--confetti-color", colors[i % colors.length]!);
      piece.style.setProperty("--confetti-delay", `${(i % 12) * -0.13}s`);
      piece.style.setProperty("--confetti-rotate", `${(i * 67) % 360}deg`);
      layer.append(piece);
    }
  }
  private renderRoute(s: CityState, container: HTMLElement): void {
    container.replaceChildren(
      ...cityLevels.map((_, i) => {
        const level = campaignLevel(s, i)!;
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
