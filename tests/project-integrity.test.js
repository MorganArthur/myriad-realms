"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const ui = fs.readFileSync(path.join(root, "game-ui.js"), "utf8");
const persistence = fs.readFileSync(path.join(root, "game-persistence.js"), "utf8");
const config = fs.readFileSync(path.join(root, "world-config.js"), "utf8");
const app = [game, ui, persistence].join("\n");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("运行脚本按依赖顺序加载", () => {
  assert.ok(html.indexOf('src="engine-core.js"') >= 0);
  assert.ok(html.indexOf('src="world-config.js"') > html.indexOf('src="engine-core.js"'));
  assert.ok(html.indexOf('src="game-ui.js"') > html.indexOf('src="world-config.js"'));
  assert.ok(html.indexOf('src="game-persistence.js"') > html.indexOf('src="game-ui.js"'));
  assert.ok(html.indexOf('src="game.js"') > html.indexOf('src="game-persistence.js"'));
});

test("代码引用的 DOM id 全部存在且页面 id 唯一", () => {
  const referenced = [...app.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map(match => match[1]);
  const declared = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  const declaredSet = new Set(declared);
  assert.deepEqual([...new Set(referenced.filter(id => !declaredSet.has(id)))], []);
  assert.equal(declaredSet.size, declared.length);
});

test("新版档案包含文化历史、世界种子与随机状态", () => {
  const version = Number(persistence.match(/version:\s*(\d+),\s*savedAt/)?.[1]);
  assert.ok(version >= 13);
  for (const field of ["chronicle", "worldStats", "worldProgress", "culture", "technology", "worldSeed", "randomState"]) assert.match(app, new RegExp(`\\b${field}\\b`));
});

test("文化科技与六个核心模拟系统相连", () => {
  for (const technology of ["agriculture", "engineering", "metallurgy", "navigation", "medicine", "administration"]) assert.match(game, new RegExp(`\\b${technology}\\b`));
  assert.match(game, /cultureTechnologyStep\(\)/);
  assert.match(game, /exchangeCultures\(/);
  assert.match(app, /data-tech-focus/);
});

test("性能保护保持单次索引重建与自适应生态批处理", () => {
  assert.match(game, /if \(!indexesReady\) rebuildWorldIndexes\(\)/);
  assert.match(game, /const ecologyStride = people\.length \+ animals\.length > BALANCE\.simulation\.adaptiveEcologyThreshold \? 3 : 2/);
  assert.match(game, /countNearbyEntities\(worldIndex\.peopleSpatial/);
});

test("模拟、视图、存档和静态规则保持独立模块边界", () => {
  assert.match(game, /globalThis\.RealmDebug/);
  assert.doesNotMatch(game, /function render\(/);
  assert.doesNotMatch(game, /function buildSaveData\(/);
  assert.match(ui, /function render\(/);
  assert.match(persistence, /function buildSaveData\(/);
  assert.match(config, /globalThis\.RealmConfig/);
});

test("正式运行时代码不绕过种子随机数", () => {
  for (const [name, source] of Object.entries({ game, ui, persistence, config })) assert.doesNotMatch(source, /Math\.random\s*\(/, `${name} 仍在直接调用 Math.random`);
});
