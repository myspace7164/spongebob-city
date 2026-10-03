import { expect, test } from "@playwright/test";

test("credits finish naturally, can be skipped with Escape and respect reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/src/main.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'import "/src/ui/style.css";',
    }),
  );
  await page.route("**/config/endless.ts*", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /creditsDurationMs:\s*[\d.e+]+/,
        "creditsDurationMs: 500",
      ),
    });
  });
  await page.goto("/");
  await page.evaluate(async () => {
    const path = "/src/ui/credits.ts";
    const { CreditsUI } = await import(path);
    const ui = new CreditsUI(
      () => (document.body.dataset.creditsFinished = "yes"),
    );
    (window as any).testCredits = ui;
    ui.show();
  });
  await expect(page.locator("#credits")).toBeVisible();
  await expect(page.locator(".credits-roll")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator("#credits")).toBeHidden();
  await expect(page.locator("body")).toHaveAttribute(
    "data-credits-finished",
    "yes",
  );
  await page.evaluate(() => {
    document.body.dataset.creditsFinished = "no";
    (window as any).testCredits.reset();
    (window as any).testCredits.show();
  });
  await page.keyboard.press("Escape");
  await expect(page.locator("#credits")).toBeHidden();
  await expect(page.locator("body")).toHaveAttribute(
    "data-credits-finished",
    "yes",
  );
});
