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
  for (const method of ["arc", "beginPath", "closePath", "ellipse", "fill", "fillRect", "lineTo", "moveTo", "restore", "rotate", "save", "stroke", "strokeRect", "translate"]) context[method] = (...args) => calls.push([method, ...args]);
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

test("十二类建筑拥有独立轮廓、等级和损毁施工状态", () => {
  const art = loadPixelArt(), types = Object.keys(art.buildingSilhouettes); assert.equal(types.length, 12); assert.equal(new Set(Object.values(art.buildingSilhouettes)).size, 12);
  assert.deepEqual(JSON.parse(JSON.stringify(art.structureVisualState({ hp: 100, maxHp: 100, builtYear: 4 }, 3, 4.5))), { integrity: 1, level: 3, construction: true, damage: "intact" });
  assert.equal(art.structureVisualState({ hp: 20, maxHp: 100, builtYear: 1 }, 1, 8).damage, "broken");
  for (const [index, type] of types.entries()) {
    const context = recordingContext(), structure = { id: index + 1, type, x: index, y: 2, hp: type === "wall" ? 25 : 80, maxHp: 100, builtYear: 4 };
    art.drawStructure(context, { structure, definition: { color: "#765432" }, kingdomColor: "#cc8844", villageLevel: 3, currentYear: 4.4, sx: 20, sy: 20, size: 10, time: 2 });
    assert.ok(context.calls.some(call => ["fillRect", "fill"].includes(call[0])), `${type} 没有绘制主体`);
  }
  const village = recordingContext(); art.drawVillageCore(village, { village: { id: 1, level: 3, hp: 30, x: 2, y: 3 }, kingdomColor: "#cc8844", sx: 20, sy: 20, size: 10, time: 2, maxHp: 100 }); assert.ok(village.calls.some(call => call[0] === "ellipse"));
});
