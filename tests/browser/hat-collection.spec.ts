import { test, expect } from "@playwright/test";

test("owned hats switch for free and persist on reload", async ({ page }) => {
  await page.route("**/models/basel-city.glb", (route) => route.abort());
  await page.goto("/");
  await page.evaluate(async () => {
    const campaignPath = "/src/game/campaign.ts";
    const hatsPath = "/src/game/hats.ts";
    const storagePath = "/src/game/hat-collection.ts";
    const uiPath = "/src/ui/hat-shop.ts";
    const { createCampaign } = await import(campaignPath);
    const { purchaseHat } = await import(hatsPath);
    const { saveHatCollection } = await import(storagePath);
    const { HatShopUI } = await import(uiPath);
    const state = createCampaign();
    state.budget = 2000;
    const shop = new HatShopUI(
      () => state.budget,
      () => state.campaign.equippedHat,
      () => state.campaign.ownedHats,
      (id: any) => {
        const result = purchaseHat(state, id);
        saveHatCollection(state, localStorage);
        return result;
      },
      () => {},
    );
    shop.show();
  });
  await page.locator('[data-hat="cowboy"] .hat-buy').click();
  await page.locator('[data-hat="wizard"] .hat-buy').click();
  await expect(page.locator("#hat-shop-balance")).toHaveText("0");
  await expect(page.locator('[data-hat="cowboy"] .hat-buy')).toHaveText(
    "EQUIP · OWNED",
  );
  await page.locator('[data-hat="cowboy"] .hat-buy').click();
  await expect(page.locator('[data-hat="cowboy"] .hat-buy')).toHaveText(
    "✓ EQUIPPED",
  );
  await expect(page.locator("#hat-shop-balance")).toHaveText("0");
  await page.reload();
  await page.locator("#open-hat-shop").click();
  await expect(page.locator('[data-hat="cowboy"] .hat-buy')).toHaveText(
    "✓ EQUIPPED",
  );
  await expect(page.locator('[data-hat="wizard"] .hat-buy')).toHaveText(
    "EQUIP · OWNED",
  );
});

test("city animation avoids recursive matrix traversals before rendering", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const viewPath = "/src/game/city-view.ts";
    const campaignPath = "/src/game/campaign.ts";
    const playerPath = "/src/game/player.ts";
    const source = await (await fetch(viewPath)).text();
    const threePath = source.match(/from\s+"([^"]*three[^"]+)"/)![1];
    const [THREE, { createCityView }, { createCampaign }, { createPlayer }] =
      await Promise.all([
        import(threePath),
        import(viewPath),
        import(campaignPath),
        import(playerPath),
      ]);
    const scene = new THREE.Scene();
    const state = createCampaign();
    const player = createPlayer();
    const view = createCityView(scene, state);
    view.update(state, player, null, 5);
    const original = THREE.Object3D.prototype.updateMatrixWorld;
    const originalWorld = THREE.Object3D.prototype.updateWorldMatrix;
    let visits = 0;
    THREE.Object3D.prototype.updateMatrixWorld = function (force: boolean) {
      visits++;
      return original.call(this, force);
    };
    const sample = (legacy: boolean) => {
      visits = 0;
      THREE.Object3D.prototype.updateWorldMatrix = function (
        parents: boolean,
        children: boolean,
      ) {
        originalWorld.call(this, parents, children);
        // Reproduce the previous full subtree traversal at each city-root update.
        if (legacy && scene.children.includes(this))
          this.updateMatrixWorld(true);
      };
      const start = performance.now();
      for (let i = 0; i < 120; i++) {
        state.elapsed += 1 / 60;
        view.update(state, player, null, 5);
      }
      return { visits, milliseconds: performance.now() - start };
    };
    try {
      return { legacy: sample(true), optimized: sample(false) };
    } finally {
      THREE.Object3D.prototype.updateMatrixWorld = original;
      THREE.Object3D.prototype.updateWorldMatrix = originalWorld;
    }
  });
  console.log("City animation transform benchmark:", JSON.stringify(result));
  expect(result.legacy.visits).toBeGreaterThan(100000);
  expect(result.optimized.visits).toBe(0);
});
