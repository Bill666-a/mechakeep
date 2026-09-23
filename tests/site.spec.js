import { test, expect } from "@playwright/test";
import path from "node:path";

test("homepage and every route load without broken images or browser errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Good company.",
  );
  for (const section of await page.locator(".reveal").all()) {
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveClass(/is-visible/);
  }
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map((img) => {
        img.loading = "eager";
        return img.decode().catch(() => {});
      }),
    );
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  for (const route of [
    "models",
    "model/strike-freedom",
    "model/sazabi",
    "model/iron-man",
    "model/captain-america",
    "model/thor",
    "model/spider-man",
    "model/gipsy-danger",
    "favourites",
    "builds",
    "submit",
    "releases",
    "about",
    "missing",
  ]) {
    await page.goto("/#/" + route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(async () => {
      await Promise.all(
        [...document.images].map((img) => {
          img.loading = "eager";
          return img.decode().catch(() => {});
        }),
      );
    });
    expect(
      await page
        .locator("img")
        .evaluateAll((imgs) =>
          imgs
            .filter(
              (i) => !i.hidden && i.getAttribute("src") && !i.naturalWidth,
            )
            .map((i) => i.src),
        ),
    ).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test("grade, search, sort, empty state and favourites persist across refresh", async ({
  page,
}) => {
  await page.goto("/#/models");
  await expect(page.locator(".model-card")).toHaveCount(17);
  await page.getByRole("button", { name: "Pacific Rim", exact: true }).click();
  await expect(page.locator(".model-card")).toHaveCount(1);
  await expect(page.locator(".model-card h3")).toHaveText("Gipsy Danger");
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByRole("searchbox").fill("Sazabi");
  await expect(page.locator(".model-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Add to favourites: Sazabi Ver.Ka" })
    .click();
  await expect(page.locator("#toast")).toContainText("Added to favourites");
  await page.reload();
  await expect(page.locator('[data-favourite="sazabi"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#model-sort").selectOption("price-asc");
  await expect(page.locator(".model-card h3").first()).toHaveText(
    "Gundam Aerial Rebuild",
  );
  await page.getByRole("searchbox").fill("nothing-matches");
  await expect(
    page.getByRole("heading", { name: "No collectibles found. Yet." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.locator(".model-card")).toHaveCount(17);
  await page.goto("/#/favourites");
  await expect(page.locator(".model-card")).toHaveCount(1);
  await page.locator('[data-favourite="sazabi"]').click();
  await expect(
    page.getByRole("heading", { name: "A little room for inspiration." }),
  ).toBeVisible();
});

test("build upload preview, local saving, modal and deliberate deletion", async ({
  page,
}) => {
  await page.goto("/#/submit?model=strike-freedom");
  await expect(page.locator("#build-model")).toHaveValue("strike-freedom");
  await page
    .locator("#build-image")
    .setInputFiles(path.resolve("public/assets/build-1.webp"));
  await expect(page.locator("#preview-image")).toBeVisible();
  await page.getByLabel("Build title").fill("My gold-frame build");
  await page.getByLabel("Builder", { exact: false }).fill("Workshop One");
  await page
    .getByLabel("The little details")
    .fill("Hand-finished and ready for the shelf.");
  await expect(page.locator("#preview-title")).toHaveText(
    "My gold-frame build",
  );
  await expect(page.locator("#preview-builder")).toHaveText(
    "Made by Workshop One",
  );
  await page.getByRole("button", { name: "Save my build" }).click();
  await expect(page).toHaveURL(/#\/builds$/);
  await page.reload();
  await page.getByRole("button", { name: /My gold-frame build/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#dialog-title")).toHaveText("My gold-frame build");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: /My gold-frame build/ }).click();
  await page.getByRole("button", { name: "Delete this build" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm delete — this cannot be undone" })
    .click();
  await expect(
    page.getByRole("button", { name: /My gold-frame build/ }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: /My gold-frame build/ }),
  ).toHaveCount(0);
});

test("release filtering, mobile navigation, overflow and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map((img) => {
        img.loading = "eager";
        return img.decode().catch(() => {});
      }),
    );
  });
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Releases" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Good things. On the horizon.",
  );
  await page.getByRole("button", { name: "Available", exact: true }).click();
  await expect(page.locator("#release-results .release-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Upcoming", exact: true }).click();
  await expect(page.locator("#release-results .release-row")).toHaveCount(4);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of [
      "",
      "models",
      "model/strike-freedom",
      "builds",
      "submit",
      "releases",
      "favourites",
    ]) {
      await page.goto("/#/" + route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `No horizontal overflow on ${route} at ${width}px`,
      ).toBe(true);
    }
  }
  await page.goto("/");
  expect(
    await page
      .locator("h1")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});

test("bad image uploads are rejected without saving a build", async ({
  page,
}) => {
  await page.goto("/#/submit");
  await page.locator("#build-image").setInputFiles({
    name: "not-a-photo.png",
    mimeType: "image/png",
    buffer: Buffer.from("invalid image"),
  });
  await expect(page.locator("#form-error")).toContainText("could not be read");
  await expect(page.locator("#preview-image")).toBeHidden();
  await expect(page.locator("#save-build")).toBeEnabled();
});
