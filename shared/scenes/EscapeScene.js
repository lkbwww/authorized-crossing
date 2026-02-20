/**
 * Post-river escape gameplay scene.
 * Player avoids traffic lanes and must reach town before timeout.
 */
import {
  BASE_FORWARD_SPEED,
  ENDINGS,
  ESCAPE_STEALTH_DURATION,
  INJURY_MULT,
  INTERNAL_HEIGHT,
  INTERNAL_WIDTH,
  LATERAL_SPEED,
  SEASON_DEFINITIONS,
  SPAWN_AHEAD_MAX,
  SPAWN_AHEAD_MIN,
  UI_THEME,
  WORLD_HEIGHT,
} from "../constants.js";
import { MotionAudioController } from "../audio/motionAudio.js";
import { TrafficAudioController } from "../audio/trafficAudio.js";
import { ensurePixelTextures } from "../assets/pixelTextures.js";
import { REWARD_LINE_BONUS, shouldClaimRewardLine } from "../escapeEvents.js";
import { HUD } from "../ui/HUD.js";
import { clamp, randomInt } from "../utils.js";

const WORLD_TOP = -WORLD_HEIGHT;
const WORLD_TOTAL_HEIGHT = WORLD_HEIGHT + INTERNAL_HEIGHT;
const WORLD_MID_Y = WORLD_TOP + WORLD_TOTAL_HEIGHT / 2;

const ROAD_LEFT = 188;
const ROAD_RIGHT = INTERNAL_WIDTH - 188;
const ROAD_CENTER = (ROAD_LEFT + ROAD_RIGHT) / 2;
const LEFT_LANE_CENTER = ROAD_CENTER - 172;
const RIGHT_LANE_CENTER = ROAD_CENTER + 172;
const LANE_HALF_WIDTH = 118;

const MAX_CARS = 20;
const TOWN_GOAL_Y = -4300;

export function createEscapeScene(Phaser, shared) {
  return class EscapeScene extends Phaser.Scene {
    constructor() {
      super({ key: "EscapeScene" });
      this.elapsed = 0;
      this.forwardSpeed = BASE_FORWARD_SPEED;
      this.isPaused = false;
      this.isEnding = false;
      this.resultCommitted = false;
      this.debugScrollOn = false;
      this.debugGameOn = false;
      this.cars = [];
      this.carSpawnAccumulator = 0;
      this.carSpawnInterval = 1.35;
      this.playerAnchorY = 560;
      this.winterMomentumX = 0;
      this.winterMomentumY = 0;
      this.footprints = [];
      this.footprintCooldown = 0;
      this.footstepSide = 1;
      this.motionFrameClock = 0;
      this.motionAudio = null;
      this.trafficAudio = null;
      this.townY = TOWN_GOAL_Y;
      this.townReached = false;
      this.escapeStartY = 560;
      this.rewardLineEvent = null;
      this.rewardLineCooldown = 0;
    }

    init() {
      this.elapsed = 0;
      this.isPaused = false;
      this.isEnding = false;
      this.resultCommitted = false;
      this.carSpawnAccumulator = 0;
      this.carSpawnInterval = 1.35;
      this.winterMomentumX = 0;
      this.winterMomentumY = 0;
      this.footprints = [];
      this.footprintCooldown = 0;
      this.footstepSide = 1;
      this.motionFrameClock = 0;
      this.townReached = false;
      this.townY = TOWN_GOAL_Y;
      this.escapeStartY = 560;
      this.rewardLineEvent = null;
      this.rewardLineCooldown = randomInt(4, 7);
    }

    create() {
      // Capture run snapshot and initialize scene-local runtime systems.
      this.state = shared.gameState;
      this.run = this.state.run;
      this.seasonKey = this.state.getSeason();
      this.template = this.state.getTemplate();
      this.season = SEASON_DEFINITIONS[this.seasonKey];
      this.hasBoat = this.state.hasRealInventoryItem("boat");

      ensurePixelTextures(this);
      this.motionAudio = new MotionAudioController(this);
      this.trafficAudio = new TrafficAudioController(this);

      this.createWorld();
      this.createPlayer();
      this.createHud();
      this.setupInput(Phaser);
      this.createDebugOverlay();

      this.escapeStartY = this.player.y;

      this.spawnCar(true);
      this.spawnCar(true);
      this.spawnCar(true);
      this.spawnCar(true);

      this.events.once("shutdown", () => {
        if (this.hud) {
          this.hud.destroy();
        }
        this.cars.forEach((car) => this.destroyCar(car));
        this.cars = [];
        this.destroyRewardLineEvent();
        this.destroyFootprints();
        if (this.motionAudio) {
          this.motionAudio.destroy();
          this.motionAudio = null;
        }
        if (this.trafficAudio) {
          this.trafficAudio.destroy();
          this.trafficAudio = null;
        }
      });
    }

    createWorld() {
      this.physics.world.setBounds(0, WORLD_TOP, INTERNAL_WIDTH, WORLD_TOTAL_HEIGHT);
      this.cameras.main.setBounds(0, WORLD_TOP, INTERNAL_WIDTH, WORLD_TOTAL_HEIGHT);
      this.cameras.main.setBackgroundColor("#2B1B14");

      this.groundBg = this.add.tileSprite(640, WORLD_MID_Y, INTERNAL_WIDTH, WORLD_TOTAL_HEIGHT, "tile-bank").setDepth(-80);
      this.road = this.add.rectangle(640, WORLD_MID_Y, ROAD_RIGHT - ROAD_LEFT, WORLD_TOTAL_HEIGHT, 0x383838, 1).setDepth(-79);
      this.roadEdgeLeft = this.add.rectangle(ROAD_LEFT, WORLD_MID_Y, 6, WORLD_TOTAL_HEIGHT, 0xb08d57, 0.95).setDepth(-78);
      this.roadEdgeRight = this.add.rectangle(ROAD_RIGHT, WORLD_MID_Y, 6, WORLD_TOTAL_HEIGHT, 0xb08d57, 0.95).setDepth(-78);
      this.centerDivider = this.add.rectangle(ROAD_CENTER, WORLD_MID_Y, 6, WORLD_TOTAL_HEIGHT, 0xd0af5f, 0.84).setDepth(-78);

      for (let y = WORLD_TOP + 120; y <= INTERNAL_HEIGHT + 120; y += 180) {
        this.add.rectangle(ROAD_CENTER, y, 12, 74, 0xf3e9d7, 0.8).setDepth(-77);
      }

      this.createTownGoal();
    }

    createTownGoal() {
      // Visual destination gate; reaching this Y ends run with success.
      this.townBannerBase = this.add.rectangle(640, this.townY, 980, 120, 0x2c2117, 0.95).setDepth(-76).setStrokeStyle(4, 0xb08d57, 1);
      this.townRoadGate = this.add.rectangle(640, this.townY + 50, 420, 44, 0x503826, 1).setDepth(-75).setStrokeStyle(2, 0xd6b57d, 1);
      this.townBuildingL = this.add.rectangle(270, this.townY - 20, 210, 164, 0x4c3323, 1).setDepth(-75).setStrokeStyle(2, 0x7a563c, 1);
      this.townBuildingR = this.add.rectangle(1010, this.townY - 20, 210, 164, 0x4c3323, 1).setDepth(-75).setStrokeStyle(2, 0x7a563c, 1);
      this.townLabel = this.add
        .text(640, this.townY - 8, "TOWN", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "44px",
          color: "#F3E9D7",
          stroke: "#1A120D",
          strokeThickness: 6,
        })
        .setOrigin(0.5)
        .setDepth(-74);
      this.townSubLabel = this.add
        .text(640, this.townY + 45, "REACH THE CHECKPOINT", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "16px",
          color: "#D4C3A3",
        })
        .setOrigin(0.5)
        .setDepth(-74);
    }

    createPlayer() {
      this.player = this.physics.add
        .image(640, 600, "px-player")
        .setDepth(2100)
        .setCollideWorldBounds(true)
        .setScale(2.15);
      this.player.body.setAllowGravity(false);
      this.player.body.setSize(12, 18);
      this.player.body.setOffset(6, 4);

      this.cameras.main.stopFollow();
      this.cameras.main.scrollY = clamp(this.player.y - this.playerAnchorY, WORLD_TOP, 0);
      this.player.y = this.cameras.main.scrollY + this.playerAnchorY;
    }

    createHud() {
      this.hud = new HUD(this, "escape");

      this.eventText = this.add
        .text(INTERNAL_WIDTH / 2, INTERNAL_HEIGHT / 2, "", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "56px",
          color: UI_THEME.textPrimary,
          stroke: "#000000",
          strokeThickness: 6,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(7000)
        .setVisible(false);

      this.pauseText = this.add
        .text(INTERNAL_WIDTH / 2, INTERNAL_HEIGHT / 2, "PAUSED", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "52px",
          color: UI_THEME.textPrimary,
          backgroundColor: "#000000",
          padding: { x: 18, y: 12 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(7000)
        .setVisible(false);
    }

    createDebugOverlay() {
      this.f1Text = this.add
        .text(14, 560, "", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "14px",
          color: "#9ce3ff",
          backgroundColor: "#000000",
          padding: { x: 8, y: 4 },
        })
        .setScrollFactor(0)
        .setDepth(7100)
        .setVisible(false);

      this.f2Text = this.add
        .text(14, 612, "", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "14px",
          color: "#ffcf96",
          backgroundColor: "#000000",
          padding: { x: 8, y: 4 },
        })
        .setScrollFactor(0)
        .setDepth(7100)
        .setVisible(false);
    }

    setupInput(Phaser) {
      this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
      this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
      this.keyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
      this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
      this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      this.keyF1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
      this.keyF2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F2);

      this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.SPACE,
      ]);
    }

    pickLane(forcedDirection = null) {
      if (forcedDirection === 1) {
        return "left";
      }
      if (forcedDirection === -1) {
        return "right";
      }
      return Math.random() < 0.5 ? "left" : "right";
    }

    spawnCar(initial = false, forcedDirection = null) {
      if (this.cars.length >= MAX_CARS) {
        return;
      }

      const lane = this.pickLane(forcedDirection);
      // Lane direction rule:
      // left lane flows downward (+Y), right lane flows upward (-Y).
      const laneDirection = lane === "left" ? 1 : -1;
      const laneCenter = lane === "left" ? LEFT_LANE_CENTER : RIGHT_LANE_CENTER;
      const laneMinX = laneCenter - LANE_HALF_WIDTH;
      const laneMaxX = laneCenter + LANE_HALF_WIDTH;
      const x = clamp(laneCenter + randomInt(-76, 76), laneMinX, laneMaxX);

      let y;
      if (laneDirection > 0) {
        y = initial
          ? this.player.y - randomInt(260, 1200)
          : this.cameras.main.scrollY - randomInt(140, 520);
      } else {
        y = initial
          ? this.player.y + randomInt(260, 1200)
          : this.cameras.main.scrollY + INTERNAL_HEIGHT + randomInt(140, 520);
      }

      const baseSpeed = this.template === "A" ? randomInt(164, 238) : randomInt(132, 208);
      const vy = laneDirection * baseSpeed;
      const vx = randomInt(-34, 34);

      const car = {
        shadow: this.add.ellipse(x, y + 18, 84, 22, 0x000000, 0.26).setDepth(1590),
        sprite: this.add.image(x, y, "px-car").setDepth(1600).setScale(2.45),
        label: this.add
          .text(x, y - 38, "TRAFFIC", {
            fontFamily: "'Arial Black', Impact, sans-serif",
            fontStyle: "bold",
            fontSize: "14px",
            color: "#F3E9D7",
            backgroundColor: "#1A120D",
            padding: { x: 4, y: 1 },
          })
          .setOrigin(0.5)
          .setDepth(1601),
        laneDirection,
        laneMinX,
        laneMaxX,
        vx,
        vy,
        hitW: 52,
        hitH: 98,
      };

      car.sprite.setAngle(laneDirection > 0 ? 90 : -90);
      this.cars.push(car);
    }

    update(_time, deltaMs) {
      if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
        this.scene.start("ShopScene");
        return;
      }

      if (Phaser.Input.Keyboard.JustDown(this.keyP)) {
        this.isPaused = !this.isPaused;
        this.pauseText.setVisible(this.isPaused);
      }

      if (Phaser.Input.Keyboard.JustDown(this.keyF1)) {
        this.debugScrollOn = !this.debugScrollOn;
      }

      if (Phaser.Input.Keyboard.JustDown(this.keyF2)) {
        this.debugGameOn = !this.debugGameOn;
      }

      this.f1Text.setVisible(this.debugScrollOn);
      this.f2Text.setVisible(this.debugGameOn);

      if (this.isPaused || this.isEnding) {
        this.updateDebug();
        return;
      }

      const dt = deltaMs / 1000;
      // Main frame loop for escape phase.
      this.elapsed += dt;
      this.run.escapeTimeSpent = this.elapsed;

      this.forwardSpeed = this.computeForwardSpeed();
      const prevPlayerY = this.player.y;
      this.updatePlayer(dt);
      this.updateRewardLineEvent(dt, prevPlayerY);
      this.updateFootprints(dt);
      this.spawnCars(dt);
      this.updateCars(dt);
      this.updateTrafficAudio();

      if (this.isHitByCar()) {
        this.triggerTrafficArrest();
        return;
      }

      if (this.hasReachedTown()) {
        this.triggerTownSuccess();
        return;
      }

      if (this.elapsed >= ESCAPE_STEALTH_DURATION) {
        this.triggerTimeoutArrest();
        return;
      }

      this.updateHud();
      this.updateDebug();
    }

    computeForwardSpeed() {
      let mult = this.season.speedMult;
      if (this.hasBoat) {
        mult += 0.35;
        if (this.seasonKey === "SUMMER") {
          mult += 0.1;
        }
      }
      if (this.state.isInjured()) {
        mult *= INJURY_MULT;
      }
      return BASE_FORWARD_SPEED * mult;
    }

    updatePlayer(dt) {
      const input = (this.keyRight.isDown ? 1 : 0) - (this.keyLeft.isDown ? 1 : 0);
      const moveForward = this.keyUp.isDown;
      const targetX = input * LATERAL_SPEED;
      let forwardDelta = moveForward ? this.forwardSpeed * dt : 0;

      if (this.seasonKey === "WINTER") {
        const response = this.hasBoat ? 0.04 : 0.02;
        this.winterMomentumX = Phaser.Math.Linear(this.winterMomentumX, targetX, response);
        this.player.body.velocity.x = this.winterMomentumX;
        const targetForward = moveForward ? this.forwardSpeed : 0;
        this.winterMomentumY = Phaser.Math.Linear(this.winterMomentumY, targetForward, response);
        forwardDelta = this.winterMomentumY * dt;
      } else {
        this.winterMomentumX = targetX;
        this.winterMomentumY = moveForward ? this.forwardSpeed : 0;
        this.player.body.velocity.x = targetX;
      }

      this.player.body.velocity.y = 0;
      // As in RiverScene, forward movement is expressed as camera scroll.
      this.cameras.main.scrollY = clamp(this.cameras.main.scrollY - forwardDelta, WORLD_TOP, 0);
      this.player.y = this.cameras.main.scrollY + this.playerAnchorY;
      this.player.x = clamp(this.player.x, ROAD_LEFT + 24, ROAD_RIGHT - 24);
      if (Math.abs(this.player.body.velocity.x) > 4) {
        this.player.setFlipX(this.player.body.velocity.x < 0);
      }

      this.applyPlayerMotionVisuals(dt, moveForward);
    }

    applyPlayerMotionVisuals(dt, moveForward) {
      const lateralMoving = Math.abs(this.player.body.velocity.x) > 20;
      const forwardMoving = moveForward || Math.abs(this.winterMomentumY) > 14;
      const moving = lateralMoving || forwardMoving;
      this.motionFrameClock += dt * (moving ? 10.8 : 4.6);
      const frame = Math.floor(this.motionFrameClock) % 2;
      const textureKey = moving ? (frame === 0 ? "px-player-walk" : "px-player-walk-2") : "px-player";
      if (this.player.texture.key !== textureKey) {
        this.player.setTexture(textureKey);
      }

      const baseY = this.cameras.main.scrollY + this.playerAnchorY;
      const bob = moving ? Math.sin(this.motionFrameClock * 0.9) * 1.35 : 0;
      this.player.y = baseY + bob;
      this.player.setAngle(moving ? Math.sin(this.motionFrameClock * 0.6) * 0.8 : 0);
    }

    updateFootprints(dt) {
      const movingForward = this.keyUp.isDown || Math.abs(this.winterMomentumY) > 18;
      const movingLateral = Math.abs(this.player.body.velocity.x) > 22;
      if (!movingForward && !movingLateral) {
        this.footprintCooldown = 0;
        return;
      }

      this.footprintCooldown -= dt;
      if (this.footprintCooldown > 0) {
        return;
      }
      this.footprintCooldown = 0.12;

      const offset = this.footstepSide * 7;
      this.footstepSide *= -1;
      const footprintColor = this.seasonKey === "WINTER" ? 0xd9e3ea : 0x4a3324;
      const print = this.add
        .rectangle(this.player.x + offset + randomInt(-1, 1), this.player.y + 16 + randomInt(-1, 1), 5, 10, footprintColor, 0.72)
        .setDepth(1500);
      this.trackFootprint(print);
      if (this.seasonKey === "WINTER") {
        this.motionAudio?.playWalkSnow(0.95);
      } else {
        this.motionAudio?.playWalkDirt(0.9);
      }
      this.tweens.add({
        targets: print,
        alpha: 0,
        scaleX: 1.3,
        scaleY: 1.1,
        duration: 2200,
        ease: "Sine.Out",
        onComplete: () => this.removeFootprint(print),
      });
    }

    trackFootprint(node) {
      this.footprints.push(node);
      while (this.footprints.length > 160) {
        const old = this.footprints.shift();
        if (old && old.active) {
          old.destroy();
        }
      }
    }

    removeFootprint(node) {
      if (node && node.active) {
        node.destroy();
      }
      const idx = this.footprints.indexOf(node);
      if (idx >= 0) {
        this.footprints.splice(idx, 1);
      }
    }

    destroyFootprints() {
      this.footprints.forEach((node) => {
        if (node && node.active) {
          node.destroy();
        }
      });
      this.footprints = [];
    }

    spawnCars(dt) {
      // Keep traffic density high while preserving both lane directions.
      if (this.elapsed < 15) {
        this.carSpawnInterval = 1.05;
      } else if (this.elapsed < 30) {
        this.carSpawnInterval = 0.82;
      } else {
        this.carSpawnInterval = 0.95;
      }

      this.carSpawnAccumulator += dt;
      if (this.carSpawnAccumulator < this.carSpawnInterval) {
        return;
      }
      this.carSpawnAccumulator = 0;

      const desiredCount = this.elapsed < 12 ? 6 : this.elapsed < 32 ? 8 : 7;
      let spawned = 0;
      while (this.cars.length < desiredCount && spawned < 3 && this.cars.length < MAX_CARS) {
        const downCount = this.cars.filter((car) => car.laneDirection > 0).length;
        const upCount = this.cars.filter((car) => car.laneDirection < 0).length;
        let forcedDirection = null;
        if (downCount === 0) {
          forcedDirection = 1;
        } else if (upCount === 0) {
          forcedDirection = -1;
        }
        this.spawnCar(false, forcedDirection);
        spawned += 1;
      }
    }

    spawnRewardLineEvent() {
      if (this.rewardLineEvent || this.isEnding) {
        return;
      }

      const lane = Math.random() < 0.5 ? "left" : "right";
      const laneCenter = lane === "left" ? LEFT_LANE_CENTER : RIGHT_LANE_CENTER;
      const laneMinX = laneCenter - LANE_HALF_WIDTH;
      const laneMaxX = laneCenter + LANE_HALF_WIDTH;
      const y = clamp(
        this.cameras.main.scrollY - randomInt(240, 420),
        WORLD_TOP + 120,
        this.player.y - 90
      );
      const lineW = LANE_HALF_WIDTH * 2 - 36;

      const line = this.add
        .rectangle(laneCenter, y, lineW, 14, 0x7a7b4f, 0.94)
        .setDepth(1585)
        .setStrokeStyle(2, 0xd4db89, 1);
      const label = this.add
        .text(laneCenter, y - 22, `BONUS +${REWARD_LINE_BONUS}`, {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "13px",
          color: "#E8ECA6",
          backgroundColor: "#1A120D",
          padding: { x: 4, y: 1 },
        })
        .setOrigin(0.5)
        .setDepth(1586);

      this.rewardLineEvent = {
        lane,
        laneMinX,
        laneMaxX,
        y,
        line,
        label,
        pulse: 0,
        expiresAt: this.elapsed + 6.5,
      };
      this.hud.showToast(
        `${lane.toUpperCase()} lane bonus line`,
        UI_THEME.warn,
        1050
      );
    }

    updateRewardLineEvent(dt, prevPlayerY) {
      if (!this.rewardLineEvent) {
        this.rewardLineCooldown -= dt;
        if (this.rewardLineCooldown <= 0) {
          this.spawnRewardLineEvent();
        }
        return;
      }

      const event = this.rewardLineEvent;
      event.pulse += dt * 9;
      const alpha = 0.55 + Math.sin(event.pulse) * 0.25;
      event.line.setAlpha(alpha);
      event.label.setAlpha(clamp(alpha + 0.2, 0.45, 1));

      const hasExpired =
        this.elapsed >= event.expiresAt ||
        event.y > this.cameras.main.scrollY + INTERNAL_HEIGHT + 160;
      if (hasExpired) {
        this.clearRewardLineEvent(false);
        return;
      }

      const forwardDistance = prevPlayerY - this.player.y;
      const claimed = shouldClaimRewardLine({
        prevY: prevPlayerY,
        currentY: this.player.y,
        lineY: event.y,
        playerX: this.player.x,
        laneMinX: event.laneMinX,
        laneMaxX: event.laneMaxX,
        isAdvancing: forwardDistance > 1.5,
      });

      if (claimed) {
        this.state.setMoney(this.state.getMoney() + REWARD_LINE_BONUS);
        this.hud.showToast(`Bonus +${REWARD_LINE_BONUS}`, UI_THEME.success, 950);
        this.clearRewardLineEvent(true);
      }
    }

    clearRewardLineEvent(collected) {
      if (!this.rewardLineEvent) {
        this.rewardLineCooldown = randomInt(8, 12);
        return;
      }

      this.rewardLineEvent.line.destroy();
      this.rewardLineEvent.label.destroy();
      this.rewardLineEvent = null;
      this.rewardLineCooldown = collected ? randomInt(7, 11) : randomInt(5, 9);
    }

    destroyRewardLineEvent() {
      if (!this.rewardLineEvent) {
        return;
      }
      this.rewardLineEvent.line.destroy();
      this.rewardLineEvent.label.destroy();
      this.rewardLineEvent = null;
    }

    updateCars(dt) {
      // Cars move along Y lanes with slight X drift for realism.
      const topCull = this.cameras.main.scrollY - 280;
      const bottomCull = this.cameras.main.scrollY + INTERNAL_HEIGHT + 280;

      for (let i = this.cars.length - 1; i >= 0; i -= 1) {
        const car = this.cars[i];

        car.sprite.x += car.vx * dt;
        car.sprite.y += car.vy * dt;

        if (car.sprite.x < car.laneMinX || car.sprite.x > car.laneMaxX) {
          car.sprite.x = clamp(car.sprite.x, car.laneMinX, car.laneMaxX);
          car.vx *= -0.82;
        }

        if (Math.random() < 0.015) {
          car.vx = clamp(car.vx + randomInt(-18, 18), -46, 46);
        }

        if (Math.random() < 0.009) {
          const nextSpeed = clamp(Math.abs(car.vy) + randomInt(-18, 22), 96, 262);
          car.vy = car.laneDirection * nextSpeed;
        }

        const bank = clamp(car.vx * 0.11, -10, 10);
        car.sprite.setAngle((car.laneDirection > 0 ? 90 : -90) + bank);
        car.label.x = car.sprite.x;
        car.label.y = car.sprite.y - 40;
        car.shadow.x = car.sprite.x;
        car.shadow.y = car.sprite.y + 18;

        const outOfBounds = car.laneDirection > 0 ? car.sprite.y > bottomCull : car.sprite.y < topCull;
        if (outOfBounds) {
          this.destroyCar(car);
          this.cars.splice(i, 1);
        }
      }

      while (this.cars.length < 2) {
        this.spawnCar(false);
      }
    }

    updateTrafficAudio() {
      this.trafficAudio?.playForTraffic(this.cars, this.player.x, this.player.y);
    }

    isHitByCar() {
      const px = this.player.x;
      const py = this.player.y + 10;
      for (const car of this.cars) {
        if (Math.abs(px - car.sprite.x) <= car.hitW / 2 && Math.abs(py - car.sprite.y) <= car.hitH / 2) {
          return true;
        }
      }
      return false;
    }

    hasReachedTown() {
      return this.player.y <= this.townY + 40;
    }

    triggerTownSuccess() {
      if (this.isEnding) {
        return;
      }

      this.townReached = true;
      this.isEnding = true;
      this.player.body.setVelocity(0, 0);
      this.hud.showToast("Town reached.", UI_THEME.success, 1000);
      this.eventText.setText("TOWN").setVisible(true);

      // Success condition is destination reach, not timeout.
      this.time.delayedCall(260, () => {
        this.finishRun({
          endingId: "CARGO",
          endingTitle: ENDINGS.CARGO,
          success: true,
          subtitle: "Town reached",
        });
      });
    }

    triggerTimeoutArrest() {
      // Time expiry is a failure branch.
      if (this.isEnding) {
        return;
      }

      this.isEnding = true;
      this.player.body.setVelocity(0, 0);
      this.cameras.main.shake(110, 0.0026);
      this.eventText.setText(ENDINGS.ARREST).setVisible(true);

      this.time.delayedCall(240, () => {
        this.finishRun({
          endingId: "ARREST",
          endingTitle: ENDINGS.ARREST,
          success: false,
          subtitle: "Time ran out before town",
        });
      });
    }

    triggerTrafficArrest() {
      if (this.isEnding) {
        return;
      }

      this.isEnding = true;
      this.player.body.setVelocity(0, 0);
      this.cameras.main.shake(120, 0.003);
      this.eventText.setText(ENDINGS.ARREST).setVisible(true);

      this.time.delayedCall(220, () => {
        this.finishRun({
          endingId: "ARREST",
          endingTitle: ENDINGS.ARREST,
          success: false,
          subtitle: ENDINGS.ARREST,
        });
      });
    }

    updateHud() {
      const itemsOwned = Array.from(this.run.inventory.values());
      if (this.run.fakePapersCharges > 0 && !itemsOwned.includes("fakePapers")) {
        itemsOwned.push("fakePapers");
      }

      const totalDistance = Math.max(1, this.escapeStartY - this.townY);
      const traveled = clamp(this.escapeStartY - this.player.y, 0, totalDistance);
      const progress = traveled / totalDistance;
      const eta = this.forwardSpeed > 0 ? Math.max(0, (this.player.y - this.townY) / this.forwardSpeed) : 0;

      this.hud.updateEscape({
        money: this.state.getMoney(),
        season: this.seasonKey,
        injured: this.state.isInjured(),
        secLeft: eta,
        progress,
        itemsOwned,
      });
    }

    updateDebug() {
      if (this.debugScrollOn) {
        this.f1Text.setText(
          [
            "F1 scroll",
            `player.y ${this.player.y.toFixed(1)}`,
            `camera.scrollY ${this.cameras.main.scrollY.toFixed(1)}`,
            `forwardSpeed ${this.forwardSpeed.toFixed(1)}`,
            `carCount ${this.cars.length}`,
          ].join("  |  ")
        );
      }

      if (this.debugGameOn) {
        const downCount = this.cars.filter((car) => car.laneDirection > 0).length;
        const upCount = this.cars.filter((car) => car.laneDirection < 0).length;
        const rewardLane = this.rewardLineEvent ? this.rewardLineEvent.lane : "none";
        this.f2Text.setText(
          [
            "F2 gameplay",
            `downLane ${downCount}`,
            `upLane ${upCount}`,
            `carSpawnInterval ${this.carSpawnInterval.toFixed(2)}`,
            `rewardLane ${rewardLane}`,
            `rewardCd ${Math.max(0, this.rewardLineCooldown).toFixed(1)}`,
            `townY ${this.townY.toFixed(0)}`,
          ].join("  |  ")
        );
      }
    }

    destroyCar(car) {
      car.shadow.destroy();
      car.sprite.destroy();
      car.label.destroy();
    }

    finishRun(result) {
      if (this.resultCommitted) {
        return;
      }
      this.resultCommitted = true;
      this.isEnding = true;
      this.run.escapeTimeSpent = this.elapsed;
      this.state.markResult(result);
      this.scene.start("ResultScene", { result });
    }
  };
}
