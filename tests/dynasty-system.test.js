"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWorldRuntime } = require("./headless-world.js");

const clone = value => JSON.parse(JSON.stringify(value));

test("新世界为四种政体建立具名统治者与合法继承序列", () => {
  const { debug } = createWorldRuntime();
  const snapshot = debug.generate("dynasty-foundations");
  assert.equal(snapshot.dynasties.length, 4);
  assert.deepEqual(clone(snapshot.dynasties.map(entry => entry[4])), ["primogeniture", "seniority", "elective", "merit"]);
  assert.ok(snapshot.dynasties.every(entry => typeof entry[1] === "string" && entry[1].length >= 3));
  assert.ok(snapshot.dynasties.every(entry => Number.isInteger(entry[2]) && entry[2] > 0));
  assert.ok(snapshot.dynasties.every(entry => Number.isInteger(entry[3]) && entry[3] > 0));
  const names = debug.saveData().people.map(person => person.name);
  assert.equal(new Set(names).size, names.length);
});

test("婚姻与双向人物关系会随模拟形成并写入 v20 存档", () => {
  const { debug } = createWorldRuntime();
  debug.generate("dynasty-marriages");
  debug.setRandomDisasters(false);
  debug.step(300);
  const save = debug.saveData();
  assert.equal(save.version, 20);
  assert.ok(save.worldStats.marriages >= 4);
  const married = save.people.filter(person => person.spouseId);
  assert.ok(married.length >= 8);
  assert.ok(married.every(person => save.people.find(candidate => candidate.id === person.spouseId)?.spouseId === person.id));
  assert.ok(married.every(person => person.bonds?.[String(person.spouseId)]?.type === "spouse"));
  const children = save.people.filter(person => person.parents?.length);
  assert.ok(children.length > 0);
  assert.ok(children.every(child => child.parents.every(parentId => child.bonds?.[String(parentId)]?.type === "parent")));
  assert.ok(children.every(child => child.parents.every(parentId => save.people.find(person => person.id === parentId)?.bonds?.[String(child.id)]?.type === "child")));
});

test("幼年继承人继位后由摄政辅政并保持存档续接", () => {
  const { debug } = createWorldRuntime();
  debug.generate("dynasty-succession");
  debug.setRandomDisasters(false);
  const checkpoint = structuredClone(debug.saveData()), realm = checkpoint.kingdoms[0], previousRulerId = realm.dynasty.rulerId;
  const heir = checkpoint.people.find(person => person.id === realm.dynasty.heirId);
  heir.age = 10; heir.parents = [previousRulerId]; heir.houseId = realm.dynasty.id;
  checkpoint.people.find(person => person.id === previousRulerId).health = 0;
  debug.restore(checkpoint);
  const after = debug.step(60), dynasty = after.dynasties.find(entry => entry[0] === realm.id);
  assert.notEqual(dynasty[2], previousRulerId);
  assert.ok(Number.isInteger(dynasty[2]) && dynasty[2] > 0);
  assert.ok(after.history.successions >= 1);
  const savedRealm = debug.saveData().kingdoms.find(kingdom => kingdom.id === realm.id);
  assert.equal(savedRealm.dynasty.sequence, 2);
  assert.equal(savedRealm.dynasty.rulerId, heir.id);
  assert.ok(Number.isInteger(savedRealm.dynasty.regentId) && savedRealm.dynasty.regentId > 0);
});

test("v15 旧档会补全姓名、关系字段与统治家族", () => {
  const { debug } = createWorldRuntime();
  debug.generate("dynasty-v15-migration");
  const legacy = structuredClone(debug.saveData()); legacy.version = 15;
  for (const kingdom of legacy.kingdoms) delete kingdom.dynasty;
  for (const person of legacy.people) for (const field of ["name", "sex", "parents", "spouseId", "childrenIds", "houseId", "bonds", "isRuler", "isHeir", "isRegent", "nobleRank", "claimStrength"]) delete person[field];
  const restored = debug.restore(legacy);
  assert.equal(restored.dynasties.length, 4);
  assert.ok(restored.dynasties.every(entry => Number.isInteger(entry[2]) && entry[2] > 0));
  const migrated = debug.saveData();
  assert.ok(migrated.people.every(person => person.name && person.sex && person.bonds));
  assert.equal(new Set(migrated.people.map(person => person.name)).size, migrated.people.length);
});
