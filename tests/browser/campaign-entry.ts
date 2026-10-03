import { expect, type Page } from "@playwright/test";

export async function enterCampaign(page: Page): Promise<void> {
  await page.locator("#play").click();
  await expect(page.locator("#campaign-story")).toBeVisible();
  await page.locator("#story-start").click();
  await expect(page.locator("#campaign-story")).toBeHidden();
}
