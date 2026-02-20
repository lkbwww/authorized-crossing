/**
 * Escape-scene event helpers.
 * Keep pure predicates here so they can be unit-tested without Phaser.
 */
export const REWARD_LINE_BONUS = 12;

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
