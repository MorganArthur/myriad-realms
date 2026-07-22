"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWorldRuntime } = require("./headless-world.js");

const plain = value => JSON.parse(JSON.stringify(value));

test("新世界生成六处确定性遗迹并开启首个探索挑战", () => {
  const { debug } = createWorldRuntime();
  const first = debug.generate("legacy-foundations").legacy;
  const second = debug.generate("legacy-foundations").legacy;
  assert.equal(first.sites.length, 6);
  assert.deepEqual(plain(first.sites), plain(second.sites));
  assert.equal(first.challenge[0], "relic_seekers");
});

test("遗迹会被文明考察并产出归属明确的神器", () => {
  const { debug } = createWorldRuntime();
  debug.generate("legacy-exploration"); debug.setRandomDisasters(false); debug.step(1400);
  const snapshot = debug.snapshot();
  assert.ok(snapshot.legacy.artifacts.length >= 1);
  assert.ok(snapshot.legacy.sites.some(site => site[2] === "explored" && site[5]));
  assert.ok(snapshot.history.artifactsFound >= 1);
});

test("动态事件支持玩家选择并记录长期结果", () => {
  const { debug } = createWorldRuntime();
  debug.generate("legacy-event");
  let snapshot = debug.triggerLegacyEvent("golden_harvest");
  assert.equal(snapshot.legacy.activeEvent[0], "golden_harvest");
  snapshot = debug.resolveLegacyEvent("store");
  assert.equal(snapshot.legacy.activeEvent, null);
  assert.equal(snapshot.history.dynamicEventsResolved, 1);
});

test("区域事件目录包含三十条情境事件且每条提供三个选择", () => {
  const { debug } = createWorldRuntime();
  const catalog = debug.regionalEventCatalog(), entries = Object.values(catalog);
  assert.equal(entries.length, 30);
  assert.ok(entries.every(entry => entry.focus && entry.choices.length === 3));
  debug.generate("regional-eligibility");
  assert.equal(debug.regionalEventEligibility("golden_harvest", 0), false);
  debug.setRandomDisasters(false); debug.step(160);
  assert.equal(debug.regionalEventEligibility("golden_harvest", 0), true);
});

test("区域事件通过统一效果引擎改变目标文明资源与派系", () => {
  const { debug } = createWorldRuntime();
  debug.generate("regional-effects");
  let snapshot = debug.triggerLegacyEvent("guild_invention"), targetId = snapshot.legacy.activeEvent[1];
  const before = structuredClone(debug.saveData()).kingdoms.find(kingdom => kingdom.id === targetId);
  debug.resolveLegacyEvent("fund");
  const after = debug.saveData().kingdoms.find(kingdom => kingdom.id === targetId);
  assert.equal(after.treasury, before.treasury - 10);
  assert.equal(after.technology.research, before.technology.research + 14);
  assert.equal(after.politics.factions.guilds.influence, before.politics.factions.guilds.influence + 4);
});

test("奇观工程分阶段推进并能完成", () => {
  const { debug } = createWorldRuntime();
  const initial = debug.generate("legacy-wonder"); debug.setRandomDisasters(false);
  const kingdomId = initial.development[0][0];
  debug.beginWonder(kingdomId); debug.step(2100);
  const wonder = debug.snapshot().legacy.wonders.find(entry => entry[2] === kingdomId);
  assert.ok(wonder);
  assert.equal(wonder[3], "complete");
  assert.equal(debug.snapshot().history.wondersCompleted, 1);
});

test("全球危机可通过跨文明干预成功化解", () => {
  const { debug } = createWorldRuntime();
  debug.generate("legacy-crisis");
  let snapshot = debug.triggerWorldCrisis("ashen_winter");
  assert.equal(snapshot.legacy.activeCrisis[0], "ashen_winter");
  for (let index = 0; index < 5; index++) snapshot = debug.interveneWorldCrisis("coordinate");
  assert.equal(snapshot.legacy.activeCrisis, null);
  assert.equal(snapshot.history.crisesResolved, 1);
});

test("v19 存档无损保存遗迹、神器、奇观、危机与挑战状态", () => {
  const { debug } = createWorldRuntime();
  debug.generate("legacy-save"); debug.setRandomDisasters(false); debug.step(900); debug.beginWonder(0); debug.triggerWorldCrisis("red_miasma");
  const before = plain(debug.snapshot().legacy), save = structuredClone(debug.saveData());
  assert.equal(save.version, 19);
  assert.equal(save.legacySites.length, 6);
  assert.ok(save.legacyState);
  debug.restore(save);
  assert.deepEqual(plain(debug.snapshot().legacy), before);
});

test("v17 旧档会补全遗迹、遗产状态与首个轮换挑战", () => {
  const { debug } = createWorldRuntime();
  debug.generate("legacy-migration");
  const save = structuredClone(debug.saveData()); save.version = 17;
  for (const field of ["legacySites", "artifacts", "wonders", "legacyState", "nextLegacySiteId", "nextArtifactId", "nextWonderId"]) delete save[field];
  for (const kingdom of save.kingdoms) delete kingdom.legacy;
  const snapshot = debug.restore(save);
  assert.equal(snapshot.legacy.sites.length, 6);
  assert.equal(snapshot.legacy.artifacts.length, 0);
  assert.equal(snapshot.legacy.challenge[0], "relic_seekers");
  assert.equal(debug.saveData().version, 19);
});
