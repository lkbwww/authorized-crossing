import test from "node:test";
import assert from "node:assert/strict";

import {
  applyLaneControlSpeed,
  didCrossLine,
  isInsideLane,
  isLaneControlViolated,
  resolveRewardLineBonus,
  shouldClaimRewardLine,
} from "../escapeEvents.js";

test("didCrossLine returns true only when moving past line from below", () => {
  assert.equal(didCrossLine(500, 490, 495), true);
  assert.equal(didCrossLine(490, 500, 495), false);
  assert.equal(didCrossLine(495, 495, 495), false);
});

test("isInsideLane supports optional tolerance", () => {
  assert.equal(isInsideLane(250, 200, 240), false);
  assert.equal(isInsideLane(250, 200, 240, 12), true);
  assert.equal(isInsideLane(220, 200, 240), true);
});

test("shouldClaimRewardLine requires line crossing, lane match, and forward movement", () => {
  const base = {
    prevY: 600,
    currentY: 560,
    lineY: 580,
    playerX: 400,
    laneMinX: 340,
    laneMaxX: 460,
  };

  assert.equal(shouldClaimRewardLine({ ...base, isAdvancing: true }), true);
  assert.equal(shouldClaimRewardLine({ ...base, isAdvancing: false }), false);
  assert.equal(shouldClaimRewardLine({ ...base, playerX: 520, isAdvancing: true }), false);
  assert.equal(shouldClaimRewardLine({ ...base, prevY: 570, currentY: 560, isAdvancing: true }), false);
});

test("resolveRewardLineBonus adds risk bonus only on controlled lane", () => {
  assert.equal(resolveRewardLineBonus(12, false), 12);
  assert.equal(resolveRewardLineBonus(12, true), 20);
});

test("isLaneControlViolated requires both lane and zone overlap", () => {
  const base = {
    playerX: 420,
    playerY: 600,
    laneMinX: 320,
    laneMaxX: 480,
    zoneY: 620,
    zoneHalfHeight: 24,
  };
  assert.equal(isLaneControlViolated(base), true);
  assert.equal(isLaneControlViolated({ ...base, playerX: 510 }), false);
  assert.equal(isLaneControlViolated({ ...base, playerY: 660 }), false);
});

test("applyLaneControlSpeed slows speed only while violating lane control zone", () => {
  assert.equal(applyLaneControlSpeed(200, false), 200);
  assert.equal(applyLaneControlSpeed(200, true), 124);
});
