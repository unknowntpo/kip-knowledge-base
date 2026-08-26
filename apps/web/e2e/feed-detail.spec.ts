import { expect, test, type Page } from "@playwright/test";

function collectBrowserProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`page: ${error.message}`));
  page.on("requestfailed", (request) => problems.push(
    `request: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`,
  ));
  return problems;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("community-kb-locale", "en");
  });
});

test("evidence search opens its immutable FeedDetail timeline", async ({ page }) => {
  const browserProblems = collectBrowserProblems(page);
  const feedResponse = page.waitForResponse((response) => response.url().endsWith("/api/feed"));

  await page.goto("/");
  expect((await feedResponse).status()).toBe(200);
  await expect(page.locator("#view-feed")).toBeVisible();
  await expect(page.locator(".card")).toHaveCount(3);
  await expect(page.locator(".card-project")).toContainText([
    "Apache Kafka",
    "Apache DataFusion",
  ]);

  const searchResponse = page.waitForResponse((response) =>
    response.url().includes("/api/search?") && response.url().includes("KIP-405"));
  await page.locator("#q").fill("KIP-405");
  expect((await searchResponse).status()).toBe(200);
  const result = page.locator(".search-card").first();
  await expect(result).toContainText("KIP-405: Kafka Tiered Storage");
  await expect(result.locator(".evidence").first()).toContainText("Tiered storage");
  await result.click();

  await expect(page).toHaveURL(/#\/search\/sdr1\./);
  await expect(page.getByRole("heading", {
    level: 1,
    name: "KIP-405: Kafka Tiered Storage",
  })).toBeVisible();
  await expect(page.locator(".timeline .tl-item")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /Wiki\s*1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Mailing list\s*1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /GitHub\s*1/ })).toBeVisible();
  await expect(page.locator(".tl-link").first()).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
  await expect(page.locator(".key-points-state")).toContainText(
    "No summarizer is configured",
  );
  expect(browserProblems).toEqual([]);
});

test("project status refines evidence search without changing ranking semantics", async ({ page }) => {
  const browserProblems = collectBrowserProblems(page);
  await page.goto("/");
  await expect(page.locator("#view-feed")).toBeVisible();

  await page.locator("#q").fill("producer");
  const filtersToggle = page.getByRole("button", { name: "Filters" });
  if (await filtersToggle.isVisible()) await filtersToggle.click();
  await page.getByRole("button", { name: /Apache Kafka/ }).click();
  const filteredResponse = page.waitForResponse((response) =>
    response.url().includes("/api/search?") &&
    response.url().includes("projectStatus=merged"));
  await page.getByRole("button", { name: "Merged" }).click();
  expect((await filteredResponse).status()).toBe(200);

  const results = page.locator(".search-card");
  await expect(results).toHaveCount(1);
  await expect(results.first()).toContainText("RecordAccumulator.ready()");
  await expect(results.first()).toContainText("Merged");
  expect(browserProblems).toEqual([]);
});
