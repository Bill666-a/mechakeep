import { test, expect } from "@playwright/test";

test("home search routes to real catalogue results and supports encoded queries", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("searchbox", { name: "Find a figure or kit" })
    .fill("MMS783");
  await page
    .locator("#discovery-search")
    .getByRole("button", { name: "Search", exact: true })
    .click();
  await expect(page.locator(".model-card")).toHaveCount(1);
  await expect(page.locator(".model-card h3")).toContainText("Stealth");
  await expect(page.locator("#model-search")).toHaveValue("MMS783");
  await page.reload();
  await expect(page.locator(".model-card")).toHaveCount(1);
  await page.goto("/");
  await page.locator("#home-search").fill("Iron Man & <armour>");
  await page.locator("#home-search").press("Enter");
  await expect(page.locator("#model-search")).toHaveValue(
    "Iron Man & <armour>",
  );
  await expect(page.getByText("No collectibles found. Yet.")).toBeVisible();
});

test("featured collection wraps, keeps links aligned and FAQ works with keyboard", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const visibleSlide = page.locator("[data-spotlight-slide]:visible");
  await expect(visibleSlide.locator("h3")).toHaveText("Gipsy Danger");
  await page.getByRole("button", { name: "Previous collectible" }).click();
  await expect(visibleSlide.locator("h3")).toHaveText("Thor");
  await page.getByRole("button", { name: "Next collectible" }).click();
  await page.getByRole("button", { name: "Next collectible" }).click();
  await expect(visibleSlide.locator("h3")).toHaveText("Strike Freedom Gundam");
  await expect(
    visibleSlide.getByRole("link", {
      name: "Explore this collectible",
      exact: true,
    }),
  ).toHaveAttribute("href", "#/model/strike-freedom");
  await expect(page.locator("#spotlight-count")).toContainText("02 / 03");
  const question = page.locator(".guide-questions summary").first();
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator(".guide-questions details").first(),
  ).toHaveAttribute("open", "");
  await expect(
    page.locator(".guide-questions details").first().locator("p"),
  ).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const cards = page.locator(".discovery-path");
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    if (width < 768) expect(second.y).toBeGreaterThan(first.y);
    else expect(second.y).toBe(first.y);
  }
});
