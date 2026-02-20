import test from "node:test";
import assert from "node:assert/strict";

import {
  applyLaneControlSpeed,
  didCrossLine,
  getAdaptiveTrafficTargets,
  getLaneControlPenalty,
  isInsideLane,
  isLaneControlViolated,
  isNearMiss,
  resolveTownArrivalBonus,
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
  assert.equal(resolveRewardLineBonus(12, true, 2), 24);
  assert.equal(resolveRewardLineBonus(12, false, 9), 18);
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

test("getLaneControlPenalty scales up to cap", () => {
  assert.equal(getLaneControlPenalty(0), 2);
  assert.equal(getLaneControlPenalty(1), 3);
  assert.equal(getLaneControlPenalty(2), 4);
  assert.equal(getLaneControlPenalty(7), 4);
});

test("isNearMiss checks tight window around the player", () => {
  const base = {
    playerX: 500,
    playerY: 620,
    carX: 516,
    carY: 652,
  };
  assert.equal(isNearMiss(base), true);
  assert.equal(isNearMiss({ ...base, carX: 560 }), false);
  assert.equal(isNearMiss({ ...base, carY: 700 }), false);
});

test("getAdaptiveTrafficTargets increases pressure for rich or late-run players", () => {
  const baseline = getAdaptiveTrafficTargets({ elapsed: 10, money: 80, progress: 0.2 });
  assert.equal(baseline.desiredCount, 6);
  assert.equal(baseline.interval, 1.05);

  const richLate = getAdaptiveTrafficTargets({ elapsed: 32, money: 180, progress: 0.8 });
  assert.equal(richLate.desiredCount, 9);
  assert.equal(richLate.interval, 0.77);
});

test("resolveTownArrivalBonus rewards clutch finishes only", () => {
  assert.equal(resolveTownArrivalBonus(12), 0);
  assert.equal(resolveTownArrivalBonus(6), 5);
  assert.equal(resolveTownArrivalBonus(2.5), 10);
});
