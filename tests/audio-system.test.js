"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "..", "audio-system.js"), "utf8");

function createAudioRuntime() {
  const storage = new Map();
  const context = vm.createContext({
    console,
    performance: { now: () => 1000 },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) },
    document: { hidden: false, addEventListener() {} },
    addEventListener() {}
  });
  context.globalThis = context;
  new vm.Script(source, { filename: "audio-system.js" }).runInContext(context);
  return { audio: context.RealmAudio, storage };
}

test("动态音乐按世界态势选择且危机优先级最高", () => {
  const { audio } = createAudioRuntime();
  assert.equal(audio.chooseMusicMode({ population: 4 }), "peace");
  assert.equal(audio.chooseMusicMode({ population: 80, villages: 5 }), "growth");
  assert.equal(audio.chooseMusicMode({ wars: 2, population: 80 }), "war");
  assert.equal(audio.chooseMusicMode({ activeEvent: true, heroes: 4 }), "legend");
  assert.equal(audio.chooseMusicMode({ disasters: ["flood"], wars: 2 }), "crisis");
  assert.equal(Object.keys(audio.musicModes).length, 5);
});

test("环境混音会响应风暴、洪水、火山和文明规模", () => {
  const { audio } = createAudioRuntime();
  const calm = audio.ambientProfile({ weather: "clear", villages: 0, running: true });
  const storm = audio.ambientProfile({ weather: "storm", rainfall: .9, disasters: ["flood", "volcano"], villages: 8, running: true });
  assert.ok(storm.wind > calm.wind);
  assert.ok(storm.rain > calm.rain);
  assert.ok(storm.water > calm.water);
  assert.ok(storm.fire > calm.fire);
  assert.ok(storm.settlement > calm.settlement);
});

test("分轨设置会归一化、持久化并兼容无 Web Audio 环境", () => {
  const { audio, storage } = createAudioRuntime();
  assert.equal(audio.initialize().enabled, false);
  audio.applySettings({ enabled: true, master: 2, music: -.5, ambient: .42, effects: .81 });
  const settings = audio.getSettings();
  assert.deepEqual(JSON.parse(JSON.stringify(settings)), { enabled: true, master: 1, music: 0, ambient: .42, effects: .81 });
  assert.equal(audio.play("melee"), false);
  assert.match(storage.get("realm-audio-settings-v1"), /"ambient":0\.42/);
});

test("战斗音效目录覆盖兵器、攻城、伤亡与旧接口别名", () => {
  const { audio } = createAudioRuntime();
  for (const name of ["melee", "shield", "arrow", "cavalry", "siegeLaunch", "siegeImpact", "casualty", "construction", "resource"]) assert.ok(audio.soundCatalog[name]);
  assert.equal(audio.playCombat("archer"), false);
  assert.equal(audio.playCombat("cavalry"), false);
  assert.equal(audio.playCombat("siege"), false);
});
