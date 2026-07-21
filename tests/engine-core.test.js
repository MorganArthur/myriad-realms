"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

require("../engine-core.js");
const { random, rand, randi, clamp, cleanText, setSeed, getRandomState, restoreRandomState, smoothNoise, removeDeadEntities } = globalThis.WorldEngine;

test("数值工具保持边界", () => {
  assert.equal(clamp(-2, 0, 10), 0);
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(clamp(4, 0, 10), 4);
  for (let index = 0; index < 100; index++) {
    assert.ok(rand(3, 7) >= 3 && rand(3, 7) < 7);
    assert.ok(randi(2, 4) >= 2 && randi(2, 4) <= 4);
  }
});

test("文本清理阻止标记注入并限制长度", () => {
  assert.equal(cleanText("<王国>&\"'"), "王国");
  assert.equal(cleanText("界".repeat(200)).length, 120);
});

test("噪声生成器返回稳定尺寸与有限值", () => {
  setSeed("noise-shape");
  const noise = smoothNoise(12, 8, 2);
  assert.equal(noise.length, 96);
  assert.ok(noise.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
});

test("种子随机数可复现并可从快照续接", () => {
  setSeed("同一个世界");
  const first = Array.from({ length: 8 }, random);
  const checkpoint = getRandomState();
  const continuation = Array.from({ length: 8 }, random);
  setSeed("同一个世界");
  assert.deepEqual(Array.from({ length: 8 }, random), first);
  assert.equal(restoreRandomState(checkpoint), true);
  assert.deepEqual(Array.from({ length: 8 }, random), continuation);
});

test("实体压缩原地移除死亡记录", () => {
  const entities = [{ id: 1 }, { id: 2, dead: true }, { id: 3 }, { id: 4, dead: true }];
  removeDeadEntities(entities);
  assert.deepEqual(entities.map(entity => entity.id), [1, 3]);
});
