import { cityLevels } from "../../config/levels";
import { levelLocationPools } from "../../config/level-locations";
import { levelLibrary, levelLineup } from "../../config/built-levels/index";
import type { LevelLineup, LibraryLevel } from "../interfaces";
import {
  endlessEntries,
  libraryLocation,
  stageProblems,
} from "../game/level-lineup";

const escape = (text: string) =>
  text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const savedAt = (iso: string) =>
  new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

/** What the lineup screen needs from the builder. */
export interface LineupHost {
  /** Load a library level into the builder. */
  open: (id: string) => void;
  editingId: () => string | null;
  /** A library level was deleted. */
  forget: (id: string) => void;
}

/**
 * Dev-only "Lineup & library" screen: pick the level for each of the four
 * stages and switch places on or off for endless mode. Every change is saved
 * to config/built-levels/lineup.json right away.
 */
export function createLineupScreen(host: LineupHost) {
  const root = document.createElement("div");
  root.id = "lb-lineup";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "lb-lineup-title");
  root.innerHTML = `
    <div class="lb-lineup-card">
      <div class="lb-lineup-head">
        <h2 id="lb-lineup-title">📚 Lineup &amp; library</h2>
        <button type="button" id="lb-lineup-close">✕ Close <kbd>L</kbd></button>
      </div>
      <p class="small">Choose which level each stage plays and which places endless mode can pick. Changes save to <code>config/built-levels/lineup.json</code> right away; commit &amp; push to share them with the team.</p>
      <h3>The four stages</h3>
      <div id="lb-stage-cards"></div>
      <h3>All levels <span id="lb-endless-count" class="lb-count"></span></h3>
      <p class="small">Switched-on places can come up in endless mode. Each place plays with the goals of its stage.</p>
      <ul id="lb-level-list"></ul>
      <p id="lb-lineup-status" role="status"></p>
    </div>`;
  document.body.append(root);
  const $ = <T extends HTMLElement>(id: string) =>
    root.querySelector<T>(`#${id}`)!;
  const status = (text: string) => ($("lb-lineup-status").textContent = text);

  const libraryLevels = () =>
    Object.values(levelLibrary).sort(
      (a, b) =>
        a.location.localeCompare(b.location) ||
        a.author.localeCompare(b.author),
    );
  const stageName = (id: string) => {
    const index = cityLevels.findIndex((stage) => stage.id === id);
    return index < 0 ? "an unknown stage" : `Stage ${index + 1}`;
  };
  const byline = (level: LibraryLevel) =>
    `by @${escape(level.author)} · ${escape(savedAt(level.savedAt))}`;
  const notes = (level: LibraryLevel) =>
    level.notes ? `<p class="lb-notes">${escape(level.notes)}</p>` : "";

  function render() {
    const levels = libraryLevels();
    $("lb-stage-cards").innerHTML = cityLevels
      .map((stage, index) => {
        const chosen = levelLibrary[levelLineup.stages[stage.id] ?? ""];
        const options = levels
          .map((level) => {
            const fits = stageProblems(level, stage).length === 0;
            const origin =
              level.builtFor === stage.id
                ? ""
                : ` · made for ${stageName(level.builtFor)}`;
            return `<option value="${escape(level.id)}" ${level === chosen ? "selected" : ""} ${fits ? "" : "disabled"}>${escape(level.location)} · @${escape(level.author)}${origin}${fits ? "" : " · doesn't fit"}</option>`;
          })
          .join("");
        const problems = chosen ? stageProblems(chosen, stage) : [];
        const detail = chosen
          ? `<p class="small">${byline(chosen)}</p>${notes(chosen)}` +
            (problems.length
              ? `<p class="lb-warning">⚠ No longer fits this stage, so it plays a random street instead: ${escape(problems.join(" "))}</p>`
              : "")
          : `<p class="small">Plays ${levelLocationPools[index].map((street) => escape(street.name)).join(" or ")} at random.</p>`;
        return `<article class="lb-stage${chosen ? " chosen" : ""}">
          <h4>Stage ${index + 1}</h4>
          <p class="lb-stage-title">${escape(stage.title)}</p>
          <label><span class="sr-only">Level for stage ${index + 1}</span>
            <select data-stage="${escape(stage.id)}">
              <option value="">🎲 Random street (built-in)</option>${options}
            </select></label>
          ${detail}
        </article>`;
      })
      .join("");

    const entries = endlessEntries();
    const playable = new Set(entries.map((entry) => entry.id));
    const unfit = levels.filter(
      (level) => !playable.has(libraryLocation(level.id)),
    );
    $("lb-endless-count").textContent =
      `${entries.filter((entry) => entry.enabled).length} of ${entries.length} on in endless mode`;
    const row = (
      id: string,
      enabled: boolean,
      name: string,
      meta: string,
      level?: LibraryLevel,
      warning = "",
    ) => `<li class="${level?.id === host.editingId() ? "editing" : ""}">
        <label class="lb-switch" title="${enabled ? "In endless mode" : "Not in endless mode"}">
          <input type="checkbox" data-endless="${escape(id)}" ${enabled ? "checked" : ""} ${warning ? "disabled" : ""} />
          <span aria-hidden="true"></span><span class="sr-only">Endless mode: ${escape(name)}</span>
        </label>
        <div class="lb-level-text">
          <strong>${escape(name)}</strong> <span class="small">${meta}</span>
          ${level ? notes(level) : ""}${warning}
        </div>
        ${
          level
            ? `<div class="lb-level-actions"><button type="button" data-open="${escape(level.id)}">✏️ Open</button><button type="button" data-delete="${escape(level.id)}" class="lb-danger">🗑</button></div>`
            : ""
        }
      </li>`;
    $("lb-level-list").innerHTML =
      entries
        .map((entry) => {
          const level = entry.author
            ? levelLibrary[entry.location.slice("library:".length)]
            : undefined;
          return row(
            entry.id,
            entry.enabled,
            entry.name,
            level
              ? `${byline(level)} · Stage ${entry.stageIndex + 1} goals`
              : `built-in street · Stage ${entry.stageIndex + 1} goals`,
            level,
          );
        })
        .join("") +
      unfit
        .map((level) =>
          row(
            libraryLocation(level.id),
            false,
            level.location,
            `${byline(level)} · made for ${stageName(level.builtFor)}`,
            level,
            `<p class="lb-warning">Not playable: it doesn't reach the goals of ${stageName(level.builtFor)} any more.</p>`,
          ),
        )
        .join("");
  }

  async function save(next: LevelLineup) {
    status("Saving…");
    try {
      const response = await fetch("/__level-builder/lineup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineup: next }),
      });
      if (!response.ok) throw new Error(await response.text());
      Object.assign(levelLineup, (await response.json()).lineup);
      status("Saved. New games use this lineup; commit & push to share it.");
    } catch (error) {
      status(
        error instanceof TypeError
          ? "Not saved: the dev server (npm run dev) is not reachable."
          : `Not saved: ${(error as Error).message}`,
      );
    }
    render();
  }

  /** Pick up files that changed on disk, e.g. after a teammate's levels were pulled. */
  async function sync() {
    try {
      const response = await fetch("/__level-builder/library");
      if (!response.ok) return;
      const data = (await response.json()) as {
        levels: LibraryLevel[];
        lineup: LevelLineup;
      };
      for (const id of Object.keys(levelLibrary)) delete levelLibrary[id];
      for (const level of data.levels) levelLibrary[level.id] = level;
      Object.assign(levelLineup, data.lineup);
      render();
    } catch {
      status(
        "The dev server is not reachable; showing the levels this page loaded with.",
      );
    }
  }

  root.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    const stages = { ...levelLineup.stages };
    let endlessOff = [...levelLineup.endlessOff];
    if (input.dataset.stage) {
      if (input.value) stages[input.dataset.stage] = input.value;
      else delete stages[input.dataset.stage];
    } else if (input.dataset.endless && input instanceof HTMLInputElement) {
      const id = input.dataset.endless;
      endlessOff = input.checked
        ? endlessOff.filter((entry) => entry !== id)
        : [...endlessOff, id];
    } else return;
    void save({ stages, endlessOff });
  });
  root.addEventListener("click", async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button",
    );
    if (!button) return;
    if (button.id === "lb-lineup-close") return api.toggle();
    if (button.dataset.open) {
      api.toggle();
      return host.open(button.dataset.open);
    }
    const id = button.dataset.delete;
    const level = id ? levelLibrary[id] : undefined;
    if (
      !id ||
      !level ||
      !window.confirm(
        `Delete “${level.location}” by @${level.author} from the library? It also leaves the stages and endless mode. (Git history still has it.)`,
      )
    )
      return;
    try {
      const response = await fetch("/__level-builder/library/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error(await response.text());
      delete levelLibrary[id];
      Object.assign(levelLineup, (await response.json()).lineup);
      host.forget(id);
      status(`Deleted “${level.location}”. Commit & push to share the change.`);
    } catch (error) {
      status(`Not deleted: ${(error as Error).message}`);
    }
    render();
  });

  const api = {
    get open() {
      return !root.hidden;
    },
    toggle() {
      root.hidden = !root.hidden;
      if (root.hidden) return;
      status("");
      render();
      void sync();
      $<HTMLButtonElement>("lb-lineup-close").focus();
    },
    /** Redraw after the builder saved a level. */
    refresh() {
      if (!root.hidden) render();
    },
  };
  return api;
}
