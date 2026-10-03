import type { CityState } from "../../src/interfaces";
import { test, expect } from "@playwright/test";
import { registerTestAccount } from "./account-fixture";
import { enterCampaign } from "./campaign-entry";
test("one sparse collectible slot, Q activates once, replacement cancels the old boost and H offers activation", async ({
  page,
}) => {
  await registerTestAccount(page);
  await page.route("**/models/spongebob.glb", (route) =>
    route.fulfill({ status: 404, body: "Use fallback for pickup timing" }),
  );
  await page.goto("/");
  await enterCampaign(page);
  const slot = page.locator("#powerup-bag .pickup-slot");
  await expect(slot).toHaveCount(1);
  await expect(slot).toContainText("NO BOOST");
  await page.keyboard.down("KeyA");
  await page.keyboard.down("KeyW");
  await expect(slot).toContainText("ACTIVATE ONCE");
  await page.keyboard.up("KeyA");
  await page.keyboard.up("KeyW");
  await expect(slot).toContainText("Pore Power");
  await expect(slot).not.toContainText("ACTIVE");
  await page.keyboard.press("KeyQ");
  await expect(slot).toContainText("ACTIVE");
  await expect(page.locator("#sponge-value")).toContainText(/1['’]400 L/);
  await expect(slot).toBeDisabled();
  await page.screenshot({ path: "/tmp/sponge-basel-powerups.png" });
  const evidence = await page.evaluate(async () => {
    const paths = {
      view: "/src/game/powerup-view.ts",
      campaign: "/src/game/campaign.ts",
      logic: "/src/game/powerups.ts",
      city: "/src/game/city.ts",
      ui: "/src/ui/powerups.ts",
    };
    const source = await (await fetch(paths.view)).text(),
      three = source.match(/from "([^"]*three[^"]*)"/)![1];
    const THREE = await import(three);
    const { createPowerupView } = await import(paths.view),
      { createCampaign } = await import(paths.campaign),
      { collectPowerups, activatePowerup } = await import(paths.logic),
      { spongeCapacity } = await import(paths.city),
      { PowerupUI } = await import(paths.ui);
    const scene = new THREE.Scene(),
      state: CityState = createCampaign(),
      view = createPowerupView(scene);
    view.update(state, () => 0, 0, true);
    const visible = scene
      .getObjectByName("basel-powerup-pickups")
      .children.filter((p: any) => p.visible).length;
    state.powerups.pickups = [{ id: "maximum", x: 0, z: 0, collected: false }];
    collectPowerups(state, { x: 0, y: 0, z: 0 });
    view.update(state, () => 0, 0, true);
    document.getElementById("powerup-bag")!.replaceChildren();
    document.getElementById("powerup-guide")!.replaceChildren();
    const ui = new PowerupUI(() => {
      activatePowerup(state);
      ui.render(state);
    });
    ui.render(state);
    Object.assign(window, { powerupFixture: { state, ui, spongeCapacity } });
    return {
      visible,
      held: state.powerups.held,
      capacity: spongeCapacity(state),
    };
  });
  expect(evidence).toEqual({ visible: 1, held: "maximum", capacity: 400 });
  await page.keyboard.press("KeyH");
  await page.locator("#powerup-guide .pickup-slot").click();
  expect(
    await page.evaluate(() =>
      (window as any).powerupFixture.spongeCapacity(
        (window as any).powerupFixture.state,
      ),
    ),
  ).toBe(4000);
});
