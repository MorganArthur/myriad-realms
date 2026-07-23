"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "..", "art-atlas.js"), "utf8");
const context = vm.createContext({}); context.globalThis = context; new vm.Script(source).runInContext(context);

test("原创图集完整映射六英雄、四神器、四奇观和十二事件", () => {
  const art = context.RealmArtAtlas;
  assert.equal(Object.keys(art.atlases.heroes.cells).length, 6);
  assert.equal(Object.keys(art.atlases.artifacts.cells).length, 4);
  assert.equal(Object.keys(art.atlases.wonders.cells).length, 4);
  assert.equal(Object.keys(art.atlases.events.cells).length, 12);
  assert.equal(art.cellStyle("heroes", "statesman"), "--art-x:0%;--art-y:0%");
  assert.equal(art.cellStyle("events", "iron_doctrine"), "--art-x:100%;--art-y:100%");
  assert.equal(art.cellStyle("missing", "none"), "");
});

test("三张像素图集存在且包含有效 PNG 尺寸", () => {
  for (const name of ["hero-archetypes.png", "artifacts-wonders.png", "world-events.png"]) {
    const buffer = fs.readFileSync(path.resolve(__dirname, "..", "assets", "art", name));
    assert.equal(buffer.subarray(1, 4).toString(), "PNG"); assert.ok(buffer.readUInt32BE(16) >= 1000); assert.ok(buffer.readUInt32BE(20) >= 900);
  }
});
