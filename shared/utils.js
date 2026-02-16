import { DEFAULT_RISK_WINDOW } from "./constants.js";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function formatSeconds(value) {
  return Math.max(0, value).toFixed(1);
}

export function formatWindow(windowRange = DEFAULT_RISK_WINDOW) {
  return `${windowRange.start.toFixed(0)}-${windowRange.end.toFixed(0)}s`;
}

export function isFailureEnding(endingId) {
  return endingId === "ARREST" || endingId === "DROWNED" || endingId === "WET";
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}
