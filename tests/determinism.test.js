"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWorldRuntime } = require("./headless-world.js");

test("相同种子生成相同地图并沿相同轨迹演化", () => {
  const { debug } = createWorldRuntime();
  const firstInitial = debug.generate("万象-确定性-001");
  debug.setRandomDisasters(false);
  const firstLater = debug.step(240);
  const secondInitial = debug.generate("万象-确定性-001");
  debug.setRandomDisasters(false);
  const secondLater = debug.step(240);
  assert.deepEqual(secondInitial, firstInitial);
  assert.deepEqual(secondLater, firstLater);
});

test("不同种子会生成不同地形和随机序列", () => {
  const { debug } = createWorldRuntime();
  const first = debug.generate("seed-alpha");
  const second = debug.generate("seed-beta");
  assert.notDeepEqual(second.terrain, first.terrain);
  assert.notEqual(second.randomState.state, first.randomState.state);
});

test("v17 存档恢复随机状态并续接同一时间线", () => {
  const { debug } = createWorldRuntime();
  debug.generate("save-resume-seed");
  debug.setRandomDisasters(true);
  debug.step(320);
  const checkpoint = structuredClone(debug.saveData());
  const expected = debug.step(180);
  debug.restore(checkpoint);
  const restored = debug.step(180);
  assert.deepEqual(JSON.parse(JSON.stringify(restored)), JSON.parse(JSON.stringify(expected)));
});
