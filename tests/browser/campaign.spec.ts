import { expect, test } from "@playwright/test";

test("arrival/story entry pauses the simulation and preserves the supplied narrative on short screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto("/");
  await page.locator("#play").click();
  await expect(page.locator("#campaign-story")).toBeVisible();
  await expect(page.locator("#story-body")).toContainText(
    "gelben Rheinschwimmsack",
  );
  await expect(page.locator("#story-body")).toContainText(
    "dieselbe Pfütze mit einem Umweg",
  );
  await expect(page.locator("#story-route li")).toHaveCount(4);
  await expect(page.locator("#story-start")).toBeInViewport();
  const weather = await page.locator("#weather").textContent();
  await page.waitForTimeout(250);
  await expect(page.locator("#weather")).toHaveText(weather!);
  await page.screenshot({ path: "/tmp/sponge-campaign-story.png" });
  await page.locator("#story-start").click();
  await expect(page.locator("#crosshair")).toBeVisible();
  await expect(page.locator("#mission-level")).toContainText(
    "LEVEL 1/4 · Riehenring",
  );
  await expect(page.locator("#mission-layout")).toContainText("Placeholder");
  await expect(page.locator("#goals")).toContainText("Hauseingang trocken");
  await page.keyboard.press("KeyH");
  await page.locator("#read-story").click();
  await expect(page.locator("#inventory-panel")).toBeHidden();
  await expect(page.locator("#campaign-story")).toBeVisible();
  await expect(page.locator("#story-start")).toBeFocused();
});

test("actual game loop automatically enters each next story and shows the ending only after level four", async ({
  page,
}) => {
  // Use zero-threshold fixture achievements to exercise the real loop without
  // making the browser test wait through four full weather cycles. Unit tests
  // complete the campaign with its production goals using only legal actions.
  await page.route("**/config/levels.ts*", async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    const body = original
      .replace(/target:\s*\d+/g, "target: 0")
      .replace(/maximum:\s*true/g, "maximum: false");
    expect(body).not.toBe(original);
    await route.fulfill({ response, body });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator("#play").click();
  await page.locator("#story-start").click();
  for (const [index, location] of [
    "Erlenmatt",
    "St. Johann",
    "VoltaNord",
  ].entries()) {
    await expect(page.locator("#campaign-story")).toBeVisible();
    await expect(page.locator("#story-title")).toContainText(location);
    await expect(page.locator("#mission-level")).toContainText(
      `LEVEL ${index + 2}/4`,
    );
    await expect(page.locator("#result")).toBeHidden();
    await expect(page.locator("#campaign-route .complete")).toHaveCount(
      index + 1,
    );
    await expect(page.locator("#story-start")).toBeInViewport();
    const weather = await page.locator("#weather").textContent();
    await page.waitForTimeout(100);
    await expect(page.locator("#weather")).toHaveText(weather!);
    await page.locator("#story-start").click();
  }
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#result-title")).toHaveText(
    "Die Stadt wird zum Schwamm",
  );
  await expect(page.locator("#campaign-ending")).toContainText(
    "Dabei braucht es ganz viele kleine.",
  );
  await expect(page.locator("#campaign-route .complete")).toHaveCount(4);
  await page.screenshot({ path: "/tmp/sponge-campaign-ending.png" });
  await page.locator("#restart").click();
  await expect(page.locator("#result")).toBeHidden();
  await expect(page.locator("#mission-level")).toContainText("LEVEL 1/4");
  await expect(page.locator("#campaign-route .complete")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("level-two failure retries its entry checkpoint and keeps level one completed", async ({
  page,
}) => {
  await page.route("**/config/levels.ts*", async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const split = source.indexOf('id: "erlenmatt"');
    expect(split).toBeGreaterThan(0);
    const first = source
      .slice(0, split)
      .replace(/target:\s*\d+/g, "target: 0")
      .replace(/maximum:\s*true/g, "maximum: false");
    await route.fulfill({ response, body: first + source.slice(split) });
  });
  await page.goto("/");
  await page.locator("#play").click();
  await page.locator("#story-start").click();
  await expect(page.locator("#story-title")).toContainText("Erlenmatt");
  await page.locator("#story-start").click();
  await expect(page.locator("#campaign-story")).toBeHidden();
  await expect(page.locator("#target-info")).toContainText("Sealed asphalt");
  await page.keyboard.press("Digit3");
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator("#target-info")).toContainText("Unsealed soil");
  await page.keyboard.press("Digit4");
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator("#city-change")).toContainText("1 trees");
  // Make the next fixed step produce a loss, through the existing danger rule.
  await page.evaluate(async () => {
    const configPath = "/config/city.ts";
    const { cityConfig } = await import(configPath);
    cityConfig.dangerSeconds = 0;
  });
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#restart")).toHaveText("Retry this level ↻");
  await page.evaluate(async () => {
    const configPath = "/config/city.ts";
    const { cityConfig } = await import(configPath);
    cityConfig.dangerSeconds = 18;
  });
  await page.locator("#restart").click();
  await expect(page.locator("#mission-level")).toContainText("LEVEL 2/4");
  await expect(page.locator("#campaign-route .complete")).toHaveCount(1);
  await expect(page.locator("#city-change")).toContainText("0 trees · 0 m²");
  await expect(page.locator("#budget")).toContainText(/4['’]400/);
  await page.locator("#play").click();
  await expect(page.locator("#story-body")).not.toContainText(
    "gelben Rheinschwimmsack",
  );
  await expect(page.locator("#story-title")).toContainText("Erlenmatt");
});
