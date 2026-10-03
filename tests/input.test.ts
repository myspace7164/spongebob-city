import assert from "node:assert/strict";
import test from "node:test";
import { GameInput } from "../src/game/input.ts";
import { createPlayer, updatePlayer } from "../src/game/player.ts";

function withInput(
  run: (
    input: GameInput,
    windowTarget: EventTarget,
    documentTarget: EventTarget,
  ) => void,
) {
  const windowTarget = new EventTarget();
  const canvas = new EventTarget();
  const documentTarget = Object.assign(new EventTarget(), {
    pointerLockElement: canvas,
    hidden: false,
    exitPointerLock() {
      this.pointerLockElement = null as never;
    },
  });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowTarget,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentTarget,
  });
  try {
    run(
      new GameInput(canvas as HTMLCanvasElement),
      windowTarget,
      documentTarget,
    );
  } finally {
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (previousDocument)
      Object.defineProperty(globalThis, "document", previousDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
}
function key(target: EventTarget, type: string, key: string, code: string) {
  target.dispatchEvent(
    Object.assign(new Event(type, { cancelable: true }), {
      key,
      code,
      repeat: false,
    }),
  );
}
test("D moves camera-right, including logical D on a different physical key", () => {
  withInput((input, windowTarget) => {
    for (const [keyName, code] of [
      ["d", "KeyD"],
      ["D", "KeyD"],
      ["d", "KeyE"],
      ["d", ""],
    ]) {
      input.clear();
      key(windowTarget, "keydown", keyName, code);
      input.yaw = Math.PI / 3;
      const player = createPlayer();
      for (let i = 0; i < 60; i++)
        updatePlayer(player, input.consume(), input.yaw, 1 / 60);
      const rightwardDistance =
        player.position.x * Math.cos(input.yaw) -
        player.position.z * Math.sin(input.yaw);
      assert.ok(rightwardDistance > 4);
      key(windowTarget, "keyup", keyName, code);
      assert.equal(input.consume().right, 0);
    }
  });
});
test("mouse look changes yaw while held walking persists across simulation steps", () => {
  withInput((input, windowTarget, documentTarget) => {
    key(windowTarget, "keydown", "w", "KeyW");
    documentTarget.dispatchEvent(
      Object.assign(new Event("mousemove"), { movementX: 160, movementY: 30 }),
    );
    assert.ok(input.yaw < 0);
    assert.ok(input.pitch > 0.28);
    const player = createPlayer();
    for (let i = 0; i < 60; i++) {
      const movement = input.consume();
      assert.equal(movement.forward, 1);
      updatePlayer(player, movement, input.yaw, 1 / 60);
    }
    assert.ok(player.position.x > 1);
    assert.ok(player.position.z < -3);
  });
});
test("keyboard camera turning works while moving and pause clears held keys", () => {
  withInput((input, windowTarget, documentTarget) => {
    key(windowTarget, "keydown", "w", "KeyW");
    key(windowTarget, "keydown", "l", "KeyL");
    input.updateLook(0.5);
    assert.ok(input.yaw < 0);
    assert.equal(input.consume().forward, 1);
    documentTarget.dispatchEvent(new Event("pointerlockchange"));
    assert.equal(input.consume().forward, 0);
  });
});
