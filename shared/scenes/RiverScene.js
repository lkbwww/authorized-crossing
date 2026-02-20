/**
 * Main crossing gameplay scene.
 * Implements movement, risk-window surveillance, exposure, and bus-stop handoff.
 */
import {
  BASE_FORWARD_SPEED,
  BREATH_DRAIN_FATIGUE_PER_SEC,
  BREATH_DRAIN_PER_SEC,
  BREATH_MAX,
  BREATH_RECOVER_PER_SEC,
  BUS_FARE,
  DESPAWN_BELOW_CAMERA,
  ENDINGS,
  EXPOSURE_DECAY_IN_WINDOW,
  EXPOSURE_DECAY_OUTSIDE_WINDOW,
  EXPOSURE_MAX,
  FAST_CURRENT_BOAT_SPEED_MULT,
  FAST_CURRENT_DURATION,
  FAST_CURRENT_NOISE_BOOST,
  FAST_CURRENT_SPEED_MULT,
  INJURY_MULT,
  INTERNAL_HEIGHT,
  INTERNAL_WIDTH,
  LATERAL_SPEED,
  MAX_SURVEILLANCE_ENTITIES,
  RIVER_BOOST_DRAIN_PER_SEC,
  RIVER_BOOST_EXHAUST_COOLDOWN,
  RIVER_BOOST_MAX_CHARGE,
  RIVER_BOOST_MIN_ACTIVATE,
  RIVER_BOOST_MULT,
  RIVER_BOOST_NOISE_BOOST,
  RIVER_BOOST_RECOVER_PER_SEC,
  RIVER_DURATION,
  REQUIRED_STRINGS,
  SEASON_DEFINITIONS,
  SPAWN_AHEAD_MAX,
  SPAWN_AHEAD_MIN,
  UI_THEME,
  WARMUP_DURATION,
  WORLD_HEIGHT,
} from "../constants.js";
import { playBeep } from "../audio/beep.js";
import { MotionAudioController } from "../audio/motionAudio.js";
import { ensurePixelTextures, getSeasonTreeTexture } from "../assets/pixelTextures.js";
import { HUD } from "../ui/HUD.js";
import { createTouchControls } from "../ui/TouchControls.js";
import { clamp, randomInt } from "../utils.js";

const WORLD_TOP = -WORLD_HEIGHT;
const WORLD_TOTAL_HEIGHT = WORLD_HEIGHT + INTERNAL_HEIGHT;
const WORLD_MID_Y = WORLD_TOP + WORLD_TOTAL_HEIGHT / 2;

export function createRiverScene(Phaser, shared) {
  return class RiverScene extends Phaser.Scene {
    constructor() {
      super({ key: "RiverScene" });
      this.resetRuntimeState();
    }

    resetRuntimeState() {
      this.elapsed = 0;
      this.exposure = 0;
      this.lastExposureDelta = 0;
      this.forwardSpeed = BASE_FORWARD_SPEED;
      this.noiseEffective = 0;
      this.spawnAccumulator = 0;
      this.spawnInterval = 1.8;
      this.entities = [];
      this.fastCurrentZones = [];
      this.fastCurrentPlan = [];
      this.inFastCurrent = false;
      this.submerged = false;
      this.submergeHeldTime = 0;
      this.breath = BREATH_MAX;
      this.isPaused = false;
      this.isEnding = false;
      this.debugScrollOn = false;
      this.debugGameOn = false;
      this.riskWarningShown = false;
      this.riskWarnIconUntil = 0;
      this.wasRiskWindow = false;
      this.exposureIncreasing = false;
      this.feedbackUntil = 0;
      this.flickerTick = 0;
      this.fastCurrentEnabled = false;
      this.wasInFastCurrent = false;
      this.playerAnchorY = 560;
      this.winterMomentumX = 0;
      this.winterMomentumY = 0;
      this.summerLandPatrolSwitched = false;
      this.detectionGraceUntil = 0;
      this.motionMode = "RUNNING";
      this.swimWavePhase = 0;
      this.motionFrameClock = 0;
      this.boostCharge = RIVER_BOOST_MAX_CHARGE;
      this.boostActive = false;
      this.boostExhaustedNotified = false;
      this.busStopResolved = false;
      this.trailMarks = [];
      this.trailCooldown = 0;
      this.footstepSide = 1;
      this.motionAudio = null;
      this.touchControls = null;
      this.boostUseTime = 0;
      this.boostUseCount = 0;
      this.boostCooldownUntil = 0;
    }

    init() {
      this.resetRuntimeState();
    }

    create() {
      // Scene-local snapshot of shared run state; reset once per scene entry.
      this.state = shared.gameState;
      this.run = this.state.run;
      this.seasonKey = this.state.getSeason();
      this.template = this.state.getTemplate();
      this.season = SEASON_DEFINITIONS[this.seasonKey];
      this.hasBoat = this.state.hasRealInventoryItem("boat");
      this.canSubmerge = this.seasonKey === "SUMMER" && !this.hasBoat;
      this.fastCurrentEnabled = this.seasonKey === "SUMMER";
      this.riskWindow = this.state.lockRiskWindow();
      this.breath = this.canSubmerge ? BREATH_MAX : BREATH_MAX;
      this.physics.world.resume();

      ensurePixelTextures(this);
      this.motionAudio = new MotionAudioController(this);
      this.createWorld();
      this.createPlayer();
      this.createHud();
      this.createDebugOverlay();
      this.setupInput(Phaser);
      this.setupTouchControls();
      this.planFastCurrentWindows();

      this.events.once("shutdown", () => {
        if (this.hud) {
          this.hud.destroy();
        }
        if (this.touchControls) {
          this.touchControls.destroy();
          this.touchControls = null;
        }
        this.destroyEntities();
        this.destroyFastCurrentZones();
        this.destroyTrailMarks();
        if (this.motionAudio) {
          this.motionAudio.destroy();
          this.motionAudio = null;
        }
      });
    }

    createWorld() {
      this.physics.world.setBounds(0, WORLD_TOP, INTERNAL_WIDTH, WORLD_TOTAL_HEIGHT);
      this.cameras.main.setBounds(0, WORLD_TOP, INTERNAL_WIDTH, WORLD_TOTAL_HEIGHT);
      this.cameras.main.setBackgroundColor("#2B1B14");

      let waterKey = "tile-water-sky";
      let shoreKey = "tile-shallow-sky";
      let landKey = "tile-bank";
      if (this.seasonKey === "SUMMER") {
        waterKey = "tile-water-blue";
        shoreKey = "tile-shallow-blue";
      } else if (this.seasonKey === "WINTER") {
        waterKey = "tile-water-winter";
        shoreKey = "tile-shallow-winter";
        landKey = "tile-bank-winter";
      }
      this.riverToLandY = -5000;
      this.riverTerminalY = WORLD_TOP + 640;

      const waterHeight = INTERNAL_HEIGHT - this.riverToLandY;
      const landHeight = this.riverToLandY - WORLD_TOP;
      const waterCenterY = this.riverToLandY + waterHeight / 2;
      const landCenterY = WORLD_TOP + landHeight / 2;

      this.waterBg = this.add.tileSprite(640, waterCenterY, INTERNAL_WIDTH, waterHeight, waterKey).setDepth(-80);
      this.landBg = this.add.tileSprite(640, landCenterY, INTERNAL_WIDTH, landHeight, landKey).setDepth(-79);
      this.shoreLine = this.add
        .tileSprite(640, this.riverToLandY + 40, INTERNAL_WIDTH, 96, shoreKey)
        .setDepth(-78)
        .setAlpha(0.92);

      this.placeSeasonTrees();
      this.createRiverTerminal();

      this.riskDarken = this.add
        .rectangle(INTERNAL_WIDTH / 2, INTERNAL_HEIGHT / 2, INTERNAL_WIDTH, INTERNAL_HEIGHT, 0x000000, 0)
        .setScrollFactor(0)
        .setDepth(3200);
    }

    createRiverTerminal() {
      const roadY = this.riverTerminalY + 18;
      const roadWidth = 980;
      this.terminalRoad = this.add.rectangle(640, roadY, roadWidth, 188, 0x2b2b2b, 0.95).setDepth(-52);
      this.terminalRoadEdgeTop = this.add.rectangle(640, roadY - 94, roadWidth, 6, 0xb08d57, 0.92).setDepth(-51);
      this.terminalRoadEdgeBottom = this.add.rectangle(640, roadY + 94, roadWidth, 6, 0xb08d57, 0.92).setDepth(-51);
      this.terminalPad = this.add
        .rectangle(640, roadY + 4, 420, 76, 0x3a261c, 0.9)
        .setStrokeStyle(3, 0xb08d57, 1)
        .setDepth(-50);
      this.terminalLabel = this.add
        .text(640, roadY - 8, "BUS STOP", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "30px",
          color: "#F3E9D7",
          stroke: "#1A120D",
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(-49);
    }

    placeSeasonTrees() {
      const treeKey = getSeasonTreeTexture(this.seasonKey);

      let y = this.riverToLandY - 80;
      while (y > WORLD_TOP + 40) {
        y -= randomInt(170, 280);
        let x = 80;

        while (x < INTERNAL_WIDTH - 80) {
          x += randomInt(85, 165);
          if (Math.random() < 0.68) {
            this.add.image(clamp(x, 56, INTERNAL_WIDTH - 56), y + randomInt(-18, 18), treeKey).setOrigin(0.5, 1).setDepth(-60);
          }
        }
      }
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
      this.playerWake = this.add.ellipse(640, 600, 64, 20, 0xa8d9f6, 0).setDepth(2095);
      this.cameras.main.stopFollow();
      this.cameras.main.scrollY = clamp(this.player.y - this.playerAnchorY, WORLD_TOP, 0);
      this.player.y = this.cameras.main.scrollY + this.playerAnchorY;
    }

    createHud() {
      this.hud = new HUD(this, "river");

      this.bigEventText = this.add
        .text(INTERNAL_WIDTH / 2, INTERNAL_HEIGHT / 2, "", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "58px",
          color: UI_THEME.textPrimary,
          stroke: "#000000",
          strokeThickness: 6,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(7000)
        .setVisible(false);

      this.feedbackText = this.add
        .text(this.player.x, this.player.y - 56, "", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "18px",
          color: UI_THEME.warn,
          stroke: "#000000",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(6100)
        .setVisible(false);

      this.riskWarnIcon = this.add
        .image(INTERNAL_WIDTH / 2 - 180, 106, "px-warning")
        .setScrollFactor(0)
        .setDepth(6100)
        .setVisible(false);

      this.pauseText = this.add
        .text(INTERNAL_WIDTH / 2, INTERNAL_HEIGHT / 2, "PAUSED", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "52px",
          color: UI_THEME.textPrimary,
          backgroundColor: "#000000",
          padding: { x: 16, y: 12 },
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
      this.keyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
      this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
      this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      this.keyF1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
      this.keyF2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F2);

      this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
        Phaser.Input.Keyboard.KeyCodes.SHIFT,
        Phaser.Input.Keyboard.KeyCodes.SPACE,
      ]);
    }

    setupTouchControls() {
      if (!this.sys.game.device.input.touch) {
        return;
      }

      // Allow UP+BOOST chord on touch devices.
      const minPointers = 3;
      const missingPointers = Math.max(0, minPointers - this.input.manager.pointersTotal);
      if (missingPointers > 0) {
        this.input.addPointer(missingPointers);
      }
      this.touchControls = createTouchControls(this, {
        showUpButton: true,
        showDownButton: this.canSubmerge,
        showBoostButton: true,
      });
    }

    isLeftHeld() {
      return this.keyLeft.isDown || !!this.touchControls?.isLeftPressed();
    }

    isRightHeld() {
      return this.keyRight.isDown || !!this.touchControls?.isRightPressed();
    }

    isForwardHeld() {
      return this.keyUp.isDown || !!this.touchControls?.isUpPressed();
    }

    isDiveHeld() {
      return this.keyDown.isDown || this.keyS.isDown || !!this.touchControls?.isDownPressed();
    }

    isBoostHeld() {
      return this.keyShift.isDown || this.keySpace.isDown || !!this.touchControls?.isBoostPressed();
    }

    planFastCurrentWindows() {
      if (!this.fastCurrentEnabled) {
        this.fastCurrentPlan = [];
        this.wasInFastCurrent = false;
        return;
      }

      const count = randomInt(1, 2);
      if (count === 1) {
        this.fastCurrentPlan = [{ t: randomInt(18, 52), spawned: false }];
      } else {
        const first = randomInt(12, 26);
        const second = randomInt(40, 60);
        this.fastCurrentPlan = [
          { t: first, spawned: false },
          { t: second, spawned: false },
        ];
      }
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
        this.updateDebugOverlay();
        return;
      }

      const dt = deltaMs / 1000;
      // Main frame loop: spawn/update/move/check in deterministic order.
      this.elapsed += dt;
      this.run.riverTimeSpent = this.elapsed;

      this.handleRiskWindowToggles();
      this.spawnSurveillanceByCadence(dt);
      if (this.fastCurrentEnabled) {
        this.spawnFastCurrentBySchedule();
        this.updateFastCurrentZones();
      } else {
        this.inFastCurrent = false;
      }

      this.updateSurveillanceEntities(dt);

      const movement = this.computeMovementState(dt);
      this.forwardSpeed = movement.forwardSpeed;
      this.noiseEffective = movement.noise + (this.inFastCurrent ? FAST_CURRENT_NOISE_BOOST : 0);

      this.updatePlayerMovement(movement, dt);
      this.updateTrailEffects(dt);
      this.enforceSummerLandPatrol();
      this.updateExposure(dt);
      this.updateFeedbackText();

      this.riskDarken.setAlpha(this.isInRiskWindow() ? 0.1 : 0);
      this.updateHud();
      this.updateDebugOverlay();

      if (this.hasReachedRiverTerminal() || this.elapsed >= RIVER_DURATION) {
        this.handleRiverEndBusStop();
      }
    }

    hasReachedRiverTerminal() {
      return this.player.y <= this.riverTerminalY + 10;
    }

    handleRiskWindowToggles() {
      const inRisk = this.isInRiskWindow();

      if (!this.riskWarningShown && this.state.hasItem("publicInfo") && this.elapsed >= this.riskWindow.start - 3 && this.elapsed < this.riskWindow.start) {
        this.riskWarningShown = true;
        this.riskWarnIcon.setVisible(true);
        this.riskWarnIconUntil = this.elapsed + 1.6;
        this.hud.showToast("⚠ Inspection soon", UI_THEME.warn, 1500);
        playBeep(this, 640, 0.1, 0.05);
      }

      if (this.elapsed >= this.riskWarnIconUntil) {
        this.riskWarnIcon.setVisible(false);
      }

      if (inRisk && !this.wasRiskWindow) {
        this.entities.forEach((entity) => {
          this.beginWarmup(entity);
        });
      }

      this.wasRiskWindow = inRisk;
    }

    spawnSurveillanceByCadence(dt) {
      // Spawn cadence ramps with phase and risk-window intensity.
      this.spawnInterval = this.getSpawnInterval();
      this.spawnAccumulator += dt;

      if (this.spawnAccumulator < this.spawnInterval) {
        return;
      }

      this.spawnAccumulator = 0;

      if (this.entities.length >= MAX_SURVEILLANCE_ENTITIES) {
        return;
      }

      const inRisk = this.isInRiskWindow();
      let spawnCount = inRisk ? randomInt(2, 3) : 1;

      if (this.season.surveillance === "cctv") {
        const activeCctv = this.entities.filter((entry) => entry.type === "cctv").length;
        const cctvCap = inRisk ? 5 : 3;
        if (activeCctv >= cctvCap) {
          spawnCount = 0;
        } else {
          spawnCount = Math.min(spawnCount, cctvCap - activeCctv);
        }
      }

      for (let i = 0; i < spawnCount; i += 1) {
        if (this.entities.length >= MAX_SURVEILLANCE_ENTITIES) {
          break;
        }
        this.spawnOneSurveillance();
      }
    }

    getSpawnInterval() {
      if (this.elapsed < 15) {
        return 1.7;
      }
      if (this.elapsed < this.riskWindow.start) {
        return 1.35;
      }
      if (this.isInRiskWindow()) {
        return 0.85;
      }
      if (this.elapsed >= RIVER_DURATION - 10) {
        return 1.4;
      }
      return 1.3;
    }

    spawnOneSurveillance() {
      const surveillanceMode = this.getSurveillanceModeForPosition();
      if (surveillanceMode === "guards") {
        this.spawnGuardEntity();
        return;
      }
      if (surveillanceMode === "boats") {
        this.spawnBoatEntity();
        return;
      }
      this.spawnCctvEntity();
    }

    getSurveillanceModeForPosition() {
      if (this.seasonKey === "SUMMER" && this.isOnLand()) {
        return "guards";
      }
      return this.season.surveillance;
    }

    isOnLand() {
      return this.player.y <= this.riverToLandY;
    }

    getSpawnX() {
      if (this.template === "A") {
        const lanes = [320, 640, 960];
        return clamp(Phaser.Utils.Array.GetRandom(lanes) + randomInt(-56, 56), 120, 1160);
      }
      return randomInt(170, 1110);
    }

    getSpawnY() {
      return this.player.y - randomInt(SPAWN_AHEAD_MIN, SPAWN_AHEAD_MAX);
    }

    createEntityBase(type, x, y, textureKey, zoneLength, zoneWidth) {
      const scaleByType = {
        guard: 1.9,
        boat: 1.8,
        cctv: 1.8,
      };
      const labelByType = {
        guard: "GUARD",
        boat: "PATROL BOAT",
        cctv: "CCTV",
      };

      const shadowWidth = type === "boat" ? 72 : 54;
      const shadow = this.add.ellipse(x, y + 16, shadowWidth, 14, 0x000000, 0.24).setDepth(1390);
      const sprite = this.add.image(x, y, textureKey).setDepth(1400).setScale(scaleByType[type] || 1.8);
      const zoneGraphic = this.add.graphics().setDepth(1300);
      const warningIcon = this.add.image(x, y - 44, "px-warning").setDepth(1600).setVisible(false).setScale(1.3);
      const label = this.add
        .text(x, y - 38, labelByType[type] || type.toUpperCase(), {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "14px",
          color: "#F3E9D7",
          backgroundColor: "#1A120D",
          padding: { x: 4, y: 1 },
        })
        .setOrigin(0.5)
        .setDepth(1500);

      return {
        type,
        x,
        y,
        shadow,
        sprite,
        zoneGraphic,
        warningIcon,
        label,
        zoneLength,
        zoneWidth,
        zoneRect: null,
        triangle: new Phaser.Geom.Triangle(),
        detectionTriangle: new Phaser.Geom.Triangle(),
        vx: 0,
        lookX: 0,
        lookY: 1,
        targetLookX: 0,
        targetLookY: 1,
        warming: false,
        warmupUntil: 0,
        active: false,
        flickerUntil: 0,
      };
    }

    spawnGuardEntity() {
      const x = this.getSpawnX();
      const y = this.getSpawnY();
      const entity = this.createEntityBase("guard", x, y, "px-guard", 145, 230);

      const speed = this.template === "A" ? randomInt(78, 120) : randomInt(45, 78);
      entity.vx = Math.random() < 0.5 ? -speed : speed;
      this.initEntityLookDirection(entity);
      this.entities.push(entity);
      this.beginWarmup(entity);
    }

    spawnBoatEntity() {
      const x = this.getSpawnX();
      const y = this.getSpawnY();
      const entity = this.createEntityBase("boat", x, y, "px-boat", 320, 250);

      const speed = this.template === "A" ? randomInt(70, 104) : randomInt(42, 72);
      entity.vx = Math.random() < 0.5 ? -speed : speed;
      this.initEntityLookDirection(entity);
      this.entities.push(entity);
      this.beginWarmup(entity);
    }

    spawnCctvEntity() {
      const x = this.getSpawnX();
      const y = this.getSpawnY();
      const entity = this.createEntityBase("cctv", x, y, "px-cctv", 280, 220);
      entity.vx = 0;
      this.initEntityLookDirection(entity);
      this.entities.push(entity);
      this.beginWarmup(entity);
    }

    randomVerticalLookSign() {
      return Math.random() < 0.5 ? -1 : 1;
    }

    initEntityLookDirection(entity) {
      const lateral = entity.vx > 4 ? 1 : entity.vx < -4 ? -1 : 0;
      entity.lookX = lateral;
      entity.lookY = 1;
      entity.targetLookX = lateral;
      entity.targetLookY = 1;
    }

    retargetEntityLookDirection(entity, randomVertical = false) {
      const lateral = entity.vx > 4 ? 1 : entity.vx < -4 ? -1 : 0;
      entity.targetLookX = lateral;
      entity.targetLookY = randomVertical ? this.randomVerticalLookSign() : 1;
    }

    updateEntityLookDirection(entity, dt) {
      const lerp = Math.min(1, dt * 5.2);
      entity.lookX = Phaser.Math.Linear(entity.lookX ?? 0, entity.targetLookX ?? 0, lerp);
      entity.lookY = Phaser.Math.Linear(entity.lookY ?? 1, entity.targetLookY ?? 1, lerp);
    }

    beginWarmup(entity) {
      if (entity.warming || entity.active) {
        return;
      }
      entity.warming = true;
      entity.warmupUntil = this.elapsed + WARMUP_DURATION;
      entity.warningIcon.setVisible(true);
      playBeep(this, 930, 0.05, 0.024);
    }

    updateSurveillanceEntities(dt) {
      for (let i = this.entities.length - 1; i >= 0; i -= 1) {
        const entity = this.entities[i];

        if (entity.vx !== 0) {
          entity.sprite.x += entity.vx * dt;
          if (entity.sprite.x < 120 || entity.sprite.x > 1160) {
            entity.vx *= -1;
            entity.sprite.x = clamp(entity.sprite.x, 120, 1160);
            this.retargetEntityLookDirection(entity, true);
          }
        }
        this.updateEntityLookDirection(entity, dt);

        entity.label.x = entity.sprite.x;
        entity.label.y = entity.sprite.y - 38;
        entity.shadow.x = entity.sprite.x;
        entity.shadow.y = entity.sprite.y + 16;
        entity.warningIcon.x = entity.sprite.x;
        entity.warningIcon.y = entity.sprite.y - 48;

        this.updateEntityActivation(entity);
        this.drawEntityZone(entity);

        const belowCamera = entity.sprite.y > this.cameras.main.scrollY + DESPAWN_BELOW_CAMERA;
        if (belowCamera) {
          this.destroyEntity(entity);
          this.entities.splice(i, 1);
        }
      }

      if (this.seasonKey === "WINTER") {
        this.updateWinterFlicker();
      }
    }

    enforceSummerLandPatrol() {
      if (this.seasonKey !== "SUMMER" || !this.isOnLand()) {
        return;
      }

      if (!this.summerLandPatrolSwitched) {
        this.summerLandPatrolSwitched = true;
      }

      for (let i = this.entities.length - 1; i >= 0; i -= 1) {
        const entity = this.entities[i];
        if (entity.type !== "boat") {
          continue;
        }
        this.destroyEntity(entity);
        this.entities.splice(i, 1);
      }
    }

    updateEntityActivation(entity) {
      if (!entity.active && !entity.warming) {
        this.beginWarmup(entity);
      }

      if (entity.warming && this.elapsed >= entity.warmupUntil) {
        entity.warming = false;
        entity.active = true;
        entity.warningIcon.setVisible(false);
      }
    }

    buildConeTriangle(entity, targetTriangle, bagInset = 0) {
      const apexX = entity.sprite.x;
      const apexY = entity.sprite.y + 8;
      const half = Math.max(6, entity.zoneWidth / 2 - bagInset);
      const rawX = entity.lookX ?? (entity.vx > 4 ? 1 : entity.vx < -4 ? -1 : 0);
      const rawY = entity.lookY ?? 1;
      const norm = Math.hypot(rawX, rawY);
      const unitX = norm > 0.0001 ? rawX / norm : 0;
      const unitY = norm > 0.0001 ? rawY / norm : 1;
      const lateralShift = unitX * Math.min(entity.zoneLength * 0.42, entity.zoneWidth * 0.58);
      const baseCenterX = apexX + lateralShift;
      const baseY = apexY + unitY * entity.zoneLength;

      targetTriangle.x1 = apexX;
      targetTriangle.y1 = apexY;
      targetTriangle.x2 = baseCenterX - half;
      targetTriangle.y2 = baseY;
      targetTriangle.x3 = baseCenterX + half;
      targetTriangle.y3 = baseY;
      return targetTriangle;
    }

    drawEntityZone(entity) {
      const inRisk = this.isInRiskWindow();
      const alpha = !inRisk
        ? 0.16
        : entity.warming
          ? 0.1 + 0.18 * Math.abs(Math.sin(this.time.now * 0.03))
          : entity.active
            ? 0.24
            : 0.1;

      entity.zoneGraphic.clear();
      const renderTriangle = this.buildConeTriangle(entity, entity.triangle, 0);

      const finalAlpha = entity.type === "cctv" && entity.flickerUntil > this.elapsed ? 0.04 : alpha;
      const zoneColor = entity.type === "boat" ? 0xE0A84A : entity.type === "cctv" ? 0xC4C6C8 : 0xA34B3A;
      entity.zoneGraphic.fillStyle(zoneColor, finalAlpha);
      entity.zoneGraphic.fillTriangle(
        renderTriangle.x1,
        renderTriangle.y1,
        renderTriangle.x2,
        renderTriangle.y2,
        renderTriangle.x3,
        renderTriangle.y3
      );
      entity.zoneGraphic.lineStyle(2, 0xF3E9D7, Math.min(1, finalAlpha + 0.05));
      entity.zoneGraphic.strokeTriangle(
        renderTriangle.x1,
        renderTriangle.y1,
        renderTriangle.x2,
        renderTriangle.y2,
        renderTriangle.x3,
        renderTriangle.y3
      );
    }

    updateWinterFlicker() {
      this.flickerTick += 1 / 60;
      if (this.flickerTick < 2) {
        return;
      }
      this.flickerTick = 0;

      const cctv = this.entities.filter((entry) => entry.type === "cctv" && entry.active);
      if (cctv.length === 0) {
        return;
      }

      const pick = Phaser.Utils.Array.GetRandom(cctv);
      pick.flickerUntil = this.elapsed + 0.7;
    }

    spawnFastCurrentBySchedule() {
      this.fastCurrentPlan.forEach((plan) => {
        if (plan.spawned || this.elapsed < plan.t) {
          return;
        }

        const x = this.template === "A"
          ? Phaser.Utils.Array.GetRandom([320, 640, 960])
          : randomInt(260, 1020);
        const y = this.player.y - randomInt(700, 1000);

        const zone = {
          x,
          y,
          width: 220,
          height: 1300,
          until: this.elapsed + FAST_CURRENT_DURATION,
          rect: this.add
            .rectangle(x, y, 220, 1300, 0x2E7AB4, 0.2)
            .setStrokeStyle(3, 0xA8D9F6, 0.95)
            .setDepth(1200),
          label: this.add
            .text(x, y - 16, "FAST CURRENT", {
              fontFamily: "'Arial Black', Impact, sans-serif",
              fontStyle: "bold",
              fontSize: "14px",
              color: "#F3E9D7",
            })
            .setOrigin(0.5)
            .setDepth(1201),
          subLabel: this.add
            .text(x, y + 12, "SPEED++  NOISE++", {
              fontFamily: "'Arial Black', Impact, sans-serif",
              fontStyle: "bold",
              fontSize: "12px",
              color: "#D4C3A3",
            })
            .setOrigin(0.5)
            .setDepth(1201),
        };

        this.fastCurrentZones.push(zone);
        plan.spawned = true;
      });
    }

    updateFastCurrentZones() {
      this.inFastCurrent = false;
      const px = this.player.x;
      const py = this.player.y;

      for (let i = this.fastCurrentZones.length - 1; i >= 0; i -= 1) {
        const zone = this.fastCurrentZones[i];
        zone.label.x = zone.x;
        zone.label.y = zone.y - 16;
        zone.subLabel.x = zone.x;
        zone.subLabel.y = zone.y + 12;

        const expired = this.elapsed >= zone.until;
        const belowCamera = zone.y > this.cameras.main.scrollY + DESPAWN_BELOW_CAMERA;

        if (expired || belowCamera) {
          zone.rect.destroy();
          zone.label.destroy();
          zone.subLabel.destroy();
          this.fastCurrentZones.splice(i, 1);
          continue;
        }

        const halfW = zone.width / 2;
        const halfH = zone.height / 2;
        const inside =
          px >= zone.x - halfW &&
          px <= zone.x + halfW &&
          py >= zone.y - halfH &&
          py <= zone.y + halfH;

        if (inside) {
          this.inFastCurrent = true;
        }
      }

      if (this.inFastCurrent && !this.wasInFastCurrent) {
        this.hud.showToast("FAST CURRENT: faster speed, easier detection", UI_THEME.warn, 1000);
      }
      this.wasInFastCurrent = this.inFastCurrent;
    }

    computeMovementState(dt) {
      // Derive effective speed/noise/inertia from season, items, injury, submerge.
      let speedMult = this.season.speedMult;
      let noise = this.season.noise;
      let inertia = this.seasonKey === "WINTER" ? 0.02 : 1;

      if (this.hasBoat) {
        speedMult += 0.35;
        if (this.seasonKey === "SUMMER") {
          speedMult += 0.1;
          noise = 0.9;
        }
        if (this.seasonKey === "WINTER") {
          inertia *= 2;
        }
      }

      if (this.state.isInjured()) {
        speedMult *= INJURY_MULT;
      }

      if (this.canSubmerge) {
        const diveHeld = this.isDiveHeld();
        const surfaceHeld = this.isForwardHeld();
        const wasSubmerged = this.submerged;
        this.submerged = diveHeld && !surfaceHeld;
        if (this.submerged && !wasSubmerged) {
          this.motionAudio?.playDive();
        }
      } else {
        this.submerged = false;
      }

      if (this.canSubmerge && this.submerged) {
        speedMult *= 0.85;
      }

      let forwardSpeed = BASE_FORWARD_SPEED * speedMult;
      const cooldownActive = this.elapsed < this.boostCooldownUntil;
      const wantsBoost = this.isBoostHeld() && this.isForwardHeld() && !this.submerged;
      const canStartBoost =
        !cooldownActive && (this.boostCharge >= RIVER_BOOST_MIN_ACTIVATE || this.boostActive);
      const wasBoostActive = this.boostActive;
      this.boostActive = wantsBoost && canStartBoost && this.boostCharge > 0;
      if (this.boostActive && !wasBoostActive) {
        this.boostUseCount += 1;
      }

      if (this.boostActive) {
        forwardSpeed *= RIVER_BOOST_MULT;
        noise += RIVER_BOOST_NOISE_BOOST;
        this.boostUseTime += dt;
        this.boostCharge = clamp(this.boostCharge - RIVER_BOOST_DRAIN_PER_SEC * dt, 0, RIVER_BOOST_MAX_CHARGE);
        if (this.boostCharge <= 0) {
          this.boostActive = false;
          this.boostCooldownUntil = this.elapsed + RIVER_BOOST_EXHAUST_COOLDOWN;
          if (!this.boostExhaustedNotified) {
            this.boostExhaustedNotified = true;
            this.hud.showToast("BOOST exhausted", UI_THEME.warn, 700);
          }
        }
      } else {
        this.boostCharge = clamp(this.boostCharge + RIVER_BOOST_RECOVER_PER_SEC * dt, 0, RIVER_BOOST_MAX_CHARGE);
        if (
          this.boostExhaustedNotified &&
          !cooldownActive &&
          this.boostCharge >= RIVER_BOOST_MIN_ACTIVATE
        ) {
          this.boostExhaustedNotified = false;
          this.hud.showToast("BOOST ready", UI_THEME.success, 600);
        }
      }

      this.run.boostUseTime = this.boostUseTime;
      this.run.boostUseCount = this.boostUseCount;

      if (this.inFastCurrent) {
        forwardSpeed *= this.hasBoat ? FAST_CURRENT_BOAT_SPEED_MULT : FAST_CURRENT_SPEED_MULT;
      }

      if (!this.canSubmerge) {
        this.breath = BREATH_MAX;
      } else if (this.submerged) {
        this.submergeHeldTime += dt;
        const drainRate = this.submergeHeldTime > 3 ? BREATH_DRAIN_FATIGUE_PER_SEC : BREATH_DRAIN_PER_SEC;
        this.breath = clamp(this.breath - drainRate * dt, 0, BREATH_MAX);
      } else {
        this.submergeHeldTime = 0;
        this.breath = clamp(this.breath + BREATH_RECOVER_PER_SEC * dt, 0, BREATH_MAX);
      }

      return {
        forwardSpeed,
        noise,
        inertia,
      };
    }

    updatePlayerMovement(movement, dt) {
      const input = (this.isRightHeld() ? 1 : 0) - (this.isLeftHeld() ? 1 : 0);
      const targetX = input * LATERAL_SPEED;
      const moveForward = this.isForwardHeld();
      let forwardDelta = moveForward ? movement.forwardSpeed * dt : 0;

      if (this.seasonKey === "WINTER") {
        this.winterMomentumX = Phaser.Math.Linear(this.winterMomentumX, targetX, movement.inertia);
        this.player.body.velocity.x = this.winterMomentumX;
        const targetForward = moveForward ? movement.forwardSpeed : 0;
        this.winterMomentumY = Phaser.Math.Linear(this.winterMomentumY, targetForward, movement.inertia);
        forwardDelta = this.winterMomentumY * dt;
      } else {
        this.winterMomentumX = targetX;
        this.winterMomentumY = moveForward ? movement.forwardSpeed : 0;
        this.player.body.velocity.x = targetX;
      }

      this.player.body.velocity.y = 0;
      // Camera scroll is the authoritative forward movement in runner mode.
      this.cameras.main.scrollY = clamp(this.cameras.main.scrollY - forwardDelta, WORLD_TOP, 0);
      this.player.y = this.cameras.main.scrollY + this.playerAnchorY;
      this.player.x = clamp(this.player.x, 48, INTERNAL_WIDTH - 48);
      if (Math.abs(this.player.body.velocity.x) > 4) {
        this.player.setFlipX(this.player.body.velocity.x < 0);
      }

      this.motionMode = this.getMotionMode();
      this.applyMotionModeVisuals(dt);

      this.run.breath = this.breath;

      if (this.canSubmerge && this.breath <= 0) {
        this.triggerDrowning();
      }
    }

    getMotionMode() {
      const onLand = this.isOnLand();
      if (this.canSubmerge && this.submerged) {
        return "SUBMERGED";
      }
      if (this.seasonKey === "SUMMER" && !onLand) {
        return "SWIMMING";
      }
      if ((this.seasonKey === "SPRING" || this.seasonKey === "AUTUMN") && !onLand) {
        return "WALKING";
      }
      if (this.seasonKey === "WINTER" && !onLand) {
        return "SLIDING";
      }
      return "RUNNING";
    }

    applyMotionModeVisuals(dt) {
      this.swimWavePhase += dt * 10;
      const movingForward = this.isForwardHeld() || Math.abs(this.winterMomentumY) > 18;
      const movingLateral = Math.abs(this.player.body.velocity.x) > 20;
      const moving = movingForward || movingLateral;
      this.motionFrameClock += dt * (moving ? 10 : 4.4);
      const frame = Math.floor(this.motionFrameClock) % 2;
      const baseY = this.cameras.main.scrollY + this.playerAnchorY;
      let textureKey = "px-player";

      if (this.motionMode === "SWIMMING") {
        textureKey = frame === 0 ? "px-player-swim" : "px-player-swim-2";
      } else if (this.motionMode === "SUBMERGED") {
        textureKey = frame === 0 ? "px-player-submerged" : "px-player-submerged-2";
      } else if (this.motionMode === "WALKING" || this.motionMode === "RUNNING" || this.motionMode === "SLIDING") {
        textureKey = moving ? (frame === 0 ? "px-player-walk" : "px-player-walk-2") : "px-player";
      }

      if (this.player.texture.key !== textureKey) {
        this.player.setTexture(textureKey);
      }

      if (this.motionMode === "SWIMMING") {
        const bob = Math.sin(this.swimWavePhase) * 2.2;
        this.player.y = baseY + bob;
        this.player.setAngle(Math.sin(this.swimWavePhase * 0.7) * 1.8);
        this.playerWake.setAlpha(0.42);
        this.playerWake.x = this.player.x;
        this.playerWake.y = this.player.y + 10;
        this.playerWake.width = 62 + Math.sin(this.swimWavePhase * 1.6) * 8;
        this.player.setAlpha(1);
      } else if (this.motionMode === "SUBMERGED") {
        const bob = Math.sin(this.swimWavePhase * 0.9) * 1.2;
        this.player.y = baseY + bob;
        this.player.setAngle(Math.sin(this.swimWavePhase * 0.5) * 2.6);
        this.playerWake.setAlpha(0.55);
        this.playerWake.x = this.player.x;
        this.playerWake.y = this.player.y + 10;
        this.playerWake.width = 68;
        this.player.setAlpha(0.58);
      } else if (this.motionMode === "WALKING") {
        const bob = moving ? Math.sin(this.swimWavePhase * 1.1) * 1.5 : 0;
        this.player.y = baseY + bob;
        this.player.setAngle(Math.sin(this.swimWavePhase * 0.8) * 0.6);
        this.playerWake.setAlpha(0.22);
        this.playerWake.x = this.player.x;
        this.playerWake.y = this.player.y + 11;
        this.playerWake.width = 44 + Math.sin(this.swimWavePhase * 1.2) * 4;
        this.player.setAlpha(0.95);
      } else {
        const bob = moving ? Math.sin(this.swimWavePhase * 1.15) * 1.25 : 0;
        this.player.y = baseY + bob;
        this.player.setAngle(Math.sin(this.swimWavePhase * 0.9) * 0.7);
        this.playerWake.setAlpha(0);
        this.player.setAlpha(1);
      }
    }

    updateTrailEffects(dt) {
      const movingForward = this.isForwardHeld() || Math.abs(this.winterMomentumY) > 18;
      const movingLateral = Math.abs(this.player.body.velocity.x) > 22;
      if (!movingForward && !movingLateral) {
        this.trailCooldown = 0;
        return;
      }

      this.trailCooldown -= dt;
      if (this.trailCooldown > 0) {
        return;
      }

      const onLand = this.isOnLand();
      if (onLand) {
        this.trailCooldown = 0.11;
        this.spawnFootprint(this.player.x, this.player.y + 16);
        if (this.seasonKey === "WINTER") {
          this.motionAudio?.playWalkSnow(0.95);
        } else {
          this.motionAudio?.playWalkDirt(0.9);
        }
        return;
      }

      if (this.motionMode !== "SWIMMING" && this.motionMode !== "WALKING") {
        return;
      }
      this.trailCooldown = this.motionMode === "SWIMMING" ? 0.09 : 0.13;
      this.spawnWaterRipple(this.player.x, this.player.y + 14, this.motionMode === "SWIMMING");
      this.motionAudio?.playSwim(this.motionMode === "SWIMMING" ? 1 : 0.78);
    }

    spawnWaterRipple(x, y, strong = false) {
      const baseColor = this.seasonKey === "SUMMER" ? 0x78AFD8 : 0xA8D9F6;
      const ripple = this.add
        .ellipse(x + randomInt(-4, 4), y + randomInt(-2, 2), strong ? 26 : 18, strong ? 12 : 8, baseColor, strong ? 0.44 : 0.32)
        .setDepth(2050)
        .setStrokeStyle(1, 0xF3E9D7, 0.5);
      this.trackTrailMark(ripple);
      this.tweens.add({
        targets: ripple,
        alpha: 0,
        scaleX: strong ? 2.2 : 1.8,
        scaleY: strong ? 1.9 : 1.5,
        duration: strong ? 980 : 860,
        ease: "Sine.Out",
        onComplete: () => this.removeTrailMark(ripple),
      });
    }

    spawnFootprint(x, y) {
      const offset = this.footstepSide * 7;
      this.footstepSide *= -1;
      const footprintColor = this.seasonKey === "WINTER" ? 0xd9e3ea : 0x4A3324;
      const footprint = this.add
        .rectangle(x + offset + randomInt(-1, 1), y + randomInt(-1, 1), 5, 10, footprintColor, 0.7)
        .setDepth(2050);
      this.trackTrailMark(footprint);
      this.tweens.add({
        targets: footprint,
        alpha: 0,
        scaleX: 1.3,
        scaleY: 1.1,
        duration: 2200,
        ease: "Sine.Out",
        onComplete: () => this.removeTrailMark(footprint),
      });
    }

    trackTrailMark(node) {
      this.trailMarks.push(node);
      while (this.trailMarks.length > 180) {
        const old = this.trailMarks.shift();
        if (old && old.active) {
          old.destroy();
        }
      }
    }

    removeTrailMark(node) {
      if (node && node.active) {
        node.destroy();
      }
      const idx = this.trailMarks.indexOf(node);
      if (idx >= 0) {
        this.trailMarks.splice(idx, 1);
      }
    }

    destroyTrailMarks() {
      this.trailMarks.forEach((node) => {
        if (node && node.active) {
          node.destroy();
        }
      });
      this.trailMarks = [];
    }

    updateExposure(dt) {
      // Detection zone contact is immediate arrest in current ruleset.
      const inRisk = this.isInRiskWindow();
      const insideActiveZone = this.isInsideActiveZone();

      if (insideActiveZone) {
        if (this.tryUseFakePapersGrace()) {
          this.lastExposureDelta = 0;
          return;
        }
        this.lastExposureDelta = EXPOSURE_MAX - this.exposure;
        this.exposure = EXPOSURE_MAX;
        this.state.markExposure(this.exposure);
        this.triggerExposureDeath();
        return;
      }

      let delta = 0;
      if (inRisk) {
        delta = -EXPOSURE_DECAY_IN_WINDOW * dt;
      } else {
        delta = -EXPOSURE_DECAY_OUTSIDE_WINDOW * dt;
      }

      this.lastExposureDelta = delta;
      this.exposure = clamp(this.exposure + delta, 0, EXPOSURE_MAX);
      this.state.markExposure(this.exposure);

      if (this.exposure >= EXPOSURE_MAX) {
        this.triggerExposureDeath();
        return;
      }

      if (delta > 0.001) {
        if (!this.exposureIncreasing) {
          this.showFeedback("DETECTED", UI_THEME.warn, 250);
        }
        this.exposureIncreasing = true;
      } else if (delta < -0.001 && this.exposureIncreasing) {
        this.showFeedback("HIDDEN", UI_THEME.success, 260);
        this.exposureIncreasing = false;
      }
    }

    showFeedback(text, color, durationMs) {
      this.feedbackText.setText(text);
      this.feedbackText.setColor(color);
      this.feedbackText.setVisible(true);
      this.feedbackUntil = this.time.now + durationMs;
    }

    updateFeedbackText() {
      this.feedbackText.x = this.player.x;
      this.feedbackText.y = this.player.y - 54;
      if (this.feedbackUntil <= this.time.now) {
        this.feedbackText.setVisible(false);
      }
    }

    isInsideActiveZone() {
      const px = this.player.x;
      const py = this.player.y;

      for (const entity of this.entities) {
        if (!entity.active) {
          continue;
        }
        if (entity.flickerUntil > this.elapsed) {
          continue;
        }
        if (this.seasonKey === "SUMMER" && this.submerged && entity.type === "boat") {
          // Summer rule: submerged player is not detected by boat searchlights.
          continue;
        }

        if (this.isInsideEntityCone(entity, px, py)) {
          return true;
        }
      }

      return false;
    }

    isInsideEntityCone(entity, px, py) {
      const bagInset = this.state.hasRealInventoryItem("waterproofBag") ? 22 : 0;
      const detectionTriangle = this.buildConeTriangle(entity, entity.detectionTriangle, bagInset);
      return Phaser.Geom.Triangle.Contains(detectionTriangle, px, py);
    }

    tryUseFakePapersGrace() {
      if (this.time.now < this.detectionGraceUntil) {
        return true;
      }

      if (!this.state.useFakePapersCharge()) {
        return false;
      }

      this.detectionGraceUntil = this.time.now + 1500;
      this.showFeedback("DOC PASS", UI_THEME.success, 380);
      this.hud.showToast("Fake Papers consumed: keep moving", UI_THEME.success, 1100);
      this.player.setTint(0xd8d09f);
      this.time.delayedCall(1500, () => {
        if (this.player && this.player.active) {
          this.player.clearTint();
        }
      });
      return true;
    }

    triggerExposureDeath() {
      if (this.isEnding) {
        return;
      }

      this.isEnding = true;
      this.player.body.setVelocity(0, 0);
      this.physics.world.pause();
      this.cameras.main.shake(120, 0.002);
      this.bigEventText.setText(ENDINGS.ARREST).setVisible(true);

      this.time.delayedCall(200, () => {
        this.finishRun({
          endingId: "ARREST",
          endingTitle: ENDINGS.ARREST,
          success: false,
          subtitle: ENDINGS.ARREST,
        });
      });
    }

    triggerDrowning() {
      if (this.isEnding) {
        return;
      }

      this.isEnding = true;
      this.player.body.setVelocity(0, 0);
      this.physics.world.pause();
      this.bigEventText.setText(ENDINGS.ARREST).setVisible(true);

      this.time.delayedCall(200, () => {
        this.finishRun({
          endingId: "ARREST",
          endingTitle: ENDINGS.ARREST,
          success: false,
          subtitle: ENDINGS.ARREST,
        });
      });
    }

    handleRiverEndBusStop() {
      // Enter bus-stop transition once when river terminal is reached.
      if (this.busStopResolved || this.isEnding) {
        return;
      }

      this.busStopResolved = true;
      this.isEnding = true;
      this.player.body.setVelocity(0, 0);
      this.bigEventText.setText("BUS STOP").setVisible(true);
      this.hud.showToast("Bus stop reached.", UI_THEME.success, 700);
      this.focusCameraToTerminal();
      this.time.delayedCall(420, () => {
        this.triggerRiverBusEncounter();
      });
    }

    focusCameraToTerminal() {
      const targetScrollY = clamp(this.riverTerminalY - this.playerAnchorY, WORLD_TOP, 0);
      this.tweens.add({
        targets: this.cameras.main,
        scrollY: targetScrollY,
        duration: 420,
        ease: "Sine.Out",
        onUpdate: () => {
          this.player.y = this.cameras.main.scrollY + this.playerAnchorY;
        },
        onComplete: () => {
          this.player.x = 640;
          this.player.y = this.cameras.main.scrollY + this.playerAnchorY;
        },
      });
    }

    triggerRiverBusEncounter() {
      // Resolve bus attempt immediately; insufficient money routes to escape scene.
      const busBody = this.add
        .rectangle(-240, this.riverTerminalY + 20, 300, 102, 0x6e4d31, 1)
        .setStrokeStyle(3, 0xb08d57, 1)
        .setDepth(2200);
      const busWindow = this.add
        .rectangle(-240, this.riverTerminalY, 122, 36, 0xe3d7bf, 0.95)
        .setDepth(2201);
      const busLabel = this.add
        .text(-240, this.riverTerminalY + 58, "BUS STOP", {
          fontFamily: "'Arial Black', Impact, sans-serif",
          fontStyle: "bold",
          fontSize: "20px",
          color: UI_THEME.textPrimary,
        })
        .setOrigin(0.5)
        .setDepth(2202);

      const busNodes = [busBody, busWindow, busLabel];

      this.tweens.add({
        targets: busNodes,
        x: 520,
        duration: 760,
        ease: "Sine.Out",
        onComplete: () => {
          if (this.state.getMoney() >= BUS_FARE) {
            this.hud.showToast(REQUIRED_STRINGS.busPass, UI_THEME.success, 1200);
            this.time.delayedCall(220, () => {
              this.finishRun({
                endingId: "BUS",
                endingTitle: ENDINGS.BUS,
                success: true,
                subtitle: REQUIRED_STRINGS.busPass,
              });
            });
            return;
          }

          this.bigEventText.setText("no money no bus").setVisible(true);
          this.hud.showToast("no money no bus", UI_THEME.warn, 1200);
          this.time.delayedCall(420, () => {
            this.tweens.add({
              targets: busNodes,
              x: INTERNAL_WIDTH + 300,
              duration: 720,
              ease: "Sine.In",
              onComplete: () => {
                busNodes.forEach((node) => node.destroy());
                this.run.riverTimeSpent = this.elapsed;
                this.scene.start("EscapeScene", { fromRiverBusStop: true });
              },
            });
          });
        },
      });
    }

    isInRiskWindow() {
      return this.elapsed >= this.riskWindow.start && this.elapsed <= this.riskWindow.end;
    }

    updateHud() {
      const itemsOwned = Array.from(this.run.inventory.values());
      if (this.run.fakePapersCharges > 0 && !itemsOwned.includes("fakePapers")) {
        itemsOwned.push("fakePapers");
      }

      this.hud.updateRiver({
        money: this.state.getMoney(),
        season: this.seasonKey,
        injured: this.state.isInjured(),
        motionMode: this.motionMode,
        secLeft: RIVER_DURATION - this.elapsed,
        progress: this.elapsed / RIVER_DURATION,
        exposure: this.exposure,
        breath: this.breath,
        showBreath: this.seasonKey === "SUMMER",
        boostCharge: this.boostCharge,
        boostActive: this.boostActive,
        boostUseTime: this.boostUseTime,
        boostUseCount: this.boostUseCount,
        itemsOwned,
        riskWindow: this.riskWindow,
        totalDuration: RIVER_DURATION,
        showRiskWindow: this.state.hasItem("publicInfo"),
        isSubmerged: this.submerged,
      });
    }

    updateDebugOverlay() {
      if (this.debugScrollOn) {
        this.f1Text.setText(
          [
            `F1 scroll`,
            `player.y ${this.player.y.toFixed(1)}`,
            `camera.scrollY ${this.cameras.main.scrollY.toFixed(1)}`,
            `forwardSpeed ${this.forwardSpeed.toFixed(1)}`,
            `entityCount ${this.entities.length}`,
          ].join("  |  ")
        );
      }

      if (this.debugGameOn) {
        this.f2Text.setText(
          [
            `F2 gameplay`,
            `template ${this.template}`,
            `inFastCurrent ${this.inFastCurrent ? "yes" : "no"}`,
            `noiseEffective ${this.noiseEffective.toFixed(2)}`,
            `spawnInterval ${this.spawnInterval.toFixed(2)}`,
            `exposureDelta ${this.lastExposureDelta.toFixed(2)}`,
            `boost ${this.boostCharge.toFixed(1)}${this.boostActive ? " active" : ""}`,
            `boostCd ${Math.max(0, this.boostCooldownUntil - this.elapsed).toFixed(1)}`,
          ].join("  |  ")
        );
      }
    }

    destroyEntity(entity) {
      entity.shadow.destroy();
      entity.sprite.destroy();
      entity.label.destroy();
      entity.zoneGraphic.destroy();
      entity.warningIcon.destroy();
    }

    destroyEntities() {
      this.entities.forEach((entity) => this.destroyEntity(entity));
      this.entities = [];
    }

    destroyFastCurrentZones() {
      this.fastCurrentZones.forEach((zone) => {
        zone.rect.destroy();
        zone.label.destroy();
        zone.subLabel.destroy();
      });
      this.fastCurrentZones = [];
      this.wasInFastCurrent = false;
    }

    finishRun(result) {
      this.run.riverTimeSpent = this.elapsed;
      this.state.markResult(result);
      this.scene.start("ResultScene", { result });
    }
  };
}
