"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWorldRuntime } = require("./headless-world.js");

const plain = value => JSON.parse(JSON.stringify(value));
const animalTotal = snapshot => Object.values(snapshot.animals).reduce((sum, count) => sum + count, 0);

test("六项挑战规则可自由组合并生成可复现分享码", () => {
  const { debug } = createWorldRuntime(), catalog = debug.worldRuleCatalog(), rules = ["scarce_resources", "relentless_disasters", "slow_progress"];
  assert.equal(Object.keys(catalog).length, 6);
  const code = debug.challengeCode("万象-挑战-01", rules), parsed = plain(debug.parseChallengeCode(code));
  assert.deepEqual(parsed, { seed: "万象-挑战-01", rules });
  const current = plain(debug.snapshot().worldRules); debug.setWorldRules(rules); assert.deepEqual(plain(debug.snapshot().worldRules), current);
  const snapshot = debug.generate(code);
  assert.equal(snapshot.seed, "万象-挑战-01"); assert.deepEqual(plain(snapshot.worldRules.selected), rules); assert.equal(snapshot.worldRules.difficulty, 7);
  assert.equal(snapshot.worldRules.code, code);
});

test("叠加规则会确定性改变初始资源、生态数量与长期压力", () => {
  const { debug } = createWorldRuntime(), rules = ["scarce_resources", "harsh_climate", "fragile_ecology", "slow_progress"];
  debug.setWorldRules([]); const standard = debug.generate("rule-comparison"), standardSave = structuredClone(debug.saveData());
  debug.setWorldRules(rules); let challenged = debug.generate("rule-comparison"), challengedSave = structuredClone(debug.saveData());
  assert.ok(challenged.resources[0][1] < standard.resources[0][1]); assert.ok(animalTotal(challenged) < animalTotal(standard));
  assert.ok(challengedSave.kingdoms[0].technology.research < standardSave.kingdoms[0].technology.research || challengedSave.kingdoms[0].technology.research === 0);
  const beforeFood = challenged.resources[0][1]; challenged = debug.applyWorldRuleStep();
  assert.ok(challenged.resources[0][1] < beforeFood);
  const replay = debug.generate("rule-comparison"); assert.deepEqual(plain(replay), plain(debug.generate("rule-comparison")));
});

test("跨世界档案独立记录不同运行并更新同一世界成绩", () => {
  const { debug } = createWorldRuntime();
  debug.setWorldRules(["fractured_realms"]); debug.generate("archive-world-a"); debug.step(20);
  let entries = plain(debug.archiveCurrentWorld()); assert.equal(entries.length, 1); assert.equal(entries[0].seed, "archive-world-a"); assert.equal(entries[0].rules[0], "fractured_realms");
  const firstRunId = entries[0].runId; entries = plain(debug.archiveCurrentWorld()); assert.equal(entries.length, 1); assert.equal(entries[0].runId, firstRunId);
  debug.setWorldRules(["harsh_climate", "slow_progress"]); debug.generate("archive-world-b"); entries = plain(debug.archiveCurrentWorld());
  assert.equal(entries.length, 2); assert.equal(new Set(entries.map(entry => entry.runId)).size, 2); assert.ok(entries.every(entry => entry.code.startsWith("MYR1|")));
});

test("v22 存档续接组合规则，v21 旧档恢复为标准沙盒", () => {
  const { debug } = createWorldRuntime(), rules = ["scarce_resources", "relentless_disasters"];
  debug.setWorldRules(rules); debug.generate("challenge-save"); const before = plain(debug.snapshot().worldRules), save = structuredClone(debug.saveData());
  assert.equal(save.version, 22); debug.setWorldRules([]); debug.restore(save); assert.deepEqual(plain(debug.snapshot().worldRules), before);
  const old = structuredClone(save); old.version = 21; delete old.worldRuleState; const migrated = debug.restore(old);
  assert.deepEqual(plain(migrated.worldRules.selected), []); assert.equal(migrated.worldRules.difficulty, 0); assert.equal(debug.saveData().version, 22);
});
