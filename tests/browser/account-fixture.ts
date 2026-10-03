import type { Page } from "@playwright/test";
/** Existing scene tests use a genuine cookie account; online tests exercise the form itself. */
export async function registerTestAccount(page: Page): Promise<void> {
  const response = await page.request.post("/api/account", {
    data: {
      username: `Check_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
    },
  });
  if (!response.ok())
    throw new Error(`Account setup failed: ${await response.text()}`);
}
