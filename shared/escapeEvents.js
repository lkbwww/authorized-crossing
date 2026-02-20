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
}) {
  if (!isAdvancing) {
    return false;
  }
  if (!didCrossLine(prevY, currentY, lineY)) {
    return false;
  }
  return isInsideLane(playerX, laneMinX, laneMaxX, 8);
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

export function applyLaneControlSpeed(baseForwardSpeed, isLaneControlViolatedNow) {
  return isLaneControlViolatedNow
    ? baseForwardSpeed * LANE_CONTROL_SPEED_MULT
    : baseForwardSpeed;
}

export function getLaneControlPenalty(violationLevel) {
  return LANE_CONTROL_BASE_PENALTY + Math.min(2, Math.max(0, violationLevel));
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
