"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWorldRuntime } = require("./headless-world.js");

const plain = value => JSON.parse(JSON.stringify(value));

test("大型事件目录包含十二条三章事件链与完整选择", () => {
  const { debug } = createWorldRuntime();
  const catalog = debug.worldEventCatalog(), entries = Object.values(catalog);
  assert.equal(entries.length, 12);
  for (const entry of entries) {
    assert.ok(entry.stages.length >= 3 && entry.stages.length <= 5, `${entry.name} 的章节数不符合路线要求`);
    assert.equal(entry.choices.length, entry.stages.length);
    assert.ok(entry.choices.every(choices => choices.length >= 3), `${entry.name} 存在选择不足的章节`);
  }
});

test("事件链跨章节保留参与文明、路径与历史记忆", () => {
  const { debug } = createWorldRuntime();
  debug.generate("world-event-participants");
  let snapshot = debug.triggerWorldEvent("starfall", "omen");
  assert.equal(snapshot.worldEvent.active[0], "starfall");
  assert.ok(snapshot.worldEvent.active[2].length >= 1);
  snapshot = debug.resolveWorldEvent("observe");
  assert.deepEqual(plain(snapshot.worldEvent.pending.slice(0, 2)), ["starfall", "expedition"]);
  debug.triggerWorldEvent("starfall", "expedition"); debug.resolveWorldEvent("shared");
  debug.triggerWorldEvent("starfall", "legacy"); snapshot = debug.resolveWorldEvent("academy");
  assert.deepEqual(plain(snapshot.worldEvent.completed), [["starfall", 1]]);
  assert.equal(snapshot.worldEvents.filter(entry => entry[0] === "starfall").length, 3);
  assert.ok(snapshot.worldEvent.memories.every(memory => memory[4].length >= 1));
  assert.ok(snapshot.worldEvent.consequences.length >= 2);
});

test("选择可以锁定互斥事件路线", () => {
  const { debug } = createWorldRuntime();
  debug.generate("world-event-locks");
  debug.triggerWorldEvent("council", "enforcement");
  const snapshot = debug.resolveWorldEvent("court");
  assert.ok(snapshot.worldEvent.locked.includes("iron_doctrine"));
  assert.equal(debug.worldEventEligibility("iron_doctrine"), false);
});

test("延迟后果到期后执行并从队列转入世界记忆", () => {
  const { debug } = createWorldRuntime();
  debug.generate("world-event-consequence");
  debug.triggerWorldEvent("starfall", "omen");
  let snapshot = debug.resolveWorldEvent("observe");
  const consequence = snapshot.worldEvent.consequences[0];
  assert.ok(consequence);
  const save = structuredClone(debug.saveData()); save.year = consequence[3] + 0.1;
  debug.restore(save); snapshot = debug.step(50);
  assert.ok(!snapshot.worldEvent.consequences.some(entry => entry[0] === consequence[0]));
  assert.ok(snapshot.worldEvent.memories.some(memory => memory[1] === "consequence" && memory[2] === "observe"));
});

test("v22 存档无损保存事件参与者、互斥路线和后果队列", () => {
  const { debug } = createWorldRuntime();
  debug.generate("world-event-save");
  debug.triggerWorldEvent("council", "enforcement"); debug.resolveWorldEvent("court");
  debug.triggerWorldEvent("starfall", "omen"); debug.resolveWorldEvent("observe");
  const before = plain(debug.snapshot().worldEvent), save = structuredClone(debug.saveData());
  assert.equal(save.version, 22);
  assert.ok(save.worldEventState.consequences.length >= 1);
  debug.restore(save);
  assert.deepEqual(plain(debug.snapshot().worldEvent), before);
});

test("v18 旧事件状态会补全参与者、后果队列与路线记录", () => {
  const { debug } = createWorldRuntime();
  debug.generate("world-event-migration");
  const save = structuredClone(debug.saveData()); save.version = 18;
  save.worldEventState = { nextYear: save.year + 10, active: { chain: "starfall", stage: "omen", startedYear: save.year }, pending: null, history: [] };
  const snapshot = debug.restore(save);
  assert.equal(snapshot.worldEvent.active[0], "starfall");
  assert.ok(snapshot.worldEvent.active[2].length >= 1);
  assert.deepEqual(plain(snapshot.worldEvent.consequences), []);
  assert.deepEqual(plain(snapshot.worldEvent.locked), []);
  assert.equal(debug.saveData().version, 22);
});
