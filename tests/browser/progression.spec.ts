import { test, expect } from "@playwright/test";
import { registerTestAccount } from "./account-fixture";
import { enterCampaign } from "./campaign-entry";
test("first level offers essentials and locked keyboard selections do not equip tools", async ({
  page,
}) => {
  await registerTestAccount(page);
  await page.goto("/");
  await expect(page.locator("#hotbar .slot:not(:disabled)")).toHaveCount(4);
  await expect(page.locator("#hotbar .slot").nth(4)).toContainText(
    "🔒 1 level",
  );
  await expect(page.locator("#hotbar .slot").nth(8)).toContainText(
    "🔒 3 levels",
  );
  await enterCampaign(page);
  await page.keyboard.press("Digit5");
  await expect(page.locator("#hotbar .slot").nth(0)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#item-status")).toContainText("locked");
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  await expect(page.locator("#sprint-status")).toHaveText("RUNNING");
  await page.keyboard.up("Shift");
  await expect(page.locator("#sprint-status")).toHaveText("sprint");
  await page.keyboard.up("w");
  await page.screenshot({ path: "/tmp/sponge-progressive-tools.png" });
});
