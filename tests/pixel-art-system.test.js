"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "..", "pixel-art-system.js"), "utf8");

function loadPixelArt(reducedMotion = false) {
  const context = vm.createContext({ matchMedia: () => ({ matches: reducedMotion }) }); context.globalThis = context;
  new vm.Script(source, { filename: "pixel-art-system.js" }).runInContext(context); return context.RealmPixelArt;
}

function recordingContext() {
  const calls = [];
  const context = { calls };
  for (const method of ["beginPath", "closePath", "fill", "fillRect", "lineTo", "moveTo", "restore", "save", "stroke"]) context[method] = (...args) => calls.push([method, ...args]);
  return context;
}

test("八类地形色板和坐标纹理保持原创且确定", () => {
  const art = loadPixelArt();
  assert.deepEqual(Object.keys(art.terrainPalettes), ["deep", "water", "sand", "grass", "forest", "mountain", "ash", "fire"]);
  assert.equal(art.visualHash(12, 7, 3), art.visualHash(12, 7, 3)); assert.notEqual(art.visualHash(12, 7, 3), art.visualHash(13, 7, 3));
  assert.equal(art.terrainColor("water", 19, 2), art.terrainColor("water", 19, 2));
});

test("地形绘制会生成基础像素、细节和海岸泡沫", () => {
  const art = loadPixelArt(), context = recordingContext();
  const forestX = Array.from({ length: 20 }, (_, x) => x).find(x => art.visualHash(x, 10) % 2 === 0);
  art.drawTerrainTile(context, { tile: { type: "forest", biomass: .8, temperature: 12, fire: 0 }, x: forestX, y: 10, sx: 10, sy: 20, size: 12, time: 3, coastTop: true });
  assert.ok(context.calls.filter(call => call[0] === "fillRect").length >= 5);
  const mountain = recordingContext(); art.drawTerrainTile(mountain, { tile: { type: "mountain", biomass: 0, temperature: -5, fire: 0 }, x: 1, y: 2, sx: 0, sy: 0, size: 12, time: 0 });
  assert.ok(mountain.calls.some(call => call[0] === "lineTo"));
});

test("环境动画限制为八帧并服从减少动态效果", () => {
  const art = loadPixelArt(); assert.equal(art.animationFrameDue(0), true); assert.equal(art.animationFrameDue(60), false); assert.equal(art.animationFrameDue(125), true);
  const reduced = loadPixelArt(true); assert.equal(reduced.prefersReducedMotion(), true); assert.equal(reduced.animationFrameDue(1000), false);
});
