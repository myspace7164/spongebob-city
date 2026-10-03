import assert from "node:assert/strict";
import test from "node:test";
import { fundingConfig as f } from "../config/funding.ts";
import { cityConfig as c, cityTools } from "../config/city.ts";
import {
  createCity,
  performCityAction as act,
  updateCity,
} from "../src/game/city.ts";
import {
  createCampaign,
  recyclePlot,
  connectRunoff,
  advanceCampaign,
  startNextCampaignLevel,
} from "../src/game/campaign.ts";
import type { CityState } from "../src/interfaces.ts";
const at = (s: CityState, id: number) => ({ ...s.plots[id], y: 0 });
const build = (
  s: CityState,
  action: "tree" | "basin" | "roof" | "tank" | "pond" | "shade",
  id: number,
) => {
  if (s.plots[id].kind === "asphalt") act(s, "karate", at(s, id), id);
  return act(s, action, at(s, id), id);
};

test("useful transfers and builds award spendable grants; failed and repeated actions do not", () => {
  const s = createCity();
  act(s, "tree", at(s, 0), 0);
  act(s, "spray", at(s, 0), 0);
  act(s, "absorb", at(s, 0), 0, 0);
  assert.equal(s.funding.earned, 0);
  act(s, "absorb", at(s, 0), 0, 50);
  act(s, "absorb", at(s, 0), 0, 100);
  assert.equal(s.funding.earned, f.collect);
  act(s, "karate", at(s, 0), 0);
  act(s, "tree", at(s, 0), 0);
  act(s, "spray", at(s, 0), 0, 40);
  const grants =
    f.collect + f.construction.soil + f.construction.tree + f.irrigate;
  assert.equal(s.funding.earned, grants);
  assert.equal(
    s.budget,
    c.budget -
      cityTools.find((t) => t.id === "karate")!.cost -
      cityTools.find((t) => t.id === "tree")!.cost +
      grants,
  );
  act(s, "tree", at(s, 0), 0);
  act(s, "spray", at(s, 0), 0, 40);
  assert.equal(s.funding.earned, grants);
  s.outcome = "lost";
  act(s, "karate", at(s, 1), 1);
  assert.equal(s.funding.earned, grants);
});

test("recycling, sabotage repair and reconnecting cannot farm government grants", () => {
  const s = createCampaign();
  s.plots.forEach((p) => delete p.site);
  build(s, "roof", 0);
  build(s, "basin", 1);
  const connect = () => {
    connectRunoff(s, 0, at(s, 0));
    connectRunoff(s, 1, at(s, 1));
  };
  connect();
  const earned = s.funding.earned;
  connect();
  assert.equal(s.funding.earned, earned);
  const budget = s.budget;
  recyclePlot(s, 0, at(s, 0));
  act(s, "roof", at(s, 0), 0);
  connect();
  assert.equal(s.budget, budget);
  assert.equal(s.funding.earned, earned);
  s.plots[1].kind = "asphalt";
  build(s, "basin", 1);
  assert.equal(s.funding.earned, earned);
});

test("Patrick, maximum collection and support actions earn grants once; new levels reset the ledger", () => {
  const s = createCity();
  act(s, "patrick", at(s, 0), null);
  assert.ok(s.funding.earned >= f.construction.soil);
  const earned = s.funding.earned;
  act(s, "patrick", at(s, 0), null);
  assert.equal(s.funding.earned, earned);
  act(s, "machine", { ...c.machine, y: 0 }, null);
  act(s, "machine", { ...c.machine, y: 0 }, null);
  assert.equal(s.funding.earned, earned + f.machine);
  act(s, "upgrade", { ...c.sandy, y: 0 }, null);
  assert.equal(s.funding.earned, earned + f.machine + f.upgrade);
  s.maximumTime = 1;
  updateCity(s, 1 / 60, at(s, 0));
  assert.ok(s.funding.claimed.some((key) => key.startsWith("collect:")));
  const campaign = createCampaign();
  build(campaign, "basin", 0);
  for (const id of [1, 2, 3]) act(campaign, "karate", at(campaign, id), id);
  build(campaign, "basin", 1);
  campaign.plots.forEach((p) => (p.surface = 0));
  Object.assign(campaign, { heat: 50, flood: 0, reused: 400 });
  campaign.campaign!.stormCompleted = true;
  assert.ok(campaign.funding.earned > 0);
  assert.equal(advanceCampaign(campaign), true);
  campaign.campaign!.pendingModifier = "speedBoost";
  assert.equal(startNextCampaignLevel(campaign), true);
  assert.deepEqual(campaign.funding, { earned: 0, claimed: [] });
  assert.equal(campaign.budget, c.budget);
});
