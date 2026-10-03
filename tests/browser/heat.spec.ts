import { expect, test } from "@playwright/test";

test("HUD shows the global Celsius temperature and its risk band", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#game")).toHaveAttribute("data-level", "loaded");
  await expect(page.locator("#heat-value")).toHaveText("27.0 °C · 0% risk");
  await expect(page.locator(".meter.heat")).toHaveAttribute(
    "data-warning",
    "normal",
  );
  await expect(page.locator("#heat-meter")).toHaveAttribute(
    "aria-label",
    "City heat risk",
  );
  expect(pageErrors).toEqual([]);
});
