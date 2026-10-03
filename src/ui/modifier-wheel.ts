import { levelModifiers, modifierWheelConfig } from "../../config/modifiers.ts";
import {
  chooseLevelModifier,
  wheelLandingRotation,
} from "../game/level-modifiers.ts";
import type { CityState, LevelModifierId } from "../interfaces.ts";

const byId = (id: string) => document.getElementById(id)!;

/** A weighted, deterministic-after-spin campaign intermission. */
export class ModifierWheelUI {
  private readonly panel = byId("modifier-wheel");
  private readonly wheel = byId("wheel-disc");
  private readonly spinButton = byId("wheel-spin") as HTMLButtonElement;
  private readonly continueButton = byId("wheel-continue") as HTMLButtonElement;
  private readonly outcome = byId("wheel-outcome");
  private spinning = false;
  private lastTick = -1;
  private tickFrame = 0;
  private rotation = 0;

  constructor(
    private readonly s: () => CityState,
    private readonly onSpinSound: () => void,
    private readonly onTickSound: () => void,
    private readonly onResultSound: (positive: boolean) => void,
    private readonly onContinue: () => void,
  ) {
    this.renderSegments();
    this.wheel.style.transitionDuration = `${modifierWheelConfig.spinDurationMs}ms`;
    this.spinButton.addEventListener("click", () => this.spin());
    this.continueButton.addEventListener("click", () => {
      if (!this.s().campaign?.pendingModifier) return;
      this.hide();
      this.onContinue();
    });
  }

  get open(): boolean {
    return !this.panel.hidden;
  }

  show(): void {
    this.spinning = false;
    this.rotation = 0;
    this.wheel.style.transform = "rotate(0deg)";
    this.spinButton.hidden = false;
    this.spinButton.disabled = false;
    this.continueButton.hidden = true;
    this.outcome.textContent = "Spin for your next level modifier!";
    byId("wheel-status").textContent = "All outcomes and odds are visible.";
    this.panel.hidden = false;
    this.spinButton.focus({ preventScroll: true });
  }

  hide(): void {
    this.panel.hidden = true;
    cancelAnimationFrame(this.tickFrame);
  }

  private renderSegments(): void {
    const total = levelModifiers.reduce((sum, item) => sum + item.weight, 0);
    let position = 0;
    const stops = levelModifiers.map((item) => {
      const start = (position / total) * 100;
      position += item.weight;
      const end = (position / total) * 100;
      const divider = Math.max(start, end - 0.6);
      return `${item.kind === "positive" ? "#ffc83d" : "#ff785f"} ${start}% ${divider}%, #fff4b4 ${divider}% ${end}%`;
    });
    this.wheel.style.background = `conic-gradient(${stops.join(",")})`;
    this.wheel.replaceChildren();
    position = 0;
    for (const item of levelModifiers) {
      const center = ((position + item.weight / 2) / total) * 360;
      const label = document.createElement("span");
      label.className = `wheel-segment ${item.kind}`;
      label.style.setProperty("--segment-angle", `${center}deg`);
      label.innerHTML = `<b aria-hidden="true">${item.icon}</b><small>${item.shortName}</small>`;
      label.setAttribute("aria-label", `${item.name}: ${item.effectText}`);
      this.wheel.append(label);
      position += item.weight;
    }
    const list = byId("wheel-options");
    list.replaceChildren(
      ...levelModifiers.map((item) => {
        const row = document.createElement("li");
        const probability = Math.round((item.weight / total) * 100);
        row.className = item.kind;
        row.innerHTML = `<span aria-hidden="true">${item.icon}</span><span><strong>${item.name}</strong><small>${item.effectText}</small></span><b>${probability}%</b>`;
        return row;
      }),
    );
  }

  private spin(): void {
    if (this.spinning) return;
    const id = chooseLevelModifier();
    const state = this.s();
    if (!state.campaign?.wheelPending) return;
    state.campaign.pendingModifier = id;
    const landing = wheelLandingRotation(id);
    const start = performance.now();
    const initialRotation = this.rotation;
    const targetRotation =
      initialRotation + modifierWheelConfig.rotations * 360 + landing;
    this.spinning = true;
    this.spinButton.disabled = true;
    this.continueButton.hidden = true;
    this.outcome.textContent = "Spinning …";
    byId("wheel-status").textContent = "Wheel spinning";
    this.onSpinSound();
    const tick = (now: number) => {
      const progress = Math.min(
        1,
        (now - start) / modifierWheelConfig.spinDurationMs,
      );
      const eased = 1 - Math.pow(1 - progress, 4);
      this.rotation =
        initialRotation + (targetRotation - initialRotation) * eased;
      this.wheel.style.transform = `rotate(${this.rotation}deg)`;
      const pointerAngle = (360 - (this.rotation % 360)) % 360;
      const totalWeight = levelModifiers.reduce(
        (sum, item) => sum + item.weight,
        0,
      );
      let swept = 0;
      const index = levelModifiers.findIndex((item) => {
        swept += (item.weight / totalWeight) * 360;
        return pointerAngle < swept;
      });
      if (index !== this.lastTick) {
        this.lastTick = index;
        this.onTickSound();
      }
      if (progress < 1) this.tickFrame = requestAnimationFrame(tick);
      else this.reveal(id);
    };
    this.tickFrame = requestAnimationFrame(tick);
  }

  private reveal(id: LevelModifierId): void {
    this.spinning = false;
    this.rotation %= 360;
    this.spinButton.hidden = true;
    const modifier = levelModifiers.find((item) => item.id === id)!;
    const positive = modifier.kind === "positive";
    this.outcome.innerHTML = `<span class="wheel-result-icon" aria-hidden="true">${modifier.icon}</span><strong>${positive ? "✨" : "⚠️"} ${modifier.name} ${positive ? "✨" : "⚠️"}</strong><span>${modifier.effectText}</span><small>NEXT LEVEL ONLY</small>`;
    byId("wheel-status").textContent =
      `${modifier.name}: ${modifier.effectText}. Next level only.`;
    this.continueButton.hidden = false;
    this.continueButton.focus({ preventScroll: true });
    this.onResultSound(positive);
    this.celebrate();
    this.panel.classList.toggle("power-up", positive);
    this.panel.classList.toggle("power-down", !positive);
  }

  private celebrate(): void {
    const stage = document.querySelector<HTMLElement>(".wheel-stage")!;
    const colors = ["#ffdc52", "#7fffe0", "#ff7a68", "#ffffff", "#96c8ff"];
    for (let i = 0; i < modifierWheelConfig.confettiPieces; i++) {
      const piece = document.createElement("i");
      piece.className = "wheel-confetti";
      piece.style.background = colors[i % colors.length];
      stage.append(piece);
      const angle = (Math.PI * 2 * i) / modifierWheelConfig.confettiPieces;
      const distance = 70 + ((i * 37) % 100);
      const flight = piece.animate(
        [
          {
            transform: "translate(-50%, -50%) scale(.2) rotate(0deg)",
            opacity: 1,
          },
          {
            transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(1) rotate(${i * 95}deg)`,
            opacity: 0,
          },
        ],
        { duration: 750 + (i % 5) * 90, easing: "ease-out" },
      );
      void flight.finished
        .then(() => piece.remove())
        .catch(() => piece.remove());
    }
  }
}
