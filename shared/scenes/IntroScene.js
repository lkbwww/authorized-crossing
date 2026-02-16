import { GAME_TITLE, UI_THEME } from "../constants.js";

export function createIntroScene(Phaser) {
  return class IntroScene extends Phaser.Scene {
    constructor() {
      super({ key: "IntroScene" });
      this.stars = [];
      this.lines = [];
      this.transitioning = false;
      this.phase = "title";
      this.storyTyping = false;
      this.storyTimer = null;
      this.merchantSignRevealTimer = null;
      this.storyTextFull = [
        "Year 2026. The border has been closed for 10 years.",
        "To keep my family from starving, I cross the river.",
        "But to do that, I may have to buy supplies in the black market.",
        "Everything is processed under the name of 'cooperation'.",
      ].join(" ");
    }

    create() {
      this.cameras.main.setBackgroundColor("#2B1B14");

      this.add.rectangle(640, 360, 1280, 720, 0x2b1b14, 1);
      this.add.rectangle(640, 560, 1280, 320, 0x24170f, 0.9);
      this.add.ellipse(640, 500, 760, 220, 0x4a3225, 0.34);
      this.add.ellipse(640, 488, 540, 150, 0xb08d57, 0.14);

      this.createMovingBackdrop();
      this.createTexts();
      this.createStoryLayer();
      this.bindInput(Phaser);

      this.events.once("shutdown", () => {
        if (this.storyTimer) {
          this.storyTimer.remove(false);
          this.storyTimer = null;
        }
        if (this.merchantSignRevealTimer) {
          this.merchantSignRevealTimer.remove(false);
          this.merchantSignRevealTimer = null;
        }
      });

      this.time.addEvent({
        delay: 430,
        loop: true,
        callback: () => {
          if (this.transitioning) {
            this.pressText.setVisible(false);
            return;
          }
          if (this.phase === "title" || this.phase === "storyReady") {
            this.pressText.setVisible(!this.pressText.visible);
          } else if (this.phase === "storyTyping") {
            this.pressText.setVisible(false);
          }
        },
      });
    }

    createMovingBackdrop() {
      for (let i = 0; i < 110; i += 1) {
        const size = Math.random() < 0.82 ? 2 : 3;
        const tint = Phaser.Utils.Array.GetRandom([0xb08d57, 0xd4c3a3, 0x7a7b4f]);
        const star = this.add.rectangle(
          Phaser.Math.Between(0, 1280),
          Phaser.Math.Between(0, 720),
          size,
          size,
          tint,
          Phaser.Math.FloatBetween(0.3, 0.95)
        );
        star.speed = Phaser.Math.FloatBetween(20, 140);
        this.stars.push(star);
      }

      for (let i = 0; i < 16; i += 1) {
        const y = 260 + i * 36;
        const line = this.add.rectangle(640, y, 1240, 2, 0x6e4d31, 0.22 + i * 0.014);
        line.speed = 18 + i * 2.5;
        this.lines.push(line);
      }

      this.scanLine = this.add.rectangle(640, 0, 1280, 4, 0xf3e9d7, 0.06);
      this.scanLine.speed = 210;
    }

    createTexts() {
      this.title = this.add
        .text(640, 214, GAME_TITLE, {
          fontFamily: "'Arbutus', 'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "72px",
          color: UI_THEME.textPrimary,
          stroke: "#6e4d31",
          strokeThickness: 6,
          align: "center",
        })
        .setOrigin(0.5);

      this.subtitle = this.add
        .text(640, 288, "RETRO BORDER RUNNER", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "24px",
          color: UI_THEME.textSecondary,
          stroke: "#2b1b14",
          strokeThickness: 4,
          align: "center",
        })
        .setOrigin(0.5);

      this.pressText = this.add
        .text(640, 610, "PRESS SPACE BAR TO CONTINUE", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "28px",
          color: UI_THEME.warn,
          stroke: "#2b1b14",
          strokeThickness: 5,
          align: "center",
        })
        .setOrigin(0.5);

      this.loadingText = this.add
        .text(640, 662, "LOADING BORDER TERMINAL...", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "16px",
          color: UI_THEME.textSecondary,
          align: "center",
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: this.title,
        scaleX: 1.04,
        scaleY: 1.04,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });

      this.tweens.add({
        targets: this.subtitle,
        alpha: 0.5,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }

    createStoryLayer() {
      this.storyPanel = this.add
        .rectangle(640, 430, 980, 330, 0x2b1b14, 0.92)
        .setStrokeStyle(3, 0xb08d57, 0.55)
        .setVisible(false)
        .setAlpha(0);

      this.storyText = this.add
        .text(196, 308, "", {
          fontFamily: "'Arial Black', Impact, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif",
          fontStyle: "bold",
          fontSize: "22px",
          color: UI_THEME.textPrimary,
          wordWrap: { width: 620 },
          lineSpacing: 12,
        })
        .setVisible(false)
        .setAlpha(0);

      this.merchantContainer = this.createMerchantFigure(930, 470);
      this.merchantContainer.setVisible(false).setAlpha(0);
    }

    createMerchantFigure(x, y) {
      const figure = this.add.container(x, y);

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
          color: "#F3E9D7",
        })
        .setOrigin(0.5);

      sign.setAlpha(0);
      signText.setAlpha(0);

      figure.add([shoulders, neck, head, hatBrim, hatTop, mask, eyeL, eyeR, mouthCover, sign, signText]);
      figure.setScale(0.86);
      figure.signPlate = sign;
      figure.signText = signText;
      return figure;
    }

    bindInput(Phaser) {
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.SPACE,
        Phaser.Input.Keyboard.KeyCodes.ENTER,
      ]);
      this.input.on("pointerdown", () => this.advancePhase());
    }

    update(_time, deltaMs) {
      if (this.transitioning) {
        return;
      }

      const dt = deltaMs / 1000;
      if (Phaser.Input.Keyboard.JustDown(this.keySpace) || Phaser.Input.Keyboard.JustDown(this.keyEnter)) {
        this.advancePhase();
        return;
      }

      for (const star of this.stars) {
        star.y += star.speed * dt;
        if (star.y > 730) {
          star.y = -8;
          star.x = Phaser.Math.Between(0, 1280);
        }
      }

      for (const line of this.lines) {
        line.y += line.speed * dt;
        if (line.y > 720) {
          line.y = 250;
        }
      }

      this.scanLine.y += this.scanLine.speed * dt;
      if (this.scanLine.y > 740) {
        this.scanLine.y = -20;
      }
    }

    advancePhase() {
      if (this.transitioning) {
        return;
      }
      if (this.phase === "title") {
        this.startBriefingPhase();
        return;
      }
      if (this.phase === "storyTyping") {
        this.finishStoryTyping();
        this.revealMerchant();
        return;
      }
      if (this.phase === "storyReady") {
        this.continueToShop();
      }
    }

    startBriefingPhase() {
      this.phase = "storyTyping";
      this.pressText.setVisible(false);
      this.loadingText.setText("OPENING DOSSIER...");

      this.tweens.add({
        targets: [this.title, this.subtitle],
        alpha: 0.2,
        duration: 260,
        ease: "Sine.InOut",
      });

      [this.storyPanel, this.storyText].forEach((node) => {
        node.setVisible(true);
      });

      this.tweens.add({
        targets: [this.storyPanel, this.storyText],
        alpha: 1,
        duration: 280,
        ease: "Sine.Out",
      });

      this.storyText.setText("");
      let idx = 0;
      this.storyTyping = true;
      this.storyTimer = this.time.addEvent({
        delay: 24,
        loop: true,
        callback: () => {
          idx += 1;
          this.storyText.setText(this.storyTextFull.slice(0, idx));
          if (idx >= this.storyTextFull.length) {
            this.finishStoryTyping();
            this.time.delayedCall(320, () => this.revealMerchant());
          }
        },
      });
    }

    finishStoryTyping() {
      if (this.storyTimer) {
        this.storyTimer.remove(false);
        this.storyTimer = null;
      }
      this.storyTyping = false;
      this.storyText.setText(this.storyTextFull);
    }

    revealMerchant() {
      if (this.phase === "storyReady") {
        return;
      }

      this.phase = "storyReady";
      this.merchantContainer.setVisible(true);
      this.merchantContainer.y += 26;

      this.tweens.add({
        targets: this.merchantContainer,
        alpha: 1,
        y: this.merchantContainer.y - 26,
        duration: 300,
        ease: "Back.Out",
      });

      this.loadingText.setText("MERCHANT LOCATED");
      this.pressText.setText("PRESS SPACE BAR TO CONTINUE");
      this.pressText.setVisible(true);

      if (this.merchantSignRevealTimer) {
        this.merchantSignRevealTimer.remove(false);
      }
      this.merchantSignRevealTimer = this.time.delayedCall(3000, () => {
        if (!this.merchantContainer || !this.merchantContainer.active) {
          return;
        }
        this.tweens.add({
          targets: [this.merchantContainer.signPlate, this.merchantContainer.signText],
          alpha: 1,
          duration: 500,
          ease: "Sine.Out",
        });
      });
    }

    continueToShop() {
      if (this.transitioning) {
        return;
      }

      if (this.merchantSignRevealTimer) {
        this.merchantSignRevealTimer.remove(false);
        this.merchantSignRevealTimer = null;
      }

      this.transitioning = true;
      this.pressText.setVisible(false);
      this.loadingText.setText("ACCESS GRANTED");

      this.tweens.add({
        targets: [this.title, this.subtitle, this.loadingText],
        alpha: 0,
        duration: 260,
        ease: "Sine.InOut",
      });

      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start("ShopScene");
      });
    }
  };
}
