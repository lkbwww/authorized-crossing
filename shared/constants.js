/**
 * Shared game constants used by both static and vite builds.
 * Values here drive gameplay balance and fixed-string compliance.
 */
export const GAME_TITLE = "Authorized Crossing";
export const SHOP_TITLE = "Pre-Departure Cooperation Procedure";

// Core render resolution.
export const INTERNAL_WIDTH = 1280;
export const INTERNAL_HEIGHT = 720;

// World and movement constants.
export const WORLD_HEIGHT = 9000;
export const BASE_FORWARD_SPEED = 170;
export const LATERAL_SPEED = 260;
export const SPAWN_AHEAD_MIN = 600;
export const SPAWN_AHEAD_MAX = 1200;
export const DESPAWN_BELOW_CAMERA = 900;
export const INJURY_MULT = 0.8;
export const RIVER_BOOST_MULT = 1.55;
export const RIVER_BOOST_NOISE_BOOST = 0.38;
export const RIVER_BOOST_MAX_CHARGE = 100;
export const RIVER_BOOST_MIN_ACTIVATE = 16;
export const RIVER_BOOST_DRAIN_PER_SEC = 50;
export const RIVER_BOOST_RECOVER_PER_SEC = 30;
export const RIVER_BOOST_EXHAUST_COOLDOWN = 2.2;

// Economy constants.
export const STARTING_MONEY = 100;
export const BUS_FARE = 60;
export const BASE_FINE = 35;
export const ENVELOPE_FLOOR = 15;

// Scene timer constants.
export const RIVER_DURATION = 75;
export const ESCAPE_STEALTH_DURATION = 45;

// Risk-window configuration.
export const DEFAULT_RISK_WINDOW = Object.freeze({ start: 25, end: 45 });

// Exposure and breath systems.
export const EXPOSURE_MAX = 100;
export const EXPOSURE_GAIN_PER_SEC = 60;
export const EXPOSURE_DECAY_IN_WINDOW = 15;
export const EXPOSURE_DECAY_OUTSIDE_WINDOW = 25;

export const BREATH_MAX = 100;
export const BREATH_DRAIN_PER_SEC = 12;
export const BREATH_DRAIN_FATIGUE_PER_SEC = 16;
export const BREATH_RECOVER_PER_SEC = 6;

// Fast-current modifiers.
export const FAST_CURRENT_DURATION = 8;
export const FAST_CURRENT_NOISE_BOOST = 0.3;
export const FAST_CURRENT_SPEED_MULT = 1.25;
export const FAST_CURRENT_BOAT_SPEED_MULT = 1.1;

export const MAX_SURVEILLANCE_ENTITIES = 12;
export const WARMUP_DURATION = 0.8;

// Buyable item manifest.
export const ITEM_DEFINITIONS = Object.freeze([
  {
    id: "boostWhisperModule",
    slot: 1,
    key: "1",
    cost: 16,
    slotAbbrev: "WHSP",
    name: "Boost Whisper Module",
    description: "Boost noise amplification is reduced.",
    why: "Dampens thermal and acoustic signature while boosting.",
    bestFor: "Best for frequent boost users in dense patrol phases.",
  },
  {
    id: "powerCapacitorCoil",
    slot: 2,
    key: "2",
    cost: 18,
    slotAbbrev: "CAP",
    name: "Power Capacitor Coil",
    description: "Boost charge drains slower and recovers faster.",
    why: "Stabilizes burst-power draw for repeated acceleration.",
    bestFor: "Best for tempo control across long river segments.",
  },
  {
    id: "rewardLineScope",
    slot: 3,
    key: "3",
    cost: 14,
    slotAbbrev: "SCOPE",
    name: "Reward Line Scope",
    description: "Reward-line capture window is slightly wider.",
    why: "Improves alignment tolerance on lane reward passes.",
    bestFor: "Best when you miss lines by a narrow margin.",
  },
  {
    id: "rewardRelayDrone",
    slot: 4,
    key: "4",
    cost: 17,
    slotAbbrev: "DRONE",
    name: "Reward Relay Drone",
    description: "Reward lines persist longer and respawn a bit sooner.",
    why: "Relay confirms lane tags and extends acquisition timing.",
    bestFor: "Best for economy-focused escape routing.",
  },
  {
    id: "laneControlStabilizer",
    slot: 5,
    key: "5",
    cost: 16,
    slotAbbrev: "LANE",
    name: "Lane Control Stabilizer",
    description: "Lane-control penalties and slowdown are slightly reduced.",
    why: "Stabilizes steering response inside control enforcement zones.",
    bestFor: "Best if control events frequently tax your money and pace.",
  },
  {
    id: "inspectionInsuranceLedger",
    slot: 6,
    key: "6",
    cost: 22,
    slotAbbrev: "LEDGR",
    name: "Inspection Insurance Ledger",
    description: "Automatically waives one inspection fine per run.",
    why: "Filed exemption token nullifies one checkpoint charge.",
    bestFor: "Best for preserving bus fare in volatile runs.",
  },
  {
    id: "exposureDampeningCoat",
    slot: 7,
    key: "7",
    cost: 19,
    slotAbbrev: "COAT",
    name: "Exposure Dampening Coat",
    description: "Detection cones are slightly less punishing.",
    why: "Suppresses heat profile and visual trace around patrol scans.",
    bestFor: "Best when you are often clipped by cone edges.",
  },
  {
    id: "riskWindowTracker",
    slot: 8,
    key: "8",
    cost: 12,
    slotAbbrev: "RISK",
    name: "Risk Window Tracker",
    description: "Shows risk segment and warns earlier before surge.",
    why: "Predictive telemetry highlights high-alert window timing.",
    bestFor: "Best low-cost planning tool across all seasons.",
  },
]);

export const ITEM_BY_ID = Object.freeze(
  ITEM_DEFINITIONS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {})
);

export const CONFISCATION_ORDER = Object.freeze([
  "inspectionInsuranceLedger",
  "powerCapacitorCoil",
  "rewardRelayDrone",
  "rewardLineScope",
  "boostWhisperModule",
  "laneControlStabilizer",
  "riskWindowTracker",
  "exposureDampeningCoat",
]);

export const ITEM_SLOT_ABBREVIATIONS = Object.freeze([
  "WHSP",
  "CAP",
  "SCOPE",
  "DRONE",
  "LANE",
  "LEDGR",
  "COAT",
  "RISK",
]);

// Run randomization pools.
export const SPAWN_TEMPLATES = Object.freeze(["A", "B"]);

export const SEASONS = Object.freeze(["SPRING", "AUTUMN", "SUMMER", "WINTER"]);

// Season-specific movement/surveillance behavior.
export const SEASON_DEFINITIONS = Object.freeze({
  SPRING: {
    key: "SPRING",
    speedMult: 1,
    noise: 1,
    surveillance: "guards",
  },
  AUTUMN: {
    key: "AUTUMN",
    speedMult: 1,
    noise: 1,
    surveillance: "guards",
  },
  SUMMER: {
    key: "SUMMER",
    speedMult: 0.75,
    noise: 0.6,
    surveillance: "boats",
  },
  WINTER: {
    key: "WINTER",
    speedMult: 1.15,
    noise: 0.7,
    surveillance: "cctv",
  },
});

// Shared HUD palette.
export const UI_THEME = Object.freeze({
  bg: 0x2b1b14,
  panel: 0x2f241d,
  border: 0x8f7a63,
  textPrimary: "#E8DECE",
  textSecondary: "#BBAE9A",
  warn: "#C89652",
  danger: "#965645",
  success: "#6E7A58",
});

// Normalized ending labels used by the result scene.
export const ENDINGS = Object.freeze({
  BUS: "Success",
  CARGO: "Success",
  ARREST: "You are arrested.",
  WET: "You are arrested.",
  DROWNED: "You are arrested.",
});

// Required satire strings that must appear in UI.
export const REQUIRED_STRINGS = Object.freeze({
  busPass: "Freedom Pass (No Refunds)",
  inspectionFail: "Violation: Got Wet",
  interstitialTitle: "Public Service Announcement",
  interstitialBody: "Watching PSA...",
  rewardedTitle: "Safety Training",
  rewardedBody: "Completing training...",
});

// Rewarded-ad choices.
export const REWARD_CHOICES = Object.freeze([
  {
    id: "money",
    label: "Money +20",
    description: "Start next run with +20 money",
  },
  {
    id: "papers",
    label: "Fake Papers (1 use)",
    description: "Grant one Fake Papers use on next run",
  },
  {
    id: "risk",
    label: "Shorten Risk Window",
    description: "Next run risk window duration shortened by 10s",
  },
]);
