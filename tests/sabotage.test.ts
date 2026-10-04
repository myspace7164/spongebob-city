import assert from "node:assert/strict";
import test from "node:test";
import {
  createCity,
  performCityAction as act,
  updateCity,
} from "../src/game/city.ts";
import {
  createCampaign,
  advanceCampaign,
  currentLevel,
  levelPosition,
  startNextCampaignLevel,
} from "../src/game/campaign.ts";
import { updateSaboteur } from "../src/game/sabotage.ts";
import { activeBetonTargets } from "../src/game/sabotage.ts";
import { cityLevels } from "../config/levels.ts";
import {
  activeLevelBounds,
  isInsideActiveLevel,
} from "../src/game/active-level-area.ts";
import { cityConfig as c } from "../config/city.ts";
import { circleCollider, CollisionWorld } from "../src/game/collisions.ts";
import type { CityState } from "../src/interfaces.ts";
const at = (s: CityState, id: number) => ({ ...s.plots[id], y: 0 });
const water = (s: ReturnType<typeof createCity>) =>
  s.plots.reduce((n, p) => n + p.surface + p.moisture + p.stored, 0);

test("villain roams reproducibly, walks to the chosen plot and seals after a visible delay", () => {
  const s = createCity(),
    other = createCity();
  const start = { x: s.saboteur.x, z: s.saboteur.z };
  for (let i = 0; i < 200; i++) {
    updateSaboteur(s, 0.1);
    updateSaboteur(other, 0.1);
  }
  assert.deepEqual(s.saboteur, other.saboteur);
  assert.ok(Math.hypot(s.saboteur.x - start.x, s.saboteur.z - start.z) > 1);
  s.plots[0].kind = "basin";
  s.plots[0].moisture = 180;
  s.plots[0].stored = 50;
  const total = water(s);
  s.sabotageIn = 0;
  updateSaboteur(s, 0.1);
  assert.equal(s.saboteur.phase, "approaching");
  assert.equal(s.plots[0].kind, "basin");
  for (let i = 0; i < 500 && String(s.saboteur.phase) !== "sealing"; i++)
    updateSaboteur(s, 0.1);
  assert.equal(s.saboteur.phase, "sealing");
  assert.ok(
    Math.hypot(s.saboteur.x - s.plots[0].x, s.saboteur.z - s.plots[0].z) < 1,
  );
  assert.equal(s.plots[0].kind, "basin");
  for (let i = 0; i < 20; i++) updateSaboteur(s, 0.1);
  assert.equal(s.plots[0].kind, "asphalt");
  assert.equal(water(s), total);
});

test("intercept the moving villain to cancel an attack; disabled/pause/loss freeze movement", () => {
  const s = createCity();
  s.plots[0].kind = "soil";
  s.sabotageIn = 0;
  updateSaboteur(s, 0.1);
  updateSaboteur(s, 1);
  act(s, "machine", { x: s.saboteur.x + 20, y: 0, z: s.saboteur.z }, null);
  assert.equal(s.machineDisabled, 0);
  act(s, "machine", { ...s.saboteur, y: 0 }, null);
  assert.equal(s.saboteur.phase, "disabled");
  assert.equal(s.saboteur.targetId, null);
  const position = { x: s.saboteur.x, z: s.saboteur.z };
  updateSaboteur(s, 10);
  assert.deepEqual({ x: s.saboteur.x, z: s.saboteur.z }, position);
  assert.equal(s.plots[0].kind, "soil");
  const frozen = structuredClone(s);
  updateCity(s, 0, { x: 0, y: 0, z: 0 });
  assert.deepEqual(s, frozen);
  s.outcome = "lost";
  const lost = structuredClone(s);
  updateCity(s, 1, { x: 0, y: 0, z: 0 });
  assert.deepEqual(s, lost);
});

test("Dr. Beton is blocked by solid footprints instead of phasing through them", () => {
  const s = createCity();
  s.saboteur.x = 0;
  s.saboteur.z = 0;
  s.saboteur.destinationX = 8;
  s.saboteur.destinationZ = 0;
  s.saboteur.phase = "roaming";
  s.saboteur.step = 1;
  s.sabotageIn = 100;
  const collisions = new CollisionWorld();
  collisions.setStatic([circleCollider("solid-tree", 3, 0, 0.6, 0, 5)]);
  updateSaboteur(s, 1, 1, collisions);
  assert.ok(
    s.saboteur.x < 2.2,
    "vehicle stops before the solid tree footprint",
  );
});

test("Dr. Beton targets only permeable plots inside the active level", () => {
  const s = createCampaign();
  const area = activeLevelBounds(s);
  const active = { ...s.plots[0]!, id: 0, kind: "soil" as const };
  const nearerInactiveLevel = {
    ...active,
    id: 1,
    levelId: cityLevels[1]!.id,
  };
  const outsideBoundary = {
    ...active,
    id: 2,
    x: area.minX - 1,
  };
  s.plots = [active, nearerInactiveLevel, outsideBoundary];
  assert.deepEqual(
    activeBetonTargets(s).map((plot) => plot.id),
    [0],
  );

  s.saboteur.x = area.minX - 2;
  s.saboteur.z = (area.minZ + area.maxZ) / 2;
  s.saboteur.levelId = area.levelId;
  s.sabotageIn = 0;
  for (let i = 0; i < 20; i++) updateSaboteur(s, 0.1);
  assert.ok(isInsideActiveLevel(area, s.saboteur, 1.8));
  assert.ok(
    !s.saboteur.targetId || s.saboteur.targetId === active.id,
    "only the active level's permeable plot may be targeted",
  );
});

test("changed targets cancel attacks and fresh levels reposition the villain", () => {
  const s = createCity();
  s.plots[0].kind = "soil";
  s.sabotageIn = 0;
  updateSaboteur(s, 0.1);
  s.plots[0].kind = "tree";
  updateSaboteur(s, 0.1);
  assert.equal(s.saboteur.phase, "roaming");
  assert.equal(s.saboteur.targetId, null);
  const campaign = createCampaign();
  for (const [id, kind] of [
    [0, "basin"],
    [1, "basin"],
    [2, "karate"],
    [3, "karate"],
  ] as const)
    if (kind === "karate") act(campaign, kind, at(campaign, id), id);
    else {
      if (campaign.plots[id].kind === "asphalt")
        act(campaign, "karate", at(campaign, id), id);
      act(campaign, kind, at(campaign, id), id);
    }
  campaign.plots.forEach((p) => (p.surface = 0));
  Object.assign(campaign, { heat: 50, flood: 0, reused: 400 });
  campaign.campaign!.stormCompleted = true;
  assert.equal(advanceCampaign(campaign), true);
  campaign.campaign!.pendingModifier = "speedBoost";
  assert.equal(startNextCampaignLevel(campaign), true);
  assert.equal(currentLevel(campaign)!.id, "erlenmatt");
  assert.deepEqual(
    { x: campaign.saboteur.x, z: campaign.saboteur.z },
    levelPosition(campaign, c.machine),
  );
  assert.equal(campaign.saboteur.phase, "roaming");
  assert.equal(campaign.saboteur.step, 0);
});
