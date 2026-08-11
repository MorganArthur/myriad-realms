"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("首页只加载八个核心脚本", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8"), scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(scripts, ["engine-core.js", "world-config.js", "audio-system.js", "pixel-art-system.js", "game-persistence.js", "experience-system.js", "game-ui.js", "game.js"]);
});

test("退役模块与内容图集已从项目删除", () => {
  for (const file of ["art-atlas.js", "world-event-content.js", "regional-event-content.js", "long-term-system.js", "dynasty-system.js", "politics-system.js", "legacy-system.js", "world-challenge-system.js", "assets/art"]) assert.equal(fs.existsSync(path.join(root, file)), false, `${file} 应被删除`);
});

test("正式代码不再包含已退役对象名称", () => {
  const files = ["index.html", "world-config.js", "audio-system.js", "pixel-art-system.js", "experience-system.js", "game-ui.js", "game-persistence.js", "game.js"], pattern = /achievement|hero|profession|caravan|army|soldier|archer|cavalry|siege|melee|shield|sword/i;
  for (const file of files) assert.doesNotMatch(fs.readFileSync(path.join(root, file), "utf8"), pattern, `${file} 仍有退役概念`);
});
