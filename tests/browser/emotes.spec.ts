import { test, expect } from "@playwright/test";
import { registerTestAccount } from "./account-fixture";
import { enterCampaign } from "./campaign-entry";
test("G plus 1–5 plays each emote without equipping inventory; movement cancels and the guide teaches the chord", async ({
  page,
}) => {
  await registerTestAccount(page);
  for (const model of ["spongebob", "basel-city"])
    await page.route(`**/models/${model}.glb`, (route) =>
      route.fulfill({
        status: 404,
        body: "Emote input uses procedural scene; imported rig covered by unit tests",
      }),
    );
  await page.goto("/");
  await enterCampaign(page);
  for (const [key, id] of [
    ["1", "six-seven"],
    ["2", "macarena"],
    ["3", "teabag"],
    ["4", "dab"],
    ["5", "floss"],
  ]) {
    await page.keyboard.down("g");
    await page.keyboard.press(key);
    await page.keyboard.up("g");
    await expect(page.locator("#game")).toHaveAttribute("data-emote", id);
    await expect(page.locator("#hotbar .slot").nth(0)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
  await page.screenshot({ path: "/tmp/sponge-emote-floss.png" });
  await page.keyboard.down("w");
  await expect(page.locator("#game")).toHaveAttribute("data-emote", "");
  await page.keyboard.up("w");
  await page.keyboard.down("g");
  await page.keyboard.press("4");
  await page.keyboard.up("g");
  await expect(page.locator("#game")).toHaveAttribute("data-emote", "dab");
  await expect(page.locator("#game")).toHaveAttribute("data-emote", "", {
    timeout: 7000,
  });
  await page.keyboard.press("h");
  await expect(page.locator("#inventory-panel")).toContainText("hold G + 1");
});
