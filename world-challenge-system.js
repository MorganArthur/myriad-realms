"use strict";

// 跨世界挑战层：可组合规则、分享码、难度评分与独立于存档槽的世界档案。

const challengeEngine = globalThis.WorldEngine;

const worldRuleDefs = Object.freeze({
  scarce_resources: { name: "资源匮乏", icon: "◇", points: 2, description: "初始储备与长期产出减少。", multipliers: { startResources: .72 }, modifiers: { food: -.16, wood: -.1, stone: -.05 } },
  harsh_climate: { name: "严酷气候", icon: "❄", points: 2, description: "粮食与居民健康持续承压。", modifiers: { food: -.08, health: -.06 } },
  relentless_disasters: { name: "天灾无休", icon: "☄", points: 3, description: "随机天灾更频繁且强度提高。", multipliers: { disasterInterval: .62 }, modifiers: { disasterIntensity: 1 } },
  fractured_realms: { name: "诸国猜忌", icon: "⚔", points: 2, description: "初始关系恶化，信任持续流失。", modifiers: { startRelations: -18, trust: -.06, unrest: .035 } },
  fragile_ecology: { name: "脆弱生态", icon: "🐾", points: 2, description: "初始野生种群减少且恢复更困难。", multipliers: { startAnimals: .78 }, modifiers: { animalHealth: -.05 } },
  slow_progress: { name: "知识长夜", icon: "▤", points: 2, description: "初始研究与长期科研速度降低。", multipliers: { startResearch: .65 }, modifiers: { research: -.13 } }
});

const crossWorldArchiveKey = "realm-cross-world-archive-v1";
let worldRuleState = createWorldRuleState();
let worldRuleDraft = [];
let worldChallengeUiReady = false;
let worldRunSequence = 0;

function createWorldRuleState() { return { selected: [], runId: null, startedAt: null }; }
function normalizedWorldRuleIds(ids) { const requested = new Set(Array.isArray(ids) ? ids : []); return Object.keys(worldRuleDefs).filter(id => requested.has(id)); }
function activeWorldRuleIds() { return normalizedWorldRuleIds(worldRuleState.selected); }
function draftWorldRuleIds() { return normalizedWorldRuleIds(worldRuleDraft); }
function worldRuleDifficulty(ids = activeWorldRuleIds()) { return normalizedWorldRuleIds(ids).reduce((sum, id) => sum + worldRuleDefs[id].points, 0); }
function worldRuleModifier(key) { return activeWorldRuleIds().reduce((sum, id) => sum + Number(worldRuleDefs[id].modifiers?.[key] || 0), 0); }
function worldRuleMultiplier(key) { return activeWorldRuleIds().reduce((product, id) => product * Number(worldRuleDefs[id].multipliers?.[key] || 1), 1); }

function setWorldRules(ids, rerender = true) {
  worldRuleDraft = normalizedWorldRuleIds(ids); if (rerender) renderWorldRuleControls(); return draftWorldRuleIds();
}

function buildWorldChallengeCode(seed = worldSeed, ids = activeWorldRuleIds()) {
  const normalizedSeed = challengeEngine.normalizeSeed(seed || "myriad-realms"); return `MYR1|${encodeURIComponent(normalizedSeed)}|${normalizedWorldRuleIds(ids).join(",")}`;
}

function parseWorldChallengeCode(code) {
  const parts = String(code || "").trim().split("|"); if (parts.length !== 3 || parts[0] !== "MYR1") return null;
  try { const seed = challengeEngine.normalizeSeed(decodeURIComponent(parts[1])); return seed ? { seed, rules: normalizedWorldRuleIds(parts[2] ? parts[2].split(",") : []) } : null; } catch { return null; }
}

function worldRunId(seed) {
  let hash = 2166136261; for (const character of String(seed)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return `${Date.now().toString(36)}-${(hash >>> 0).toString(36)}-${(++worldRunSequence).toString(36)}`;
}

function beginWorldRuleRun(seed) { worldRuleState.selected = draftWorldRuleIds(); worldRuleState.runId = worldRunId(seed); worldRuleState.startedAt = new Date().toISOString(); renderWorldRuleControls(); }

function applyWorldRuleGeneration() {
  const resourceMultiplier = worldRuleMultiplier("startResources"), researchMultiplier = worldRuleMultiplier("startResearch"), relationShift = worldRuleModifier("startRelations");
  for (const kingdom of kingdoms) {
    for (const resource of ["food", "wood", "stone"]) kingdom.resources[resource] = Math.max(0, kingdom.resources[resource] * resourceMultiplier);
    kingdom.technology.research *= researchMultiplier;
  }
  if (relationShift) for (let first = 0; first < kingdoms.length; first++) for (let second = first + 1; second < kingdoms.length; second++) for (const relation of [relationBetween(kingdoms[first].id, kingdoms[second].id), relationBetween(kingdoms[second].id, kingdoms[first].id)].filter(Boolean)) { relation.score = challengeEngine.clamp(relation.score + relationShift, -100, 100); relation.trust = challengeEngine.clamp((relation.trust || 50) + relationShift * .55, 0, 100); relation.grievance = challengeEngine.clamp((relation.grievance || 0) + Math.max(0, -relationShift) * .35, 0, 100); }
  const animalMultiplier = worldRuleMultiplier("startAnimals");
  if (animalMultiplier < 1) {
    const totals = Object.fromEntries(Object.keys(animalDefs).map(species => [species, 0])), retained = { ...totals };
    for (const animal of animals) totals[animal.species] = (totals[animal.species] || 0) + 1;
    animals = animals.filter(animal => ++retained[animal.species] <= Math.max(1, Math.floor(totals[animal.species] * animalMultiplier)));
  }
  if (activeWorldRuleIds().length) addEvent(`◇ 挑战规则生效：${activeWorldRuleIds().map(id => worldRuleDefs[id].name).join("、")}。`, "challenge");
}

function worldRuleSimulationStep() {
  const food = worldRuleModifier("food"), wood = worldRuleModifier("wood"), stone = worldRuleModifier("stone"), research = worldRuleModifier("research"), health = worldRuleModifier("health"), unrest = worldRuleModifier("unrest"), trust = worldRuleModifier("trust"), animalHealth = worldRuleModifier("animalHealth");
  if (!activeWorldRuleIds().length) return;
  for (const kingdom of kingdoms.filter(candidate => !candidate.defeated)) { kingdom.resources.food = challengeEngine.clamp(kingdom.resources.food + food, 0, 9999); kingdom.resources.wood = challengeEngine.clamp(kingdom.resources.wood + wood, 0, 9999); kingdom.resources.stone = challengeEngine.clamp(kingdom.resources.stone + stone, 0, 9999); kingdom.technology.research = Math.max(0, kingdom.technology.research + research); kingdom.unrest = challengeEngine.clamp(kingdom.unrest + unrest, 0, 100); }
  if (health) for (const person of people) person.needs.health = challengeEngine.clamp((person.needs.health || 60) + health, 0, 100);
  if (animalHealth) for (const animal of animals) { animal.health = challengeEngine.clamp(animal.health + animalHealth, 1, animalDefs[animal.species]?.health || 100); animal.hunger = challengeEngine.clamp(animal.hunger + animalHealth * .5, 0, 100); }
  if (trust) { const active = kingdoms.filter(kingdom => !kingdom.defeated); for (let first = 0; first < active.length; first++) for (let second = first + 1; second < active.length; second++) for (const relation of [relationBetween(active[first].id, active[second].id), relationBetween(active[second].id, active[first].id)].filter(Boolean)) { relation.score = challengeEngine.clamp(relation.score + trust, -100, 100); relation.trust = challengeEngine.clamp((relation.trust || 50) + trust, 0, 100); } }
}

function worldChallengeScore() {
  const achievements = Object.keys(worldProgress.achievements || {}).length, goals = Object.keys(worldProgress.completedGoals || {}).length, activeKingdoms = kingdoms.filter(kingdom => !kingdom.defeated).length;
  const base = Math.max(0, year * 3 + people.length * 1.5 + activeKingdoms * 25 + achievements * 12 + goals * 20 + (worldStats.crisesResolved || 0) * 35 + (worldStats.wondersCompleted || 0) * 25 + worldProgress.renown - (worldStats.crisesFailed || 0) * 8);
  return Math.round(base * (1 + worldRuleDifficulty() * .1));
}

function normalizeArchiveEntry(entry) {
  if (!entry || !entry.runId || !entry.seed) return null; const rules = normalizedWorldRuleIds(entry.rules);
  return { runId: challengeEngine.cleanText(entry.runId), worldName: challengeEngine.cleanText(entry.worldName) || "无名世界", seed: challengeEngine.normalizeSeed(entry.seed), rules, code: buildWorldChallengeCode(entry.seed, rules), difficulty: worldRuleDifficulty(rules), year: Math.max(1, Number(entry.year) || 1), population: Math.max(0, Number(entry.population) || 0), kingdoms: Math.max(0, Number(entry.kingdoms) || 0), animals: Math.max(0, Number(entry.animals) || 0), renown: Math.max(0, Number(entry.renown) || 0), achievements: Math.max(0, Number(entry.achievements) || 0), legacies: Math.max(0, Number(entry.legacies) || 0), score: Math.max(0, Number(entry.score) || 0), reason: ["manual", "replaced", "completed"].includes(entry.reason) ? entry.reason : "manual", archivedAt: entry.archivedAt || new Date().toISOString() };
}

function readCrossWorldArchive() {
  try { const parsed = JSON.parse(localStorage.getItem(crossWorldArchiveKey) || "[]"); return (Array.isArray(parsed) ? parsed : []).map(normalizeArchiveEntry).filter(Boolean).slice(0, 30); } catch { return []; }
}

function writeCrossWorldArchive(entries) { localStorage.setItem(crossWorldArchiveKey, JSON.stringify(entries.slice(0, 30))); }

function currentWorldArchiveEntry(reason = "manual") {
  return normalizeArchiveEntry({ runId: worldRuleState.runId || worldRunId(worldSeed), worldName: document.getElementById("worldName")?.textContent, seed: worldSeed, rules: activeWorldRuleIds(), year: Math.floor(year), population: people.length, kingdoms: kingdoms.filter(kingdom => !kingdom.defeated).length, animals: animals.length, renown: Math.floor(worldProgress.renown), achievements: Object.keys(worldProgress.achievements || {}).length, legacies: legacyState.crisisLegacies?.length || 0, score: worldChallengeScore(), reason, archivedAt: new Date().toISOString() });
}

function archiveCurrentWorld(reason = "manual", notifyUser = true) {
  if (!worldSeed || !tiles.length) return false; const entry = currentWorldArchiveEntry(reason), entries = readCrossWorldArchive(), index = entries.findIndex(candidate => candidate.runId === entry.runId);
  if (index >= 0) entries[index] = entry; else entries.unshift(entry); entries.sort((first, second) => second.score - first.score || second.year - first.year); writeCrossWorldArchive(entries); renderCrossWorldArchive(); if (notifyUser && typeof showToast === "function") showToast(`已封存“${entry.worldName}” · ${entry.score} 分`); return true;
}

function deleteCrossWorldArchive(runId) { const entries = readCrossWorldArchive().filter(entry => entry.runId !== runId); writeCrossWorldArchive(entries); renderCrossWorldArchive(); }

function renderWorldRuleControls() {
  const list = document.getElementById("worldRuleList"), difficulty = document.getElementById("challengeDifficulty"), code = document.getElementById("challengeCodeInput"), draft = draftWorldRuleIds(), selected = new Set(draft), pending = draft.join(",") !== activeWorldRuleIds().join(",");
  if (list) list.innerHTML = Object.entries(worldRuleDefs).map(([id, definition]) => `<button type="button" class="world-rule ${selected.has(id) ? "active" : ""}" data-world-rule="${id}" title="${definition.description}"><span>${definition.icon} ${definition.name}</span><b>+${definition.points}</b></button>`).join("");
  if (difficulty) difficulty.textContent = selected.size ? `难度 ${worldRuleDifficulty(draft)} · 评分倍率 ×${(1 + worldRuleDifficulty(draft) * .1).toFixed(1)}${pending ? " · 待生成" : ""}` : `标准沙盒 · 不启用挑战加成${pending ? " · 待生成" : ""}`;
  if (code && document.activeElement !== code) code.value = buildWorldChallengeCode(document.getElementById("worldSeedInput")?.value || worldSeed || "myriad-realms", draft);
}

function renderCrossWorldArchive() {
  const list = document.getElementById("crossWorldArchiveList"); if (!list) return; const entries = readCrossWorldArchive();
  list.innerHTML = entries.length ? entries.map((entry, index) => `<article class="cross-world-entry"><div><b>#${index + 1} ${entry.worldName}</b><span>纪元 ${entry.year} · ${entry.population} 人 · ${entry.kingdoms} 国 · 难度 ${entry.difficulty}</span><small>${entry.rules.length ? entry.rules.map(id => worldRuleDefs[id].name).join(" · ") : "标准沙盒"} · 永久遗产 ${entry.legacies}</small></div><strong>${entry.score}</strong><div class="slot-actions"><button data-world-archive-action="rules" data-run-id="${entry.runId}">载入规则</button><button class="delete-slot" data-world-archive-action="delete" data-run-id="${entry.runId}">删除</button></div></article>`).join("") : `<p class="muted">尚未封存任何世界；这里的记录不会随存档槽覆盖而消失。</p>`;
}

function applyChallengeCodeInput() {
  const input = document.getElementById("challengeCodeInput"), parsed = parseWorldChallengeCode(input?.value); if (!parsed) { showToast("挑战码格式无效"); return false; }
  document.getElementById("worldSeedInput").value = parsed.seed; setWorldRules(parsed.rules); showToast("挑战码已载入，生成新世界后生效"); return true;
}

async function copyChallengeCode() {
  const code = buildWorldChallengeCode(document.getElementById("worldSeedInput")?.value || worldSeed, draftWorldRuleIds()); document.getElementById("challengeCodeInput").value = code;
  try { await navigator.clipboard.writeText(code); showToast("挑战码已复制"); } catch { document.getElementById("challengeCodeInput").select(); showToast("挑战码已选中，请手动复制"); }
}

function normalizeWorldRuleState(saved) {
  worldRuleState = { selected: normalizedWorldRuleIds(saved?.selected), runId: challengeEngine.cleanText(saved?.runId) || worldRunId(worldSeed), startedAt: saved?.startedAt || new Date().toISOString() }; worldRuleDraft = activeWorldRuleIds(); renderWorldRuleControls();
}

function initializeWorldChallengeUI() {
  if (worldChallengeUiReady) return; worldChallengeUiReady = true;
  document.getElementById("worldRuleList")?.addEventListener("click", event => { const id = event.target.closest?.("[data-world-rule]")?.dataset.worldRule; if (!worldRuleDefs[id]) return; const selected = new Set(draftWorldRuleIds()); if (selected.has(id)) selected.delete(id); else selected.add(id); setWorldRules([...selected]); });
  document.getElementById("worldSeedInput")?.addEventListener("input", renderWorldRuleControls); document.getElementById("applyChallengeCodeBtn")?.addEventListener("click", applyChallengeCodeInput); document.getElementById("copyChallengeCodeBtn")?.addEventListener("click", copyChallengeCode);
  document.getElementById("archiveCurrentWorldBtn")?.addEventListener("click", () => archiveCurrentWorld("manual", true));
  document.getElementById("crossWorldArchiveList")?.addEventListener("click", event => { const button = event.target.closest?.("[data-world-archive-action]"); if (!button) return; const entries = readCrossWorldArchive(), entry = entries.find(candidate => candidate.runId === button.dataset.runId); if (!entry) return; if (button.dataset.worldArchiveAction === "rules") { document.getElementById("worldSeedInput").value = entry.seed; setWorldRules(entry.rules); closeArchive(); showToast("已载入档案中的种子与规则"); } if (button.dataset.worldArchiveAction === "delete" && confirm(`删除“${entry.worldName}”的跨世界记录吗？`)) { deleteCrossWorldArchive(entry.runId); showToast("跨世界记录已删除"); } });
  renderWorldRuleControls(); renderCrossWorldArchive();
}

globalThis.RealmChallenges = Object.freeze({ worldRuleDefs, buildWorldChallengeCode, parseWorldChallengeCode, setWorldRules, worldRuleModifier, worldRuleMultiplier, worldRuleDifficulty, worldChallengeScore, readCrossWorldArchive, archiveCurrentWorld });
