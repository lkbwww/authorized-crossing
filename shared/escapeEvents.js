/**
 * Escape-scene event helpers.
 * Keep pure predicates here so they can be unit-tested without Phaser.
 */
export const REWARD_LINE_BONUS = 12;
export const LANE_CONTROL_REWARD_BONUS = 8;
export const LANE_CONTROL_SPEED_MULT = 0.62;
export const NEAR_MISS_BONUS = 3;
export const REWARD_STREAK_STEP_BONUS = 2;
export const LANE_CONTROL_BASE_PENALTY = 2;
export const TOWN_CLUTCH_BONUS = 10;

export function didCrossLine(prevY, currentY, lineY) {
  return prevY > lineY && currentY <= lineY;
}

export function isInsideLane(x, laneMinX, laneMaxX, tolerance = 0) {
  return x >= laneMinX - tolerance && x <= laneMaxX + tolerance;
}

export function shouldClaimRewardLine({
  prevY,
  currentY,
  lineY,
  playerX,
  laneMinX,
  laneMaxX,
  isAdvancing,
  laneTolerance = 8,
}) {
  if (!isAdvancing) {
    return false;
  }
  if (!didCrossLine(prevY, currentY, lineY)) {
    return false;
  }
  return isInsideLane(playerX, laneMinX, laneMaxX, laneTolerance);
}

export function resolveRewardLineBonus(baseBonus, isLaneControlRisk, streakCount = 0) {
  const riskBonus = isLaneControlRisk ? LANE_CONTROL_REWARD_BONUS : 0;
  const streakBonus = Math.min(3, Math.max(0, streakCount)) * REWARD_STREAK_STEP_BONUS;
  return baseBonus + riskBonus + streakBonus;
}

export function isLaneControlViolated({
  playerX,
  playerY,
  laneMinX,
  laneMaxX,
  zoneY,
  zoneHalfHeight,
}) {
  return (
    isInsideLane(playerX, laneMinX, laneMaxX, 6) &&
    Math.abs(playerY - zoneY) <= zoneHalfHeight
  );
}

export function applyLaneControlSpeed(baseForwardSpeed, isLaneControlViolatedNow, speedMitigation = 0) {
  const adjustedMult = Math.min(1, Math.max(0.45, LANE_CONTROL_SPEED_MULT + speedMitigation));
  return isLaneControlViolatedNow
    ? baseForwardSpeed * adjustedMult
    : baseForwardSpeed;
}

export function getLaneControlPenalty(violationLevel, penaltyReduction = 0) {
  const base = LANE_CONTROL_BASE_PENALTY + Math.min(2, Math.max(0, violationLevel));
  return Math.max(1, base - Math.max(0, penaltyReduction));
}

export function isNearMiss({
  playerX,
  playerY,
  carX,
  carY,
  nearMissWidth = 74,
  nearMissHeight = 120,
}) {
  return (
    Math.abs(playerX - carX) <= nearMissWidth / 2 &&
    Math.abs(playerY - carY) <= nearMissHeight / 2
  );
}

export function getAdaptiveTrafficTargets({ elapsed, money, progress }) {
  const early = elapsed < 15;
  const mid = elapsed >= 15 && elapsed < 30;
  let interval = early ? 1.05 : mid ? 0.82 : 0.95;
  let desiredCount = early ? 6 : mid ? 8 : 7;

  if (money >= 140) {
    interval = Math.max(0.7, interval - 0.1);
    desiredCount += 1;
  }
  if (progress >= 0.75) {
    interval = Math.max(0.68, interval - 0.08);
    desiredCount += 1;
  }

  return {
    interval,
    desiredCount: Math.min(10, desiredCount),
  };
}

export function resolveTownArrivalBonus(secondsLeft) {
  if (secondsLeft <= 3) {
    return TOWN_CLUTCH_BONUS;
  }
  if (secondsLeft <= 7) {
    return Math.floor(TOWN_CLUTCH_BONUS / 2);
  }
  return 0;
}
