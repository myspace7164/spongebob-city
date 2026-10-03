import { cityConfig as c, cityTools, plotNames } from "../../config/city";
import { cityMetrics, spongeCapacity, weather } from "../game/city";
import type { CityState, CityTool } from "../interfaces";

const element = (id: string) => document.getElementById(id)!;
const number = (value: number) => Math.round(value).toLocaleString("en-CH");

/** Presentation reads city state; construction and water rules stay in the simulation. */
export class CityUI {
  open = false;
  private selected: CityTool | null = null;
  constructor(select: (tool: CityTool) => void) {
    for (const [i, tool] of cityTools.entries()) {
      const slot = document.createElement("button");
      slot.className = "slot";
      slot.title = `${tool.name} · ${tool.description}`;
      slot.innerHTML = `<span class="tool-icon">${tool.icon}</span><span>${i + 1} · ${tool.name}</span><small>${tool.cost ? `${tool.cost} coins` : "FREE"}</small>`;
      slot.setAttribute("aria-label", `${i + 1}. ${tool.name}`);
      slot.onclick = () => select(tool.id);
      element("hotbar").append(slot);
      const detail = document.createElement("button");
      detail.className = "inventory-item";
      detail.textContent = `${i + 1} · ${tool.icon} ${tool.name} · ${tool.cost} coins — ${tool.description}`;
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
    element("budget").textContent =
      `🦀 ${number(s.budget)} coins · Mr. Krabs' city fund`;
    const goals = [
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
          `<p class="${done ? "complete" : ""}">${done ? "✓" : "○"} ${text}</p>`,
      )
      .join("");
    element("city-change").textContent =
      `🌳 ${m.trees} trees · ${m.unsealedArea} m² unsealed · ${number(m.retained)} L retained`;
    element("item-status").textContent =
      s.dangerTime > 0
        ? `⚠ Flood emergency! ${Math.ceil(c.dangerSeconds - s.dangerTime)}s to bring danger below 99%. ${s.feedback}`
        : s.feedback;
    const plot = s.plots.find((p) => p.id === target);
    element("target-info").textContent = plot
      ? `${plotNames[plot.kind]} · ${number(plot.surface)} L surface · ${number(plot.moisture + plot.stored)} L retained${inReach ? "" : " · MOVE CLOSER"}`
      : "Aim at a plot on the square";
    const timer = (remaining: number) =>
      remaining > 0 ? `${Math.ceil(remaining)}s` : "READY";
    element("abilities").textContent =
      `Q Poren-Power: ${timer(s.powerCooldown)} · P Patrick: ${timer(s.patrickCooldown)} · X Maximum: ${s.reused < c.maximumUnlock ? `reuse ${c.maximumUnlock} L to unlock` : timer(s.maximumCooldown)} · ${s.upgraded ? "B bubbles: READY" : "Sandy upgrade: E at workshop"} · Dr. Beton: ${s.machineDisabled > 0 ? `offline ${Math.ceil(s.machineDisabled)}s` : `sabotage in ${Math.ceil(s.sabotageIn)}s`}`;
    if (this.selected !== s.selected) {
      this.selected = s.selected;
      [...element("hotbar").children].forEach((button, i) =>
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
