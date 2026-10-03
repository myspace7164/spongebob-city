import { expect, test } from "@playwright/test";

test("short talking briefing pauses the simulation on short screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 600 });
  await page.goto("/");
  await page.locator("#play").click();
  await expect(page.locator("#campaign-story")).toBeVisible();
  await expect(page.locator("#story-fulltext")).toContainText("Burger gesucht");
  await expect(page.locator("#story-fulltext")).toContainText(
    "Gib dem Regen ein Zuhause",
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
  await expect(page.locator("#mission-layout")).toContainText(
    "Real street: Riehenring",
  );
  await expect(page.locator("#goals")).not.toContainText(/trocken/i);
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
    if (location === "VoltaNord") {
      await expect(page.locator("#story-fulltext")).not.toContainText(
        /Überläufe verbinden|Dachzuflüsse|Tanküberläufe/i,
      );
      await expect(page.locator("#story-objective")).not.toContainText(
        /Dachzuflüsse|Tanküberläufe|Überläufe verbinden/i,
      );
    }
    await expect(page.locator("#story-start")).toBeInViewport();
    const weather = await page.locator("#weather").textContent();
    await page.waitForTimeout(100);
    await expect(page.locator("#weather")).toHaveText(weather!);
    await page.locator("#story-start").click();
  }
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#result-title")).toHaveText(
    "Basel wird Schwammstadt",
  );
  await expect(page.locator("#campaign-ending")).toContainText(
    "Viele kleine Lösungen",
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
  // A shared browser flag avoids mutating a second Vite module instance when
  // cache-busting queries are present. The production danger rule still loses.
  await page.route("**/config/city.ts*", async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    await route.fulfill({
      response,
      body: source.replace(
        /dangerSeconds:\s*18/,
        "get dangerSeconds() { return globalThis.forceCampaignLoss ? 0 : 18; }",
      ),
    });
  });
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
  await page.evaluate(() => {
    (window as unknown as { forceCampaignLoss: boolean }).forceCampaignLoss =
      true;
  });
  await expect(page.locator("#result")).toBeVisible();
  await expect(page.locator("#restart")).toHaveText("Retry this level ↻");
  await page.evaluate(() => {
    (window as unknown as { forceCampaignLoss: boolean }).forceCampaignLoss =
      false;
  });
  await page.locator("#restart").click();
  await expect(page.locator("#mission-level")).toContainText("LEVEL 2/4");
  await expect(page.locator("#campaign-route .complete")).toHaveCount(1);
  await expect(page.locator("#city-change")).toContainText("0 trees · 0 m²");
  await expect(page.locator("#budget")).toContainText(/2['’]200/);
  await page.locator("#play").click();
  await expect(page.locator("#story-body")).not.toContainText(
    "gelben Rheinschwimmsack",
  );
  await expect(page.locator("#story-title")).toContainText("Erlenmatt");
});

test("briefing reveals briskly with a bounded wah-wah voice; mute and early start silence it", async ({
  page,
}) => {
  // Isolate the short audio lifecycle from software rendering of the Blender
  // character. Other browser checks exercise the real character model.
  await page.route("**/models/spongebob.glb", (route) =>
    route.fulfill({ status: 404, body: "Speech test uses the placeholder" }),
  );
  await page.addInitScript(() => {
    const audio = { created: 0, ended: 0 };
    Object.defineProperty(window, "briefingAudio", { value: audio });
    const create = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      const voice = create.call(this);
      audio.created++;
      voice.addEventListener("ended", () => audio.ended++);
      return voice;
    };
  });
  await page.goto("/");
  await page.locator("#play").click();
  const mascot = page.locator("#story-mascot");
  await expect(mascot.locator("svg")).toBeVisible();
  await expect(mascot).toHaveAttribute("data-speaking", "true");
  const full = await page.locator("#story-fulltext").textContent();
  const initial = await page.locator("#story-copy").textContent();
  expect(initial!.length).toBeLessThan(full!.length);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { briefingAudio: { created: number } })
            .briefingAudio.created,
      ),
    )
    .toBeGreaterThan(0);
  await expect(mascot).toHaveAttribute("data-speaking", "false", {
    timeout: 13000,
  });
  await expect(page.locator("#story-copy")).toContainText(
    "Gib dem Regen ein Zuhause.",
  );
  await expect
    .poll(() =>
      page.evaluate(() => {
        const audio = (
          window as unknown as {
            briefingAudio: { created: number; ended: number };
          }
        ).briefingAudio;
        return audio.created - audio.ended;
      }),
    )
    .toBe(0);
  await page.screenshot({ path: "/tmp/sponge-short-briefing.png" });
  await page.locator("#story-start").click();
  await page.keyboard.press("KeyH");
  await page.locator("#read-story").click();
  await expect(mascot).toHaveAttribute("data-speaking", "true");
  // Dispatch immediately: software rendering can spend the short narration's
  // entire lifetime waiting for repeated pointer actionability frames.
  await page
    .locator("#sound-toggle")
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect
    .poll(() =>
      page.evaluate(() => {
        const audio = (
          window as unknown as {
            briefingAudio: { created: number; ended: number };
          }
        ).briefingAudio;
        return audio.created - audio.ended;
      }),
    )
    .toBe(0);
  const mutedCount = await page.evaluate(
    () =>
      (window as unknown as { briefingAudio: { created: number } })
        .briefingAudio.created,
  );
  await page.waitForTimeout(350);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { briefingAudio: { created: number } })
          .briefingAudio.created,
    ),
  ).toBe(mutedCount);
  await page
    .locator("#sound-toggle")
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { briefingAudio: { created: number } })
            .briefingAudio.created,
      ),
    )
    .toBeGreaterThan(mutedCount);
  await page.locator("#story-start").click();
  await expect(mascot).toHaveAttribute("data-speaking", "false");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const audio = (
          window as unknown as {
            briefingAudio: { created: number; ended: number };
          }
        ).briefingAudio;
        return audio.created - audio.ended;
      }),
    )
    .toBe(0);
  await page.keyboard.press("KeyH");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#read-story").click();
  await expect(mascot).toHaveCSS("animation-name", "none");
});
