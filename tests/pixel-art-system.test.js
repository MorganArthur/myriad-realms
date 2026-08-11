"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

require("../world-config.js");
require("../pixel-art-system.js");
const art = globalThis.PixelArt;

test("像素绘制器覆盖全部核心对象", () => {
  for (const method of ["drawTile", "drawPerson", "drawAnimal", "drawStructure", "drawDisaster", "drawWeather"]) assert.equal(typeof art[method], "function");
  assert.equal(Object.hasOwn(art, "drawEquipment"), false);
  assert.equal(Object.hasOwn(art, "drawCombatEffect"), false);
});

test("地形色支持自然、冬季和肥力视图", () => {
  const tile = { terrain: "grass", fertility: .8, dryness: 0, fire: 0 };
  assert.equal(art.terrainColor(tile, "spring", "natural"), globalThis.RealmConfig.terrainColors.grass);
  assert.notEqual(art.terrainColor(tile, "winter", "natural"), globalThis.RealmConfig.terrainColors.grass);
  assert.match(art.terrainColor(tile, "spring", "fertility"), /^hsl\(/);
});
