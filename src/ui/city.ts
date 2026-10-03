import { cityConfig as c, cityTools, plotNames } from "../../config/city";
import { siteTechniques } from "../../config/sites";
import { downhillNeighbours } from "../game/city-water";
import { cityMetrics, spongeCapacity, weather } from "../game/city";
import { levelAchievements } from "../game/campaign";
import { fundingConfig } from "../../config/funding";
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
    element("weather").textContent = w.raining
      ? `⛈ STORM · ${Math.ceil(w.remaining)}s until dry`
      : `☀ DRY HEAT · storm in ${Math.ceil(w.remaining)}s`;
    element("heat-value").textContent =
      `${m.temperature.toFixed(1)} °C · ${Math.round(s.heat)}%`;
    element("flood-value").textContent = `${Math.round(s.flood)}% danger`;
    element("sponge-value").textContent =
      `${number(s.sponge)} / ${number(capacity)} L`;
    for (const [name, value, max] of [
      ["heat", s.heat, 100],
      ["flood", s.flood, 100],
      ["sponge", s.sponge, capacity],
    ] as const) {
      const progress = element(`${name}-meter`) as HTMLProgressElement;
      progress.max = max;
      progress.value = value;
    }
    element("budget").textContent = number(s.budget);
    const receipt = element("funding-receipt");
    if (this.ledger !== s.funding) {
      this.ledger = s.funding;
      this.earned = s.funding.earned;
      clearTimeout(this.receiptTimer);
      receipt.hidden = true;
      element("coin-burst").replaceChildren();
      element("coin-wallet")
        .getAnimations()
        .forEach((a) => a.cancel());
    } else if (s.funding.earned > this.earned) {
      const coins = s.funding.earned - this.earned;
      this.earned = s.funding.earned;
      receipt.textContent = `+${number(coins)} coins · City funding!`;
      receipt.hidden = false;
      clearTimeout(this.receiptTimer);
      this.receiptTimer = setTimeout(
        () => (receipt.hidden = true),
        fundingConfig.celebrationMs,
      );
      this.onFunding();
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const wallet = element("coin-wallet");
        wallet.getAnimations().forEach((a) => a.cancel());
        wallet.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.14) rotate(-3deg)" },
            { transform: "scale(1)" },
          ],
          { duration: 420, easing: "ease-out" },
        );
        const burst = element("coin-burst");
        burst.replaceChildren();
        for (let i = 0; i < 5; i++) {
          const coin = document.createElement("i");
          coin.textContent = "🪙";
          burst.append(coin);
          const flight = coin.animate(
            [
              { transform: "translate(0, 0) scale(.6)", opacity: 1 },
              {
                transform: `translate(${(i - 2) * 22}px, ${-45 - (i % 2) * 20}px) scale(1.2)`,
                opacity: 1,
                offset: 0.45,
              },
              {
                transform: `translate(${(i - 2) * 32}px, 15px) scale(.8)`,
                opacity: 0,
              },
            ],
            { duration: 850, easing: "ease-out" },
          );
          void flight.finished
            .then(() => coin.remove())
            .catch(() => coin.remove());
        }
      }
    }
    const goals = s.campaign
      ? levelAchievements(s).map((goal) => [
          goal.done,
          `${goal.label}: ${number(goal.value)} / ${number(goal.target)}${goal.metric === "heat" || goal.metric === "flood" ? "%" : ""}`,
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
    element("city-change").textContent =
      `🌳 ${m.trees} trees · ${m.unsealedArea} m² unsealed · ${number(m.retained)} L retained`;
    element("item-status").textContent =
      s.dangerTime > 0
        ? `⚠ Flood emergency! ${Math.ceil(c.dangerSeconds - s.dangerTime)}s to bring danger below 99%. ${s.feedback}`
        : s.feedback;
    element("item-status").classList.toggle("emergency", s.dangerTime > 0);
    const plot = s.plots.find((p) => p.id === target);
    element("target-info").textContent = plot
      ? `#${plot.id + 1} ${plotNames[plot.kind]}${plot.site ? ` · ${siteTechniques[plot.site].name}` : ""} · ${number(plot.surface)} L surface · ${number(plot.moisture + plot.stored)} L retained${plot.drainsTo === undefined ? "" : ` · runoff → #${plot.drainsTo + 1}`}${downhill(s, plot)}${inReach ? "" : " · MOVE CLOSER"}`
      : "Aim at a plot on the street or square";
    const timer = (remaining: number) =>
      remaining > 0 ? `${Math.ceil(remaining)}s` : "READY";
    const powers = [
      ["Q", "Poren-Power", timer(s.powerCooldown), s.powerCooldown === 0],
      ["P", "Patrick", timer(s.patrickCooldown), s.patrickCooldown === 0],
      [
        "X",
        "MAXIMUM!",
        s.reused < c.maximumUnlock
          ? `${c.maximumUnlock} L to unlock`
          : timer(s.maximumCooldown),
        s.reused >= c.maximumUnlock && s.maximumCooldown === 0,
      ],
      ["B", "Bubbles", s.upgraded ? "READY" : "E at Sandy's", s.upgraded],
    ];
    element("abilities").innerHTML =
      powers
        .map(
          ([key, name, status, ready]) =>
            `<span class="power-pill ${ready ? "ready" : ""}"><kbd>${key}</kbd>${name}: ${status}</span>`,
        )
        .join("") +
      `<span class="power-pill ${s.machineDisabled > 0 ? "" : "threat"}">🦹 Dr. Beton: ${s.machineDisabled > 0 ? `offline ${Math.ceil(s.machineDisabled)}s` : `${Math.ceil(s.sabotageIn)}s`}</span>`;
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
          : "Flood danger stayed critical for too long. Try more rain gardens and storage before the storm.";
      element("result-metrics").innerHTML =
        `<div><strong>${(37 - m.temperature).toFixed(1)} °C</strong><span>surface cooling</span></div><div><strong>${number(m.retained)} L</strong><span>rainwater retained now</span></div><div><strong>${m.trees}</strong><span>new trees (${m.healthyTrees} healthy)</span></div><div><strong>${m.unsealedArea} m²</strong><span>unsealed ground</span></div><div><strong>${number(s.reused)} L</strong><span>usefully delivered</span></div><div><strong>${number(s.infiltrated)} L</strong><span>infiltrated to deeper soil</span></div>`;
    }
  }
}

/** Where a plot's puddle runs on sloped ground, steepest neighbour first. */
function downhill(s: CityState, plot: CityPlot): string {
  const lower = downhillNeighbours(s, plot).sort((a, b) => b.weight - a.weight);
  return lower.length ? ` · runs downhill → #${lower[0].plot.id + 1}` : "";
}
