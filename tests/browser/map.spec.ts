import { registerTestAccount } from "./account-fixture";
test.beforeEach(async ({ page }) => {
  await registerTestAccount(page);
});
import { enterCampaign } from "./campaign-entry";
import { expect, test } from "@playwright/test";

test("Basel GLB loads and the mission remains playable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.locator("#game")).toHaveAttribute("data-level", "loaded");
  await expect(page.locator("#level-status")).toContainText(
    "Basel buildings loaded",
  );
  await page.screenshot({ path: "/tmp/basel-map-loaded.png" });
  await enterCampaign(page);
  await expect(page.locator("#menu")).toBeHidden();
  const before = await page.locator("#game").screenshot();
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyW");
  expect((await page.locator("#game").screenshot()).equals(before)).toBe(false);
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();
  expect(errors).toEqual([]);
});

test("missing Basel map keeps the original scene playable", async ({
  page,
}) => {
  await page.route("**/models/basel-city.glb", (route) =>
    route.fulfill({ status: 404, body: "Unavailable" }),
  );
  await page.goto("/");
  await expect(page.locator("#game")).toHaveAttribute("data-level", "fallback");
  await expect(page.locator("#level-status")).toContainText(
    "using the original scenery",
  );
  await enterCampaign(page);
  await expect(page.locator("#menu")).toBeHidden();
});
