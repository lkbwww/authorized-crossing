/**
 * Small deterministic utility helpers shared across scenes.
 */
import { DEFAULT_RISK_WINDOW } from "./constants.js";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Common timer display formatter used by HUD texts.
export function formatSeconds(value) {
  return Math.max(0, value).toFixed(1);
}

// Shared formatter for showing risk windows in shop/HUD.
export function formatWindow(windowRange = DEFAULT_RISK_WINDOW) {
  return `${windowRange.start.toFixed(0)}-${windowRange.end.toFixed(0)}s`;
}

// Normalizes all failure IDs to a single boolean branch.
export function isFailureEnding(endingId) {
  return endingId === "ARREST" || endingId === "DROWNED" || endingId === "WET";
}

// Float RNG helper for spawn offsets and variation.
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

// Inclusive integer RNG helper.
export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}
