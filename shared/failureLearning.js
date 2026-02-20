/**
 * Failure learning loop heuristics shown on Result scene.
 * Picks one dominant failure reason and a concrete next-run plan.
 */
import { BUS_FARE, ITEM_BY_ID } from "./constants.js";

function hasOwnedItem(summary, itemId) {
  return summary.itemsOwned.includes(itemId);
}

function pickSuggestedItem(summary, priority = []) {
  for (const itemId of priority) {
    if (!hasOwnedItem(summary, itemId)) {
      return itemId;
    }
  }
  return priority[0] || null;
}

function toItemLabel(itemId) {
  if (!itemId) {
    return "No item change";
  }
  return ITEM_BY_ID[itemId]?.name || itemId;
}

function buildCandidate(id, score, reason, action, itemPriority) {
  return { id, score, reason, action, itemPriority };
}

export function buildFailureLearning(resultData, summary) {
  const subtitle = (resultData?.subtitle || "").toLowerCase();
  const candidates = [];

  if (subtitle.includes("time ran out")) {
    candidates.push(
      buildCandidate(
        "timeout",
        110,
        "Priority cause: pace collapsed in the escape phase and the timer expired.",
        "Next run action: push vertical movement first, avoid wide lane zig-zags, and activate boost early.",
        ["boat", "cooperationFee", "publicInfo"]
      )
    );
  }

  if (summary.inspectionCount >= 2) {
    candidates.push(
      buildCandidate(
        "inspection_chain",
        90 + summary.inspectionCount * 3,
        "Priority cause: repeated inspections stacked penalties and control loss.",
        "Next run action: play outside the risk window and disengage from detection cones instead of forcing through.",
        ["fakePapers", "publicInfo", "waterproofBag"]
      )
    );
  }

  if (summary.exposurePeak >= 90) {
    candidates.push(
      buildCandidate(
        "exposure_peak",
        84,
        "Priority cause: exposure reached critical range, making arrest highly likely.",
        "Next run action: dip out of line-of-sight earlier and reset exposure before re-engaging.",
        ["publicInfo", "waterproofBag", "cooperationFee"]
      )
    );
  }

  if (summary.injured) {
    candidates.push(
      buildCandidate(
        "injury_penalty",
        78,
        "Priority cause: injury penalty reduced mobility and recovery options.",
        "Next run action: choose safer channels after first warning instead of trading health for distance.",
        ["fakePapers", "waterproofBag", "publicInfo"]
      )
    );
  }

  if (summary.money < BUS_FARE) {
    candidates.push(
      buildCandidate(
        "economy_shortfall",
        72,
        "Priority cause: economy shortfall removed the bus bailout option.",
        "Next run action: hold at least $60 reserve when approaching river terminal; skip low-impact buys.",
        ["publicInfo", "cooperationFee"]
      )
    );
  }

  if ((summary.laneControlPenaltyPaid || 0) >= 8) {
    candidates.push(
      buildCandidate(
        "lane_control_tax",
        86,
        "Priority cause: repeated lane-control penalties drained your economy and pace.",
        "Next run action: leave controlled lanes immediately; if you chase a risk bonus line, cross fast and exit.",
        ["publicInfo", "boat", "waterproofBag"]
      )
    );
  }

  if ((summary.rewardLineClaims || 0) === 0 && (summary.escapeTimeSpent || 0) >= 20) {
    candidates.push(
      buildCandidate(
        "missed_escape_economy",
        64,
        "Priority cause: no escape bonus lines were secured, reducing buffer for mistakes.",
        "Next run action: take one safe bonus line per 10s window instead of only dodging traffic.",
        ["boat", "publicInfo"]
      )
    );
  }

  if (candidates.length === 0) {
    candidates.push(
      buildCandidate(
        "generic",
        10,
        "Priority cause: sustained detection pressure built up into a terminal mistake.",
        "Next run action: play one tempo slower for 20s, then accelerate only after patrol rhythm becomes visible.",
        ["publicInfo", "fakePapers", "waterproofBag"]
      )
    );
  }

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0];
  const suggestedItemId = pickSuggestedItem(summary, top.itemPriority);
  const suggestedItemLabel = toItemLabel(suggestedItemId);
  const alreadyOwned = suggestedItemId ? hasOwnedItem(summary, suggestedItemId) : false;
  const itemLine = suggestedItemId
    ? `Next run item: ${suggestedItemLabel}${alreadyOwned ? " (already owned last run; prioritize usage timing)" : ""}.`
    : "Next run item: keep current loadout and focus on execution.";

  return {
    reasonId: top.id,
    reason: top.reason,
    action: top.action,
    itemId: suggestedItemId,
    item: itemLine,
  };
}
