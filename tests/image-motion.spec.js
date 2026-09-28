import { test, expect } from "@playwright/test";

test("slow images reveal after loading and offscreen photographs reveal on scroll", async ({
  page,
}) => {
  let release;
  const ready = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/assets/iron-man-mk85.webp", async (route) => {
    await ready;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const hero = page.locator('.flagship-hero img[src*="iron-man-mk85"]');
  try {
    await expect(hero).toHaveCSS("opacity", "0");
  } finally {
    release();
  }
  await expect
    .poll(() =>
      hero.evaluate((img) =>
        img.getAnimations().some((a) => a.playState === "running"),
      ),
    )
    .toBe(true);
  await expect(hero).toHaveCSS("opacity", "1");
  const lower = page.locator(".photo-feature-grid img").first();
  await expect(lower).toHaveCSS("opacity", "0");
  await lower.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      lower.evaluate((img) =>
        img.getAnimations().some((a) => a.playState === "running"),
      ),
    )
    .toBe(true);
  await expect(lower).toHaveCSS("opacity", "1");
  await expect(lower).toHaveCSS("translate", "none");
});

test("latest gallery selection wins and reduced motion immediately shows images", async ({
  page,
}) => {
  await page.goto("/#/model/iron-spider-2");
  await page
    .locator(".photo-thumbnails img")
    .evaluateAll((imgs) => Promise.all(imgs.map((img) => img.decode())));
  await page.evaluate(() => {
    document.querySelector('[data-photo="1"]').click();
    document.querySelector('[data-photo="2"]').click();
  });
  await expect(page.locator("#product-main-photo")).toHaveAttribute(
    "src",
    "assets/iron-spider-portrait.webp",
  );
  await expect(page.locator("#photo-count")).toHaveText("3 / 3");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("#product-main-photo")).toHaveCSS("opacity", "1");
  await page.goto("/");
  for (const image of await page.locator("img").all()) {
    await expect(image).toHaveCSS("opacity", "1");
    expect(await image.evaluate((img) => img.getAnimations().length)).toBe(0);
  }
});

test("home tiles and copy enter in order, and reduced motion keeps them visible", async ({
  page,
}) => {
  await page.goto("/");
  const tiles = page.locator(".bento-grid .photo-tile");
  await expect(tiles).toHaveCount(4);
  await page.locator(".bento-intro").scrollIntoViewIfNeeded();
  await expect(page.locator(".bento-intro")).toHaveClass(/is-visible/);
  await tiles.first().scrollIntoViewIfNeeded();
  await expect(tiles.first()).toHaveClass(/is-visible/);
  await expect(page.locator(".bento-intro h2")).toHaveCSS(
    "animation-name",
    "content-rise",
  );
  await page.locator(".bento-directory").scrollIntoViewIfNeeded();
  await expect(page.locator(".bento-directory")).toHaveClass(/is-visible/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  for (const element of await page
    .locator(".bento-intro, .bento-grid .photo-tile")
    .all()) {
    await expect(element).toHaveCSS("opacity", "1");
  }
  await expect(page.locator(".bento-intro h2")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("flagship specs open as a keyboard dismissible gallery", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /View technical specifications/ })
    .click();
  const dialog = page.locator("#spec-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("MMS528D30");
  await expect(dialog).toContainText("32.5 cm");
  await expect(dialog.locator("#spec-main-photo")).toHaveAttribute(
    "src",
    "assets/iron-man-mk85.webp",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
