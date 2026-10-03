import { test, expect } from "@playwright/test";
test("username cookie, duplicate rejection, two-browser co-op and persisted ranking", async ({
  browser,
}) => {
  test.setTimeout(150000);
  const contextA = await browser.newContext(),
    contextB = await browser.newContext();
  const a = await contextA.newPage(),
    b = await contextB.newPage();
  const username = `Hero_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
  try {
    for (const page of [a, b]) {
      await page.route("**/models/spongebob.glb", (route) =>
        route.fulfill({
          status: 404,
          body: "Use fallback for network lifecycle check",
        }),
      );
      // Networking uses the procedural scenery; imported facade rendering is covered by map tests.
      await page.route("**/models/basel-city.glb", (route) =>
        route.fulfill({
          status: 404,
          body: "Use fallback for network lifecycle check",
        }),
      );
      await page.goto("/");
      await page.locator("#online-toggle").click();
    }
    await a.locator("#username").fill(username);
    await a.locator("#account-form button").click();
    await expect(a.locator("#account-name")).toContainText(username);
    const cookies = await contextA.cookies();
    expect(cookies.find((c) => c.name === "sponge_session")).toMatchObject({
      httpOnly: true,
      sameSite: "Lax",
    });
    await b.locator("#username").fill(username.toLowerCase());
    await b.locator("#account-form button").click();
    await expect(b.locator("#online-status")).toContainText("already taken");
    await b.locator("#username").fill(`${username}_B`);
    await b.locator("#account-form button").click();
    await expect(b.locator("#account-name")).toContainText(`${username}_B`);
    await a.locator("#create-room").click();
    await expect(a.locator("#team-status")).toContainText("1/4");
    const code = (await a.locator("#team-status").textContent())!.match(
      /CO-OP ([A-F0-9]{6})/,
    )![1];
    await b.locator("#room-code").fill(code);
    await b.locator("#join-room-form button").click();
    await expect(a.locator("#team-status")).toContainText("2/4");
    await expect(b.locator("#team-status")).toContainText("2/4");
    // Start only A: the authoritative server receives real movement input. Both browsers see its build.
    await a.locator("#story-start").click();
    await expect(a.locator("#crosshair")).toBeVisible();
    await a.waitForFunction(
      () => document.pointerLockElement === document.querySelector("#game"),
    );
    await a.keyboard.down("KeyW");
    await expect(a.locator("#target-info")).toContainText("Sealed asphalt");
    await expect(a.locator("#target-info")).not.toContainText("MOVE CLOSER");
    await a.keyboard.up("KeyW");
    await a.keyboard.press("Digit3");
    await a.mouse.down();
    await a.mouse.up();
    await expect(a.locator("#city-change")).toContainText(
      /[1-9]\d* m² unsealed/,
    );
    await expect(b.locator("#city-change")).toContainText(
      /[1-9]\d* m² unsealed/,
    );
    await a.keyboard.press("Escape");
    await a.locator("#online-toggle").click();
    await expect(a.locator("#leaderboard-rows")).toContainText(username);
    await expect(a.locator("#leaderboard-rows")).toContainText("40");
    await a.screenshot({ path: "/tmp/sponge-online-leaderboard.png" });
    await a.reload();
    await expect(a.locator("#online-toggle")).toContainText(username);
    await expect(a.locator("#team-status")).toContainText(code);
    await a.locator("#online-toggle").click();
    await expect(a.locator("#room-roster")).toContainText(`${username}_B`);
    await b.locator("#online-toggle").click();
    await b.locator("#leave-room").click();
    await expect(a.locator("#team-status")).toContainText("1/4");
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

test("an empty account API response reports a useful message instead of JSON.parse", async ({
  page,
}) => {
  await page.route("**/api/account", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 404, body: "" })
      : route.continue(),
  );
  await page.route("**/models/spongebob.glb", (route) =>
    route.fulfill({ status: 404, body: "Fallback" }),
  );
  await page.goto("/");
  await page.locator("#online-toggle").click();
  await page.locator("#username").fill("EmptyResponseHero");
  await page.locator("#account-form button").click();
  await expect(page.locator("#online-status")).toContainText(
    "Online server unavailable",
  );
});
