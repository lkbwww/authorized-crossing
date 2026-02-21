/**
 * Fake ad flow manager used by the result scene.
 * Real ad SDK integration can replace these overlay hooks later.
 */
import { REQUIRED_STRINGS } from "./constants.js";

export class AdManager {
  // Interstitial shown on every second result screen.
  showInterstitial(scene) {
    return this.showOverlay(
      scene,
      REQUIRED_STRINGS.interstitialTitle,
      REQUIRED_STRINGS.interstitialBody,
      1500
    );
  }

  // Rewarded ad used only on failure flow.
  showRewarded(scene) {
    return this.showOverlay(
      scene,
      REQUIRED_STRINGS.rewardedTitle,
      REQUIRED_STRINGS.rewardedBody,
      2000
    );
  }

  // Generic full-screen overlay used as fake ad placeholder.
  showOverlay(scene, title, body, durationMs) {
    return new Promise((resolve) => {
      const container = scene.add.container(scene.scale.width / 2, scene.scale.height / 2);
      container.setDepth(10000);

      const backdrop = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x1a120d, 0.9);
      const panel = scene.add.rectangle(0, 0, 540, 230, 0x2b1e15, 0.94).setStrokeStyle(3, 0xc08a54, 1);
      const titleText = scene.add
        .text(0, -34, title, {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "30px",
          color: "#f8ecdc",
          align: "center",
        })
        .setOrigin(0.5);
      const bodyText = scene.add
        .text(0, 28, body, {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "24px",
          color: "#eabf95",
          align: "center",
        })
        .setOrigin(0.5);

      container.add([backdrop, panel, titleText, bodyText]);

      const timer = scene.time.delayedCall(durationMs, () => {
        container.destroy(true);
        resolve(true);
      });

      scene.events.once("shutdown", () => {
        if (!timer.hasDispatched) {
          timer.remove(false);
        }
        if (container.active) {
          container.destroy(true);
        }
        resolve(false);
      });
    });
  }
}
