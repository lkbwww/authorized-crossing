import test from "node:test";
import assert from "node:assert/strict";

import { buildFailureLearning } from "../failureLearning.js";

function baseSummary(overrides = {}) {
  return {
    season: "SUMMER",
    template: "A",
    money: 100,
    injured: false,
    inspectionCount: 0,
    exposurePeak: 40,
    fakePapersRemaining: 0,
    itemsOwned: [],
    confiscatedItems: [],
    riverTimeSpent: 10,
    escapeTimeSpent: 10,
    boostUseTime: 2,
    boostUseCount: 1,
    ...overrides,
  };
}

test("prioritizes timeout as top failure reason and suggests boat first", () => {
  const learning = buildFailureLearning(
    { endingId: "ARREST", subtitle: "Time ran out before town" },
    baseSummary()
  );

  assert.equal(learning.reasonId, "timeout");
  assert.equal(learning.itemId, "boat");
});

test("inspection chain recommends next missing detection safety item", () => {
  const learning = buildFailureLearning(
    { endingId: "ARREST", subtitle: "You are arrested." },
    baseSummary({
      inspectionCount: 3,
      itemsOwned: ["fakePapers"],
    })
  );

  assert.equal(learning.reasonId, "inspection_chain");
  assert.equal(learning.itemId, "publicInfo");
});

test("low money without other signals falls back to economy shortfall", () => {
  const learning = buildFailureLearning(
    { endingId: "ARREST", subtitle: "You are arrested." },
    baseSummary({
      money: 20,
    })
  );

  assert.equal(learning.reasonId, "economy_shortfall");
  assert.equal(learning.itemId, "publicInfo");
});
