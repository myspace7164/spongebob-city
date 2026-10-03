import * as THREE from "three";
import { cityLevels } from "../../config/levels";
import { groundStyle } from "../../config/ground";
import type {
  BuiltLevel,
  CityTool,
  LevelSite,
  LevelSpot,
  NpcId,
  SiteType,
  TerrainGrid,
} from "../interfaces";
import { label } from "../game/characters";
import {
  categoryAt,
  decodeGroundPng,
  inflateInBrowser,
  type GroundTileData,
} from "../game/ground-data";
import { groundTileAt, type GroundMeta } from "../game/ground-style";
import {
  areaBounds,
  autoBounds,
  buildTools,
  checkCharacters,
  checkLayout,
  mapToPlay,
  mapToWorld,
  npcIds,
  placeNpcs,
  plotFootprint,
  siteFromView,
  siteTypes,
  spotBuilds,
  unionBounds,
} from "../game/level-builder";
import { playToMap, worldToMap } from "../game/streets";
import { levelLocalGroundAt, levelScenery } from "../game/terrain";
import { areaCorners, openAreaMap, type AreaOutline } from "./level-area-map";

/** What the builder needs from the running game. */
export interface BuilderHost {
  scenery: THREE.Object3D;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  levelIndex: () => number;
  terrain: () => TerrainGrid | null;
  groundAt: (x: number, z: number) => number;
  /** Play the draft of a level right away (in memory, not saved). */
  testPlay: (levelId: string, level: BuiltLevel) => void;
  /** Leave the builder back into the running game. */
  backToGame: () => void;
  /** Hide the mission's own plots/characters and ghost the trees while building. */
  showGameScene: (visible: boolean) => void;
}
type Tool = "spots" | "spawn" | "npcs";
type Point = [number, number];
/** A spot while building, in map-local metres (stable across level poses). */
interface DraftSpot {
  x: number;
  z: number;
  site: SiteType;
  builds?: CityTool[];
}
/** Everything undo restores. */
interface Snapshot {
  spots: DraftSpot[];
  origin: Point;
  forward: Point;
  area: { width: number; length: number };
  name: string;
  spawn: Point;
  facing: Point;
  npcs: Partial<Record<NpcId, Point>>;
}
interface SavedVersion {
  id: string;
  savedAt: string;
  location: string | null;
}
const typeNames: Record<SiteType, string> = {
  parking: "Parking",
  verge: "Tree pit",
  swale: "Swale",
  facade: "Building front",
};
const typeColours: Record<SiteType, string> = {
  parking: "#ff4fa0",
  verge: "#ffd400",
  swale: "#2f7dd1",
  facade: "#ff7a00",
};
const npcNames: Record<NpcId, string> = {
  sandy: "Sandy · upgrade",
  patrick: "Patrick",
  krabs: "Mr. Krabs",
  squidward: "Squidward",
  beton: "Dr. Beton start",
};
const npcColours: Record<NpcId, string> = {
  sandy: "#c8f0ff",
  patrick: "#ff9ec4",
  krabs: "#e5483c",
  squidward: "#8fd1b5",
  beton: "#6b6f75",
};
const toolNames: Record<Tool, string> = {
  spots: "Spots",
  spawn: "Spawn",
  npcs: "Characters",
};
const escape = (text: string) =>
  text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const len = (a: Point) => Math.hypot(a[0], a[1]);

/**
 * Dev-only level editor with a free mouse: an orbit camera over the Basel
 * map, tools for spots, the player's spawn and the characters, an area map,
 * undo, test play and saving into the project.
 */
export function createLevelBuilder(host: BuilderHost) {
  let active = false;
  let levelIndex = 0;
  let tool: Tool = "spots";
  let type: SiteType = "verge";
  let selected: number | null = null;
  let state: Snapshot = {
    spots: [],
    origin: [0, 0],
    forward: [0, -1],
    area: { width: 29, length: 110 },
    name: "",
    spawn: [0, 0],
    facing: [0, -1],
    npcs: {},
  };
  let npcsTouched = false;
  let loaded = false;
  const undoStack: Snapshot[] = [];
  const remember = () => {
    undoStack.push(structuredClone(state));
    if (undoStack.length > 60) undoStack.shift();
  };

  // ---- Editor camera (focus in map-local metres) ----
  const view = { focus: [0, 0] as Point, yaw: 0, pitch: 0.9, distance: 45 };
  const held = new Set<string>();
  let versions: SavedVersion[] = [];
  const pose = () =>
    levelScenery(cityLevels[host.levelIndex()], host.terrain());
  const groundMap = (x: number, z: number) => {
    return levelLocalGroundAt(pose(), x, z, host.groundAt);
  };
  /** Move the focus by world-space offsets (camera-relative panning). */
  function panWorld(dx: number, dz: number) {
    const p = pose();
    const [wx, wz] = mapToWorld(p, ...view.focus);
    view.focus = worldToMap(p, wx + dx, wz + dz);
  }
  function updateCamera(dt: number) {
    const step = view.distance * 0.9 * dt;
    const fx = -Math.sin(view.yaw),
      fz = -Math.cos(view.yaw);
    const ahead =
      (held.has("KeyW") || held.has("ArrowUp") ? 1 : 0) -
      (held.has("KeyS") || held.has("ArrowDown") ? 1 : 0);
    const right =
      (held.has("KeyD") || held.has("ArrowRight") ? 1 : 0) -
      (held.has("KeyA") || held.has("ArrowLeft") ? 1 : 0);
    if (ahead || right)
      panWorld(
        (fx * ahead - fz * right) * step,
        (fz * ahead + fx * right) * step,
      );
    if (held.has("KeyQ")) view.yaw += 1.6 * dt;
    if (held.has("KeyE")) view.yaw -= 1.6 * dt;
    const [wx, wz] = mapToWorld(pose(), ...view.focus);
    const wy = host.groundAt(wx, wz);
    const horizontal = Math.cos(view.pitch) * view.distance;
    host.camera.position.set(
      wx + Math.sin(view.yaw) * horizontal,
      wy + Math.sin(view.pitch) * view.distance,
      wz + Math.cos(view.yaw) * horizontal,
    );
    host.camera.lookAt(wx, wy, wz);
    host.camera.updateMatrixWorld();
    // Labels close to the camera would cover the view.
    const eye = host.camera.position;
    const at = new THREE.Vector3();
    for (const tag of tags)
      tag.visible = tag.getWorldPosition(at).distanceTo(eye) > 6;
  }

  // ---- Land cover for character placement (tiles decoded on demand) ----
  let groundMeta: GroundMeta | undefined;
  const groundTiles = new Map<number, GroundTileData>();
  async function ensureGround(points: Point[]) {
    groundMeta ??= (await (
      await fetch(groundStyle.metaUrl)
    ).json()) as GroundMeta;
    const base = groundStyle.metaUrl.slice(
      0,
      groundStyle.metaUrl.lastIndexOf("/") + 1,
    );
    for (const [x, z] of points) {
      const index = groundTileAt(groundMeta, x, z);
      if (index < 0 || groundTiles.has(index)) continue;
      const tile = groundMeta.tiles[index];
      const png = new Uint8Array(
        await (await fetch(base + tile.file)).arrayBuffer(),
      );
      groundTiles.set(
        index,
        await decodeGroundPng(tile, png, inflateInBrowser),
      );
    }
  }
  const surfaceAt = (x: number, z: number) =>
    groundMeta
      ? categoryAt(groundMeta, [...groundTiles.values()], x, z)
      : "other";

  // ---- Scene markers (children of the scenery group, so map-local) ----
  const markers = new THREE.Group();
  host.scenery.add(markers);
  markers.visible = false;
  const tags: THREE.Sprite[] = [];
  const ghost = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.3, 1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45 }),
  );
  host.scenery.add(ghost);
  ghost.visible = false;

  // ---- DOM ----
  const banner = document.createElement("div");
  banner.id = "builder-banner";
  banner.hidden = true;
  banner.setAttribute("role", "status");
  document.body.append(banner);
  const panel = document.createElement("aside");
  panel.id = "level-builder";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="lb-title"><span aria-hidden="true">🛠</span> Level builder</div>
    <label class="lb-row">Level <select id="lb-level"></select></label>
    <section>
      <h3>1 · Area &amp; name</h3>
      <label class="lb-row">Name <input id="lb-name" maxlength="40" /></label>
      <button type="button" id="lb-map" class="lb-wide">🗺 Choose area on map</button>
      <p id="lb-area" class="small"></p>
    </section>
    <section>
      <h3>2 · Tools</h3>
      <div id="lb-tools" class="lb-tabs">
        <button type="button" data-tool="spots"><kbd>T</kbd> Spots</button>
        <button type="button" data-tool="spawn"><kbd>P</kbd> Spawn</button>
        <button type="button" data-tool="npcs"><kbd>C</kbd> Characters</button>
      </div>
      <div id="lb-tool-spots">
        <div id="lb-types">${siteTypes
          .map(
            (t, i) =>
              `<button type="button" data-type="${t}"><span class="swatch" style="background:${typeColours[t]}"></span><kbd>${i + 1}</kbd> ${typeNames[t]}</button>`,
          )
          .join("")}</div>
        <fieldset id="lb-techniques"><legend>Selected spot</legend><div></div></fieldset>
        <p class="small">All spots (click to select and fly there):</p>
        <ol id="lb-spots"></ol>
      </div>
      <p id="lb-tool-spawn" class="small">Click on the ground where SpongeBob starts; keep the mouse pressed and drag to set the direction he looks.</p>
      <div id="lb-tool-npcs">
        <p class="small">Drag a character to move it. Sandy should stay close to the spawn: she sells the upgrade.</p>
        <button type="button" id="lb-auto" class="lb-wide">✨ Auto-place characters</button>
      </div>
    </section>
    <section>
      <h3>3 · Check &amp; play</h3>
      <ul id="lb-problems"></ul>
      <div class="lb-actions">
        <button type="button" id="lb-test" class="lb-primary">▶ Test play</button>
        <button type="button" id="lb-save-draft">📝 Save draft</button>
        <button type="button" id="lb-load-draft">↩ Load draft</button>
        <button type="button" id="lb-apply" class="lb-primary">✅ Apply to level</button>
        <button type="button" id="lb-undo">↶ Undo <kbd>Ctrl Z</kbd></button>
        <button type="button" id="lb-exit">Back to game</button>
      </div>
      <label class="lb-row">Saved versions <select id="lb-history"><option value="">Loading…</option></select></label>
      <button type="button" id="lb-restore">⏪ Restore selected version</button>
      <p id="lb-status" role="status"></p>
    </section>
    <details class="small"><summary>Mouse &amp; keys</summary>
      Left-click: use the tool · drag: move · right-click: delete spot ·
      right-drag: rotate view · Shift+drag or middle-drag: move view · wheel: zoom ·
      WASD/arrows: move view · Q/E: rotate · F: focus selection · Home: focus spawn ·
      Delete: remove selected spot · N: close
    </details>`;
  document.body.append(panel);
  const $ = <T extends HTMLElement>(id: string) =>
    panel.querySelector<T>(`#${id}`)!;
  const nameInput = $<HTMLInputElement>("lb-name");
  const status = (text: string) => {
    $("lb-status").textContent = text;
  };
  const draftKey = (id: string) => `spongebob-city:level-builder:draft:${id}`;
  const isPoint = (value: unknown): value is Point =>
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n));
  const storedDraft = (): Snapshot | undefined => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(draftKey(cityLevels[levelIndex].id)) ?? "null",
      );
      const draft = saved?.state as Snapshot | undefined;
      if (
        saved?.version !== 1 ||
        !draft ||
        typeof draft.name !== "string" ||
        !isPoint(draft.origin) ||
        !isPoint(draft.forward) ||
        !isPoint(draft.spawn) ||
        !isPoint(draft.facing) ||
        !draft.area ||
        !Number.isFinite(draft.area.width) ||
        !Number.isFinite(draft.area.length) ||
        !Array.isArray(draft.spots) ||
        draft.spots.length > 16 ||
        !draft.spots.every(
          (spot) =>
            Number.isFinite(spot.x) &&
            Number.isFinite(spot.z) &&
            siteTypes.includes(spot.site),
        ) ||
        !draft.npcs ||
        !Object.entries(draft.npcs).every(
          ([id, at]) => npcIds.includes(id as NpcId) && isPoint(at),
        )
      )
        return;
      return structuredClone(draft);
    } catch {
      return;
    }
  };
  function saveDraft() {
    try {
      localStorage.setItem(
        draftKey(cityLevels[levelIndex].id),
        JSON.stringify({
          version: 1,
          savedAt: new Date().toISOString(),
          state,
        }),
      );
      status(`Draft saved in this browser for ${state.name}.`);
      render();
    } catch {
      status("Draft could not be saved in this browser.");
    }
  }
  function loadDraft() {
    const saved = storedDraft();
    if (!saved) return status("There is no valid saved draft for this level.");
    remember();
    state = saved;
    npcsTouched = true;
    selected = null;
    view.focus = state.spawn;
    render();
    status(
      `Draft loaded for ${state.name}. The saved game level is unchanged.`,
    );
  }

  // ---- Model ↔ level ----
  function load(index: number) {
    levelIndex = index;
    loaded = true;
    const level = cityLevels[index];
    const p = levelScenery(level, host.terrain());
    const o = level.origin ?? { x: 0, z: 0 };
    const local = (x: number, z: number) => worldToMap(p, o.x + x, o.z + z);
    const [sx, sz] = level.site?.start ?? [0, 0];
    const origin = local(0, 0);
    const spawn = local(sx, sz);
    const yaw = level.site?.startYaw ?? 0;
    const b = level.site?.bounds;
    const npcs: Partial<Record<NpcId, Point>> = {};
    for (const id of npcIds) {
      const at = level.site?.npcs?.[id];
      if (at) npcs[id] = local(...at);
    }
    state = {
      origin,
      forward: sub(local(0, -1), origin),
      spawn,
      facing: sub(local(sx - Math.sin(yaw), sz - Math.cos(yaw)), spawn),
      name: level.location,
      area: b
        ? { width: b.maxX - b.minX, length: Math.max(20, -b.minZ) }
        : { width: 30, length: 30 },
      spots: level.layout.map((s) => {
        const [x, z] = worldToMap(p, s.x, s.z);
        return {
          x,
          z,
          site: s.site ?? "verge",
          ...(s.builds ? { builds: [...s.builds] } : {}),
        };
      }),
      npcs,
    };
    npcsTouched = Object.keys(npcs).length > 0;
    undoStack.length = 0;
    // Load the land cover for this area now, so auto-placing is instant later.
    void ensureGround([origin, spawn, ...Object.values(npcs)]);
    selected = null;
    view.focus = spawn;
    render();
    void refreshVersions();
  }

  /** The level as it would be saved, in play coordinates of its site. */
  function draft(): BuiltLevel {
    const site: LevelSite = siteFromView(
      state.origin,
      state.forward,
      state.name,
    );
    const toPlay = ([x, z]: Point) => mapToPlay(site, x, z);
    const spots: LevelSpot[] = state.spots.map((s) => {
      const [x, z] = toPlay([s.x, s.z]);
      return { x, z, site: s.site, ...(s.builds ? { builds: s.builds } : {}) };
    });
    const start = toPlay(state.spawn);
    const [lx, lz] = sub(
      toPlay([
        state.spawn[0] + state.facing[0],
        state.spawn[1] + state.facing[1],
      ]),
      start,
    );
    site.start = start;
    site.startYaw = Math.atan2(-lx, -lz);
    const npcs: Partial<Record<NpcId, Point>> = {};
    for (const id of npcIds) {
      const at = state.npcs[id];
      if (at) npcs[id] = toPlay(at);
    }
    site.npcs = npcs;
    const extra = [start, ...Object.values(npcs)].map(([x, z]) => ({
      x,
      z,
      site: "verge" as const,
    }));
    site.bounds = unionBounds(
      unionBounds(
        areaBounds(state.area.width, state.area.length),
        autoBounds(spots, start, 2),
      ),
      autoBounds(extra, start, 2),
    );
    return { location: state.name, site, spots };
  }

  async function autoPlace(reason: string) {
    const level = draft();
    const toMap = ([x, z]: Point) => playToMap(level.site, x, z);
    const b = level.site.bounds;
    status("Placing characters…");
    await ensureGround(
      (
        [
          [b.minX, b.minZ],
          [b.maxX, b.minZ],
          [b.maxX, b.maxZ],
          [b.minX, b.maxZ],
        ] as Point[]
      ).map(toMap),
    );
    const { npcs, warnings } = placeNpcs(
      level.site.start!,
      level.spots,
      b,
      (x, z) => surfaceAt(...toMap([x, z])),
    );
    remember();
    for (const id of npcIds) state.npcs[id] = toMap(npcs[id]);
    npcsTouched = false;
    status(
      warnings.length ? warnings.join(" ") : `Characters placed ${reason}.`,
    );
    render();
  }

  function outlines(): AreaOutline[] {
    return cityLevels.map((level, i) => {
      const p = levelScenery(level, host.terrain());
      const o = level.origin ?? { x: 0, z: 0 };
      const b = level.site?.bounds ?? {
        minX: -15,
        maxX: 15,
        minZ: -25,
        maxZ: 5,
      };
      const corners = (
        [
          [b.minX, b.minZ],
          [b.maxX, b.minZ],
          [b.maxX, b.maxZ],
          [b.minX, b.maxZ],
        ] as Point[]
      ).map(([x, z]) => worldToMap(p, o.x + x, o.z + z));
      return {
        label: `${i + 1} ${level.location}`,
        corners,
        current: i === levelIndex,
      };
    });
  }

  // ---- Rendering ----
  function render() {
    markers.clear();
    tags.length = 0;
    const level = draft();
    const y = groundMap;
    const tag = (text: string, x: number, z: number, height: number) => {
      const t = label(text);
      // Constant size on screen, readable at any zoom.
      (t.material as THREE.SpriteMaterial).sizeAttenuation = false;
      t.scale.set(0.15, 0.028, 1);
      t.position.set(x, y(x, z) + height, z);
      markers.add(t);
      tags.push(t);
    };
    state.spots.forEach((s, i) => {
      const [w, d] = plotFootprint(s.site);
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.3, d),
        new THREE.MeshBasicMaterial({
          color: i === selected ? "#ffffff" : typeColours[s.site],
        }),
      );
      tile.position.set(s.x, y(s.x, s.z) + 0.2, s.z);
      tile.rotation.y = -level.site.heading;
      markers.add(tile);
      tag(`#${i + 1} ${typeNames[s.site]}`, s.x, s.z, 2.2);
    });
    const corners = areaCorners({
      start: state.origin,
      forward: state.forward,
      ...state.area,
      name: state.name,
    });
    markers.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          [...corners, corners[0]].map(
            ([x, z]) => new THREE.Vector3(x, y(x, z) + 0.15, z),
          ),
        ),
        new THREE.LineBasicMaterial({ color: "#ffd400" }),
      ),
    );
    // Spawn: black ring with an arrow in the facing direction.
    const [sx, sz] = state.spawn;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.3, 32),
      new THREE.MeshBasicMaterial({ color: "#000000", side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(sx, y(sx, sz) + 0.12, sz);
    const n = len(state.facing) || 1;
    const [tx, tz] = [
      sx + (state.facing[0] / n) * 3,
      sz + (state.facing[1] / n) * 3,
    ];
    const arrow = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(sx, y(sx, sz) + 0.3, sz),
        new THREE.Vector3(tx, y(tx, tz) + 0.3, tz),
      ]),
      new THREE.LineBasicMaterial({ color: "#000000" }),
    );
    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.9, 10),
      new THREE.MeshBasicMaterial({ color: "#000000" }),
    );
    head.position.set(tx, y(tx, tz) + 0.3, tz);
    // Point the cone along the facing: tip (+Y) turned to the horizontal direction.
    head.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(state.facing[0] / n, 0, state.facing[1] / n),
    );
    markers.add(ring, arrow, head);
    tag("SPAWN", sx, sz, 2.4);
    for (const id of npcIds) {
      const at = state.npcs[id];
      if (!at) continue;
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 1.8, 14),
        new THREE.MeshBasicMaterial({ color: npcColours[id] }),
      );
      body.position.set(at[0], y(...at) + 0.9, at[1]);
      markers.add(body);
      tag(npcNames[id], at[0], at[1], 2.6);
    }
    // Panel and banner.
    $<HTMLSelectElement>("lb-level").innerHTML = cityLevels
      .map(
        (l, i) =>
          `<option value="${i}" ${i === levelIndex ? "selected" : ""}>${i + 1} · ${escape(i === levelIndex ? state.name : l.location)}</option>`,
      )
      .join("");
    if (document.activeElement !== nameInput) nameInput.value = state.name;
    $("lb-area").textContent =
      `Area ${Math.round(state.area.width)} × ${Math.round(state.area.length)} m (yellow outline on the ground).`;
    panel
      .querySelectorAll<HTMLButtonElement>("#lb-tools button")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.tool === tool)),
      );
    for (const t of ["spots", "spawn", "npcs"] as Tool[])
      $(`lb-tool-${t}`).hidden = t !== tool;
    panel
      .querySelectorAll<HTMLButtonElement>("#lb-types button")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.type === type)),
      );
    $("lb-spots").innerHTML = state.spots
      .map(
        (s, i) =>
          `<li><button type="button" data-spot="${i}" aria-pressed="${i === selected}"><span class="swatch" style="background:${typeColours[s.site]}"></span>#${i + 1} ${typeNames[s.site]}</button></li>`,
      )
      .join("");
    const box = $("lb-techniques").querySelector("div")!;
    const spot = selected === null ? undefined : state.spots[selected];
    box.innerHTML = spot
      ? buildTools
          .map(
            (t) =>
              `<label><input type="checkbox" value="${t}" ${spotBuilds(spot).includes(t) ? "checked" : ""}/> ${t}</label>`,
          )
          .join("") +
        `<button type="button" id="lb-reset">Reset to ${typeNames[spot.site]}</button>` +
        `<button type="button" id="lb-delete" class="lb-danger">🗑 Delete spot #${selected! + 1}</button>`
      : `<p class="small">Click a spot to select it. Unsealing always works.</p>`;
    const problems = [
      ...checkLayout(state.spots, cityLevels[levelIndex].goals),
      ...checkCharacters(level.site, level.spots),
    ];
    $("lb-problems").innerHTML = problems.length
      ? problems.map((p) => `<li>${escape(p)}</li>`).join("")
      : '<li class="ok">✓ Ready: all goals can be reached.</li>';
    banner.textContent = `🛠 LEVEL BUILDER · Level ${levelIndex + 1} · ${state.name} · tool: ${toolNames[tool]}${tool === "spots" ? ` (${typeNames[type]})` : ""} · ${state.spots.length}/16 spots · N: close`;
    document.body.style.setProperty("--builder-type", typeColours[type]);
    $<HTMLButtonElement>("lb-undo").disabled = undoStack.length === 0;
    $<HTMLButtonElement>("lb-load-draft").disabled = !storedDraft();
    const historySelect = $<HTMLSelectElement>("lb-history");
    const chosenVersion = historySelect.value;
    historySelect.innerHTML = versions.length
      ? versions
          .map(
            (version) =>
              `<option value="${escape(version.id)}" ${version.id === chosenVersion ? "selected" : ""}>${escape(new Date(version.savedAt).toLocaleString())} · ${escape(version.location ?? "built-in level")}</option>`,
          )
          .join("")
      : '<option value="">No saved versions yet</option>';
    $<HTMLButtonElement>("lb-restore").disabled = versions.length === 0;
  }

  // ---- Mouse picking ----
  function pick(event: MouseEvent): Point | null {
    const rect = host.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, host.camera);
    const p = new THREE.Vector3();
    const step = Math.max(0.25, view.distance / 200);
    for (let t = 0.5; t < 800; t += step) {
      p.copy(ray.ray.origin).addScaledVector(ray.ray.direction, t);
      if (p.y <= host.groundAt(p.x, p.z)) return worldToMap(pose(), p.x, p.z);
    }
    return null;
  }
  const spotAt = (at: Point) =>
    state.spots.findIndex((s) => {
      const [w, d] = plotFootprint(s.site);
      return Math.abs(s.x - at[0]) <= w / 2 && Math.abs(s.z - at[1]) <= d / 2;
    });
  const npcAt = (at: Point) =>
    npcIds.find((id) => state.npcs[id] && len(sub(state.npcs[id]!, at)) < 1.4);

  let drag:
    | { kind: "spot"; index: number; offset: Point }
    | { kind: "spawn" }
    | { kind: "npc"; id: NpcId }
    | { kind: "rotate" | "pan"; x: number; y: number; moved: boolean }
    | null = null;
  const canvas = host.canvas;
  canvas.addEventListener("contextmenu", (e) => {
    if (active) e.preventDefault();
  });
  canvas.addEventListener("mousedown", (e) => {
    if (!active) return;
    e.preventDefault();
    if (e.button === 2) {
      drag = { kind: "rotate", x: e.clientX, y: e.clientY, moved: false };
      return;
    }
    if (e.button === 1 || e.shiftKey) {
      drag = { kind: "pan", x: e.clientX, y: e.clientY, moved: false };
      return;
    }
    const at = pick(e);
    if (!at) {
      status(
        "That click didn't hit the ground. Zoom in (wheel) or turn the view (right-drag).",
      );
      return;
    }
    if (tool === "spots") {
      const hit = spotAt(at);
      if (hit >= 0) {
        remember();
        selected = hit;
        drag = {
          kind: "spot",
          index: hit,
          offset: sub([state.spots[hit].x, state.spots[hit].z], at),
        };
        status(
          `Spot #${hit + 1} selected: drag to move it, right-click or 🗑 to delete it.`,
        );
      } else if (state.spots.length < 16) {
        remember();
        state.spots.push({ x: at[0], z: at[1], site: type });
        selected = state.spots.length - 1;
        drag = { kind: "spot", index: selected, offset: [0, 0] };
        status(
          `Spot #${selected + 1} placed (${typeNames[type]}). ${16 - state.spots.length} left to place.`,
        );
      } else
        status(
          "All 16 spots are placed: delete one first (right-click, Delete key or 🗑).",
        );
    } else if (tool === "spawn") {
      remember();
      state.spawn = at;
      drag = { kind: "spawn" };
    } else {
      const id = npcAt(at);
      if (id) {
        remember();
        drag = { kind: "npc", id };
      }
    }
    render();
  });
  window.addEventListener("mousemove", (e) => {
    if (!active) return;
    if (drag?.kind === "rotate" || drag?.kind === "pan") {
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (drag.kind === "rotate") {
        view.yaw -= dx * 0.006;
        view.pitch = Math.min(1.5, Math.max(0.15, view.pitch + dy * 0.004));
      } else {
        const scale = view.distance * 0.0016;
        const fx = -Math.sin(view.yaw),
          fz = -Math.cos(view.yaw);
        // Drag the ground with the mouse: right on screen moves the view left.
        panWorld((fz * dx + fx * dy) * scale, (-fx * dx + fz * dy) * scale);
      }
      return;
    }
    if (e.target !== canvas && !drag) return;
    const at = pick(e);
    if (!at) return;
    if (drag?.kind === "spot") {
      state.spots[drag.index].x = at[0] + drag.offset[0];
      state.spots[drag.index].z = at[1] + drag.offset[1];
      render();
    } else if (drag?.kind === "spawn") {
      const d = sub(at, state.spawn);
      if (len(d) > 0.8) state.facing = d;
      render();
    } else if (drag?.kind === "npc") {
      state.npcs[drag.id] = at;
      npcsTouched = true;
      render();
    }
    ghost.visible = tool === "spots" && !drag && spotAt(at) < 0;
    if (ghost.visible) {
      const [w, d] = plotFootprint(type);
      ghost.scale.set(w, 1, d);
      ghost.rotation.y = -draft().site.heading;
      ghost.position.set(at[0], groundMap(...at) + 0.25, at[1]);
      (ghost.material as THREE.MeshBasicMaterial).color.set(typeColours[type]);
    }
  });
  window.addEventListener("mouseup", (e) => {
    if (!active || !drag) return;
    const ended = drag;
    drag = null;
    if (ended.kind === "rotate" && !ended.moved && tool === "spots") {
      // A right-click without dragging deletes the spot under the mouse.
      const at = pick(e);
      const hit = at ? spotAt(at) : -1;
      if (hit >= 0) {
        remember();
        state.spots.splice(hit, 1);
        selected = null;
        render();
      }
    }
    if (ended.kind === "spawn") {
      if (!npcsTouched) void autoPlace("around the new spawn");
      else
        status(
          "Spawn moved. Characters keep their places (✨ Auto-place to redo).",
        );
    }
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (!active) return;
      e.preventDefault();
      view.distance = Math.min(
        250,
        Math.max(5, view.distance * (e.deltaY > 0 ? 1.12 : 1 / 1.12)),
      );
    },
    { passive: false },
  );

  // ---- Keys (ignored while typing in a field) ----
  const typing = () =>
    ["INPUT", "SELECT", "TEXTAREA"].includes(
      document.activeElement?.tagName ?? "",
    );
  window.addEventListener("keydown", (e) => {
    if (!active) return;
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
      e.preventDefault();
      saveDraft();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ" && !typing()) {
      e.preventDefault();
      undo();
      return;
    }
    if (typing() || e.ctrlKey || e.metaKey) return;
    held.add(e.code);
    const digit = Number(e.key);
    if (digit >= 1 && digit <= siteTypes.length) {
      tool = "spots";
      setType(siteTypes[digit - 1]);
    } else if (e.code === "KeyT") setTool("spots");
    else if (e.code === "KeyP") setTool("spawn");
    else if (e.code === "KeyC") setTool("npcs");
    else if (
      (e.code === "Delete" || e.code === "Backspace") &&
      selected !== null
    ) {
      remember();
      state.spots.splice(selected, 1);
      selected = null;
      render();
    } else if (e.code === "KeyF" && selected !== null)
      view.focus = [state.spots[selected].x, state.spots[selected].z];
    else if (e.code === "Home") view.focus = state.spawn;
    else if (e.code === "KeyN") host.backToGame();
  });
  window.addEventListener("keyup", (e) => held.delete(e.code));
  window.addEventListener("blur", () => held.clear());

  // ---- Panel events ----
  function setTool(next: Tool) {
    tool = next;
    ghost.visible = false;
    render();
  }
  function setType(next: SiteType) {
    type = next;
    if (selected !== null && tool === "spots") {
      remember();
      state.spots[selected].site = next;
      delete state.spots[selected].builds;
    }
    render();
  }
  function undo() {
    const previous = undoStack.pop();
    if (!previous) return status("Nothing to undo.");
    state = previous;
    selected = null;
    status("Undone.");
    render();
  }
  async function refreshVersions() {
    const levelId = cityLevels[levelIndex].id;
    try {
      const response = await fetch(
        `/__level-builder/history?levelId=${encodeURIComponent(levelId)}`,
      );
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as { versions: SavedVersion[] };
      versions = data.versions;
      render();
    } catch {
      versions = [];
      render();
      status("Saved versions could not be loaded from the dev server.");
    }
  }
  async function applyDraft() {
    const problems = checkLayout(state.spots, []);
    if (problems.length) return status(`Not applied: ${problems.join(" ")}`);
    if (
      !window.confirm(
        `Apply this draft to ${state.name}? The current saved level will be kept as a restorable version.`,
      )
    )
      return;
    status("Applying draft and keeping the current level…");
    try {
      const response = await fetch("/__level-builder/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levelId: cityLevels[levelIndex].id,
          level: draft(),
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      status(
        `Applied level ${levelIndex + 1} (${state.name}). The previous state is available under Saved versions. Reload to play the applied level.`,
      );
      await refreshVersions();
    } catch {
      status("Not applied: the dev server (npm run dev) is not reachable.");
    }
  }
  async function restoreVersion() {
    const versionId = $<HTMLSelectElement>("lb-history").value;
    if (!versionId) return status("Choose a saved version first.");
    const version = versions.find((item) => item.id === versionId);
    if (!version) return status("That saved version is no longer available.");
    if (
      !window.confirm(
        `Restore the saved state from ${new Date(version.savedAt).toLocaleString()}? Your current saved level will also be kept as a version.`,
      )
    )
      return;
    try {
      const response = await fetch("/__level-builder/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ levelId: cityLevels[levelIndex].id, versionId }),
      });
      if (!response.ok) throw new Error(await response.text());
      status("Restored. The level is saved; reload the game to play it.");
      await refreshVersions();
    } catch {
      status("Restore failed: the dev server could not update this level.");
    }
  }
  $<HTMLSelectElement>("lb-level").addEventListener("change", (e) =>
    load(Number((e.target as HTMLSelectElement).value)),
  );
  nameInput.addEventListener("focus", () => remember());
  nameInput.addEventListener("input", () => {
    state.name = nameInput.value;
    render();
  });
  $("lb-spots").addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!b?.dataset.spot) return;
    selected = Number(b.dataset.spot);
    view.focus = [state.spots[selected].x, state.spots[selected].z];
    status(`Spot #${selected + 1} selected: the view flew there.`);
    render();
  });
  $("lb-tools").addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (b?.dataset.tool) setTool(b.dataset.tool as Tool);
  });
  $("lb-types").addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (b?.dataset.type) setType(b.dataset.type as SiteType);
  });
  $("lb-techniques").addEventListener("change", () => {
    if (selected === null) return;
    remember();
    state.spots[selected].builds = [
      ...panel.querySelectorAll<HTMLInputElement>(
        "#lb-techniques input:checked",
      ),
    ].map((i) => i.value as CityTool);
    render();
  });
  $("lb-techniques").addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "lb-delete" && selected !== null) {
      remember();
      const removed = selected + 1;
      state.spots.splice(selected, 1);
      selected = null;
      status(
        `Spot #${removed} deleted. The following spots move up one number.`,
      );
      render();
      return;
    }
    if ((e.target as HTMLElement).id !== "lb-reset" || selected === null)
      return;
    remember();
    delete state.spots[selected].builds;
    render();
  });
  $("lb-auto").addEventListener("click", () => void autoPlace("on request"));
  $("lb-undo").addEventListener("click", undo);
  $("lb-save-draft").addEventListener("click", saveDraft);
  $("lb-load-draft").addEventListener("click", loadDraft);
  $("lb-apply").addEventListener("click", () => void applyDraft());
  $("lb-restore").addEventListener("click", () => void restoreVersion());
  $("lb-exit").addEventListener("click", () => host.backToGame());
  $("lb-test").addEventListener("click", () => {
    const problems = checkLayout(state.spots, []);
    if (problems.length)
      return status(`Cannot test yet: ${problems.join(" ")}`);
    host.testPlay(cityLevels[levelIndex].id, draft());
  });
  $("lb-map").addEventListener("click", () =>
    openAreaMap({
      initial: {
        start: state.origin,
        forward: state.forward,
        ...state.area,
        name: state.name,
      },
      areas: outlines(),
      onChoose: (choice) => {
        remember();
        const corners = areaCorners(choice);
        const inside = (s: DraftSpot) => {
          let isIn = false;
          for (let i = 0, j = 3; i < 4; j = i++) {
            const [xi, zi] = corners[i],
              [xj, zj] = corners[j];
            if (
              zi > s.z !== zj > s.z &&
              s.x < ((xj - xi) * (s.z - zi)) / (zj - zi) + xi
            )
              isIn = !isIn;
          }
          return isIn;
        };
        if (
          state.spots.some((s) => !inside(s)) &&
          window.confirm(
            "Some spots lie outside the new area. Remove those spots?",
          )
        )
          state.spots = state.spots.filter(inside);
        state.origin = choice.start;
        state.forward = choice.forward;
        state.spawn = choice.start;
        state.facing = choice.forward;
        state.area = { width: choice.width, length: choice.length };
        state.name = choice.name.trim() || state.name;
        selected = null;
        view.focus = choice.start;
        view.distance = Math.max(40, choice.length * 0.7);
        render();
        void autoPlace("for the new area");
      },
    }),
  );

  const api = {
    get active() {
      return active;
    },
    /** Open or close the builder; the game stays paused while it is open. */
    toggle() {
      active = !active;
      panel.hidden = !active;
      banner.hidden = !active;
      markers.visible = active;
      ghost.visible = false;
      held.clear();
      drag = null;
      document.body.classList.toggle("building", active);
      host.showGameScene(!active);
      // Reopening after Test play keeps the draft; another level loads fresh.
      if (active) {
        if (!loaded || levelIndex !== host.levelIndex())
          load(host.levelIndex());
        else render();
      }
    },
    updateCamera,
  };
  return api;
}
