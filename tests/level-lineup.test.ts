import assert from "node:assert/strict";
import test from "node:test";
import { cityLevels, riehenringSite } from "../config/levels.ts";
import {
  baselLocations,
  levelLocationPools,
} from "../config/level-locations.ts";
import { levelLibrary, levelLineup } from "../config/built-levels/index.ts";
import {
  endlessEntries,
  fitsStage,
  levelAtLocation,
  libraryLocation,
  pickEndlessEntry,
  stageLocation,
} from "../src/game/level-lineup.ts";
import {
  createCampaign,
  currentLevel,
  startEndless,
} from "../src/game/campaign.ts";
import type { LevelLineup, LibraryLevel } from "../src/interfaces.ts";

const first = cityLevels[0];
const fitting: LibraryLevel = {
  id: "test-fits-a1b2c3",
  author: "Giginio",
  notes: "Fits stage 1.",
  builtFor: first.id,
  savedAt: "2026-10-04T12:00:00.000Z",
  location: "Test street",
  site: { ...riehenringSite, start: [0, 0] },
  spots: first.layout.map((spot) => ({ ...spot })),
};
const empty: LibraryLevel = { ...fitting, id: "test-empty-a1b2c3", spots: [] };
const library = { [fitting.id]: fitting, [empty.id]: empty };
const none: LevelLineup = { stages: {}, endlessOff: [] };

test("a library level fits a stage only when its spots reach the goals", () => {
  assert.equal(fitsStage(fitting, first), true);
  assert.equal(fitsStage(empty, first), false);
});

test("a stage plays its lineup level, else a random built-in street", () => {
  const chosen = { stages: { [first.id]: fitting.id }, endlessOff: [] };
  assert.equal(
    stageLocation(0, () => 0, chosen, library),
    libraryLocation(fitting.id),
  );
  assert.equal(
    stageLocation(0, () => 0.99, none, library),
    levelLocationPools[0][1].id,
  );
  // An unfit or missing level falls back to the built-in streets.
  for (const id of [empty.id, "gone"])
    assert.ok(
      levelLocationPools[0].some(
        (street) =>
          street.id ===
          stageLocation(
            0,
            () => 0,
            { stages: { [first.id]: id }, endlessOff: [] },
            library,
          ),
      ),
    );
});

test("endless lists every built-in street and fitting library level, all on by default", () => {
  const entries = endlessEntries(none, library);
  assert.equal(entries.length, baselLocations.length + 1);
  assert.ok(entries.every((entry) => entry.enabled));
  const built = entries.find(
    (entry) => entry.id === libraryLocation(fitting.id),
  )!;
  assert.equal(built.stageIndex, 0);
  assert.equal(built.author, "Giginio");
  assert.ok(!entries.some((entry) => entry.id === libraryLocation(empty.id)));
  // Each built-in street plays the stage of its difficulty tier.
  levelLocationPools.forEach((pool, stageIndex) =>
    pool.forEach((street) =>
      assert.equal(
        entries.find((entry) => entry.id === `basel:${street.id}`)!.stageIndex,
        stageIndex,
      ),
    ),
  );
});

test("endless picks only switched-on places, and everything when all are off", () => {
  const all = endlessEntries(none, library).map((entry) => entry.id);
  const onlyLibrary = {
    stages: {},
    endlessOff: all.filter((id) => id !== libraryLocation(fitting.id)),
  };
  for (const r of [0, 0.5, 0.99])
    assert.equal(
      pickEndlessEntry(() => r, onlyLibrary, library).id,
      libraryLocation(fitting.id),
    );
  const allOff = { stages: {}, endlessOff: all };
  assert.equal(pickEndlessEntry(() => 0, allOff, library).id, all[0]);
});

test("a library location plays the stage's rules at the saved place and spots", () => {
  const level = levelAtLocation(first, libraryLocation(fitting.id), library)!;
  assert.equal(level.location, "Test street");
  assert.equal(level.mapSite, level.site);
  assert.deepEqual(level.layout, fitting.spots);
  assert.deepEqual(level.goals, first.goals);
  const street = levelLocationPools[0][0];
  assert.equal(
    levelAtLocation(first, street.id, library)!.location,
    street.name,
  );
  assert.equal(levelAtLocation(first, "library:gone", library), undefined);
});

test("the campaign and endless mode use the shared lineup", () => {
  const savedLineup = structuredClone(levelLineup);
  levelLibrary[fitting.id] = fitting;
  try {
    levelLineup.stages = { [first.id]: fitting.id };
    const s = createCampaign(() => 0);
    assert.equal(s.campaign!.locations![0], libraryLocation(fitting.id));
    assert.equal(currentLevel(s)!.location, "Test street");
    assert.equal(s.plots.length, fitting.spots.length);
    // Endless with only this level switched on always plays it, under stage 1 rules.
    levelLineup.endlessOff = endlessEntries()
      .map((entry) => entry.id)
      .filter((id) => id !== libraryLocation(fitting.id));
    s.outcome = "won";
    assert.equal(
      startEndless(s, () => 0.7),
      true,
    );
    assert.equal(s.campaign!.level, 0);
    assert.equal(currentLevel(s)!.location, "Test street");
  } finally {
    delete levelLibrary[fitting.id];
    Object.assign(levelLineup, savedLineup);
  }
});
