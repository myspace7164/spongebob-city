import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { emoteConfig } from "../config/emotes";
import { emotePose, startEmote } from "../src/game/emotes";
import { createPlayer, updatePlayer } from "../src/game/player";
import { createLocomotion } from "../src/game/locomotion";
import { makeCharacter } from "../src/game/characters";
import { AccountStore } from "../server/store";
import { Rooms } from "../server/rooms";
const idle = { forward: 0, right: 0, jump: false, run: false };
test("five emotes expire, movement/jump cancels, and crouching never moves the physics position", () => {
  const player = createPlayer();
  for (const item of emoteConfig.items) {
    assert.equal(startEmote(player, item.id), true);
    updatePlayer(player, idle, 0, 0.25);
    assert.equal(player.emote?.elapsed, 0.25);
    assert.deepEqual(player.position, { x: 0, y: 0, z: 0 });
    updatePlayer(player, idle, 0, item.duration);
    assert.equal(player.emote, undefined);
  }
  for (const movement of [
    { ...idle, forward: 1 },
    { ...idle, right: 1 },
    { ...idle, jump: true },
  ]) {
    startEmote(player, "teabag");
    updatePlayer(player, movement, 0, 1 / 60);
    assert.equal(player.emote, undefined);
  }
  assert.equal(startEmote(player, "fake" as never), false);
  assert.equal(
    new Set(
      emoteConfig.items.map((item) => JSON.stringify(emotePose(item.id, 0.4))),
    ).size,
    5,
  );
  assert.ok(emotePose("teabag", 0.3).squash < 1);
  assert.notDeepEqual(emotePose("floss", 0.1), emotePose("floss", 0.5));
});
test("imported and fallback rigs animate all emotes and restore idle transforms and attachments", async () => {
  const doc = Object.getOwnPropertyDescriptor(globalThis, "document"),
    style = Object.getOwnPropertyDescriptor(globalThis, "getComputedStyle");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { documentElement: {} },
  });
  Object.defineProperty(globalThis, "getComputedStyle", {
    configurable: true,
    value: () => ({ getPropertyValue: () => "#ffffff" }),
  });
  try {
    const bytes = readFileSync("public/models/spongebob.glb");
    const imported = (
      await new GLTFLoader().parseAsync(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
        "",
      )
    ).scene;
    for (const [model, isImported] of [
      [imported, true],
      [makeCharacter("sponge"), false],
    ] as const) {
      const rig = createLocomotion(model, isImported),
        arm = model.getObjectByName("right-arm")!;
      const rest = {
        position: model.position.clone(),
        scale: model.scale.clone(),
        rotation: model.rotation.clone(),
        arm: arm.rotation.clone(),
      };
      for (const item of emoteConfig.items) {
        const player = createPlayer();
        startEmote(player, item.id);
        player.emote!.elapsed = 0.7;
        rig.update(1, 0, true, player.emote);
        assert.equal(model.userData.gait, `emote:${item.id}`);
        assert.notDeepEqual(arm.rotation.toArray(), rest.arm.toArray());
        assert.equal(rig.rightHand.parent, arm);
        model.traverse((o) => {
          if (o.userData.attachedToLimb)
            assert.ok(o.parent?.name === o.userData.attachedToLimb);
        });
        rig.update(2, 0, true);
        assert.deepEqual(model.position.toArray(), rest.position.toArray());
        assert.deepEqual(model.scale.toArray(), rest.scale.toArray());
        assert.deepEqual(model.rotation.toArray(), rest.rotation.toArray());
        assert.deepEqual(arm.rotation.toArray(), rest.arm.toArray());
        rig.update(2, 0, true, player.emote, true);
        const still = arm.rotation.toArray();
        player.emote!.elapsed = 2;
        rig.update(3, 0, true, player.emote, true);
        assert.deepEqual(arm.rotation.toArray(), still);
      }
    }
  } finally {
    if (doc) Object.defineProperty(globalThis, "document", doc);
    else Reflect.deleteProperty(globalThis, "document");
    if (style) Object.defineProperty(globalThis, "getComputedStyle", style);
    else Reflect.deleteProperty(globalThis, "getComputedStyle");
  }
});
test("co-op validates and shares emote state, preserves city resources and cancels on movement", () => {
  const store = new AccountStore(":memory:"),
    rooms = new Rooms(store);
  try {
    const a = store.create("EmoteAlpha").account,
      b = store.create("EmoteBeta").account;
    const room = rooms.create(a);
    rooms.join(b, room.code);
    const budget = room.city.budget;
    for (const item of emoteConfig.items) {
      rooms.command(a.id, {
        ready: true,
        emote: item.id,
        movement: idle,
        yaw: 0,
      });
      rooms.tick(0.1);
      const shared = rooms.current(b.id)!;
      assert.equal(
        shared.players.find((p) => p.id === a.id)!.player.emote?.id,
        item.id,
      );
      assert.equal(shared.city.budget, budget);
    }
    assert.throws(
      () => rooms.command(a.id, { emote: "fake" } as never),
      /Unknown emote/,
    );
    rooms.command(a.id, { movement: { ...idle, forward: 1 }, yaw: 0 });
    rooms.tick(0.1);
    assert.equal(
      rooms.current(b.id)!.players.find((p) => p.id === a.id)!.player.emote,
      undefined,
    );
  } finally {
    store.close();
  }
});
