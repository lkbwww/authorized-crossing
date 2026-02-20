/**
 * End-of-run result scene.
 * Handles summary, retry flow, fake interstitial/rewarded ads, and rewards.
 */
import { REWARD_CHOICES } from "../constants.js";
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
          fontSize: "20px",
          color: "#e1cfb8",
          align: "center",
          wordWrap: { width: 1100 },
        })
        .setOrigin(0.5, 0);

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

      const ownedItems = summary.itemsOwned.length > 0 ? summary.itemsOwned.join(", ") : "none";
      const confiscated = summary.confiscatedItems.length > 0 ? summary.confiscatedItems.join(", ") : "none";

      this.statusText.setText(
        [
          `SEASON: ${summary.season}   TEMPLATE: ${summary.template}   MONEY: $${summary.money}   INJURED: ${summary.injured ? "YES" : "NO"}`,
          `INSPECTIONS: ${summary.inspectionCount}   PEAK EXPOSURE: ${summary.exposurePeak}   RIVER: ${summary.riverTimeSpent.toFixed(1)}s   ESCAPE: ${summary.escapeTimeSpent.toFixed(1)}s`,
          `BOOST USED: ${summary.boostUseTime.toFixed(1)}s (${summary.boostUseCount} activations)`,
          `ITEMS OWNED: ${ownedItems}`,
          `CONFISCATED: ${confiscated}`,
        ].join("\n")
      );

      this.rewardButton.container.setVisible(isFailure && !this.rewardClaimed);

      if (isFailure && !this.rewardClaimed) {
        this.feedbackText.setText("Failure run: optional rewarded training is available.");
      } else {
        this.feedbackText.setText("");
      }
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
          this.rewardButton.container.setVisible(false);
          this.rewardChoiceButtons.forEach((entry) => entry.setEnabled(false));
        });

        this.rewardChoiceButtons.push(button);
      });
    }
  };
}
