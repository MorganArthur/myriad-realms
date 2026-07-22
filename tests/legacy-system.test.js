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

test("十二类历史伤痕可被考证、重建、圣化或争夺", () => {
  const { debug } = createWorldRuntime();
  const initial = debug.generate("historical-scars"), kingdomId = initial.development[0][0], secondKingdomId = initial.development[1][0];
  assert.equal(Object.keys(debug.scarCatalog()).length, 12);
  const cases = [["flooded_town", "explore", 10], ["broken_road", "rebuild", 22], ["plague_memorial", "sanctify", 34], ["ancient_battlefield", "contest", 46]];
  for (const [type, action, x] of cases) {
    let snapshot = debug.recordScar(type, x, 18, kingdomId, { cause: `${type}-test` });
    const site = snapshot.legacy.sites.find(entry => entry[1] === type && entry[6] === "historical");
    assert.ok(site);
    snapshot = debug.actOnLegacySite(site[0], action, action === "contest" ? null : kingdomId);
    const resolved = snapshot.legacy.sites.find(entry => entry[0] === site[0]);
    assert.equal(resolved[7], { explore: "explored", rebuild: "rebuilt", sanctify: "sanctified", contest: "contested" }[action]);
    if (action === "contest") assert.notEqual(resolved[4], kingdomId);
  }
  const secondVillage = debug.saveData().villages.find(village => village.kingdom === secondKingdomId);
  const neutral = debug.recordScar("storm_path", secondVillage.x, secondVillage.y, null, { cause: "neutral-owner-test" }).legacy.sites.find(entry => entry[1] === "storm_path" && entry[6] === "historical");
  assert.equal(neutral[4], secondKingdomId);
  assert.equal(debug.snapshot().history.historicalScars, 5);
  assert.equal(debug.snapshot().history.scarsRestored, 1);
});

test("神器可由英雄携带、受损、易主、失落并从历史伤痕中重现", () => {
  const { debug } = createWorldRuntime();
  const initial = debug.generate("artifact-journey"), firstKingdomId = initial.development[0][0], secondKingdomId = initial.development[1][0], siteId = initial.legacy.sites[0][0];
  let snapshot = debug.discoverArtifact(siteId, firstKingdomId), artifact = snapshot.legacy.artifacts[0];
  assert.ok(artifact);
  if (snapshot.heroes.some(hero => hero[1] === firstKingdomId)) { snapshot = debug.manageArtifact(artifact[0], "treasury"); artifact = snapshot.legacy.artifacts[0]; assert.equal(artifact[4], "kingdom"); snapshot = debug.manageArtifact(artifact[0], "hero"); artifact = snapshot.legacy.artifacts[0]; assert.equal(artifact[4], "hero"); }
  snapshot = debug.damageArtifact(artifact[0], 35, "战火擦损"); artifact = snapshot.legacy.artifacts[0];
  assert.equal(artifact[6], "damaged"); assert.equal(artifact[7], 65);
  snapshot = debug.transferArtifact(artifact[0], secondKingdomId); artifact = snapshot.legacy.artifacts[0];
  assert.equal(artifact[2], secondKingdomId); assert.equal(snapshot.history.artifactTransfers, 1);
  snapshot = debug.loseArtifact(artifact[0], "王国覆灭时失落"); artifact = snapshot.legacy.artifacts[0];
  assert.equal(artifact[6], "lost"); assert.ok(artifact[5]);
  snapshot = debug.actOnLegacySite(artifact[5], "explore", secondKingdomId); artifact = snapshot.legacy.artifacts[0];
  assert.notEqual(artifact[6], "lost"); assert.equal(artifact[2], secondKingdomId); assert.equal(snapshot.history.artifactsLost, 1);
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

test("完成的奇观会受损、降低耐久并可由所属文明修复", () => {
  const { debug } = createWorldRuntime();
  const initial = debug.generate("wonder-damage"), kingdomId = initial.development[0][0];
  let snapshot = debug.beginWonder(kingdomId), wonder = snapshot.legacy.wonders[0];
  snapshot = debug.completeWonder(wonder[0]); wonder = snapshot.legacy.wonders[0];
  assert.equal(wonder[3], "complete"); assert.equal(wonder[5], wonder[6]);
  snapshot = debug.damageWonder(wonder[0], 60, "地震"); wonder = snapshot.legacy.wonders[0];
  assert.equal(wonder[3], "damaged"); assert.equal(wonder[5], 240); assert.equal(snapshot.history.wondersDamaged, 1);
  snapshot = debug.restoreWonder(wonder[0]); wonder = snapshot.legacy.wonders[0];
  assert.equal(wonder[3], "complete"); assert.equal(wonder[5], wonder[6]); assert.equal(snapshot.history.wondersRestored, 1);
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

test("v21 存档无损保存遗迹、神器、奇观、危机与挑战状态", () => {
  const { debug } = createWorldRuntime();
  debug.generate("legacy-save"); debug.setRandomDisasters(false); debug.step(900); debug.beginWonder(0); debug.triggerWorldCrisis("red_miasma");
  const before = plain(debug.snapshot().legacy), save = structuredClone(debug.saveData());
  assert.equal(save.version, 21);
  assert.equal(save.legacySites.length, 6);
  assert.ok(save.legacyState);
  debug.restore(save);
  assert.deepEqual(plain(debug.snapshot().legacy), before);
});

test("v19 存档会补全神器持有、耐久与奇观耐久字段", () => {
  const { debug } = createWorldRuntime();
  const initial = debug.generate("heritage-v19-migration"), kingdomId = initial.development[0][0], siteId = initial.legacy.sites[0][0];
  debug.discoverArtifact(siteId, kingdomId); let snapshot = debug.beginWonder(kingdomId), save = structuredClone(debug.saveData()); save.version = 19;
  for (const artifact of save.artifacts) for (const field of ["holderType", "holderId", "status", "durability", "history"]) delete artifact[field];
  for (const wonder of save.wonders) for (const field of ["hp", "maxHp", "damageHistory"]) delete wonder[field];
  snapshot = debug.restore(save);
  assert.equal(snapshot.legacy.artifacts[0][4], "kingdom"); assert.equal(snapshot.legacy.artifacts[0][6], "held"); assert.equal(snapshot.legacy.artifacts[0][7], 100);
  assert.equal(snapshot.legacy.wonders[0][5], 300); assert.equal(snapshot.legacy.wonders[0][6], 300); assert.equal(debug.saveData().version, 21);
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
  assert.equal(debug.saveData().version, 21);
});
