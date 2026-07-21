"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("运行脚本按依赖顺序加载", () => {
  assert.ok(html.indexOf('src="engine-core.js"') >= 0);
  assert.ok(html.indexOf('src="engine-core.js"') < html.indexOf('src="game.js"'));
});

test("代码引用的 DOM id 全部存在且页面 id 唯一", () => {
  const referenced = [...game.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map(match => match[1]);
  const declared = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  const declaredSet = new Set(declared);
  assert.deepEqual([...new Set(referenced.filter(id => !declaredSet.has(id)))], []);
  assert.equal(declaredSet.size, declared.length);
});

test("新版档案包含目标历史且保持显式版本", () => {
  const version = Number(game.match(/version:\s*(\d+),\s*savedAt/)?.[1]);
  assert.ok(version >= 11);
  for (const field of ["chronicle", "worldStats", "worldProgress"]) assert.match(game, new RegExp(`\\b${field}\\b`));
});

test("性能保护保持单次索引重建与自适应生态批处理", () => {
  assert.match(game, /if \(!indexesReady\) rebuildWorldIndexes\(\)/);
  assert.match(game, /const ecologyStride = people\.length \+ animals\.length > 900 \? 3 : 2/);
  assert.match(game, /countNearbyEntities\(worldIndex\.peopleSpatial/);
});
