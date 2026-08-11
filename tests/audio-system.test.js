"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

require("../audio-system.js");
const audio = globalThis.RealmAudio;

test("声音层只暴露世界与界面反馈", () => {
  assert.deepEqual(Object.keys(audio.soundCatalog), ["click", "power", "disaster", "event", "construction"]);
  assert.equal(typeof audio.play, "function");
  assert.equal(Object.hasOwn(audio, "playCombat"), false);
});

test("音乐根据人口、国家冲突和天灾切换", () => {
  assert.equal(audio.chooseMusicMode({ population: 2 }), "peace");
  assert.equal(audio.chooseMusicMode({ population: 50 }), "growth");
  assert.equal(audio.chooseMusicMode({ wars: 1 }), "tension");
  assert.equal(audio.chooseMusicMode({ disasters: [{ type: "flood" }] }), "crisis");
});
