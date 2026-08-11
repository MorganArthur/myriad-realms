"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWorldRuntime } = require("./headless-world.js");

test("保存并恢复后确定性随机序列继续衔接", () => {
  const first = createWorldRuntime(), second = createWorldRuntime(); first.debug.generate("save-roundtrip"); first.debug.step(420); const save = first.debug.save(); second.debug.restore(save);
  const expected = first.debug.step(260), actual = second.debug.step(260); assert.deepEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)));
});

test("旧存档迁移时丢弃已退役字段和不支持的建筑", () => {
  const { game, debug } = createWorldRuntime(); debug.generate("migration-source"); const legacy = JSON.parse(JSON.stringify(debug.save().state)); legacy.version = 22; legacy.achievements = { old: true }; legacy.heroes = [{ id: 1 }]; legacy.armies = [{ id: 1 }];
  legacy.kingdoms = legacy.kingdoms.map(kingdom => ({ ...kingdom, id: kingdom.id - 1, relations: Object.fromEntries(Object.entries(kingdom.relations).map(([key, value]) => [Number(key) - 1, value])) }));
  legacy.tiles = legacy.tiles.map(tile => [tile.terrain, tile.fertility, .5, tile.fire, tile.kingdomId == null ? -1 : tile.kingdomId - 1, tile.moisture, 16]);
  legacy.people = legacy.people.map(person => { const old = { ...person, kingdom: person.kingdomId - 1, village: person.villageId, profession: "builder", role: "soldier" }; delete old.kingdomId; delete old.villageId; return old; });
  legacy.villages = legacy.villages.map(village => { const old = { ...village, kingdom: village.kingdomId - 1, inventory: village.resources }; delete old.kingdomId; delete old.resources; return old; }); legacy.villages[0].structures.push({ id: 999, type: "barracks", x: 1, y: 1, hp: 80, maxHp: 100 });
  debug.restore(legacy); const state = game.getState(); assert.equal(Object.hasOwn(state, "achievements"), false); assert.equal(Object.hasOwn(state, "heroes"), false); assert.equal(Object.hasOwn(state, "armies"), false); assert.equal(Object.hasOwn(state.people[0], "profession"), false); assert.equal(state.villages[0].structures.some(item => item.type === "barracks"), false); assert.equal(new Set(state.kingdoms.map(item => item.id)).size, 4); assert.ok(state.kingdoms.some(item => item.id === 0)); assert.equal(state.people[0].kingdomId, state.villages.find(item => item.id === state.people[0].villageId).kingdomId); assert.notEqual(state.tiles[0].terrain, undefined);
});
