/**
 * Pre-run shop scene:
 * buy items, inspect season/risk window, and start the crossing.
 */
import { GAME_TITLE, SHOP_TITLE, UI_THEME } from "../constants.js";
import { createButton } from "../ui/common.js";
import { formatWindow } from "../utils.js";

export function createShopScene(Phaser, shared) {
  return class ShopScene extends Phaser.Scene {
    constructor() {
      super({ key: "ShopScene" });
      this.selectedIndex = 0;
      this.itemRows = [];
      this.message = "Pick an item and buy when ready.";
    }

    create() {
      // Each visit to shop starts a fresh run snapshot.
      this.state = shared.gameState;
      this.state.prepareNewRun();
      this.run = this.state.run;
      this.shopItems = this.state.getShopItems();

      this.cameras.main.setBackgroundColor("#2B1B14");
      this.add.rectangle(640, 360, 1280, 720, 0x2b1b14, 1);
      this.add.rectangle(640, 124, 1280, 238, 0x3a261c, 0.92);
      this.add.rectangle(640, 590, 1280, 262, 0x24170f, 0.94);

      this.add
        .text(640, 38, GAME_TITLE, {
          fontFamily: "'Arbutus', 'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "44px",
          color: UI_THEME.textPrimary,
        })
        .setOrigin(0.5);

      this.add
        .text(640, 84, SHOP_TITLE, {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "24px",
          color: UI_THEME.textSecondary,
        })
        .setOrigin(0.5);

      this.moneyText = this.add.text(50, 152, "", {
        fontFamily: "'Arial Black', Impact, sans-serif",
        fontStyle: "bold",
        fontSize: "24px",
        color: UI_THEME.textPrimary,
      });

      this.seasonText = this.add.text(50, 184, "", {
        fontFamily: "'Arial Black', Impact, sans-serif",
        fontStyle: "bold",
        fontSize: "22px",
        color: "#C9D69F",
      });

      this.riskText = this.add.text(50, 214, "", {
        fontFamily: "'Arial Black', Impact, sans-serif",
        fontStyle: "bold",
        fontSize: "20px",
        color: "#E0A84A",
      });
      this.bonusText = this.add.text(50, 242, "", {
        fontFamily: "'Arial Black', Impact, sans-serif",
        fontStyle: "bold",
        fontSize: "16px",
        color: UI_THEME.textSecondary,
      });

      this.add
        .text(48, 286, "Item Manifest", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "22px",
          color: UI_THEME.textPrimary,
        })
        .setOrigin(0, 0);

      this.add
        .text(318, 288, "UP / DOWN: Select   1-8: Quick select   ENTER: Buy   SPACE: Start", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "15px",
          color: UI_THEME.warn,
        })
        .setOrigin(0, 0);

      this.createMerchantFigure();

      this.shopItems.forEach((item, idx) => {
        const y = 320 + idx * 30;
        const rowBg = this.add
          .rectangle(500, y, 900, 26, 0x332117, 0.9)
          .setStrokeStyle(2, 0x6f5137, 1)
          .setInteractive({ useHandCursor: true });

        const rowText = this.add.text(56, y - 9, "", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "16px",
          color: UI_THEME.textPrimary,
        });

        rowBg.on("pointerdown", () => {
          this.selectedIndex = idx;
          this.tryPurchaseSelected();
        });

        this.itemRows.push({ rowBg, rowText, item });
      });

      this.slotsText = this.add.text(50, 610, "", {
        fontFamily: "'Arial Black', Impact, sans-serif",
        fontStyle: "bold",
        fontSize: "16px",
        color: UI_THEME.textSecondary,
      });

      this.itemHintTitle = this.add.text(50, 530, "Selected Item", {
        fontFamily: "'Arial Black', Impact, sans-serif",
        fontStyle: "bold",
        fontSize: "17px",
        color: UI_THEME.warn,
      });

      this.itemHintText = this.add.text(50, 550, "", {
        fontFamily: "'Arial Black', Impact, sans-serif",
        fontStyle: "bold",
        fontSize: "14px",
        color: UI_THEME.textPrimary,
        wordWrap: { width: 780 },
      });

      this.messageText = this.add.text(50, 662, this.message, {
        fontFamily: "'Arial Black', Impact, sans-serif",
        fontStyle: "bold",
        fontSize: "16px",
        color: UI_THEME.textPrimary,
        wordWrap: { width: 780 },
      });

      this.startButton = createButton(this, 1030, 654, 420, 64, "Start Crossing (Space)", () => {
        this.scene.start("RiverScene");
      });

      this.bindInputs(Phaser);
      this.refreshUi();
    }

    bindInputs(Phaser) {
      // Support arrows + number keys + numpad for quick item targeting.
      this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
      this.keyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
      this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

      const digitCodes = [
        "ONE",
        "TWO",
        "THREE",
        "FOUR",
        "FIVE",
        "SIX",
        "SEVEN",
        "EIGHT",
      ];
      const numpadCodes = [
        "NUMPAD_ONE",
        "NUMPAD_TWO",
        "NUMPAD_THREE",
        "NUMPAD_FOUR",
        "NUMPAD_FIVE",
        "NUMPAD_SIX",
        "NUMPAD_SEVEN",
        "NUMPAD_EIGHT",
      ];
      this.digitKeys = digitCodes.map((name) =>
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[name])
      );
      this.numpadKeys = numpadCodes.map((name) =>
        this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes[name])
      );

      this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        Phaser.Input.Keyboard.KeyCodes.SPACE,
      ]);
    }

    createMerchantFigure() {
      // In-scene pixel-primitive merchant prop for black-market tone.
      const figure = this.add.container(1080, 206);

      const shoulders = this.add.rectangle(0, 96, 220, 126, 0x4d3525, 1).setStrokeStyle(2, 0x6e4d31, 1);
      const neck = this.add.rectangle(0, 40, 26, 20, 0xc69d75, 1);
      const head = this.add.ellipse(0, 12, 112, 122, 0xd3aa80, 1).setStrokeStyle(2, 0x6e4d31, 1);
      const hatBrim = this.add.ellipse(0, -36, 176, 26, 0x1b120d, 1);
      const hatTop = this.add.rectangle(0, -68, 104, 54, 0x261b14, 1).setStrokeStyle(2, 0x3b2a20, 1);
      const mask = this.add.rectangle(0, 20, 84, 38, 0x2d2017, 1).setStrokeStyle(2, 0xf3e9d7, 1);
      const eyeL = this.add.rectangle(-18, 12, 14, 8, 0xf0dcbf, 1);
      const eyeR = this.add.rectangle(18, 12, 14, 8, 0xf0dcbf, 1);
      const mouthCover = this.add.rectangle(0, 34, 70, 12, 0x553b29, 1);
      const sign = this.add.rectangle(0, 166, 206, 26, 0x2a1d14, 0.95).setStrokeStyle(2, 0x7c5a3d, 1);
      const signText = this.add
        .text(0, 166, "Unofficial Counter", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "15px",
          color: UI_THEME.textPrimary,
        })
        .setOrigin(0.5);

      figure.add([shoulders, neck, head, hatBrim, hatTop, mask, eyeL, eyeR, mouthCover, sign, signText]);
    }

    update() {
      // Shop navigation and purchase handling are fully keyboard-driven.
      const prev =
        Phaser.Input.Keyboard.JustDown(this.keyUp) || Phaser.Input.Keyboard.JustDown(this.keyLeft);
      const next =
        Phaser.Input.Keyboard.JustDown(this.keyDown) || Phaser.Input.Keyboard.JustDown(this.keyRight);

      if (prev) {
        this.selectedIndex = (this.selectedIndex - 1 + this.shopItems.length) % this.shopItems.length;
        this.refreshUi();
      }

      if (next) {
        this.selectedIndex = (this.selectedIndex + 1) % this.shopItems.length;
        this.refreshUi();
      }

      for (let i = 0; i < this.digitKeys.length; i += 1) {
        const direct = Phaser.Input.Keyboard.JustDown(this.digitKeys[i]);
        const pad = Phaser.Input.Keyboard.JustDown(this.numpadKeys[i]);
        if ((direct || pad) && i < this.shopItems.length) {
          this.selectedIndex = i;
          this.refreshUi();
        }
      }

      if (Phaser.Input.Keyboard.JustDown(this.keyEnter)) {
        this.tryPurchaseSelected();
      }

      if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
        this.scene.start("RiverScene");
      }
    }

    tryPurchaseSelected() {
      const item = this.shopItems[this.selectedIndex];
      const result = this.state.buyItem(item.id);
      this.message = result.message;
      this.refreshUi();
    }

    refreshUi() {
      // Re-render the shop list and selected item details from current run state.
      const risk = this.state.getRiskWindow();
      this.moneyText.setText(`MONEY: $${this.state.getMoney()}`);
      this.seasonText.setText(`SEASON: ${this.state.getSeason()}`);
      this.riskText.setText(`Risk Window: ${formatWindow(risk)}`);
      const startBonus = this.run.appliedStartBonus || {};
      this.bonusText.setText(
        `Start Bonus: money +${startBonus.money || 0}, papers +${startBonus.fakePapers || 0}, risk-short ${startBonus.riskShortenSeconds || 0}s`
      );

      this.itemRows.forEach((row, idx) => {
        const selected = idx === this.selectedIndex;
        const owned = this.state.hasRealInventoryItem(row.item.id);

        row.rowBg.setStrokeStyle(2, selected ? 0xb08d57 : 0x6f5137, 1);
        row.rowBg.setFillStyle(selected ? 0x4a3322 : 0x332117, 0.92);

        row.rowText.setText(
          `${row.item.key}. ${row.item.name}  $${row.item.cost}  - ${row.item.description}${owned ? "  [OWNED]" : ""}`
        );
      });

      const slotText = this.shopItems.map((item) => {
        return `${item.slotAbbrev}[${this.state.hasRealInventoryItem(item.id) ? "X" : "-"}]`;
      }).join("  ");

      const selectedItem = this.shopItems[this.selectedIndex];
      const compare = this.buildItemComparison(selectedItem.id);
      this.itemHintText.setText(
        `Effect: ${selectedItem.description}\n${compare}\nWhy: ${selectedItem.why || "Operational advantage"}\nBest for: ${selectedItem.bestFor || "General use"}`
      );
      this.slotsText.setText(`SLOTS: ${slotText}`);
      this.messageText.setText(this.message);
    }

    buildItemComparison(itemId) {
      const table = {
        boostWhisperModule: "Noise boost: +38% -> +24%",
        powerCapacitorCoil: "Boost drain/recover: -12% / +12%",
        rewardLineScope: "Reward line tolerance: 8 -> 16 px",
        rewardRelayDrone: "Reward duration/cooldown: +0.9s / -12%",
        laneControlStabilizer: "Lane tax/speed penalty: -$1 tick / -8% slowdown",
        inspectionInsuranceLedger: "Inspection waives: 0 -> 1 run",
        exposureDampeningCoat: "Detection gain: 100% -> 72%",
        riskWindowTracker: "Early warning lead: 3s -> 5s",
      };
      return `Stats: ${table[itemId] || "No stat preview"}`;
    }
  };
}
