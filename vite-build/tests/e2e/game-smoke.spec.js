/**
 * High-level smoke test:
 * boot game, step Intro -> Shop -> River, and fail on runtime errors.
 */
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

async function riverBoostCharge(page) {
  return page.evaluate(() => {
    const game = window.__authorizedCrossingGame;
    if (!game?.scene) {
      return null;
    }
    const activeRiver = game.scene.getScenes(true).find((s) => s?.scene?.key === "RiverScene");
    if (activeRiver && typeof activeRiver.boostCharge === "number") {
      return activeRiver.boostCharge;
    }
    const keyed = game.scene.keys?.RiverScene;
    return typeof keyed?.boostCharge === "number" ? keyed.boostCharge : null;
  });
}

async function goToRiverScene(page) {
  await page.goto("/");
  await expect(page.locator("#game-root canvas")).toBeVisible();
  await page.waitForFunction(() => !!window.__authorizedCrossingGame);

  await expect.poll(() => activeSceneKey(page)).toBe("IntroScene");
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  await page.keyboard.press("Space");
  await page.waitForTimeout(250);
  await page.keyboard.press("Space");
  await expect.poll(() => activeSceneKey(page)).toBe("ShopScene");
  await page.keyboard.press("Space");
  await expect.poll(() => activeSceneKey(page)).toBe("RiverScene");
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

  await goToRiverScene(page);

  expect(runtimeErrors, runtimeErrors.join("\n")).toEqual([]);
});

test("river boost consumes and recovers charge", async ({ page }) => {
  await goToRiverScene(page);

  await page.waitForFunction(() => {
    const game = window.__authorizedCrossingGame;
    const activeRiver = game?.scene?.getScenes?.(true)?.find((s) => s?.scene?.key === "RiverScene");
    return typeof activeRiver?.boostCharge === "number";
  });

  const initialBoost = await riverBoostCharge(page);
  expect(initialBoost).not.toBeNull();

  await page.keyboard.down("ArrowUp");
  await page.keyboard.down("Shift");
  await page.waitForTimeout(900);
  await page.keyboard.up("Shift");
  await page.keyboard.up("ArrowUp");

  const drainedBoost = await riverBoostCharge(page);
  expect(drainedBoost).not.toBeNull();
  expect(drainedBoost).toBeLessThan(initialBoost);

  await page.waitForTimeout(1000);
  const recoveredBoost = await riverBoostCharge(page);
  expect(recoveredBoost).not.toBeNull();
  expect(recoveredBoost).toBeGreaterThan(drainedBoost);
});
