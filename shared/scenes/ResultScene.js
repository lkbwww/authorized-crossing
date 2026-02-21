/**
 * End-of-run result scene.
 * Handles summary, retry flow, fake interstitial/rewarded ads, and rewards.
 */
import { REWARD_CHOICES } from "../constants.js";
import { buildFailureLearning } from "../failureLearning.js";
import { isFailureEnding } from "../utils.js";
import { createButton } from "../ui/common.js";

export function createResultScene(Phaser, shared) {
  return class ResultScene extends Phaser.Scene {
    constructor() {
      super({ key: "ResultScene" });
      this.rewardClaimed = false;
      this.resultData = null;
    }

    init(data) {
      this.resultData = data?.result || null;
    }

    create() {
      // Fallback protects against direct scene jumps without payload.
      this.state = shared.gameState;
      this.adManager = shared.adManager;
      this.resultData = this.resultData || this.state.getResult() || {
        endingId: "ARREST",
        endingTitle: "You are arrested.",
        success: false,
        subtitle: "No payload",
      };

      this.cameras.main.setBackgroundColor("#1f150f");
      this.add.rectangle(640, 360, 1280, 720, 0x281b13, 1);
      this.add.rectangle(640, 150, 1280, 260, 0x3a281b, 0.9);

      this.titleText = this.add
        .text(640, 94, "Result", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "48px",
          color: "#f8ecdc",
          align: "center",
        })
        .setOrigin(0.5);
      this.emblemRing = this.add.circle(150, 128, 44, 0x000000, 0).setStrokeStyle(5, 0xc89652, 0.8);
      this.emblemCore = this.add.circle(150, 128, 24, 0xc89652, 0.32);
      this.emblemMark = this.add.text(150, 128, "AC", {
        fontFamily: "'Arial Black', Impact, sans-serif",
        fontSize: "20px",
        color: "#f8ecdc",
      }).setOrigin(0.5);

      this.subtitleText = this.add
        .text(640, 148, "", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "28px",
          color: "#eabf95",
          align: "center",
          wordWrap: { width: 1160 },
        })
        .setOrigin(0.5);

      this.statusText = this.add
        .text(640, 242, "Loading result...", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "18px",
          color: "#e1cfb8",
          align: "center",
          wordWrap: { width: 1100 },
        })
        .setOrigin(0.5, 0);
      this.metricRows = this.createMetricRows();

      this.feedbackText = this.add
        .text(640, 514, "", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "20px",
          color: "#d9b996",
          align: "center",
          wordWrap: { width: 1080 },
        })
        .setOrigin(0.5);
      this.nextBonusText = this.add
        .text(640, 560, "", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontSize: "16px",
          color: "#d8c7ab",
          align: "center",
        })
        .setOrigin(0.5);

      this.learningText = this.add
        .text(640, 430, "", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "18px",
          color: "#edd3b5",
          align: "center",
          wordWrap: { width: 1080 },
        })
        .setOrigin(0.5)
        .setVisible(false);

      this.retryButton = createButton(this, 640, 620, 320, 66, "Retry (R)", () => {
        this.retryToShop();
      });

      this.rewardButton = createButton(
        this,
        640,
        540,
        480,
        62,
        "Watch Cooperation Video (Reward)",
        () => this.handleRewardedAd()
      );
      this.rewardButton.container.setVisible(false);

      this.rewardChoiceButtons = [];

      this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.R,
        Phaser.Input.Keyboard.KeyCodes.ENTER,
        Phaser.Input.Keyboard.KeyCodes.SPACE,
      ]);

      this.onKeyRetry = () => this.retryToShop();
      this.input.keyboard.on("keydown-R", this.onKeyRetry);
      this.input.keyboard.on("keydown-ENTER", this.onKeyRetry);
      this.input.keyboard.on("keydown-SPACE", this.onKeyRetry);

      this.events.once("shutdown", () => {
        if (this.input?.keyboard && this.onKeyRetry) {
          this.input.keyboard.off("keydown-R", this.onKeyRetry);
          this.input.keyboard.off("keydown-ENTER", this.onKeyRetry);
          this.input.keyboard.off("keydown-SPACE", this.onKeyRetry);
        }
      });

      this.startResultSequence();
    }

    createMetricRows() {
      const rows = [];
      const labels = ["RIVER", "ESCAPE", "BOOST", "RISK"];
      for (let i = 0; i < labels.length; i += 1) {
        const y = 330 + i * 28;
        const label = this.add.text(290, y, labels[i], {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontSize: "14px",
          color: "#e1cfb8",
        });
        const bg = this.add.rectangle(500, y + 10, 420, 12, 0x1f150f, 0.9).setOrigin(0, 0.5);
        const fg = this.add.rectangle(500, y + 10, 0, 12, 0xc89652, 0.9).setOrigin(0, 0.5);
        const value = this.add.text(936, y, "-", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontSize: "14px",
          color: "#edd3b5",
          align: "right",
        }).setOrigin(1, 0);
        rows.push({ label, bg, fg, value });
      }
      return rows;
    }

    update() {
      if (
        Phaser.Input.Keyboard.JustDown(this.keyR) ||
        Phaser.Input.Keyboard.JustDown(this.keyEnter) ||
        Phaser.Input.Keyboard.JustDown(this.keySpace)
      ) {
        this.retryToShop();
      }
    }

    retryToShop() {
      this.scene.start("ShopScene");
    }

    async startResultSequence() {
      const round = this.state.incrementRoundCount();

      // Show fake interstitial every second completed round.
      if (round % 2 === 0) {
        await this.adManager.showInterstitial(this);
      }

      this.renderResult();
    }

    renderResult() {
      // Render immutable run summary snapshot for post-run review.
      const summary = this.state.getRunSummary();
      const isFailure = isFailureEnding(this.resultData.endingId);

      this.titleText.setText(this.resultData.endingTitle);
      this.subtitleText.setText(this.resultData.subtitle || "");
      this.emblemCore.setScale(0.7).setAlpha(0.15);
      this.emblemRing.setScale(0.7).setAlpha(0.2);
      this.tweens.add({
        targets: [this.emblemCore, this.emblemRing],
        scaleX: 1,
        scaleY: 1,
        alpha: { from: 0.15, to: 0.85 },
        duration: 340,
        ease: "Sine.Out",
      });

      const ownedItems = summary.itemsOwned.length > 0 ? summary.itemsOwned.join(", ") : "none";
      const confiscated = summary.confiscatedItems.length > 0 ? summary.confiscatedItems.join(", ") : "none";

      this.statusText.setText(
        [
          `SEASON ${summary.season} | TEMPLATE ${summary.template} | MONEY $${summary.money} | INJURED ${summary.injured ? "YES" : "NO"}`,
          `INSPECTIONS ${summary.inspectionCount} (waived ${summary.inspectionWaivedCount || 0}) | EVENTS near-miss ${summary.nearMissCount}, bonus-lines ${summary.rewardLineClaims}, control-tax $${summary.laneControlPenaltyPaid}`,
          `ITEMS ${ownedItems} | CONFISCATED ${confiscated}`,
        ].join("\n")
      );
      this.renderMetricRows(summary);

      this.rewardButton.container.setVisible(isFailure && !this.rewardClaimed);
      this.updateNextBonusSummary();

      if (isFailure && !this.rewardClaimed) {
        const learning = buildFailureLearning(this.resultData, summary);
        this.learningText.setText([learning.reason, learning.action, learning.item].join("\n")).setVisible(true);
        this.feedbackText.setText("Failure run: optional rewarded training is available.");
      } else {
        this.learningText.setVisible(false);
        if (summary.rewardLineClaims >= 2 && summary.laneControlPenaltyPaid <= 4) {
          this.feedbackText.setText("Clean tactical run: keep chaining bonus lines while avoiding lane-control tax.");
        } else if (summary.laneControlPenaltyPaid >= 8) {
          this.feedbackText.setText("Success with heavy control tax: safer lane exits can stabilize your next run.");
        } else {
          this.feedbackText.setText("");
        }
      }
    }

    renderMetricRows(summary) {
      const maxRiver = 75;
      const maxEscape = 45;
      const maxBoost = 30;
      const maxRisk = 100;
      const rows = [
        { ratio: Math.min(1, summary.riverTimeSpent / maxRiver), value: `${summary.riverTimeSpent.toFixed(1)}s` },
        { ratio: Math.min(1, summary.escapeTimeSpent / maxEscape), value: `${summary.escapeTimeSpent.toFixed(1)}s` },
        { ratio: Math.min(1, summary.boostUseTime / maxBoost), value: `${summary.boostUseTime.toFixed(1)}s x${summary.boostUseCount}` },
        { ratio: Math.min(1, summary.exposurePeak / maxRisk), value: `${summary.exposurePeak}%` },
      ];
      rows.forEach((entry, idx) => {
        const row = this.metricRows[idx];
        row.fg.width = Math.max(2, Math.floor(420 * entry.ratio));
        row.value.setText(entry.value);
      });
    }

    async handleRewardedAd() {
      if (this.rewardClaimed) {
        return;
      }

      this.rewardButton.setEnabled(false);
      const completed = await this.adManager.showRewarded(this);
      if (!completed) {
        this.rewardButton.setEnabled(true);
        return;
      }

      // Reward selection is only shown after ad completion.
      this.feedbackText.setText("Reward earned. Select one bonus for the next run.");
      this.showRewardChoices();
    }

    showRewardChoices() {
      if (this.rewardChoiceButtons.length > 0) {
        return;
      }

      REWARD_CHOICES.forEach((choice, idx) => {
        const button = createButton(this, 640, 420 + idx * 66, 520, 56, choice.label, () => {
          if (this.rewardClaimed) {
            return;
          }
          this.rewardClaimed = true;
          const message = this.state.applyRewardChoice(choice.id);
          this.feedbackText.setText(`${message}\n${choice.description}`);
          this.updateNextBonusSummary();
          this.rewardButton.container.setVisible(false);
          this.rewardChoiceButtons.forEach((entry) => entry.setEnabled(false));
        });

        this.rewardChoiceButtons.push(button);
      });
    }

    updateNextBonusSummary() {
      const bonus = this.state.getNextRunBonus();
      this.nextBonusText.setText(
        `Next Run Bonus: money +${bonus.money || 0}, fake-papers +${bonus.fakePapers || 0}, risk-short ${bonus.riskShortenSeconds || 0}s`
      );
    }
  };
}
