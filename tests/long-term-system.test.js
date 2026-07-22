"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWorldRuntime } = require("./headless-world.js");

test("新世界中的四个文明拥有时代与种族倾向野心", () => {
  const { debug } = createWorldRuntime();
  const snapshot = debug.generate("long-term-foundations");
  assert.equal(snapshot.development.length, 4);
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot.development.map(entry => entry[1]))), ["kindling", "kindling", "kindling", "kindling"]);
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot.development.map(entry => entry[2]))), ["unity", "harmony", "wonder", "hegemony"]);
});

test("时代与野心状态通过 v16 存档无损续接", () => {
  const { debug } = createWorldRuntime();
  debug.generate("long-term-save");
  debug.setRandomDisasters(false);
  debug.step(420);
  const before = debug.snapshot();
  const save = structuredClone(debug.saveData());
  assert.equal(save.version, 16);
  assert.ok(save.kingdoms.every(kingdom => kingdom.development && kingdom.development.era));
  debug.restore(save);
  const after = debug.snapshot();
  assert.deepEqual(JSON.parse(JSON.stringify(after.development)), JSON.parse(JSON.stringify(before.development)));
});

test("长期发展步进由世界状态推动并保持有效进度", () => {
  const { debug } = createWorldRuntime();
  debug.generate("long-term-progress");
  debug.setRandomDisasters(false);
  debug.step(1200);
  const snapshot = debug.snapshot();
  assert.ok(snapshot.development.every(entry => ["kindling", "settlement", "city_state", "flourishing", "legendary"].includes(entry[1])));
  assert.ok(snapshot.development.every(entry => entry[2] === null || typeof entry[2] === "string"));
  assert.ok(snapshot.development.some(entry => entry[1] !== "kindling"));
});
