"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWorldRuntime } = require("./headless-world.js");

const plain = value => JSON.parse(JSON.stringify(value));

test("后期危机目录包含六类危机与十二种互斥永久结局", () => {
  const { debug } = createWorldRuntime(), catalog = debug.crisisCatalog(), entries = Object.values(catalog);
  assert.equal(entries.length, 6);
  assert.equal(new Set(entries.flatMap(entry => [entry.success, entry.failure])).size, 12);
  assert.ok(entries.every(entry => entry.minYear >= 20 && entry.success && entry.failure));
});

test("六类危机结局会累积为永久世界遗产和持续修正", () => {
  const { debug } = createWorldRuntime();
  debug.generate("six-lasting-crises"); const ids = Object.keys(debug.crisisCatalog()); let snapshot;
  for (let index = 0; index < ids.length; index++) { debug.triggerWorldCrisis(ids[index]); snapshot = debug.finishWorldCrisis(index % 2 === 0); }
  assert.equal(snapshot.legacy.legacies.length, 6);
  assert.equal(new Set(snapshot.legacy.legacies.map(entry => entry[0])).size, 6);
  assert.equal(snapshot.history.crisisLegacies, 6);
  assert.ok(Object.keys(snapshot.legacy.modifiers).length >= 6);
});

test("永久危机遗产会在危机结束后继续改变文明资源", () => {
  const { debug } = createWorldRuntime();
  debug.generate("lasting-crisis-effects"); debug.triggerWorldCrisis("ashen_winter"); let snapshot = debug.finishWorldCrisis(true);
  assert.equal(snapshot.legacy.legacies[0][0], "granary_compact"); assert.equal(snapshot.legacy.modifiers.food, .22);
  const beforeFood = snapshot.resources[0][1]; snapshot = debug.applyCrisisLegacies();
  assert.equal(snapshot.resources[0][1], Math.round((beforeFood + .22) * 1000) / 1000);
});

test("永涨潮汐失守会永久改写海岸线并留下淹没旧镇", () => {
  const { debug } = createWorldRuntime();
  const before = debug.generate("drowned-coast-outcome"), waterBefore = before.terrain.water;
  debug.triggerWorldCrisis("rising_tides"); const after = debug.finishWorldCrisis(false);
  assert.ok(after.terrain.water > waterBefore);
  assert.ok(after.legacy.sites.some(site => site[1] === "flooded_town" && site[6] === "historical"));
  assert.equal(after.legacy.legacies[0][0], "drowned_coasts");
});

test("v21 存档无损续接永久危机遗产并从 v20 安全迁移", () => {
  const { debug } = createWorldRuntime();
  debug.generate("crisis-legacy-save"); debug.triggerWorldCrisis("broken_oaths"); debug.finishWorldCrisis(true); debug.triggerWorldCrisis("worldfire"); debug.finishWorldCrisis(false);
  const before = plain(debug.snapshot().legacy), save = structuredClone(debug.saveData());
  assert.equal(save.version, 21); debug.restore(save); assert.deepEqual(plain(debug.snapshot().legacy), before);
  const old = structuredClone(save); old.version = 20; delete old.legacyState.crisisLegacies; delete old.legacyState.permanentModifiers;
  const migrated = debug.restore(old); assert.deepEqual(plain(migrated.legacy.legacies), []); assert.deepEqual(plain(migrated.legacy.modifiers), {}); assert.equal(debug.saveData().version, 21);
});
