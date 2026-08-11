"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWorldRuntime } = require("./headless-world.js");

const plain = value => JSON.parse(JSON.stringify(value));

test("固定种子在相同步数后完全一致", () => {
  const first = createWorldRuntime(), second = createWorldRuntime(); first.debug.generate("deterministic-simple-world"); second.debug.generate("deterministic-simple-world");
  assert.deepEqual(plain(first.debug.step(600)), plain(second.debug.step(600)));
  assert.deepEqual(plain(first.game.getState().worldStats), plain(second.game.getState().worldStats));
});

test("初始世界仅包含核心模拟对象", () => {
  const { game, debug } = createWorldRuntime(); const snapshot = debug.generate("core-shape"), state = game.getState();
  assert.equal(snapshot.kingdoms, 4); assert.equal(snapshot.villages, 4); assert.equal(snapshot.population, 36); assert.ok(Object.values(snapshot.animals).reduce((sum, value) => sum + value, 0) > 80);
  for (const key of ["achievements", "goals", "heroes", "professions", "caravans", "routes", "armies", "units", "equipment"]) assert.equal(Object.hasOwn(state, key), false, `${key} 不应存在`);
  for (const person of state.people) for (const key of ["profession", "role", "equipment", "class", "rank"]) assert.equal(Object.hasOwn(person, key), false, `居民不应有 ${key}`);
});

test("六类天灾都能手动创建并自然结束", () => {
  const { game, debug, config } = createWorldRuntime(); debug.generate("six-disasters");
  for (const type of Object.keys(config.disasters)) assert.ok(debug.triggerDisaster(type, 60, 40), `${type} 应能创建`);
  assert.equal(game.getState().activeDisasters.length, 6); debug.step(150); assert.equal(game.getState().activeDisasters.length, 0); assert.equal(game.getState().worldStats.disastersSurvived, 6);
});

test("国家冲突只改变关系和聚落，不生成额外实体", () => {
  const { game, debug } = createWorldRuntime(); debug.generate("abstract-relations"); const state = game.getState(), [first, other] = state.kingdoms; game.setRelation(first.id, other.id, "war", -80); debug.step(500);
  assert.ok(state.worldStats.warsEnded + game.countWars() >= 1); assert.equal(Object.hasOwn(state, "units"), false); assert.equal(Object.hasOwn(state, "armies"), false);
});
