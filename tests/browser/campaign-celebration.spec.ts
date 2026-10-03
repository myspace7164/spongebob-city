import { expect, test } from "@playwright/test";

test("finishing the campaign celebrates once and dismisses to the stats report", async ({
  page,
}) => {
  await page.route("**/src/main.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'import "/src/ui/style.css";',
    }),
  );
  await page.goto("/");
  await page.evaluate(async () => {
    const loadModule = new Function("path", "return import(path)") as (
      path: string,
    ) => Promise<any>;
    const [{ CampaignUI }, { createCampaign }, { cityLevels }] =
      await Promise.all([
        loadModule("/src/ui/campaign.ts"),
        loadModule("/src/game/campaign.ts"),
        loadModule("/config/levels.ts"),
      ]);
    const state = createCampaign();
    state.campaign.level = cityLevels.length - 1;
    state.outcome = "won";
    let fanfareCount = 0;
    const ui = new CampaignUI(() => fanfareCount++);
    ui.render(state);
    ui.render(state);
    Object.assign(window, { fanfareCount });
  });
  await expect(page.locator("#campaign-celebration")).toBeVisible();
  await expect(page.locator("#celebration-title")).toContainText(
    "CONGRATULATIONS",
  );
  await expect(page.locator(".celebration-confetti i")).toHaveCount(72);
  expect(await page.evaluate(() => (window as any).fanfareCount)).toBe(1);
  await page.locator("#celebration-dismiss").click();
  await expect(page.locator("#campaign-celebration")).toBeHidden();
});
