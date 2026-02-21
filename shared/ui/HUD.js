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
  graphics.fillStyle(bgColor, 0.82);
  graphics.fillRect(x, y, width, height);
  graphics.fillStyle(fillColor, 0.86);
  graphics.fillRect(x + 2, y + 2, Math.floor((width - 4) * safeRatio), height - 4);
  graphics.lineStyle(1, UI_THEME.border, 0.8);
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
    this.panelLeft = fixedRect(this.scene, 180, 56, 340, 92, UI_THEME.panel, 0.76).setStrokeStyle(1, UI_THEME.border, 0.75);
    this.panelCenter = fixedRect(this.scene, INTERNAL_WIDTH / 2, 58, 460, 110, UI_THEME.panel, 0.76).setStrokeStyle(1, UI_THEME.border, 0.75);
    this.panelRight = fixedRect(this.scene, 1110, 62, 300, 124, UI_THEME.panel, 0.76).setStrokeStyle(1, UI_THEME.border, 0.75);
    this.panelBottom = fixedRect(this.scene, INTERNAL_WIDTH / 2, 695, 1220, 42, UI_THEME.panel, 0.8).setStrokeStyle(1, UI_THEME.border, 0.75);
  }

  createTexts() {
    this.leftText = fixedText(this.scene, 24, 20, "", {
      fontFamily: "'Trebuchet MS', Tahoma, sans-serif",
      fontSize: "17px",
      color: UI_THEME.textPrimary,
    });

    this.centerText = fixedText(
      this.scene,
      INTERNAL_WIDTH / 2,
      14,
      "",
      {
        fontFamily: "'Arial Black', Impact, sans-serif",
        fontSize: "17px",
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
        fontSize: "12px",
        color: UI_THEME.textSecondary,
      },
      0.5,
      0
    );

    this.exposureLabel = fixedText(this.scene, 980, 18, "BOOST", {
      fontFamily: "'Trebuchet MS', Tahoma, sans-serif",
      fontSize: "14px",
      color: UI_THEME.warn,
    });

    this.breathLabel = fixedText(this.scene, 980, 62, "BREATH", {
      fontFamily: "'Trebuchet MS', Tahoma, sans-serif",
      fontSize: "14px",
      color: "#9CC1D9",
    });

    this.bottomText = fixedText(
      this.scene,
      INTERNAL_WIDTH / 2,
      684,
      "",
      {
        fontFamily: "'Arial Black', Impact, sans-serif",
        fontSize: "14px",
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
        fontSize: "20px",
        color: UI_THEME.warn,
        stroke: "#000000",
        strokeThickness: 3,
      },
      0.5,
      0
    ).setVisible(false);
  }

  createGraphics() {
    this.progressBar = this.scene.add.graphics().setScrollFactor(0).setDepth(5000);
    this.progressRiskOverlay = this.scene.add.graphics().setScrollFactor(0).setDepth(5001);
    this.progressCursor = this.scene.add.graphics().setScrollFactor(0).setDepth(5002);
    this.exposureBar = this.scene.add.graphics().setScrollFactor(0).setDepth(5000);
    this.breathBar = this.scene.add.graphics().setScrollFactor(0).setDepth(5000);
    this.hudParticles = this.scene.add.particles(0, 0, "px-mist", {
      quantity: 1,
      frequency: 300,
      x: { min: 980, max: 1248 },
      y: 102,
      lifespan: { min: 600, max: 1100 },
      speedY: { min: -24, max: -12 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.25, end: 0.85 },
      alpha: { start: 0.22, end: 0 },
    }).setScrollFactor(0).setDepth(5003).setVisible(false);
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
    this.progressCursor.clear();
    if (data.riskWindow) {
      const startRatio = data.riskWindow.start / data.totalDuration;
      const endRatio = data.riskWindow.end / data.totalDuration;
      const x = 420 + Math.floor(440 * startRatio);
      const w = Math.max(6, Math.floor(440 * (endRatio - startRatio)));
      this.progressRiskOverlay.fillStyle(0xe0a84a, data.showRiskWindow ? 0.38 : 0.18);
      this.progressRiskOverlay.fillRect(x, 36, w, 20);
      this.progressRiskOverlay.lineStyle(1, 0xf5d5a0, data.showRiskWindow ? 0.8 : 0.42);
      this.progressRiskOverlay.strokeRect(x, 36, w, 20);
    }
    const timeRatio = clamp((data.elapsed ?? 0) / data.totalDuration, 0, 1);
    const cursorX = 420 + Math.floor(440 * timeRatio);
    this.progressCursor.fillStyle(0xf3e9d7, 0.9);
    this.progressCursor.fillRect(cursorX, 33, 2, 26);

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
    this.hudParticles.setVisible(showBreath || this.mode === "river");

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
    this.progressCursor.clear();
    this.breathBar.clear();
    this.breathLabel.setVisible(false);

    if (data.laneControl?.active) {
      const secLeft = Math.max(0, data.laneControl.secLeft ?? 0);
      const lane = (data.laneControl.lane || "").toUpperCase();
      this.exposureLabel.setVisible(true);
      this.exposureLabel.setColor(data.laneControl.violating ? UI_THEME.danger : UI_THEME.warn);
      this.exposureLabel.setText(`CONTROL ${lane}  ${secLeft.toFixed(1)}s`);
      drawBar(
        this.exposureBar,
        980,
        34,
        270,
        18,
        clamp(data.laneControl.ratio ?? 0, 0, 1),
        data.laneControl.violating ? 0x965645 : 0xc89652,
        0x1a120d
      );
    } else if (data.laneControl?.previewLane) {
      const secLeft = Math.max(0, data.laneControl.previewSec ?? 0);
      const lane = (data.laneControl.previewLane || "").toUpperCase();
      this.exposureLabel.setVisible(true);
      this.exposureLabel.setColor(UI_THEME.textSecondary);
      this.exposureLabel.setText(`NEXT CONTROL ${lane} in ${secLeft.toFixed(1)}s`);
      this.exposureBar.clear();
    } else {
      this.exposureBar.clear();
      this.exposureLabel.setVisible(false);
    }
    this.hudParticles.setVisible(!!data.laneControl?.active);

    this.bottomText.setText(this.buildSlotText(data.itemsOwned));
    this.updateToast();
  }

  buildSlotText(itemsOwned) {
    const ownedSet = new Set(itemsOwned);
    return ITEM_DEFINITIONS.map((item) => {
      const icon = item.slotAbbrev.slice(0, 2).toUpperCase();
      return `<${icon}:${ownedSet.has(item.id) ? "ON" : "OFF"}>`;
    }).join(" ");
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
      this.progressCursor,
      this.exposureBar,
      this.breathBar,
      this.hudParticles,
    ].forEach((node) => {
      if (node && node.destroy) {
        node.destroy();
      }
    });
  }
}
