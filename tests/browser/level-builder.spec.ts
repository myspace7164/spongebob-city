import { test, expect } from "@playwright/test";

test("level builder stays local and refuses to open in an online room", async ({
  page,
}) => {
  await page.route("**/models/*.glb", (route) =>
    route.fulfill({ status: 404, body: "Use procedural fallback" }),
  );

  await page.goto("/");
  await expect(page.locator(".level-builder-open")).toHaveCount(0);

  await page.goto("/?builder");
  const openBuilder = page.locator(".level-builder-open");
  await expect(openBuilder).toBeVisible();
  await openBuilder.click();
  await expect(page.locator("#level-builder")).toBeVisible();
  await expect(page.locator("#lb-spots button").first()).toBeVisible();
  await page.locator("#lb-spots button").first().click();
  await expect(page.locator("#lb-status")).toContainText("selected");

  await page.reload();
  await page.locator("#online-toggle").click();
  const username = `Builder_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
  await page.locator("#username").fill(username);
  await page.locator("#account-form button").click();
  await expect(page.locator("#account-name")).toContainText(username);
  await page.locator("#create-room").click();
  await expect(page.locator("#team-status")).toContainText("1/4");
  await page.locator("#story-start").click();
  await expect(page.locator("#crosshair")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(openBuilder).toBeVisible();
  await openBuilder.click();
  await expect(page.locator("#message")).toContainText(
    "not available in an online room",
  );
  await expect(page.locator("#level-builder")).toBeHidden();
});
