import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createLocomotion } from "../src/game/locomotion.ts";
import { createHeldTools } from "../src/game/held-tools.ts";
import { makeCharacter } from "../src/game/characters.ts";
import { updateSpongeWaterState } from "../src/game/assets.ts";
import { cityTools } from "../config/city.ts";

test("real GLB has relaxed moving limbs, white teeth, preserved water morphs and held props", async () => {
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
    const { scene: model } = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
    const rig = createLocomotion(model, true),
      props = createHeldTools(rig.rightHand);
    model.updateMatrixWorld(true);
    const idleHand = rig.rightHand.getWorldPosition(new THREE.Vector3());
    assert.ok(
      idleHand.y < 0.6,
      "idle hand hangs beside the body instead of a T pose",
    );
    const right = model.getObjectByName("right-arm")!,
      left = model.getObjectByName("left-arm")!,
      leg = model.getObjectByName("right-leg")!;
    const sleeveMeshes: THREE.Mesh[] = [];
    model.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        object.userData.attachedToLimb &&
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).some((material) => material.name.startsWith("Sleeve "))
      )
        sleeveMeshes.push(object);
    });
    assert.equal(sleeveMeshes.length, 2);
    for (const sleeve of sleeveMeshes) {
      const isRight = sleeve.userData.attachedToLimb === "right-arm";
      const arm = isRight ? right : left;
      assert.ok(arm.getObjectById(sleeve.id), "sleeve shares its arm pivot");
    }
    for (const side of ["right", "left"] as const) {
      const leg = model.getObjectByName(`${side}-leg`)!;
      const sock = model.getObjectByName(
        `${side}-sock-export-mesh`,
      ) as THREE.Mesh;
      const redCuff = model.getObjectByName(`${side}-red-ring-export-mesh`)!;
      const blueCuff = model.getObjectByName(`${side}-blue-ring-export-mesh`)!;
      assert.ok(leg.getObjectById(sock.id), `${side} sock follows its leg`);
      assert.ok(
        leg.getObjectById(redCuff.id),
        `${side} red cuff follows its leg`,
      );
      assert.ok(
        leg.getObjectById(blueCuff.id),
        `${side} blue cuff follows its leg`,
      );
      assert.ok(
        sock.morphTargetDictionary?.WaterFull !== undefined,
        `${side} sock keeps the water-state morph targets`,
      );
    }
    assert.ok(
      right.rotation.z > 0 && left.rotation.z < 0,
      "both arms rest down",
    );

    const rightSock = model.getObjectByName("right-sock-export-mesh")!;
    const leftSock = model.getObjectByName("left-sock-export-mesh")!;
    const sockCenters = [rightSock, leftSock].map((sock) =>
      new THREE.Box3().setFromObject(sock).getCenter(new THREE.Vector3()),
    );
    rig.update(0.2, 5, true);
    model.updateMatrixWorld(true);
    assert.ok(Math.abs(right.rotation.x) > 0.1);
    assert.equal(right.rotation.x, -left.rotation.x);
    assert.equal(leg.rotation.x, -right.rotation.x);
    assert.ok(
      sockCenters.some(
        (center, index) =>
          center.distanceTo(
            new THREE.Box3()
              .setFromObject(index === 0 ? rightSock : leftSock)
              .getCenter(new THREE.Vector3()),
          ) > 0.005,
      ),
      "socks move with their leg pivots during the walk cycle",
    );
    assert.ok(
      rig.rightHand.getWorldPosition(new THREE.Vector3()).distanceTo(idleHand) >
        0.1,
    );
    rig.update(0.2, 9, true);
    assert.equal(model.userData.gait, "sprint");
    const pose = right.rotation.clone();
    rig.update(0.2, 9, true);
    assert.deepEqual(right.rotation.toArray(), pose.toArray());
    rig.update(0.3, 0, true);
    assert.equal(right.rotation.x, 0);
    assert.equal(Math.abs(leg.rotation.x), 0);
    const teeth: THREE.Mesh[] = [];
    model.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.whiteTooth) teeth.push(o);
    });
    assert.equal(teeth.length, 2);
    teeth.forEach((t) =>
      assert.equal(
        (t.material as THREE.MeshStandardMaterial).color.getHex(),
        0xffffff,
      ),
    );
    updateSpongeWaterState(model, 400, 400);
    let morphs = 0;
    model.traverse((o) => {
      if (
        o instanceof THREE.Mesh &&
        o.morphTargetDictionary?.WaterFull !== undefined
      ) {
        morphs++;
        assert.equal(
          o.morphTargetInfluences![o.morphTargetDictionary.WaterFull],
          1,
        );
      }
    });
    assert.ok(
      morphs >= 4,
      "water state includes both animated legs and the torso",
    );
    const count = props.root.children.length;
    for (const tool of cityTools) {
      props.select(tool.id);
      assert.equal(props.root.children.filter((o) => o.visible).length, 1);
      assert.equal(
        props.root.children.find((o) => o.visible)!.name,
        `held-${tool.id}`,
      );
    }
    assert.equal(props.root.children.length, count);
    const fallback = makeCharacter("sponge"),
      fallbackRig = createLocomotion(fallback, false);
    fallbackRig.update(0.2, 5, true);
    assert.ok(
      Math.abs(fallback.getObjectByName("right-leg")!.rotation.x) > 0.1,
    );
  } finally {
    if (doc) Object.defineProperty(globalThis, "document", doc);
    else Reflect.deleteProperty(globalThis, "document");
    if (style) Object.defineProperty(globalThis, "getComputedStyle", style);
    else Reflect.deleteProperty(globalThis, "getComputedStyle");
  }
});
