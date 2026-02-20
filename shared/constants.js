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

// Economy constants.
export const STARTING_MONEY = 100;
export const BUS_FARE = 60;
export const BASE_FINE = 35;
export const WATERPROOF_FINE = 20;
export const ENVELOPE_FLOOR = 15;

// Scene timer constants.
export const RIVER_DURATION = 75;
export const ESCAPE_STEALTH_DURATION = 45;

// Risk-window configuration.
export const DEFAULT_RISK_WINDOW = Object.freeze({ start: 25, end: 45 });
export const COOP_RISK_SHIFT = 15;

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
    id: "cooperationFee",
    slot: 1,
    key: "1",
    cost: 20,
    slotAbbrev: "BRIBE",
    name: "Cooperation Fee (Not Legal)",
    description: "High-alert surge shifts later: 25-45s -> 40-60s",
    why: "Paid coordination delays heavy patrol scheduling for your route.",
    bestFor: "Best if you keep getting caught early in the run.",
  },
  {
    id: "boat",
    slot: 2,
    key: "2",
    cost: 35,
    slotAbbrev: "BOAT",
    name: "Boat (Seasonal)",
    description: "Higher forward speed. Summer: no breath drain.",
    why: "A motor route reduces time exposed in open channels.",
    bestFor: "Best for fast crossing when you can afford less safety budget.",
  },
  {
    id: "publicInfo",
    slot: 3,
    key: "3",
    cost: 10,
    slotAbbrev: "INFO",
    name: "Public Info (Confidential)",
    description: "Shows risk segment and gives 3s warning beep.",
    why: "Leaked schedule data reveals when active surveillance spikes.",
    bestFor: "Best low-cost safety pick for almost every run.",
  },
  {
    id: "fakePapers",
    slot: 4,
    key: "4",
    cost: 25,
    slotAbbrev: "DOC",
    name: "Fake Papers (Looks Real)",
    description: "First detection is cancelled + 1.5s grace.",
    why: "Initial checkpoint mismatch gets waved through once.",
    bestFor: "Best panic button if you expect one major mistake.",
  },
  {
    id: "waterproofBag",
    slot: 5,
    key: "5",
    cost: 15,
    slotAbbrev: "BAG",
    name: "Waterproof Bag (Evidence Storage)",
    description: "Detection hitbox gets narrower (easier cone dodging).",
    why: "Compact profile and dry gear reduce visible signature.",
    bestFor: "Best if you are close to cones but not perfectly precise.",
  },
]);

export const ITEM_BY_ID = Object.freeze(
  ITEM_DEFINITIONS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {})
);

export const CONFISCATION_ORDER = Object.freeze([
  "boat",
  "cooperationFee",
  "publicInfo",
  "fakePapers",
]);

export const ITEM_SLOT_ABBREVIATIONS = Object.freeze([
  "BRIBE",
  "BOAT",
  "INFO",
  "DOC",
  "BAG",
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
  panel: 0x3a261c,
  border: 0xb08d57,
  textPrimary: "#F3E9D7",
  textSecondary: "#D4C3A3",
  warn: "#E0A84A",
  danger: "#A34B3A",
  success: "#7A7B4F",
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
