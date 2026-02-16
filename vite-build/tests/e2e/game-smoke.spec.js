import { expect, test } from "@playwright/test";

async function activeSceneKey(page) {
  return page.evaluate(() => {
    const game = window.__authorizedCrossingGame;
    if (!game || !game.scene) {
      return null;
    }
    const activeScenes = game.scene.getScenes(true);
    return activeScenes?.[0]?.scene?.key ?? null;
  });
}

test("game boots and reaches RiverScene from Intro", async ({ page }) => {
  const runtimeErrors = [];

  page.on("pageerror", (err) => {
    runtimeErrors.push(`pageerror: ${err.message}`);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      runtimeErrors.push(`console.error: ${msg.text()}`);
    }
  });

  await page.goto("/");
  await expect(page.locator("#game-root canvas")).toBeVisible();
  await page.waitForFunction(() => !!window.__authorizedCrossingGame);

  await expect.poll(() => activeSceneKey(page)).toBe("IntroScene");

  // Intro -> briefing typing
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);

  // Finish typing / reveal merchant
  await page.keyboard.press("Space");
  await page.waitForTimeout(250);

  // Continue to shop
  await page.keyboard.press("Space");
  await expect.poll(() => activeSceneKey(page)).toBe("ShopScene");

  // Shop -> river
  await page.keyboard.press("Space");
  await expect.poll(() => activeSceneKey(page)).toBe("RiverScene");

  expect(runtimeErrors, runtimeErrors.join("\n")).toEqual([]);
});
