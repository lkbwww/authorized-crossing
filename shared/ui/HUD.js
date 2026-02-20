/**
 * Screen-space HUD renderer for river and escape scenes.
 * Keeps gameplay telemetry and item slots readable while camera scrolls.
 */
import {
  BREATH_MAX,
  INTERNAL_WIDTH,
  ITEM_DEFINITIONS,
  UI_THEME,
} from "../constants.js";
import { clamp } from "../utils.js";

function drawBar(graphics, x, y, width, height, ratio, fillColor, bgColor = 0x1a120d) {
  const safeRatio = clamp(ratio, 0, 1);
  graphics.clear();
  graphics.fillStyle(bgColor, 0.95);
  graphics.fillRect(x, y, width, height);
  graphics.fillStyle(fillColor, 1);
  graphics.fillRect(x + 2, y + 2, Math.floor((width - 4) * safeRatio), height - 4);
  graphics.lineStyle(2, UI_THEME.border, 1);
  graphics.strokeRect(x, y, width, height);
}

function fixedText(scene, x, y, text, style, originX = 0, originY = 0) {
  return scene.add
    .text(x, y, text, style)
    .setOrigin(originX, originY)
    .setScrollFactor(0)
    .setDepth(5000);
}

function fixedRect(scene, x, y, w, h, color, alpha = 1) {
  return scene.add
    .rectangle(x, y, w, h, color, alpha)
    .setScrollFactor(0)
    .setDepth(4900);
}

export class HUD {
  constructor(scene, mode = "river") {
    this.scene = scene;
    this.mode = mode;
    this.toastUntil = 0;
    this.toastColor = UI_THEME.warn;

    this.createPanels();
    this.createTexts();
    this.createGraphics();
  }

  createPanels() {
    // Fixed panels stay in screen space (scrollFactor = 0).
    this.panelLeft = fixedRect(this.scene, 180, 56, 340, 92, UI_THEME.panel, 0.9).setStrokeStyle(2, UI_THEME.border, 1);
    this.panelCenter = fixedRect(this.scene, INTERNAL_WIDTH / 2, 58, 460, 110, UI_THEME.panel, 0.9).setStrokeStyle(2, UI_THEME.border, 1);
    this.panelRight = fixedRect(this.scene, 1110, 62, 300, 124, UI_THEME.panel, 0.9).setStrokeStyle(2, UI_THEME.border, 1);
    this.panelBottom = fixedRect(this.scene, INTERNAL_WIDTH / 2, 695, 1220, 42, UI_THEME.panel, 0.94).setStrokeStyle(2, UI_THEME.border, 1);
  }

  createTexts() {
    this.leftText = fixedText(this.scene, 24, 20, "", {
      fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
      fontSize: "18px",
      color: UI_THEME.textPrimary,
    });

    this.centerText = fixedText(
      this.scene,
      INTERNAL_WIDTH / 2,
      14,
      "",
      {
        fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
        fontSize: "18px",
        color: UI_THEME.textPrimary,
      },
      0.5,
      0
    );

    this.modeText = fixedText(
      this.scene,
      INTERNAL_WIDTH / 2,
      66,
      "",
      {
        fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
        fontSize: "13px",
        color: UI_THEME.textSecondary,
      },
      0.5,
      0
    );

    this.exposureLabel = fixedText(this.scene, 980, 18, "BOOST", {
      fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
      fontSize: "15px",
      color: UI_THEME.warn,
    });

    this.breathLabel = fixedText(this.scene, 980, 62, "BREATH", {
      fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
      fontSize: "15px",
      color: "#9CC1D9",
    });

    this.bottomText = fixedText(
      this.scene,
      INTERNAL_WIDTH / 2,
      684,
      "",
      {
        fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
        fontSize: "16px",
        color: UI_THEME.textSecondary,
      },
      0.5,
      0
    );

    this.toastText = fixedText(
      this.scene,
      INTERNAL_WIDTH / 2,
      96,
      "",
      {
        fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
        fontSize: "22px",
        color: UI_THEME.warn,
        stroke: "#000000",
        strokeThickness: 4,
      },
      0.5,
      0
    ).setVisible(false);
  }

  createGraphics() {
    this.progressBar = this.scene.add.graphics().setScrollFactor(0).setDepth(5000);
    this.progressRiskOverlay = this.scene.add.graphics().setScrollFactor(0).setDepth(5001);
    this.exposureBar = this.scene.add.graphics().setScrollFactor(0).setDepth(5000);
    this.breathBar = this.scene.add.graphics().setScrollFactor(0).setDepth(5000);
  }

  updateRiver(data) {
    // River mode shows crossing timer and optional breath readout.
    const injuredBadge = data.injured ? "  [INJURED]" : "";
    this.leftText.setText(`MONEY $${data.money}\nSEASON ${data.season}${injuredBadge}`);

    this.centerText.setText(`CROSSING... ${Math.max(0, data.secLeft).toFixed(1)}s`);
    this.modeText.setVisible(true);
    this.modeText.setText(`MODE: ${data.motionMode || "RUNNING"}`);

    drawBar(this.progressBar, 420, 36, 440, 20, data.progress, 0x7a7b4f, 0x1a120d);

    this.progressRiskOverlay.clear();
    if (data.showRiskWindow && data.riskWindow) {
      const startRatio = data.riskWindow.start / data.totalDuration;
      const endRatio = data.riskWindow.end / data.totalDuration;
      const x = 420 + Math.floor(440 * startRatio);
      const w = Math.max(6, Math.floor(440 * (endRatio - startRatio)));
      this.progressRiskOverlay.fillStyle(0xe0a84a, 0.38);
      this.progressRiskOverlay.fillRect(x, 36, w, 20);
      this.progressRiskOverlay.lineStyle(1, 0xf5d5a0, 0.8);
      this.progressRiskOverlay.strokeRect(x, 36, w, 20);
    }

    const boostRatio = clamp((data.boostCharge ?? 0) / 100, 0, 1);
    const boostColor = data.boostActive ? 0xe0a84a : 0x7a7b4f;
    const boostUseTime = data.boostUseTime ?? 0;
    const boostUseCount = data.boostUseCount ?? 0;
    const boostCd = Math.max(0, data.boostCooldownLeft ?? 0);
    const cooldownText = boostCd > 0 ? `  CD ${boostCd.toFixed(1)}s` : "";
    this.exposureLabel.setVisible(true);
    this.exposureLabel.setText(
      `BOOST ${Math.round((data.boostCharge ?? 0))}%${data.boostActive ? " ACTIVE" : ""}${cooldownText}  ${boostUseTime.toFixed(1)}s x${boostUseCount}`
    );
    drawBar(this.exposureBar, 980, 34, 270, 18, boostRatio, boostColor, 0x1a120d);

    const showBreath = !!data.showBreath;
    this.breathLabel.setVisible(showBreath);
    this.breathBar.setVisible(showBreath);
    if (showBreath) {
      drawBar(this.breathBar, 980, 78, 270, 18, data.breath / BREATH_MAX, 0x5f7f95, 0x1a120d);
    }

    this.bottomText.setText(this.buildSlotText(data.itemsOwned));
    this.updateToast();
  }

  updateEscape(data) {
    // Escape mode hides exposure/breath and focuses on destination progress.
    const injuredBadge = data.injured ? "  [INJURED]" : "";
    this.leftText.setText(`MONEY $${data.money}\nSEASON ${data.season}${injuredBadge}`);
    this.centerText.setText(`ESCAPE... ${Math.max(0, data.secLeft).toFixed(1)}s`);
    this.modeText.setVisible(false);

    drawBar(this.progressBar, 420, 36, 440, 20, data.progress, 0x7a7b4f, 0x1a120d);

    this.progressRiskOverlay.clear();
    this.exposureBar.clear();
    this.breathBar.clear();
    this.exposureLabel.setVisible(false);
    this.breathLabel.setVisible(false);

    this.bottomText.setText(this.buildSlotText(data.itemsOwned));
    this.updateToast();
  }

  buildSlotText(itemsOwned) {
    const ownedSet = new Set(itemsOwned);
    return ITEM_DEFINITIONS.map((item) => `${item.slotAbbrev}[${ownedSet.has(item.id) ? "X" : "-"}]`).join("  ");
  }

  showToast(text, color = UI_THEME.warn, durationMs = 1500) {
    this.toastColor = color;
    this.toastText.setColor(color);
    this.toastText.setText(text);
    this.toastText.setVisible(true);
    this.toastUntil = this.scene.time.now + durationMs;
  }

  updateToast() {
    if (this.toastUntil > this.scene.time.now) {
      return;
    }
    this.toastText.setVisible(false);
  }

  destroy() {
    [
      this.panelLeft,
      this.panelCenter,
      this.panelRight,
      this.panelBottom,
      this.leftText,
      this.centerText,
      this.modeText,
      this.exposureLabel,
      this.breathLabel,
      this.bottomText,
      this.toastText,
      this.progressBar,
      this.progressRiskOverlay,
      this.exposureBar,
      this.breathBar,
    ].forEach((node) => {
      if (node && node.destroy) {
        node.destroy();
      }
    });
  }
}
