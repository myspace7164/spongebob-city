import { expect, test } from "@playwright/test";

test("city renders, water loop and construction work, powers and pause/reset are wired", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#play")).toBeEnabled();
  await page.waitForFunction(() => {
    const gl = document.querySelector("canvas")!.getContext("webgl2");
    return !!gl && !gl.isContextLost();
  });
  await expect(page.locator("#hotbar .slot")).toHaveCount(9);
  await page.screenshot({ path: "/tmp/sponge-city-before.png" });
  await page.locator("#play").click();
  await expect(page.locator("#menu")).toBeHidden();
  await expect(page.locator("#crosshair")).toBeVisible();
  // Look down slightly so the initial ray reaches the first row of plots.
  await page.keyboard.down("KeyK");
  await page.waitForTimeout(180);
  await page.keyboard.up("KeyK");
  await page.keyboard.press("Digit3");
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator("#target-info")).toContainText("Unsealed soil");
  await expect(page.locator("#budget")).toContainText(/2['’]170/);
  await page.keyboard.press("Digit4");
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator("#target-info")).toContainText("Tree");
  await page.keyboard.press("Digit1");
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.mouse.up();
  await expect(page.locator("#sponge-value")).not.toHaveText("0 / 400 L");
  await page.keyboard.press("Digit2");
  await page.mouse.down();
  await page.waitForTimeout(650);
  await page.mouse.up();
  await expect(page.locator("#goals")).toContainText("1/4 healthy");
  await page.keyboard.press("KeyQ");
  await expect(page.locator("#sponge-value")).toContainText(/1['’]400 L/);
  await page.keyboard.press("KeyP");
  await expect(page.locator("#item-status")).toContainText("Patrick");
  await page.keyboard.press("Digit9");
  await expect(page.locator("#hotbar .slot").nth(8)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("KeyH");
  await expect(page.locator("#inventory-panel")).toBeVisible();
  await expect(page.locator("#menu")).toBeHidden();
  await page.locator("#close-inventory").click();
  await page.locator("#play").click();
  const canvas = page.locator("canvas");
  const start = await canvas.screenshot();
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyW");
  expect((await canvas.screenshot()).equals(start)).toBe(false);
  await page.keyboard.press("Space");
  await page.waitForTimeout(120);
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu")).toBeVisible();
  await expect(page.locator("#crosshair")).toBeHidden();
  const paused = await canvas.screenshot();
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(200);
  await page.keyboard.up("KeyW");
  expect((await canvas.screenshot()).equals(paused)).toBe(true);
  await page.screenshot({ path: "/tmp/sponge-city-after.png" });
  await page.locator("#play").click();
  await page.keyboard.press("KeyR");
  await expect(page.locator("#city-change")).toContainText("0 trees · 0 m²");
  await expect(page.locator("#sponge-value")).toHaveText("0 / 400 L");
  await expect(page.locator("#budget")).toContainText(/2['’]200/);
  expect(errors).toEqual([]);
});
