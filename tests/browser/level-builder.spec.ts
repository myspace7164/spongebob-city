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
  await page.locator("#online-toggle").click();
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

test("drafts stay local until Apply and saved versions can be restored", async ({
  page,
}) => {
  await page.route("**/models/*.glb", (route) =>
    route.fulfill({ status: 404, body: "Use procedural fallback" }),
  );
  let applied: { levelId: string; level: { location: string } } | undefined;
  let restored: { levelId: string; versionId: string } | undefined;
  await page.route("**/__level-builder/history**", (route) =>
    route.fulfill({
      json: {
        versions: [
          {
            id: "prior-version",
            savedAt: "2026-10-04T10:00:00.000Z",
            location: "Previous level",
          },
        ],
      },
    }),
  );
  await page.route("**/__level-builder/apply", async (route) => {
    const request = route.request().postDataJSON();
    applied = request;
    await route.fulfill({ json: { saved: request.levelId } });
  });
  await page.route("**/__level-builder/restore", async (route) => {
    const request = route.request().postDataJSON();
    restored = request;
    await route.fulfill({ json: { saved: request.levelId } });
  });
  page.on("dialog", (dialog) => void dialog.accept());

  await page.goto("/?builder");
  await page.locator(".level-builder-open").click();
  const panel = page.locator("#level-builder");
  await expect(panel).toBeVisible();
  const name = panel.locator("#lb-name");
  await name.fill("Saved draft");
  await panel.locator("#lb-save-draft").click();
  await expect(panel.locator("#lb-status")).toContainText("Draft saved");
  await name.fill("Unsaved edit");
  await panel.locator("#lb-load-draft").click();
  await expect(name).toHaveValue("Saved draft");
  expect(applied).toBeUndefined();

  await name.fill("Applied draft");
  await panel.locator("#lb-apply").click();
  await expect.poll(() => applied?.level.location).toBe("Applied draft");
  await expect(panel.locator("#lb-history")).toHaveValue("prior-version");
  await panel.locator("#lb-restore").click();
  await expect.poll(() => restored?.versionId).toBe("prior-version");
});

test("Test play does not write a saved level", async ({ page }) => {
  await page.route("**/models/*.glb", (route) =>
    route.fulfill({ status: 404, body: "Use procedural fallback" }),
  );
  let writes = 0;
  await page.route("**/__level-builder/**", async (route) => {
    if (route.request().method() === "POST") writes++;
    await route.fulfill({ json: { versions: [] } });
  });
  await page.goto("/?builder");
  await page.locator(".level-builder-open").click();
  const panel = page.locator("#level-builder");
  await expect(panel).toBeVisible();
  await panel.locator("#lb-test").click();
  await expect(panel).toBeHidden();
  expect(writes).toBe(0);
});
