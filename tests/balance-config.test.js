"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

require("../world-config.js");
const { balance } = globalThis.RealmConfig;

test("平衡参数集中、冻结且门禁区间有效", () => {
  assert.ok(Object.isFrozen(globalThis.RealmConfig));
  assert.ok(Object.isFrozen(balance.diplomacy));
  assert.ok(Object.isFrozen(balance.targets));
  assert.ok(balance.targets.year50PopulationMin < balance.targets.year50PopulationMax);
  assert.ok(balance.targets.warWorldRateMin < balance.targets.warWorldRateMax);
  assert.ok(balance.citizens.baseBirthChance > 0 && balance.citizens.baseBirthChance < .01);
  assert.ok(balance.diplomacy.warThreshold < balance.diplomacy.allianceBreakThreshold);
});
