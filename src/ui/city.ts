import { isToolAvailable, levelsUntilTool } from "../game/progression";
import { isPowerupActive } from "../game/powerups";
import { cityConfig as c, cityTools, plotNames } from "../../config/city";
import { siteTechniques } from "../../config/sites";
import { downhillNeighbours } from "../game/city-water";
import { cityMetrics, spongeCapacity, weather } from "../game/city";
import { levelAchievements } from "../game/campaign";
import { fundingConfig } from "../../config/funding";
import { activeModifier } from "../game/level-modifiers";
import type { CityPlot, CityState, CityTool } from "../interfaces";

const element = (id: string) => document.getElementById(id)!;
const number = (value: number) => Math.round(value).toLocaleString("en-CH");

/** Presentation reads city state; construction and water rules stay in the simulation. */
export class CityUI {
  open = false;
  private selected: CityTool | null = null;
  private ledger?: CityState["funding"];
  private earned = 0;
  private receiptTimer?: ReturnType<typeof setTimeout>;
  constructor(
    select: (tool: CityTool) => void,
    private onFunding = () => {},
  ) {
    for (const [i, tool] of cityTools.entries()) {
      const slot = document.createElement("button");
      slot.className = "slot";
      slot.title = `${tool.name} · ${tool.description}`;
      slot.innerHTML = `<span class="tool-key" aria-hidden="true">${i + 1}</span><span class="tool-icon" aria-hidden="true">${tool.icon}</span><span class="tool-name">${tool.name}</span><small>${tool.cost ? `${tool.cost} coins` : "FREE"}</small>`;
      slot.setAttribute("aria-label", `${i + 1}. ${tool.name}`);
      slot.onclick = () => select(tool.id);
      element("hotbar").append(slot);
      const detail = document.createElement("button");
      detail.className = "inventory-item";
      detail.innerHTML = `<span class="tool-icon" aria-hidden="true">${tool.icon}</span><span><strong>${i + 1} · ${tool.name} · ${tool.cost} coins</strong><small>${tool.description}</small></span>`;
      detail.onclick = () => select(tool.id);
      element("inventory-list").append(detail);
    }
  }
  setOpen(open: boolean): void {
    this.open = open;
    element("inventory-panel").hidden = !open;
  }
  render(s: CityState, target: number | null, inReach: boolean): void {
    const m = cityMetrics(s),
      w = weather(s),
      capacity = spongeCapacity(s);
    const modifier = activeModifier(s);
    const modifierHud = element("active-modifier");
    modifierHud.hidden = !modifier;
    modifierHud.textContent = modifier
      ? `${modifier.icon} ${modifier.name} · ${modifier.effectText} · THIS LEVEL ONLY`
      : "";
    element("weather").textContent = w.raining
      ? `⛈ STORM · ${Math.ceil(w.remaining)}s until dry`
      : `☀ DRY HEAT · storm in ${Math.ceil(w.remaining)}s`;
    element("heat-value").textContent =
      `${m.temperature.toFixed(1)} °C · ${Math.round(s.heat)}% risk`;
    const heatLevel =
      m.temperature >= 55
        ? "critical"
        : m.temperature >= 45
          ? "danger"
          : m.temperature >= 36
            ? "warm"
            : "normal";
    element("heat-meter").parentElement!.setAttribute(
      "data-warning",
      heatLevel,
    );
    element("flood-value").textContent = `${Math.round(s.flood)}% danger`;
    element("sponge-value").textContent =
      `${number(s.sponge)} / ${number(capacity)} L`;
    for (const [name, value, max] of [
      ["heat", s.heat, 100],
      ["flood", s.flood, 100],
      ["sponge", s.sponge, capacity],
    ] as const) {
      const progress = element(`${name}-meter`) as HTMLProgressElement;
      progress.max = name === "heat" ? 100 : max;
      progress.value = value;
      progress.parentElement!.classList.toggle(
        "critical",
        name !== "sponge" && value >= 80,
      );
    }
    element("budget").textContent = number(s.budget);
    const receipt = element("funding-receipt");
    if (this.ledger !== s.funding) {
      this.ledger = s.funding;
      this.earned = s.funding.earned;
      clearTimeout(this.receiptTimer);
      receipt.hidden = true;
      element("reward-shout").hidden = true;
      element("coin-burst").replaceChildren();
      element("coin-wallet")
        .getAnimations()
        .forEach((a) => a.cancel());
    } else if (s.funding.earned > this.earned) {
      const coins = s.funding.earned - this.earned;
      this.earned = s.funding.earned;
      receipt.textContent = `+${number(coins)} COINS · CITY FUNDING!`;
      const shout = element("reward-shout");
      shout.replaceChildren();
      shout.append(document.createTextNode(`+${number(coins)} COINS!`));
      const caption = document.createElement("small");
      caption.textContent = "City funding";
      shout.append(caption);
      shout.hidden = false;
      receipt.hidden = false;
      clearTimeout(this.receiptTimer);
      this.receiptTimer = setTimeout(() => {
        receipt.hidden = true;
        element("reward-shout").hidden = true;
      }, fundingConfig.celebrationMs);
      this.onFunding();
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        shout.getAnimations().forEach((a) => a.cancel());
        shout.animate(
          [
            { opacity: 0, scale: ".6", rotate: "-5deg" },
            { opacity: 1, scale: "1.12", rotate: "2deg", offset: 0.3 },
            { opacity: 1, scale: "1", rotate: "0deg", offset: 0.8 },
            { opacity: 0, scale: "1.05" },
          ],
          { duration: fundingConfig.celebrationMs, easing: "ease-out" },
        );
        const wallet = element("coin-wallet");
        wallet.getAnimations().forEach((a) => a.cancel());
        wallet.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.06)" },
            { transform: "scale(1)" },
          ],
          { duration: 240, easing: "ease-out" },
        );
        const burst = element("coin-burst");
        burst.replaceChildren();
        for (let i = 0; i < 3; i++) {
          const coin = document.createElement("i");
          coin.textContent = "🪙";
          burst.append(coin);
          const flight = coin.animate(
            [
              { transform: "translate(0, 0) scale(.6)", opacity: 1 },
              {
                transform: `translate(${(i - 1) * 20}px, ${-45 - (i % 2) * 20}px) scale(1.2)`,
                opacity: 1,
                offset: 0.45,
              },
              {
                transform: `translate(${(i - 1) * 24}px, 15px) scale(.8)`,
                opacity: 0,
              },
            ],
            { duration: 650, easing: "ease-out" },
          );
          void flight.finished
            .then(() => coin.remove())
            .catch(() => coin.remove());
        }
      }
    }
    for (const [i, tool] of cityTools.entries()) {
      const remaining = levelsUntilTool(s, tool.id);
      for (const container of [element("hotbar"), element("inventory-list")]) {
        const button = container.children[i] as HTMLButtonElement;
        button.disabled = !isToolAvailable(s, tool.id);
        if (container.id === "inventory-list") {
          button.style.order = String(remaining > 0 ? 100 + i : i);
          button.querySelector("small")!.textContent =
            remaining > 0
              ? `Unlocks in ${remaining} level${remaining === 1 ? "" : "s"}`
              : tool.description;
        }
        button.classList.toggle("tool-locked", remaining > 0);
        let lock = button.querySelector(".tool-lock");
        if (remaining > 0) {
          if (!lock) {
            lock = document.createElement("span");
            lock.className = "tool-lock";
            button.append(lock);
          }
          lock.textContent = `🔒 ${remaining} level${remaining === 1 ? "" : "s"}`;
          button.title = `${tool.name} · unlocks in ${remaining} level${remaining === 1 ? "" : "s"}`;
          button.setAttribute(
            "aria-label",
            `${tool.name}, locked for ${remaining} more levels`,
          );
        } else {
          lock?.remove();
          button.title = `${tool.name} · ${tool.description}`;
          button.setAttribute("aria-label", `${i + 1}. ${tool.name}`);
        }
      }
    }
    const goals = s.campaign
      ? levelAchievements(s)
          .filter((goal) => goal.metric !== "heat" && goal.metric !== "flood")
          .map((goal) => [
            goal.done,
            goal.metric === "stormCompleted"
              ? "Survive a full storm"
              : `${goal.label}: ${number(goal.value)} / ${number(goal.target)}`,
          ])
      : [
          [
            m.permeable >= c.goals.permeable,
            `Unseal ${m.permeable}/${c.goals.permeable} plots`,
          ],
          [
            m.healthyTrees >= c.goals.trees,
            `${m.healthyTrees}/${c.goals.trees} healthy, watered trees`,
          ],
          [
            s.reused >= c.goals.reused,
            `${number(s.reused)}/${number(c.goals.reused)} L usefully delivered`,
          ],
          [
            s.heat <= c.goals.heat && s.flood <= c.goals.flood,
            `Heat ≤ ${c.goals.heat}% · flood ≤ ${c.goals.flood}%`,
          ],
          [s.stormSeen, "Weather a thunderstorm"],
        ];
    element("goals").innerHTML = goals
      .map(
        ([done, text]) =>
          `<p class="${done ? "complete" : ""}"><span class="goal-check" aria-hidden="true">${done ? "✓" : ""}</span><span>${done ? '<span class="sr-only">Complete: </span>' : ""}${text}</span></p>`,
      )
      .join("");
    const safety = s.campaign
      ? levelAchievements(s)
          .filter((g) => g.metric === "heat" || g.metric === "flood")
          .map(
            (g) => `${g.metric === "heat" ? "Heat" : "Flood"} ≤ ${g.target}%`,
          )
          .join(" · ")
      : "";
    element("city-change").textContent =
      `${safety ? safety + " · " : ""}🌳 ${m.trees} trees · ${m.unsealedArea} m² unsealed · ${number(m.retained)} L retained`;
    element("item-status").textContent =
      s.dangerTime > 0
        ? `⚠ Flood emergency! ${Math.ceil(c.dangerSeconds - s.dangerTime)}s to bring danger below 99%. ${s.feedback}`
        : s.feedback;
    element("item-status").classList.toggle("emergency", s.dangerTime > 0);
    const plot = s.plots.find((p) => p.id === target);
    element("target-info").textContent = plot
      ? `#${plot.id + 1} ${plotNames[plot.kind]}${plot.site ? ` · ${siteTechniques[plot.site].name}` : ""} · ${number(plot.surface)} L surface · ${number(plot.moisture + plot.stored)} L retained${plot.drainsTo === undefined ? "" : ` · runoff → #${plot.drainsTo + 1}`}${downhill(s, plot)}${inReach ? "" : " · MOVE CLOSER"}`
      : "Aim at a plot on the street or square";
    const powers = [
      [
        "Q",
        "Boost",
        s.powerups.held
          ? "READY"
          : s.powerups.active
            ? `${Math.ceil(s.powerups.remaining)}s active`
            : "Find a drop",
        !!s.powerups.held,
      ],
      [
        "B",
        "Bubbles",
        s.upgraded || isPowerupActive(s, "bubbles")
          ? "HOLD TO WATER"
          : "Sandy / bubble drop",
        s.upgraded || isPowerupActive(s, "bubbles"),
      ],
    ];
    element("abilities").innerHTML =
      powers
        .map(
          ([key, name, status, ready]) =>
            `<span class="power-pill ${ready ? "ready" : ""}"><kbd>${key}</kbd>${name}: ${status}</span>`,
        )
        .join("") +
      `<span class="power-pill ${s.machineDisabled > 0 ? "" : "threat"}">🦹 Dr. Beton: ${s.machineDisabled > 0 ? `offline ${Math.ceil(s.machineDisabled)}s` : s.saboteur.phase === "roaming" ? `roaming · ${Math.ceil(s.sabotageIn)}s` : `${s.saboteur.phase} #${s.saboteur.targetId! + 1}`}</span>`;
    if (this.selected !== s.selected) {
      this.selected = s.selected;
      [...element("hotbar").children].forEach((button, i) =>
        button.setAttribute(
          "aria-pressed",
          String(cityTools[i].id === s.selected),
        ),
      );
      [...element("inventory-list").children].forEach((button, i) =>
        button.setAttribute(
          "aria-pressed",
          String(cityTools[i].id === s.selected),
        ),
      );
      const tool = cityTools.find((t) => t.id === s.selected)!;
      element("tool-description").textContent = tool.description;
    }
    element("result").hidden = s.outcome === "playing";
    if (s.outcome !== "playing") {
      element("result-title").textContent =
        s.outcome === "won" ? "Basel blooms! 🌳" : "The square needs you.";
      element("result-reason").textContent =
        s.outcome === "won"
          ? "You cooled the square, gave water a purpose and made room for life."
          : (s.lossReason ??
            "Flood danger stayed critical for too long. Try more rain gardens and storage before the storm.");
      element("result-metrics").innerHTML =
        `<div><strong>${m.temperature.toFixed(1)} °C</strong><span>city temperature</span></div><div><strong>${number(m.retained)} L</strong><span>rainwater retained now</span></div><div><strong>${m.trees}</strong><span>new trees (${m.healthyTrees} healthy)</span></div><div><strong>${m.unsealedArea} m²</strong><span>unsealed ground</span></div><div><strong>${number(s.reused)} L</strong><span>usefully delivered</span></div><div><strong>${number(s.infiltrated)} L</strong><span>infiltrated to deeper soil</span></div>`;
    }
  }
}

/** Where a plot's puddle runs on sloped ground, steepest neighbour first. */
function downhill(s: CityState, plot: CityPlot): string {
  const lower = downhillNeighbours(s, plot).sort((a, b) => b.weight - a.weight);
  return lower.length ? ` · runs downhill → #${lower[0].plot.id + 1}` : "";
}
