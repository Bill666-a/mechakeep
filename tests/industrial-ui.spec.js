import { test, expect } from "@playwright/test";

test("dark presentation, structure switch and useful navigation controls", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(0, 0, 0)",
  );
  await expect(page.locator("#header")).toHaveCSS("height", "48px");
  await expect(page.locator("#header")).toHaveCSS(
    "backdrop-filter",
    "blur(20px)",
  );
  await expect(page.locator(".industrial-panel").first()).toHaveCSS(
    "border-radius",
    "24px",
  );
  await page.getByRole("button", { name: "Full armour", exact: true }).click();
  await expect(page.locator("#frame-photo")).toHaveAttribute(
    "src",
    "assets/freedom.webp",
  );
  await expect(
    page.getByRole("button", { name: "Full armour", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Inner frame", exact: true }).click();
  await expect(page.locator("#frame-photo")).toHaveAttribute(
    "src",
    "assets/frame.webp",
  );
  await page.getByRole("link", { name: "Search models", exact: true }).click();
  await expect(page.locator("#model-search")).toBeFocused();
  await page.locator("#model-search").fill("月光骑士");
  await expect(page.locator(".model-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Filter models", exact: true }).click();
  await expect(page.locator("[data-grade=All]")).toBeFocused();
});

test("multi-angle specification dialog, focus recovery and route cleanup", async ({
  page,
}) => {
  await page.goto("/#/model/iron-spider-2");
  const trigger = page.locator(".detail-spec-trigger");
  await trigger.click();
  const dialog = page.locator("#spec-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".spec-thumbnails button")).toHaveCount(3);
  await expect(
    dialog.getByRole("button", { name: "Close specifications" }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: "View 2", exact: true }).click();
  await dialog.getByRole("button", { name: "View 3", exact: true }).click();
  await expect(dialog.locator("#spec-main-photo")).toHaveAttribute(
    "src",
    "assets/iron-spider-portrait.webp",
  );
  await expect(dialog.locator("#spec-photo-count")).toHaveText("3 / 3");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(dialog.locator("#spec-main-photo")).toHaveCSS("opacity", "1");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("link", { name: "Explore this model" }).click();
  await expect(dialog).not.toBeVisible();
  await page.goto("/");
  await page
    .getByRole("button", { name: "View technical specifications", exact: true })
    .click();
  await page
    .locator("#spec-dialog")
    .getByRole("link", { name: "Explore this model" })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/iron-man$/);
});

test("mobile technical dialog remains readable and dismissible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/#/model/captain-america-stealth");
    await page.locator(".detail-spec-trigger").click();
    const dialog = page.locator("#spec-dialog");
    await expect(dialog).toBeVisible();
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    const close = dialog.getByRole("button", { name: "Close specifications" });
    await expect(close).toBeInViewport();
    await dialog.getByRole("button", { name: "View 2", exact: true }).click();
    await expect(dialog.locator("#spec-main-photo")).toHaveAttribute(
      "src",
      "assets/captain-america-stealth-helmet.webp",
    );
    if (width === 390 || width === 1440) {
      await dialog.locator("#spec-main-photo").evaluate((img) => img.decode());
      await page.screenshot({
        path: `test-results/spec-${width}.png`,
        animations: "disabled",
      });
    }
    await close.click();
    await expect(dialog).not.toBeVisible();
  }
});
