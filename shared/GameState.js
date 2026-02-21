/**
 * Central run-state container.
 * Keeps deterministic economy, inventory, risk windows, and ending state.
 */
import {
  BASE_FINE,
  BUS_FARE,
  CONFISCATION_ORDER,
  DEFAULT_RISK_WINDOW,
  ENVELOPE_FLOOR,
  ITEM_BY_ID,
  ITEM_DEFINITIONS,
  SEASONS,
  SPAWN_TEMPLATES,
  STARTING_MONEY,
} from "./constants.js";

function pickRandomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class GameState {
  constructor() {
    this.roundCount = 0;
    this.nextRunBonus = {
      money: 0,
      fakePapers: 0,
      riskShortenSeconds: 0,
    };
    this.run = null;
    this.prepareNewRun();
  }

  // Starts a brand-new run while consuming any one-run reward bonuses.
  prepareNewRun() {
    const bonus = { ...this.nextRunBonus };
    this.nextRunBonus = { money: 0, fakePapers: 0, riskShortenSeconds: 0 };

    this.run = {
      season: pickRandomFrom(SEASONS),
      template: pickRandomFrom(SPAWN_TEMPLATES),
      money: STARTING_MONEY + bonus.money,
      appliedStartBonus: bonus,
      inventory: new Set(),
      fakePapersCharges: bonus.fakePapers,
      riskShortenSeconds: bonus.riskShortenSeconds,
      injured: false,
      inspectionCount: 0,
      confiscatedItems: [],
      inspectionLog: [],
      exposurePeak: 0,
      breath: 100,
      result: null,
      riskWindowSnapshot: null,
      riverTimeSpent: 0,
      escapeTimeSpent: 0,
      boostUseTime: 0,
      boostUseCount: 0,
      nearMissCount: 0,
      rewardLineClaims: 0,
      laneControlPenaltyPaid: 0,
      inspectionWaivedCount: 0,
    };
  }

  getSeason() {
    return this.run.season;
  }

  getTemplate() {
    return this.run.template;
  }

  getMoney() {
    return this.run.money;
  }

  setMoney(value) {
    this.run.money = Math.max(0, Math.floor(value));
  }

  hasRealInventoryItem(itemId) {
    return this.run.inventory.has(itemId);
  }

  hasItem(itemId) {
    if (itemId === "fakePapers") {
      return this.run.fakePapersCharges > 0 || this.run.inventory.has("fakePapers");
    }
    return this.run.inventory.has(itemId);
  }

  canBuyItem(itemId) {
    const item = ITEM_BY_ID[itemId];
    if (!item) {
      return { ok: false, message: "Unknown item" };
    }
    if (this.run.inventory.has(itemId)) {
      return { ok: false, message: "Already purchased" };
    }
    if (this.run.money < item.cost) {
      return { ok: false, message: "Insufficient funds" };
    }
    return { ok: true, message: "Available" };
  }

  buyItem(itemId) {
    const check = this.canBuyItem(itemId);
    if (!check.ok) {
      return check;
    }

    const item = ITEM_BY_ID[itemId];
    this.run.money -= item.cost;
    this.run.inventory.add(itemId);

    if (itemId === "fakePapers") {
      this.run.fakePapersCharges += 1;
    }

    return { ok: true, message: `Purchased ${item.name}` };
  }

  // Computes the active risk window from base rules + purchased modifiers.
  getRiskWindow() {
    const durationBase = DEFAULT_RISK_WINDOW.end - DEFAULT_RISK_WINDOW.start;
    let start = DEFAULT_RISK_WINDOW.start;
    let duration = durationBase;

    // Seasonal/template variance keeps timing learnable but not identical every run.
    const seasonShiftByKey = {
      SPRING: 0,
      AUTUMN: 2,
      SUMMER: -2,
      WINTER: 1,
    };
    start += seasonShiftByKey[this.run.season] ?? 0;
    if (this.run.template === "A") {
      duration += 2;
    } else {
      start += 1;
      duration -= 1;
    }

    // Situation-based pressure adjustments.
    if (this.run.money < BUS_FARE) {
      start -= 1;
      duration += 2;
    }
    if (this.run.fakePapersCharges > 0) {
      duration = Math.max(6, duration - 1);
    }

    duration = Math.max(5, duration - this.run.riskShortenSeconds);
    start = Math.max(8, start);
    return {
      start,
      end: start + duration,
    };
  }

  // Locks the current risk window so the run stays deterministic after shop.
  lockRiskWindow() {
    this.run.riskWindowSnapshot = this.getRiskWindow();
    return this.run.riskWindowSnapshot;
  }

  getLockedRiskWindow() {
    return this.run.riskWindowSnapshot || this.getRiskWindow();
  }

  markExposure(value) {
    this.run.exposurePeak = Math.max(this.run.exposurePeak, value);
  }

  isInjured() {
    return this.run.injured;
  }

  getShopItems() {
    return ITEM_DEFINITIONS;
  }

  markResult(payload) {
    this.run.result = payload;
  }

  getResult() {
    return this.run.result;
  }

  incrementRoundCount() {
    this.roundCount += 1;
    return this.roundCount;
  }

  getNextRunBonus() {
    return { ...this.nextRunBonus };
  }

  // Applies one rewarded-ad choice to the very next run only.
  applyRewardChoice(choiceId) {
    if (choiceId === "money") {
      this.nextRunBonus.money += 20;
      return "Next run bonus: Money +20";
    }
    if (choiceId === "papers") {
      this.nextRunBonus.fakePapers += 1;
      return "Next run bonus: Fake Papers granted";
    }
    if (choiceId === "risk") {
      this.nextRunBonus.riskShortenSeconds += 10;
      return "Next run bonus: risk window shortened by 10s";
    }
    return "No reward applied";
  }

  // Consumes one Fake Papers charge if available.
  useFakePapersCharge() {
    if (this.run.fakePapersCharges <= 0) {
      return false;
    }
    this.run.fakePapersCharges -= 1;
    if (this.run.fakePapersCharges <= 0) {
      this.run.fakePapersCharges = 0;
      this.run.inventory.delete("fakePapers");
    }
    return true;
  }

  // Deterministic inspection resolution order defined by game rules.
  resolveInspection() {
    const run = this.run;
    run.inspectionCount += 1;

    if (
      this.hasItem("inspectionInsuranceLedger") &&
      (run.inspectionWaivedCount || 0) <= 0
    ) {
      run.inspectionWaivedCount = 1;
      const waived = {
        cancelledByInsuranceLedger: true,
        cancelledByFakePapers: false,
        fine: 0,
        paid: 0,
        confiscated: [],
        injuryApplied: false,
      };
      run.inspectionLog.push(waived);
      return waived;
    }

    if (this.useFakePapersCharge()) {
      const cancelled = {
        cancelledByInsuranceLedger: false,
        cancelledByFakePapers: true,
        fine: 0,
        paid: 0,
        confiscated: [],
        injuryApplied: false,
      };
      run.inspectionLog.push(cancelled);
      return cancelled;
    }

    const fine = BASE_FINE;
    const confiscated = [];
    let injuryApplied = false;
    let paid = 0;

    if (this.hasItem("emergencyEnvelope")) {
      const projectedMoney = run.money - fine;
      if (projectedMoney >= ENVELOPE_FLOOR) {
        paid = fine;
        run.money = projectedMoney;
      } else {
        const shortfall = ENVELOPE_FLOOR - projectedMoney;
        const coverage = this.confiscateForCoverage(shortfall, confiscated);
        const remainingFine = Math.max(0, fine - coverage);

        paid = Math.min(run.money, remainingFine);
        run.money -= paid;

        if (run.money < ENVELOPE_FLOOR) {
          run.money = ENVELOPE_FLOOR;
        }

        if (coverage < shortfall) {
          injuryApplied = true;
        }
      }
    } else if (run.money >= fine) {
      paid = fine;
      run.money -= fine;
    } else {
      paid = run.money;
      run.money = 0;
      injuryApplied = true;
    }

    if (injuryApplied) {
      run.injured = true;
    }

    const details = {
      cancelledByInsuranceLedger: false,
      cancelledByFakePapers: false,
      fine,
      paid,
      confiscated,
      injuryApplied,
    };

    run.inspectionLog.push(details);
    return details;
  }

  // Converts item confiscation into temporary value coverage for envelope logic.
  confiscateForCoverage(requiredValue, outList) {
    let covered = 0;

    for (const itemId of CONFISCATION_ORDER) {
      if (covered >= requiredValue) {
        break;
      }
      if (!this.run.inventory.has(itemId)) {
        continue;
      }
      if (itemId === "emergencyEnvelope") {
        continue;
      }

      this.run.inventory.delete(itemId);
      if (itemId === "fakePapers") {
        this.run.fakePapersCharges = 0;
      }

      const value = ITEM_BY_ID[itemId]?.cost || 0;
      covered += value;
      this.run.confiscatedItems.push(itemId);
      outList.push(itemId);
    }

    return covered;
  }

  canTakeBusEscape() {
    return this.run.money >= BUS_FARE;
  }

  getRunSummary() {
    const run = this.run;
    const itemsOwned = Array.from(run.inventory.values());
    if (run.fakePapersCharges > 0 && !itemsOwned.includes("fakePapers")) {
      itemsOwned.push("fakePapers");
    }
    return {
      season: run.season,
      template: run.template,
      money: run.money,
      injured: run.injured,
      inspectionCount: run.inspectionCount,
      exposurePeak: Math.round(run.exposurePeak),
      fakePapersRemaining: run.fakePapersCharges,
      itemsOwned,
      confiscatedItems: [...run.confiscatedItems],
      riverTimeSpent: run.riverTimeSpent,
      escapeTimeSpent: run.escapeTimeSpent,
      boostUseTime: run.boostUseTime,
      boostUseCount: run.boostUseCount,
      nearMissCount: run.nearMissCount || 0,
      rewardLineClaims: run.rewardLineClaims || 0,
      laneControlPenaltyPaid: run.laneControlPenaltyPaid || 0,
      inspectionWaivedCount: run.inspectionWaivedCount || 0,
    };
  }
}
