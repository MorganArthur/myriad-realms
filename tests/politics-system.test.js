"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWorldRuntime } = require("./headless-world.js");

test("四个文明建立五派议会并按影响力分配完整席位", () => {
  const { debug } = createWorldRuntime();
  const snapshot = debug.generate("politics-foundations");
  assert.equal(snapshot.politics.length, 4);
  for (const realm of snapshot.politics) {
    assert.equal(realm[5].length, 5);
    assert.ok(realm[5].every(faction => faction[1] >= 0 && faction[1] <= 100 && faction[2] >= 0 && faction[2] <= 100));
    const saveRealm = debug.saveData().kingdoms.find(kingdom => kingdom.id === realm[0]);
    assert.equal(realm[5].reduce((sum, faction) => sum + faction[4], 0), saveRealm.politics.councilSize);
    const leaders = Object.values(saveRealm.politics.factions).map(faction => faction.leaderId).filter(Boolean);
    assert.equal(new Set(leaders).size, leaders.length);
  }
});

test("议会会提出政策议题并由国家自动形成决议", () => {
  const { debug } = createWorldRuntime();
  debug.generate("politics-debates"); debug.setRandomDisasters(false); debug.step(540);
  const snapshot = debug.snapshot(), save = debug.saveData();
  assert.ok(snapshot.history.politicalResolutions >= 4);
  assert.ok(save.kingdoms.every(kingdom => kingdom.politics.sessions >= 1));
  assert.ok(save.kingdoms.every(kingdom => Object.values(kingdom.politics.factions).reduce((sum, faction) => sum + faction.seats, 0) === kingdom.politics.councilSize));
  assert.ok(save.kingdoms.every(kingdom => { const leaders = Object.values(kingdom.politics.factions).map(faction => faction.leaderId).filter(Boolean); return save.people.filter(person => person.kingdom === kingdom.id && person.age >= 16).length < 5 || new Set(leaders).size === leaders.length; }));
  assert.ok(save.kingdoms.some(kingdom => kingdom.politics.history.some(entry => entry.type === "resolution")));
});

test("玩家可以接受当前派系提案并立即改变政策", () => {
  const { debug } = createWorldRuntime();
  debug.generate("politics-guidance"); debug.setRandomDisasters(false);
  const prepared = structuredClone(debug.saveData()), realm = prepared.kingdoms[0];
  realm.politics.nextIssueYear = 1; debug.restore(prepared); debug.step(60);
  const before = debug.saveData().kingdoms[0], issue = before.politics.activeIssue;
  assert.ok(issue);
  debug.resolvePolitics(before.id, "support");
  const after = debug.saveData().kingdoms[0];
  assert.equal(after.policies[issue.domain], issue.proposed);
  assert.equal(after.politics.activeIssue, null);
  assert.equal(debug.snapshot().history.politicalResolutions, 1);
});

test("v16 旧档会迁移派系、席位和议会状态", () => {
  const { debug } = createWorldRuntime();
  debug.generate("politics-v16-migration");
  const legacy = structuredClone(debug.saveData()); legacy.version = 16;
  for (const kingdom of legacy.kingdoms) delete kingdom.politics;
  const restored = debug.restore(legacy);
  assert.equal(restored.politics.length, 4);
  const migrated = debug.saveData(); assert.equal(migrated.version, 18);
  assert.ok(migrated.kingdoms.every(kingdom => Object.keys(kingdom.politics.factions).length === 5));
  assert.ok(migrated.kingdoms.every(kingdom => Object.values(kingdom.politics.factions).reduce((sum, faction) => sum + faction.seats, 0) === kingdom.politics.councilSize));
});

test("激进派系危机会冲击国家并写入人物与政治历史", () => {
  const { debug } = createWorldRuntime(); debug.generate("politics-crisis");
  const beforeSave = debug.saveData(), before = beforeSave.kingdoms[0], unrest = before.unrest, leaderId = before.politics.factions.military.leaderId, rulerId = before.dynasty.rulerId;
  debug.triggerPoliticsCrisis(before.id, "military");
  const after = debug.saveData().kingdoms[0], snapshot = debug.snapshot();
  assert.ok(after.unrest > unrest);
  assert.equal(after.dynasty.disputed, true);
  assert.ok(after.politics.history.some(entry => entry.type === "crisis" && entry.faction === "military"));
  assert.equal(snapshot.history.politicalCrises, 1);
  if (leaderId !== rulerId) assert.ok(debug.saveData().people.find(person => person.id === leaderId).bonds[String(rulerId)].memories.some(memory => memory.type === "political-crisis"));
});
