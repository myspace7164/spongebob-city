import type { Page } from "@playwright/test";
/** Existing scene tests use a genuine cookie account; online tests exercise the form itself. */
export async function registerTestAccount(page: Page): Promise<void> {
  await page.route("**/src/game/campaign.ts*", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replaceAll(
        "random = Math.random",
        "random = () => 0",
      ),
    });
  });
  const response = await page.request.post("/api/account", {
    data: {
      username: `Check_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
    },
  });
  if (!response.ok())
    throw new Error(`Account setup failed: ${await response.text()}`);
}
