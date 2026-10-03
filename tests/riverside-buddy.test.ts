import assert from "node:assert/strict";
import test from "node:test";
import { riversideBuddy } from "../config/riverside-buddy.ts";
import { createCampaign, levelPosition } from "../src/game/campaign.ts";
import { riversideBuddyPose } from "../src/game/riverside-buddy.ts";
import { gameplayColliders } from "../src/game/world-colliders.ts";

test("ambient buddy walks, pauses for every gesture and matches shared room snapshots without changing resources", () => {
  const s = createCampaign();
  const snapshot = structuredClone(s);
  const samples = [
    [0, "walk"],
    [23, "sip"],
    [40, "roll"],
    [46, "smoke"],
    [53, "cheer"],
    [59, "walk"],
  ] as const;
  for (const [time, activity] of samples) {
    s.elapsed = time;
    const pose = riversideBuddyPose(s);
    assert.equal(pose.activity, activity);
    assert.deepEqual(riversideBuddyPose(JSON.parse(JSON.stringify(s))), pose);
    assert.deepEqual(riversideBuddyPose(s), pose);
    const collider = gameplayColliders(s, () => 0).find(
      (c) => c.id === "character-buddy",
    )!.shape;
    assert.equal(collider.type, "circle");
    if (collider.type === "circle") {
      assert.equal(collider.x, pose.x);
      assert.equal(collider.z, pose.z);
    }
    if (activity !== "walk") {
      s.elapsed += 0.1;
      const later = riversideBuddyPose(s);
      assert.equal(later.x, pose.x);
      assert.equal(later.z, pose.z);
    }
  }
  s.elapsed = 4;
  assert.notEqual(riversideBuddyPose(s).x, riversideBuddyPose(snapshot).x);
  s.elapsed = snapshot.elapsed;
  assert.deepEqual(s, snapshot);
  s.campaign!.level = 3;
  const pose = riversideBuddyPose(s);
  const origin = levelPosition(s, riversideBuddy);
  assert.equal(pose.x, origin.x);
  assert.equal(pose.z, origin.z + riversideBuddy.radiusZ);
});

test("short positive messages rotate without repetition until the complete set has played", () => {
  const s = createCampaign();
  const messages = new Set<string>();
  for (let i = 0; i < riversideBuddy.messages.length; i++) {
    s.elapsed = i * riversideBuddy.messageSeconds;
    messages.add(riversideBuddyPose(s).message);
  }
  assert.equal(messages.size, 20);
  assert.ok([...messages].some((m) => /rain|roots|concrete/i.test(m)));
  assert.ok([...messages].some((m) => /breath|going|fine/i.test(m)));
});
