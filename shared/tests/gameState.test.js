import test from "node:test";
import assert from "node:assert/strict";

import { BASE_FINE } from "../constants.js";
import { GameState } from "../GameState.js";

test("inspection insurance ledger waives the first inspection only", () => {
  const state = new GameState();
  state.prepareNewRun();

  const purchase = state.buyItem("inspectionInsuranceLedger");
  assert.equal(purchase.ok, true);

  const beforeMoney = state.getMoney();
  const first = state.resolveInspection();
  assert.equal(first.cancelledByInsuranceLedger, true);
  assert.equal(state.getMoney(), beforeMoney);

  const second = state.resolveInspection();
  assert.equal(second.cancelledByInsuranceLedger, false);
  assert.equal(second.fine, BASE_FINE);
  assert.equal(state.getMoney(), beforeMoney - BASE_FINE);
});

test("risk window tracker does not alter base risk timing", () => {
  const state = new GameState();
  state.prepareNewRun();

  const baseline = state.getRiskWindow();
  state.buyItem("riskWindowTracker");
  const tracked = state.getRiskWindow();

  assert.deepEqual(tracked, baseline);
});
