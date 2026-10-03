import { enterCampaign } from "./campaign-entry";
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
  await expect(page.locator("#game")).toHaveAttribute("data-level", "loaded");
  await expect(page.locator("#game")).toHaveAttribute("data-roads", "loaded");
  await expect(page.locator("#game")).toHaveAttribute("data-imagery", "loaded");
  await page.screenshot({ path: "/tmp/sponge-city-before.png" });
  await enterCampaign(page);
  await expect(page.locator("#menu")).toBeHidden();
  await expect(page.locator("#crosshair")).toBeVisible();
  // The initial camera aims at a reachable plot; fixed-duration key holds vary
  // with software rendering and can turn past it while the model is loading.
  await expect(page.locator("#target-info")).toContainText("Sealed asphalt");
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
  await expect(page.locator("#target-info")).toContainText(
    /Tree.*[1-9][0-9]+ L retained/,
  );
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
  await expect(page.locator("#menu")).toBeVisible();
  expect(errors).toEqual([]);
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1024, height: 640 },
  { width: 1024, height: 600 },
]) {
  test(`cartoon UI fits ${viewport.width}×${viewport.height} and entry remains clickable`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator("#play")).toBeEnabled();
    const menu = await page.locator("#menu").boundingBox();
    const dock = await page.locator("#hotbar").boundingBox();
    expect(menu!.y + menu!.height).toBeLessThan(dock!.y);
    const mission = await page.locator("#mission").boundingBox();
    expect(mission!.y + mission!.height).toBeLessThan(dock!.y);
    const caption = await page.locator("#menu .description").boundingBox();
    const mascot = await page.locator(".hero-sponge").boundingBox();
    expect(mascot!.y + mascot!.height).toBeLessThanOrEqual(caption!.y + 2);
    await page.screenshot({
      path: `/tmp/sponge-aero-${viewport.width}-${viewport.height}.png`,
    });
    await enterCampaign(page);
    await expect(page.locator("#menu")).toBeHidden();
    await page.keyboard.press("KeyH");
    await expect(page.locator("#inventory-panel")).toBeVisible();
    await page.screenshot({
      path: `/tmp/sponge-aero-guide-${viewport.width}-${viewport.height}.png`,
    });
    await expect(page.locator("#close-inventory")).toBeInViewport();
    await page.locator("#close-inventory").click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    const animations = await page
      .locator(".bubble")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animations).toBe("none");
  });
}
