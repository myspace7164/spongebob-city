import { expect, test } from "@playwright/test";
import type { HatId } from "../../src/interfaces";
import { hatPrice, hats } from "../../config/hats.ts";
import { registerTestAccount } from "./account-fixture";
import { enterCampaign } from "./campaign-entry";

test("the main menu sells six hats, equips one immediately, and charges each purchase", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await registerTestAccount(page);
  await page.goto("/");
  await expect(page.locator("#open-hat-shop")).toBeVisible();
  await page.locator("#open-hat-shop").click();
  await expect(page.locator("#hat-shop")).toBeVisible();
  await expect(page.locator(".hat-card")).toHaveCount(6);
  await expect(page.locator(".hat-preview svg")).toHaveCount(6);
  await expect(page.locator("#hat-shop-balance")).toHaveText("2,200");
  for (const hat of hats) {
    await expect(page.locator(`[data-hat="${hat.id}"] .hat-price`)).toHaveText(
      `🪙 ${hatPrice.toLocaleString("en-US")} coins`,
    );
  }

  await page.locator('[data-hat="cowboy"] .hat-buy').click();
  await expect(page.locator("#hat-shop-balance")).toHaveText("1,200");
  await expect(page.locator("#game")).toHaveAttribute(
    "data-equipped-hat",
    "cowboy",
  );
  await expect(page.locator("#hat-shop-status")).toContainText("equipped");

  await page.locator('[data-hat="trafficCone"] .hat-buy').click();
  await expect(page.locator("#hat-shop-balance")).toHaveText("200");
  await expect(page.locator("#game")).toHaveAttribute(
    "data-equipped-hat",
    "trafficCone",
  );
  await expect(page.locator('[data-hat="trafficCone"] .hat-buy')).toHaveText(
    "✓ EQUIPPED",
  );
  await expect(page.locator('[data-hat="wizard"] .hat-buy')).toBeDisabled();
  await expect(page.locator('[data-hat="wizard"] .hat-buy')).toHaveText(
    "NOT ENOUGH COINS",
  );
  await expect(page.locator("#budget")).toHaveText("200");

  await page.locator("#hat-shop-close").click();
  await expect(page.locator("#menu")).toBeVisible();
  await enterCampaign(page);
  await expect(page.locator("#game")).toHaveAttribute(
    "data-equipped-hat",
    "trafficCone",
  );
  await page.screenshot({ path: "/tmp/sponge-hat-equipped.png" });
  expect(errors).toEqual([]);
});

test("the hat is run-only and refresh does not restore a free hat", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#open-hat-shop").click();
  await page.locator('[data-hat="sailor"] .hat-buy').click();
  await expect(page.locator("#game")).toHaveAttribute(
    "data-equipped-hat",
    "sailor",
  );
  await page.reload();
  await expect(page.locator("#game")).toHaveAttribute(
    "data-equipped-hat",
    "none",
  );
  await page.locator("#open-hat-shop").click();
  await expect(page.locator("#hat-shop-balance")).toHaveText("2,200");
  await expect(page.locator('[data-hat="sailor"] .hat-buy')).toBeEnabled();
});

test("the hat shop opens from gameplay and returns to the same run", async ({
  page,
}) => {
  await registerTestAccount(page);
  // This interaction only needs gameplay UI; the surveyed 23 MB map is covered by asset tests.
  await page.route("**/models/basel-city.glb", (route) => route.abort());
  await page.goto("/");
  await page.locator("#play").click({ force: true });
  await expect(page.locator("#campaign-story")).toBeVisible();
  await page.locator("#story-start").click({ force: true });
  await expect(page.locator("#campaign-story")).toBeHidden();
  await expect(page.locator("footer .controls")).toContainText("T hats");
  await page.keyboard.press("t");
  await expect(page.locator("#hat-shop")).toBeVisible();
  await expect(page.locator("#hat-shop-close")).toHaveText("Return to game");
  await page.locator('[data-hat="wizard"] .hat-buy').click();
  await expect(page.locator("#hat-shop-status")).toContainText("equipped");
  await page.locator("#hat-shop-close").click();
  await expect(page.locator("#hat-shop")).toBeHidden();
  await expect(page.locator("#campaign-story")).toBeHidden();
  await expect(page.locator("footer .controls")).toContainText("T hats");
  await expect(page.locator("#game")).toHaveAttribute(
    "data-equipped-hat",
    "wizard",
  );
});

test("insufficient funds disable purchase and rapid activation cannot double-charge", async ({
  page,
}) => {
  await page.route("**/src/main.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'import "/src/ui/style.css";',
    }),
  );
  await page.goto("/");
  await page.evaluate(async () => {
    const loadModule = new Function("path", "return import(path)") as (
      path: string,
    ) => Promise<any>;
    const [{ HatShopUI }, { createCampaign }, { purchaseHat }] =
      await Promise.all([
        loadModule("/src/ui/hat-shop.ts"),
        loadModule("/src/game/campaign.ts"),
        loadModule("/src/game/hats.ts"),
      ]);
    const state = createCampaign();
    state.budget = 999;
    const shop = new HatShopUI(
      () => state.budget,
      () => state.campaign!.equippedHat,
      (id: HatId) => purchaseHat(state, id),
      () => {},
    );
    shop.show();
    Object.assign(window, { hatPurchaseFixture: { state, shop } });
  });
  const cowboyBuy = page.locator('[data-hat="cowboy"] .hat-buy');
  await expect(cowboyBuy).toBeDisabled();
  await expect(cowboyBuy).toHaveText("NOT ENOUGH COINS");
  await page.evaluate(() => {
    const fixture = (window as any).hatPurchaseFixture;
    fixture.state.budget = 1000;
    fixture.shop.render();
  });
  await expect(cowboyBuy).toBeEnabled();
  await cowboyBuy.click();
  await expect(page.locator("#hat-shop-balance")).toHaveText("0");
  await expect(cowboyBuy).toHaveText("✓ EQUIPPED");
  await page.evaluate(() =>
    (
      document.querySelector(
        '[data-hat="cowboy"] .hat-buy',
      ) as HTMLButtonElement
    ).click(),
  );
  const balance = await page.evaluate(
    () => (window as any).hatPurchaseFixture.state.budget,
  );
  expect(balance).toBe(0);
});

test("the hat remains parented to the animated character and follows its transforms", async ({
  page,
}) => {
  await page.route("**/src/main.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'import "/src/ui/style.css";',
    }),
  );
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const loadModule = new Function("path", "return import(path)") as (
      path: string,
    ) => Promise<any>;
    const worldSource = await (await fetch("/src/game/world.ts")).text();
    const threePath = worldSource.match(/from\s+"([^"]*three[^"]+)"/)![1];
    const THREE = await loadModule(threePath);
    const { createWorld } = await loadModule("/src/game/world.ts");
    const { loadModel } = await loadModule("/src/game/assets.ts");
    const { gameConfig } = await loadModule("/config/game.ts");
    const scene = new THREE.Scene();
    const world = createWorld(scene);
    world.equipHat("wizard");
    const initialPosition = world.wearableHat!.getWorldPosition(
      new THREE.Vector3(),
    );
    const model = await loadModel(gameConfig.character);
    world.useCharacter(model);
    const player = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      facing: 0,
    };
    const physicsBefore = structuredClone(player);
    world.update(player, 0, 1, "absorb");
    const characterPosition = world.wearableHat!.getWorldPosition(
      new THREE.Vector3(),
    );
    const movedPlayer = {
      ...player,
      position: { x: 3, y: 0, z: -2 },
      facing: Math.PI / 2,
    };
    world.update(movedPlayer, 0, 2, "spray");
    scene.updateMatrixWorld(true);
    const after = world.wearableHat!.getWorldPosition(new THREE.Vector3());
    return {
      parented: world.wearableHat!.parent === world.character,
      modelLoaded: world.character.children.includes(model),
      movesWithCharacter: after.distanceTo(characterPosition) > 2,
      physicsUnchanged:
        JSON.stringify(player) === JSON.stringify(physicsBefore),
      onlyOneHat:
        world.character.children.filter(
          (child: any) => child.name === "equipped-hat",
        ).length === 1,
    };
  });
  expect(result).toEqual({
    parented: true,
    modelLoaded: true,
    movesWithCharacter: true,
    physicsUnchanged: true,
    onlyOneHat: true,
  });
});
