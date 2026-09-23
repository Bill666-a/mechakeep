import { test, expect } from "@playwright/test";

test("supplied photographs belong to the correct releases and every gallery image loads", async ({
  page,
}) => {
  const galleries = [
    ["iron-man", "MMS528D30", ["iron-man-mk85"]],
    ["scarlet-witch", "MMS652 / MMS653", ["scarlet-witch"]],
    ["spider-man-brand-new-day", "MMS892", ["spider-man-brand-new-day"]],
    [
      "captain-america-stealth",
      "MMS783",
      ["captain-america-stealth", "captain-america-stealth-helmet"],
    ],
    ["moon-knight", "TMS075", ["moon-knight", "moon-knight-detail"]],
    [
      "iron-spider-2",
      "MMS761 / MMS762AE",
      ["iron-spider", "iron-spider-action", "iron-spider-portrait"],
    ],
    ["iron-man-mk42", "MMS759D66", ["iron-man-mk42", "iron-man-mk42-action"]],
  ];
  for (const [id, reference, images] of galleries) {
    await page.goto("/#/model/" + id);
    await expect(page.locator(".release-meta")).toContainText(reference);
    await expect(page.locator(".price-unverified")).toHaveText(
      "Reference price not verified",
    );
    await expect(page.locator(".photo-credit").first()).toContainText(
      "Photography",
    );
    for (let i = 0; i < images.length; i++) {
      if (images.length > 1) {
        const button = page.getByRole("button", {
          name: `View photograph ${i + 1} of ${images.length}`,
        });
        await button.focus();
        await page.keyboard.press("Enter");
        await expect(button).toHaveAttribute("aria-pressed", "true");
      }
      await expect(page.locator("#product-main-photo")).toHaveAttribute(
        "src",
        `assets/${images[i]}.webp`,
      );
      expect(
        await page.locator("#product-main-photo").evaluate(async (img) => {
          await img.decode();
          return img.naturalWidth > 0;
        }),
      ).toBe(true);
      await expect(page.locator("#photo-count")).toHaveText(
        `${i + 1} / ${images.length}`,
      );
    }
    await page
      .getByText("Product references & edition notes", { exact: true })
      .click();
    await expect(page.locator(".product-references a").first()).toHaveAttribute(
      "href",
      /^https:\/\/www\.toysbuyingagent\.com\/products\//,
    );
  }
});

test("Chinese searches separate costume variants and new favourites persist", async ({
  page,
}) => {
  await page.goto("/#/models?category=Hot%20Toys");
  await expect(page.locator(".model-card")).toHaveCount(10);
  await page.getByRole("searchbox").fill("潜行");
  await expect(page.locator(".model-card")).toHaveCount(1);
  await expect(page.locator(".model-card h3")).toHaveText(
    "Captain America · Stealth S.T.R.I.K.E. Suit 2.0",
  );
  await page.getByRole("searchbox").fill("崭新之日");
  await expect(page.locator(".model-card")).toHaveCount(1);
  await expect(page.locator(".model-card .model-code")).toHaveText("MMS892");
  await page.locator('[data-favourite="spider-man-brand-new-day"]').click();
  await page.goto("/#/favourites");
  await page.reload();
  await expect(page.locator(".model-card h3")).toHaveText(
    "Spider-Man · Brand New Day Suit",
  );
});

test("new photo pages fit desktop and mobile without cropping the main photographs", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const route of [
      "",
      "builds",
      "model/captain-america-stealth",
      "model/iron-spider-2",
      "model/iron-man-mk42",
    ]) {
      await page.goto("/#/" + route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}`,
      ).toBe(true);
      if (route.startsWith("model/"))
        expect(
          await page
            .locator("#product-main-photo")
            .evaluate((i) => getComputedStyle(i).objectFit),
        ).toBe("contain");
    }
  }
});
