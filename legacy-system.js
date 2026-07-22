"use strict";

// 世界遗产层：动态事件、遗迹探索、神器、奇观工程、全球危机与轮换挑战。

const legacyEngine = globalThis.WorldEngine;

const ruinDefs = Object.freeze({
  star_observatory: { name: "群星观测台", icon: "✧", color: "#8fb9d8", lore: "断裂的星盘仍在记录陌生天体的轨迹。", artifact: "star_compass" },
  ember_vault: { name: "余烬锻库", icon: "◆", color: "#d7895d", lore: "熄灭千年的炉膛下埋藏着失落的锻造技艺。", artifact: "titan_hammer" },
  verdant_shrine: { name: "苍翠圣所", icon: "❧", color: "#75b779", lore: "巨树根系包裹着一座比现存文明更古老的神殿。", artifact: "verdant_crown" },
  drowned_archive: { name: "沉潮档案馆", icon: "▤", color: "#67afbd", lore: "潮水退去时，刻满盟誓的石室短暂显露。", artifact: "oath_tablet" }
});

const artifactDefs = Object.freeze({
  star_compass: { name: "星界罗盘", icon: "✧", color: "#9cc9e4", effect: "推动航运与研究，并加快遗迹探索。" },
  titan_hammer: { name: "泰坦铸锤", icon: "⚒", color: "#dfa06b", effect: "提高木石积累与奇观营造效率。" },
  verdant_crown: { name: "苍生之冠", icon: "♧", color: "#8acb7f", effect: "改善粮食、健康与自然恢复。" },
  oath_tablet: { name: "万邦誓碑", icon: "▤", color: "#d4bd75", effect: "提高合法性、凝聚力与非战争外交。" }
});

const wonderDefs = Object.freeze({
  grand_library: { name: "万卷穹庭", icon: "📚", color: "#82bad1", race: "human", effect: "行政与研究获得持续推动。" },
  worldroot_garden: { name: "世界根花园", icon: "🌳", color: "#79bd76", race: "elf", effect: "粮食、医药与居民健康持续改善。" },
  eternal_forge: { name: "永恒熔炉", icon: "⚒", color: "#d58a5c", race: "dwarf", effect: "资源积累与建筑修复效率提高。" },
  sky_citadel: { name: "苍穹战垒", icon: "🏰", color: "#cf7667", race: "orc", effect: "军团士气、合法性与国土防御提高。" }
});

const dynamicEventDefs = Object.freeze({
  golden_harvest: { name: "金穗丰年", icon: "🌾", text: "异常温和的季节带来超额收成。各文明必须决定如何处理这份短暂的富足。", choices: [
    { id: "store", label: "充实粮仓", hint: "各国获得粮食储备", effect: "store_food" },
    { id: "festival", label: "举办庆典", hint: "提高幸福与合法性", effect: "festival" },
    { id: "seed", label: "保留良种", hint: "推动农业研究", effect: "agriculture" }
  ] },
  border_envoys: { name: "边境使团", icon: "🕊", text: "一支未经预约的使团穿过争议边境，既可能打开谈判，也可能成为新的导火索。", choices: [
    { id: "welcome", label: "礼遇使团", hint: "改善国家互信", effect: "diplomacy" },
    { id: "terms", label: "交换条件", hint: "获得国库与贸易收益", effect: "commerce" },
    { id: "detain", label: "扣押盘问", hint: "提高戒备但积累旧怨", effect: "detain" }
  ] },
  guild_invention: { name: "工坊新法", icon: "⚙", text: "行会呈上一套前所未见的工具。资助、开放还是封存，将决定技术如何扩散。", choices: [
    { id: "patronage", label: "国家资助", hint: "消耗国库，大幅推动研究", effect: "patronage" },
    { id: "open", label: "公开技艺", hint: "所有文明获得研究", effect: "open_knowledge" },
    { id: "license", label: "授予专营", hint: "国库获利，行会影响上升", effect: "license" }
  ] },
  wandering_people: { name: "流民长队", icon: "🚶", text: "战乱与灾害之外，一支寻找新家园的长队出现在文明边缘。", choices: [
    { id: "shelter", label: "安置流民", hint: "民生改善但消耗粮食", effect: "shelter" },
    { id: "settle", label: "开垦边地", hint: "获得资源与行政经验", effect: "settle" },
    { id: "close", label: "封闭边界", hint: "安全上升但幸福下降", effect: "close_border" }
  ] },
  comet_faith: { name: "彗星之夜", icon: "☄", text: "明亮彗星照耀数夜，祭司、学者与将军都宣称自己理解它的含义。", choices: [
    { id: "observe", label: "记录天象", hint: "推动研究并缩短遗迹探索", effect: "observe" },
    { id: "rite", label: "举行仪式", hint: "提高信仰与凝聚力", effect: "rite" },
    { id: "omen", label: "宣告军兆", hint: "提高尚武与军团士气", effect: "war_omen" }
  ] }
});

const crisisDefs = Object.freeze({
  ashen_winter: { name: "灰烬长冬", icon: "❄", color: "#9fb8c8", duration: 16, text: "高空灰尘遮蔽日光，作物歉收与严寒正在同时席卷大陆。", response: "储粮、医药与协作" },
  red_miasma: { name: "赤雾疫潮", icon: "☣", color: "#9bc46b", duration: 14, text: "一种跨越国境传播的疫病迫使各文明共享医药、隔离与救济经验。", response: "医药、救济与公共秩序" },
  broken_oaths: { name: "盟誓崩解", icon: "⚔", color: "#d66f63", duration: 15, text: "旧怨、军备与边境冲突形成连锁反应，世界秩序濒临全面战争。", response: "外交、权威与共同约束" }
});

const challengeDefs = Object.freeze({
  relic_seekers: { name: "寻古者之约", icon: "🗿", metric: () => artifacts.length, target: 1, duration: 22, reward: 18, text: "在期限内从遗迹中寻得一件神器。" },
  builders_call: { name: "巨匠之约", icon: "🏗", metric: () => wonders.filter(wonder => wonder.status === "complete").length, target: 1, duration: 34, reward: 24, text: "在期限内完成一座世界奇观。" },
  caravan_compact: { name: "百队通商", icon: "🐫", metric: () => worldStats.tradeDeliveries || 0, target: 8, duration: 24, reward: 18, text: "在期限内完成八次新的商队交付。" },
  disaster_vigil: { name: "守望者誓约", icon: "🛡", metric: () => worldStats.disastersSurvived || 0, target: 2, duration: 26, reward: 20, text: "在期限内让世界安然度过两场天灾。" }
});

let legacySites = [], artifacts = [], wonders = [];
let nextLegacySiteId = 1, nextArtifactId = 1, nextWonderId = 1;
let legacyState = createLegacyState();
let selectedLegacyId = null;
let legacyUiReady = false;

function createLegacyState() {
  return { nextEventYear: 7, activeEvent: null, eventHistory: [], nextCrisisYear: 28, activeCrisis: null, crisisHistory: [], challenge: null, challengeHistory: [], nextChallengeYear: 1 };
}

function resetLegacyState() {
  legacySites = []; artifacts = []; wonders = []; nextLegacySiteId = 1; nextArtifactId = 1; nextWonderId = 1; selectedLegacyId = null;
  legacyState = createLegacyState();
}

function legacyTileCandidate(existing = []) {
  for (let attempt = 0; attempt < 600; attempt++) {
    const x = legacyEngine.randi(3, MAP_W - 4), y = legacyEngine.randi(3, MAP_H - 4), tile = tileAt(x, y);
    if (!isLand(tile) || tile.type === "mountain" || tile.fire > 0) continue;
    if (villages.some(village => Math.hypot(village.x - x, village.y - y) < 6)) continue;
    if (existing.some(site => Math.hypot(site.x - x, site.y - y) < 12)) continue;
    return { x, y };
  }
  const fallback = tiles.findIndex((tile, index) => isLand(tile) && tile.type !== "mountain" && index % 17 === 0);
  return fallback >= 0 ? { x: fallback % MAP_W, y: Math.floor(fallback / MAP_W) } : { x: Math.floor(MAP_W / 2), y: Math.floor(MAP_H / 2) };
}

function seedLegacySites(count = 6) {
  const types = Object.keys(ruinDefs);
  for (let index = legacySites.length; index < count; index++) {
    const position = legacyTileCandidate(legacySites), type = types[(index + legacyEngine.randi(0, types.length - 1)) % types.length];
    legacySites.push({ id: nextLegacySiteId++, type, x: position.x, y: position.y, status: "hidden", progress: 0, kingdomId: null, discoveredYear: null, exploredYear: null, artifactId: null });
  }
}

function startWorldChallenge(id = null) {
  const candidates = Object.keys(challengeDefs).filter(candidate => candidate !== legacyState.challenge?.id);
  const selected = challengeDefs[id] ? id : candidates[legacyEngine.randi(0, candidates.length - 1)], definition = challengeDefs[selected];
  legacyState.challenge = { id: selected, startedYear: Math.floor(year), deadline: year + definition.duration, baseline: definition.metric(), progress: 0 };
  legacyState.nextChallengeYear = Infinity;
  addEvent(`${definition.icon} 世界挑战“${definition.name}”开启：${definition.text}`, "legacy");
  return legacyState.challenge;
}

function initializeLegacyWorld() {
  if (!legacySites.length) seedLegacySites(6);
  legacyState.nextEventYear = year + 6 + legacyEngine.randi(0, 5);
  legacyState.nextCrisisYear = year + 26 + legacyEngine.randi(0, 8);
  if (!legacyState.challenge) startWorldChallenge("relic_seekers");
}

function nearestKingdomToSite(site) {
  let selected = null, best = Infinity;
  for (const kingdom of kingdoms) {
    if (kingdom.defeated) continue;
    const distance = Math.min(...villagesOfKingdom(kingdom.id).map(village => Math.hypot(village.x - site.x, village.y - site.y)), Infinity);
    if (distance < best) { best = distance; selected = kingdom; }
  }
  return selected;
}

function artifactIdsForKingdom(kingdomId) { return artifacts.filter(artifact => artifact.kingdomId === kingdomId).map(artifact => artifact.id); }

function discoverArtifact(site, kingdom) {
  if (!site || site.artifactId || !kingdom) return null;
  const definition = ruinDefs[site.type], artifact = { id: nextArtifactId++, type: definition.artifact, kingdomId: kingdom.id, siteId: site.id, foundYear: Math.floor(year) };
  artifacts.push(artifact); site.artifactId = artifact.id; site.status = "explored"; site.progress = 100; site.exploredYear = Math.floor(year);
  kingdom.legacy ||= {}; kingdom.legacy.artifactIds = artifactIdsForKingdom(kingdom.id);
  worldStats.ruinsExplored = (worldStats.ruinsExplored || 0) + 1; worldStats.artifactsFound = (worldStats.artifactsFound || 0) + 1; worldProgress.renown += 6;
  const artifactDefinition = artifactDefs[artifact.type]; kingdom.technology.research += 6; kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy + 3, 0, 100);
  addEvent(`${artifactDefinition.icon} ${kingdom.name}探索${definition.name}，寻得神器“${artifactDefinition.name}”。`, "legacy");
  spawnExperienceEffect("event", site.x, site.y, artifactDefinition.color); playExperienceSound("event");
  return artifact;
}

function exploreLegacySites() {
  for (const site of legacySites) {
    if (site.status === "explored") continue;
    const kingdom = getKingdom(site.kingdomId) && !getKingdom(site.kingdomId).defeated ? getKingdom(site.kingdomId) : nearestKingdomToSite(site);
    if (!kingdom) continue;
    if (site.status === "hidden") {
      site.status = "exploring"; site.kingdomId = kingdom.id; site.discoveredYear = Math.floor(year);
      addEvent(`${ruinDefs[site.type].icon} ${kingdom.name}的斥候发现了${ruinDefs[site.type].name}。`, "legacy");
    }
    const explorers = heroes.filter(hero => hero.status === "active" && hero.kingdomId === kingdom.id && hero.archetype === "explorer").length;
    const compass = artifacts.some(artifact => artifact.kingdomId === kingdom.id && artifact.type === "star_compass") ? 1 : 0;
    const discoveryPace = 4.2 + (site.id * 7 % 4) * .55;
    site.progress = legacyEngine.clamp(site.progress + discoveryPace + technologyLevel(kingdom, "navigation") * .8 + explorers * 1.4 + compass * 1.2, 0, 100);
    if (site.progress >= 100) discoverArtifact(site, kingdom);
  }
}

function chooseWonderFor(kingdom) {
  const preferred = Object.entries(wonderDefs).find(([, definition]) => definition.race === kingdom.race)?.[0];
  const occupied = new Set(wonders.filter(wonder => wonder.status !== "ruined").map(wonder => wonder.type));
  if (preferred && !occupied.has(preferred)) return preferred;
  return Object.keys(wonderDefs).find(id => !occupied.has(id)) || preferred || Object.keys(wonderDefs)[0];
}

function beginWonderProject(kingdom, forced = false) {
  if (!kingdom || kingdom.defeated || wonders.some(wonder => wonder.kingdomId === kingdom.id && wonder.status !== "ruined")) return null;
  const villages = villagesOfKingdom(kingdom.id), structures = villages.flatMap(village => village.structures || []);
  if (!forced && (eraIndexOf(kingdom.development?.era) < 2 || structures.length < 16 || kingdom.resources.wood < 55 || kingdom.resources.stone < 32)) return null;
  const capital = villages[0]; if (!capital) return null;
  const type = chooseWonderFor(kingdom), wonder = { id: nextWonderId++, type, kingdomId: kingdom.id, villageId: capital.id, x: capital.x + 1, y: capital.y, progress: 0, status: "building", sponsored: Boolean(forced), startedYear: Math.floor(year), completedYear: null };
  wonders.push(wonder); kingdom.legacy ||= {}; kingdom.legacy.wonderId = wonder.id;
  addEvent(`${wonderDefs[type].icon} ${kingdom.name}在${capital.name}奠基世界奇观“${wonderDefs[type].name}”。`, "wonder");
  return wonder;
}

function completeWonder(wonder, kingdom) {
  wonder.status = "complete"; wonder.progress = 100; wonder.completedYear = Math.floor(year);
  worldStats.wondersCompleted = (worldStats.wondersCompleted || 0) + 1; worldProgress.renown += 20; kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy + 9, 0, 100); kingdom.culture.influence += 14;
  addEvent(`${wonderDefs[wonder.type].icon} ${kingdom.name}完成世界奇观“${wonderDefs[wonder.type].name}”。${wonderDefs[wonder.type].effect}`, "wonder");
  spawnExperienceEffect("event", wonder.x, wonder.y, wonderDefs[wonder.type].color); playExperienceSound("event");
}

function applyArtifactAndWonderEffects(kingdom) {
  const owned = artifacts.filter(artifact => artifact.kingdomId === kingdom.id).map(artifact => artifact.type);
  if (owned.includes("star_compass")) { kingdom.technology.research += .16; kingdom.treasury = Math.min(99999, kingdom.treasury + .08); }
  if (owned.includes("titan_hammer")) { kingdom.resources.wood = Math.min(9999, kingdom.resources.wood + .18); kingdom.resources.stone = Math.min(9999, kingdom.resources.stone + .22); }
  if (owned.includes("verdant_crown")) { kingdom.resources.food = Math.min(9999, kingdom.resources.food + .28); for (const person of peopleOfKingdom(kingdom.id).slice(0, 10)) person.needs.health = legacyEngine.clamp((person.needs.health || 60) + .18, 0, 100); }
  if (owned.includes("oath_tablet")) { kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy + .07, 0, 100); kingdom.unrest = legacyEngine.clamp(kingdom.unrest - .05, 0, 100); }
  const completed = wonders.find(wonder => wonder.kingdomId === kingdom.id && wonder.status === "complete"); if (!completed) return;
  if (completed.type === "grand_library") kingdom.technology.research += .32;
  if (completed.type === "worldroot_garden") kingdom.resources.food = Math.min(9999, kingdom.resources.food + .45);
  if (completed.type === "eternal_forge") { kingdom.resources.wood += .22; kingdom.resources.stone += .3; const damaged = villagesOfKingdom(kingdom.id).flatMap(village => village.structures || []).find(structure => structure.hp < structure.maxHp); if (damaged) damaged.hp = Math.min(damaged.maxHp, damaged.hp + .5); }
  if (completed.type === "sky_citadel") { kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy + .08, 0, 100); for (const army of armies.filter(candidate => candidate.kingdomId === kingdom.id)) army.morale = legacyEngine.clamp(army.morale + .12, 0, 100); }
}

function wonderStep() {
  for (const kingdom of kingdoms) {
    if (kingdom.defeated) continue;
    kingdom.legacy ||= { artifactIds: [], wonderId: null }; kingdom.legacy.artifactIds = artifactIdsForKingdom(kingdom.id);
    let wonder = wonders.find(candidate => candidate.kingdomId === kingdom.id && candidate.status !== "ruined");
    if (!wonder) wonder = beginWonderProject(kingdom, false);
    if (wonder?.status === "building") {
      const builders = peopleOfKingdom(kingdom.id).filter(person => person.profession === "builder").length, hammer = artifacts.some(artifact => artifact.kingdomId === kingdom.id && artifact.type === "titan_hammer") ? 1 : 0;
      if (wonder.sponsored || (kingdom.resources.wood >= 1.2 && kingdom.resources.stone >= .8 && kingdom.treasury >= .35)) {
        kingdom.resources.wood = Math.max(0, kingdom.resources.wood - 1.2); kingdom.resources.stone = Math.max(0, kingdom.resources.stone - .8); kingdom.treasury = Math.max(0, kingdom.treasury - .35);
        wonder.progress = legacyEngine.clamp(wonder.progress + 3.2 + technologyLevel(kingdom, "engineering") * .75 + Math.min(4, builders) * .25 + hammer, 0, 100);
      }
      if (wonder.progress >= 100) completeWonder(wonder, kingdom);
    }
    applyArtifactAndWonderEffects(kingdom);
  }
  for (const wonder of wonders) if (getKingdom(wonder.kingdomId)?.defeated && wonder.status !== "ruined") { wonder.status = "ruined"; addEvent(`${wonderDefs[wonder.type].icon} ${wonderDefs[wonder.type].name}随其建造文明覆灭，成为新的遗迹。`, "wonder"); }
}

function eventTargetKingdom() {
  return [...kingdoms].filter(kingdom => !kingdom.defeated).sort((a, b) => peopleOfKingdom(b.id).length + totalTechnologyLevel(b) * 3 - peopleOfKingdom(a.id).length - totalTechnologyLevel(a) * 3)[0] || null;
}

function activateDynamicEvent(id = null) {
  if (legacyState.activeEvent || worldEventState.active) return false;
  const ids = Object.keys(dynamicEventDefs), eventId = dynamicEventDefs[id] ? id : ids[legacyEngine.randi(0, ids.length - 1)], definition = dynamicEventDefs[eventId], target = eventTargetKingdom();
  if (!target) return false;
  const resumeAfterChoice = typeof running !== "undefined" && running && !debugBatchMode;
  legacyState.activeEvent = { id: eventId, kingdomId: target.id, startedYear: Math.floor(year), resumeAfterChoice };
  if (resumeAfterChoice) setRunning(false, false);
  addEvent(`${definition.icon} 动态事件“${definition.name}”正在等待抉择。`, "legacy"); renderLegacyChoiceModal(); renderLegacyPanels(); playExperienceSound("event"); return true;
}

function applyDynamicEventEffect(effect, target) {
  const active = kingdoms.filter(kingdom => !kingdom.defeated);
  if (effect === "store_food") for (const kingdom of active) kingdom.resources.food += 16;
  if (effect === "festival") for (const kingdom of active) { kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy + 4, 0, 100); for (const person of peopleOfKingdom(kingdom.id).slice(0, 30)) person.happiness = legacyEngine.clamp(person.happiness + 5, 0, 100); }
  if (effect === "agriculture") for (const kingdom of active) { kingdom.technology.focus = "agriculture"; kingdom.technology.research += 8; }
  if (effect === "diplomacy") for (let first = 0; first < active.length; first++) for (let second = first + 1; second < active.length; second++) recordDiplomaticMemory(active[first].id, active[second].id, "legacy-event", "边境使团促成了新的谅解", 4, -4);
  if (effect === "commerce") for (const kingdom of active) kingdom.treasury += 9;
  if (effect === "detain" && target) { target.legitimacy = legacyEngine.clamp(target.legitimacy + 3, 0, 100); target.culture.values.valor = legacyEngine.clamp(target.culture.values.valor + 4, 0, 100); for (const other of active.filter(kingdom => kingdom.id !== target.id)) recordDiplomaticMemory(target.id, other.id, "grievance", "扣押了跨境使团", -5, 8); }
  if (effect === "patronage" && target) { target.treasury = Math.max(0, target.treasury - 14); target.technology.research += 24; }
  if (effect === "open_knowledge") for (const kingdom of active) kingdom.technology.research += 9;
  if (effect === "license" && target) { target.treasury += 18; if (target.politics?.factions?.guilds) target.politics.factions.guilds.influence = legacyEngine.clamp(target.politics.factions.guilds.influence + 5, 0, 100); }
  if (effect === "shelter" && target) { target.resources.food = Math.max(0, target.resources.food - 12); target.unrest = legacyEngine.clamp(target.unrest - 6, 0, 100); target.legitimacy = legacyEngine.clamp(target.legitimacy + 4, 0, 100); }
  if (effect === "settle" && target) { target.resources.wood += 12; target.resources.stone += 8; target.technology.research += 5; }
  if (effect === "close_border" && target) { target.unrest = legacyEngine.clamp(target.unrest - 2, 0, 100); for (const person of peopleOfKingdom(target.id).slice(0, 25)) person.happiness = legacyEngine.clamp(person.happiness - 3, 0, 100); }
  if (effect === "observe") { for (const kingdom of active) kingdom.technology.research += 7; for (const site of legacySites.filter(site => site.status === "exploring")) site.progress = legacyEngine.clamp(site.progress + 8, 0, 100); }
  if (effect === "rite") for (const kingdom of active) { kingdom.culture.values.faith = legacyEngine.clamp(kingdom.culture.values.faith + 4, 0, 100); if (kingdom.politics) kingdom.politics.cohesion = legacyEngine.clamp(kingdom.politics.cohesion + 3, 0, 100); }
  if (effect === "war_omen") for (const kingdom of active) { kingdom.culture.values.valor = legacyEngine.clamp(kingdom.culture.values.valor + 4, 0, 100); for (const army of armies.filter(candidate => candidate.kingdomId === kingdom.id)) army.morale = legacyEngine.clamp(army.morale + 7, 0, 100); }
}

function resolveDynamicEvent(choiceId, automatic = false) {
  const active = legacyState.activeEvent, definition = dynamicEventDefs[active?.id]; if (!active || !definition) return false;
  const choice = definition.choices.find(candidate => candidate.id === choiceId) || definition.choices[0], resume = Boolean(active.resumeAfterChoice), target = getKingdom(active.kingdomId);
  applyDynamicEventEffect(choice.effect, target); legacyState.eventHistory.unshift({ id: active.id, choice: choice.id, kingdomId: active.kingdomId, year: Math.floor(year) }); legacyState.eventHistory = legacyState.eventHistory.slice(0, 60);
  worldStats.dynamicEventsResolved = (worldStats.dynamicEventsResolved || 0) + 1; legacyState.nextEventYear = year + 7 + legacyEngine.randi(0, 6); legacyState.activeEvent = null;
  addEvent(`${definition.icon} ${automatic ? "各文明最终" : "创世者引导世界"}选择了“${choice.label}”。`, "legacy"); renderLegacyChoiceModal(); updateUI(); if (resume && !automatic) setRunning(true, false); return true;
}

function crisisContribution(kingdom, type) {
  if (type === "ashen_winter") return .8 + technologyLevel(kingdom, "agriculture") * .55 + kingdom.resources.food / Math.max(40, peopleOfKingdom(kingdom.id).length * 9) * .5;
  if (type === "red_miasma") return .8 + technologyLevel(kingdom, "medicine") * .8 + (kingdom.policies?.welfare === "relief" ? .7 : 0);
  return .8 + technologyLevel(kingdom, "administration") * .6 + Math.max(0, kingdom.legitimacy - 45) * .02;
}

function triggerWorldCrisis(type = null) {
  if (legacyState.activeCrisis) return false;
  const ids = Object.keys(crisisDefs), selected = crisisDefs[type] ? type : ids[legacyEngine.randi(0, ids.length - 1)], definition = crisisDefs[selected];
  legacyState.activeCrisis = { id: selected, startedYear: Math.floor(year), deadline: year + definition.duration, progress: 0, interventions: 0 };
  worldStats.crisesStarted = (worldStats.crisesStarted || 0) + 1; addEvent(`${definition.icon} 全球危机“${definition.name}”爆发：${definition.text}`, "crisis"); playExperienceSound("disaster"); return true;
}

function applyCrisisPressure(crisis) {
  for (const kingdom of kingdoms.filter(candidate => !candidate.defeated)) {
    if (crisis.id === "ashen_winter") { kingdom.resources.food = Math.max(0, kingdom.resources.food - 1.2); kingdom.unrest = legacyEngine.clamp(kingdom.unrest + .18, 0, 100); }
    if (crisis.id === "red_miasma") { const citizens = peopleOfKingdom(kingdom.id); if (citizens.length) { const victim = citizens[legacyEngine.randi(0, citizens.length - 1)]; victim.plague = Math.max(8, victim.plague || 0); } kingdom.unrest = legacyEngine.clamp(kingdom.unrest + .12, 0, 100); }
    if (crisis.id === "broken_oaths") { kingdom.warWeariness = legacyEngine.clamp((kingdom.warWeariness || 0) + .3, 0, 100); kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy - .08, 0, 100); }
    crisis.progress += crisisContribution(kingdom, crisis.id);
  }
}

function finishWorldCrisis(success) {
  const crisis = legacyState.activeCrisis, definition = crisisDefs[crisis?.id]; if (!crisis || !definition) return false;
  legacyState.crisisHistory.unshift({ id: crisis.id, success, year: Math.floor(year), progress: Math.round(crisis.progress) }); legacyState.crisisHistory = legacyState.crisisHistory.slice(0, 30);
  if (success) { worldStats.crisesResolved = (worldStats.crisesResolved || 0) + 1; worldProgress.renown += 24; for (const kingdom of kingdoms.filter(candidate => !candidate.defeated)) { kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy + 5, 0, 100); kingdom.unrest = legacyEngine.clamp(kingdom.unrest - 5, 0, 100); } }
  else { worldStats.crisesFailed = (worldStats.crisesFailed || 0) + 1; for (const kingdom of kingdoms.filter(candidate => !candidate.defeated)) { kingdom.resources.food = Math.max(0, kingdom.resources.food - 12); kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy - 6, 0, 100); kingdom.unrest = legacyEngine.clamp(kingdom.unrest + 8, 0, 100); } }
  addEvent(`${definition.icon} ${definition.name}${success ? "在共同努力下得到化解" : "超过临界点，给世界留下长期创伤"}。`, "crisis"); legacyState.activeCrisis = null; legacyState.nextCrisisYear = year + 24 + legacyEngine.randi(0, 12); return true;
}

function interveneWorldCrisis(action = "coordinate") {
  const crisis = legacyState.activeCrisis; if (!crisis) return false;
  const active = kingdoms.filter(kingdom => !kingdom.defeated), cost = action === "mobilize" ? 9 : action === "relief" ? 7 : 5;
  let participants = 0; for (const kingdom of active) if (kingdom.treasury >= cost) { kingdom.treasury -= cost; participants++; if (action === "relief") kingdom.resources.food = Math.max(0, kingdom.resources.food - 5); }
  crisis.progress = legacyEngine.clamp(crisis.progress + participants * (action === "coordinate" ? 5 : action === "relief" ? 4 : 3.5), 0, 140); crisis.interventions++;
  addEvent(`创世者推动各文明${action === "coordinate" ? "协调应对" : action === "relief" ? "组织赈济" : "全面动员"}${crisisDefs[crisis.id].name}。`, "crisis"); if (crisis.progress >= 100) finishWorldCrisis(true); updateUI(); return true;
}

function crisisStep() {
  const crisis = legacyState.activeCrisis;
  if (crisis) { applyCrisisPressure(crisis); if (crisis.progress >= 100) finishWorldCrisis(true); else if (year >= crisis.deadline) finishWorldCrisis(false); }
  else if (year >= legacyState.nextCrisisYear && !legacyState.activeEvent && !worldEventState.active) triggerWorldCrisis();
}

function challengeStep() {
  if (!legacyState.challenge) { if (year >= legacyState.nextChallengeYear) startWorldChallenge(); return; }
  const challenge = legacyState.challenge, definition = challengeDefs[challenge.id]; if (!definition) { legacyState.challenge = null; return; }
  challenge.progress = Math.max(0, definition.metric() - challenge.baseline);
  if (challenge.progress >= definition.target) {
    legacyState.challengeHistory.unshift({ id: challenge.id, success: true, year: Math.floor(year) }); worldStats.challengesCompleted = (worldStats.challengesCompleted || 0) + 1; worldProgress.renown += definition.reward;
    addEvent(`${definition.icon} 世界挑战“${definition.name}”完成，获得 ${definition.reward} 世界声望。`, "challenge"); legacyState.challenge = null; legacyState.nextChallengeYear = year + 4;
  } else if (year >= challenge.deadline) {
    legacyState.challengeHistory.unshift({ id: challenge.id, success: false, year: Math.floor(year) }); addEvent(`${definition.icon} 世界挑战“${definition.name}”未能在期限内完成。`, "challenge"); legacyState.challenge = null; legacyState.nextChallengeYear = year + 3;
  }
  legacyState.challengeHistory = legacyState.challengeHistory.slice(0, 30);
}

function dynamicEventStep() {
  if (legacyState.activeEvent) { if (year - legacyState.activeEvent.startedYear > 2.5) { const definition = dynamicEventDefs[legacyState.activeEvent.id]; resolveDynamicEvent(definition.choices[legacyEngine.randi(0, definition.choices.length - 1)].id, true); } return; }
  if (year >= legacyState.nextEventYear && !worldEventState.active && !legacyState.activeCrisis) activateDynamicEvent();
}

function legacySimulationStep() {
  exploreLegacySites(); wonderStep(); crisisStep(); challengeStep(); dynamicEventStep();
}

function normalizeLegacyWorld(sourceVersion = 1) {
  legacySites = (Array.isArray(legacySites) ? legacySites : []).filter(site => site && ruinDefs[site.type]).slice(0, 24).map(site => ({ ...site, id: Math.max(1, Number(site.id) || nextLegacySiteId++), x: legacyEngine.clamp(Math.round(Number(site.x) || 0), 0, MAP_W - 1), y: legacyEngine.clamp(Math.round(Number(site.y) || 0), 0, MAP_H - 1), status: ["hidden", "exploring", "explored"].includes(site.status) ? site.status : "hidden", progress: legacyEngine.clamp(Number(site.progress) || 0, 0, 100), kingdomId: getKingdom(Number(site.kingdomId)) ? Number(site.kingdomId) : null, discoveredYear: site.discoveredYear ? Math.max(1, Number(site.discoveredYear)) : null, exploredYear: site.exploredYear ? Math.max(1, Number(site.exploredYear)) : null, artifactId: site.artifactId ? Number(site.artifactId) : null }));
  artifacts = (Array.isArray(artifacts) ? artifacts : []).filter(artifact => artifact && artifactDefs[artifact.type] && getKingdom(Number(artifact.kingdomId))).slice(0, 40).map(artifact => ({ ...artifact, id: Math.max(1, Number(artifact.id) || nextArtifactId++), kingdomId: Number(artifact.kingdomId), siteId: Number(artifact.siteId) || null, foundYear: Math.max(1, Number(artifact.foundYear) || Math.floor(year)) }));
  wonders = (Array.isArray(wonders) ? wonders : []).filter(wonder => wonder && wonderDefs[wonder.type] && getKingdom(Number(wonder.kingdomId))).slice(0, 20).map(wonder => ({ ...wonder, id: Math.max(1, Number(wonder.id) || nextWonderId++), kingdomId: Number(wonder.kingdomId), villageId: Number(wonder.villageId) || null, x: legacyEngine.clamp(Number(wonder.x) || 0, 0, MAP_W - 1), y: legacyEngine.clamp(Number(wonder.y) || 0, 0, MAP_H - 1), progress: legacyEngine.clamp(Number(wonder.progress) || 0, 0, 100), status: ["building", "complete", "ruined"].includes(wonder.status) ? wonder.status : "building", sponsored: Boolean(wonder.sponsored), startedYear: Math.max(1, Number(wonder.startedYear) || Math.floor(year)), completedYear: wonder.completedYear ? Math.max(1, Number(wonder.completedYear)) : null }));
  nextLegacySiteId = Math.max(Number(nextLegacySiteId) || 1, 1, ...legacySites.map(site => site.id + 1)); nextArtifactId = Math.max(Number(nextArtifactId) || 1, 1, ...artifacts.map(artifact => artifact.id + 1)); nextWonderId = Math.max(Number(nextWonderId) || 1, 1, ...wonders.map(wonder => wonder.id + 1));
  const saved = legacyState && typeof legacyState === "object" ? legacyState : createLegacyState();
  legacyState = { nextEventYear: Number.isFinite(Number(saved.nextEventYear)) ? Number(saved.nextEventYear) : year + 7, activeEvent: dynamicEventDefs[saved.activeEvent?.id] ? saved.activeEvent : null, eventHistory: Array.isArray(saved.eventHistory) ? saved.eventHistory.slice(0, 60) : [], nextCrisisYear: Number.isFinite(Number(saved.nextCrisisYear)) ? Number(saved.nextCrisisYear) : year + 24, activeCrisis: crisisDefs[saved.activeCrisis?.id] ? { ...saved.activeCrisis, progress: legacyEngine.clamp(Number(saved.activeCrisis.progress) || 0, 0, 140), deadline: Number(saved.activeCrisis.deadline) || year + crisisDefs[saved.activeCrisis.id].duration } : null, crisisHistory: Array.isArray(saved.crisisHistory) ? saved.crisisHistory.slice(0, 30) : [], challenge: challengeDefs[saved.challenge?.id] ? { ...saved.challenge, baseline: Number(saved.challenge.baseline) || 0, progress: Math.max(0, Number(saved.challenge.progress) || 0), deadline: Number(saved.challenge.deadline) || year + challengeDefs[saved.challenge.id].duration } : null, challengeHistory: Array.isArray(saved.challengeHistory) ? saved.challengeHistory.slice(0, 30) : [], nextChallengeYear: Number.isFinite(Number(saved.nextChallengeYear)) ? Number(saved.nextChallengeYear) : year + 3 };
  for (const kingdom of kingdoms) kingdom.legacy = { artifactIds: artifactIdsForKingdom(kingdom.id), wonderId: wonders.find(wonder => wonder.kingdomId === kingdom.id && wonder.status !== "ruined")?.id || null };
  if (sourceVersion < 18) { if (!legacySites.length) seedLegacySites(6); if (!legacyState.challenge) startWorldChallenge("relic_seekers"); }
}

function renderLegacyChoiceModal() {
  const modal = document.getElementById("legacyEventModal"); if (!modal) return;
  const active = legacyState.activeEvent, definition = dynamicEventDefs[active?.id]; modal.hidden = !active || !definition; if (!active || !definition) return;
  const target = getKingdom(active.kingdomId); document.getElementById("legacyEventContent").innerHTML = `<div class="world-event-icon">${definition.icon}</div><small>动态世界事件 · ${target?.name || "整个世界"}</small><h2>${definition.name}</h2><p>${definition.text}</p><div class="world-event-choices">${definition.choices.map(choice => `<button data-legacy-event-choice="${choice.id}"><b>${choice.label}</b><span>${choice.hint}</span></button>`).join("")}</div><small class="muted">若不选择，文明将在约 2.5 个纪元后自行决定。</small>`;
}

function legacySiteLabel(site) { const definition = ruinDefs[site.type]; return site.status === "hidden" ? `？ 未知遗迹` : `${definition.icon} ${definition.name}`; }

function inspectLegacyEntity(key) {
  selectedLegacyId = key; selectedKingdomId = null; selectedTradeRouteId = null; selectedArmyId = null; selectedHeroId = null;
  const [kind, rawId] = String(key).split(":"), id = Number(rawId), box = document.getElementById("selectionCard"); box.classList.remove("empty");
  if (kind === "ruin") { const site = legacySites.find(candidate => candidate.id === id); if (!site) return; const definition = ruinDefs[site.type], kingdom = getKingdom(site.kingdomId), artifact = artifacts.find(candidate => candidate.id === site.artifactId); box.innerHTML = `<h4>${legacySiteLabel(site)}</h4><div class="detail-row"><span>坐标 / 状态</span><b>${site.x}, ${site.y} · ${site.status === "explored" ? "已探索" : site.status === "exploring" ? "考察中" : "尚未发现"}</b></div><div class="detail-row"><span>考察文明</span><b>${kingdom?.name || "暂无"}</b></div>${site.status !== "hidden" ? `<p class="muted">${definition.lore}</p><div class="need-list">${needMeter("探索进度", site.progress)}</div>` : `<p class="muted">地图上只有零散传闻，尚无文明确认其来历。</p>`}${artifact ? `<div class="artifact-chip" style="--artifact-color:${artifactDefs[artifact.type].color}">${artifactDefs[artifact.type].icon} 神器：${artifactDefs[artifact.type].name}</div>` : ""}`; }
  if (kind === "wonder") { const wonder = wonders.find(candidate => candidate.id === id); if (!wonder) return; const definition = wonderDefs[wonder.type], kingdom = getKingdom(wonder.kingdomId); box.innerHTML = `<h4>${definition.icon} ${definition.name}</h4><div class="detail-row"><span>建造文明</span><b>${kingdom?.name || "失落文明"}</b></div><div class="detail-row"><span>状态 / 奠基</span><b>${wonder.status === "complete" ? "已完成" : wonder.status === "ruined" ? "奇观遗迹" : "建造中"} · 纪元 ${wonder.startedYear}</b></div><div class="need-list">${needMeter("工程进度", wonder.progress)}</div><p class="muted">${definition.effect}</p>`; }
}

function legacyDetailHtml(kingdom) {
  const owned = artifacts.filter(artifact => artifact.kingdomId === kingdom.id), wonder = wonders.find(candidate => candidate.kingdomId === kingdom.id && candidate.status !== "ruined");
  if (!owned.length && !wonder) return "";
  const artifactHtml = owned.map(artifact => { const definition = artifactDefs[artifact.type]; return `<span class="artifact-chip" style="--artifact-color:${definition.color}" title="${definition.effect}">${definition.icon} ${definition.name}</span>`; }).join("") || `<span class="muted">尚未持有神器</span>`;
  const wonderHtml = wonder ? `<button class="wonder-project ${wonder.status}" data-legacy-entity="wonder:${wonder.id}" style="--wonder-color:${wonderDefs[wonder.type].color}"><b>${wonderDefs[wonder.type].icon} ${wonderDefs[wonder.type].name}</b><span>${wonder.status === "complete" ? "世界奇观已完成" : `工程进度 ${Math.round(wonder.progress)}%`}</span><i><em style="width:${wonder.progress}%"></em></i></button>` : "";
  return `<h3>神器与奇观</h3><div class="artifact-list">${artifactHtml}</div>${wonderHtml}`;
}

function renderLegacyPanels() {
  const legacyList = document.getElementById("legacyList"), crisisList = document.getElementById("crisisList");
  if (legacyList) {
    const sites = legacySites.slice(0, 8).map(site => `<button class="legacy-site ${site.status}" data-legacy-entity="ruin:${site.id}" style="--legacy-color:${ruinDefs[site.type].color}"><b>${legacySiteLabel(site)}</b><span>${site.status === "explored" ? `${artifactDefs[ruinDefs[site.type].artifact].icon} 神器已出土` : site.status === "exploring" ? `${getKingdom(site.kingdomId)?.name || "文明"}考察 · ${Math.round(site.progress)}%` : `坐标 ${site.x}, ${site.y}`}</span><i><em style="width:${site.progress}%"></em></i></button>`).join("");
    const wonderItems = wonders.slice(0, 6).map(wonder => `<button class="legacy-site wonder ${wonder.status}" data-legacy-entity="wonder:${wonder.id}" style="--legacy-color:${wonderDefs[wonder.type].color}"><b>${wonderDefs[wonder.type].icon} ${wonderDefs[wonder.type].name}</b><span>${getKingdom(wonder.kingdomId)?.name || "失落文明"} · ${wonder.status === "complete" ? "已完成" : wonder.status === "ruined" ? "已成遗迹" : `${Math.round(wonder.progress)}%`}</span><i><em style="width:${wonder.progress}%"></em></i></button>`).join("");
    legacyList.innerHTML = sites + wonderItems || `<p class="muted">世界遗产尚未留下踪迹</p>`;
  }
  if (crisisList) {
    const crisis = legacyState.activeCrisis, challenge = legacyState.challenge, event = legacyState.activeEvent;
    const eventHtml = event ? `<button class="legacy-event-summary" data-open-legacy-event><b>${dynamicEventDefs[event.id].icon} ${dynamicEventDefs[event.id].name}</b><span>等待世界抉择</span></button>` : `<div class="legacy-next-event"><b>◌ 动态事件平静</b><span>下一事件约在纪元 ${Math.ceil(legacyState.nextEventYear)}</span></div>`;
    const crisisHtml = crisis ? `<div class="world-crisis" style="--crisis-color:${crisisDefs[crisis.id].color}"><b>${crisisDefs[crisis.id].icon} ${crisisDefs[crisis.id].name}</b><p>${crisisDefs[crisis.id].text}</p><small>应对进度 ${Math.round(crisis.progress)} / 100 · 截止纪元 ${Math.ceil(crisis.deadline)}</small><i><em style="width:${legacyEngine.clamp(crisis.progress, 0, 100)}%"></em></i><div><button data-crisis-action="coordinate">协调应对</button><button data-crisis-action="relief">组织赈济</button><button data-crisis-action="mobilize">全面动员</button></div></div>` : `<div class="legacy-next-event"><b>◇ 全球危机预警</b><span>下一风险约在纪元 ${Math.ceil(legacyState.nextCrisisYear)}</span></div>`;
    const challengeHtml = challenge ? `<div class="world-challenge"><b>${challengeDefs[challenge.id].icon} ${challengeDefs[challenge.id].name}</b><span>${challengeDefs[challenge.id].text}</span><small>${Math.min(challengeDefs[challenge.id].target, Math.floor(challenge.progress))} / ${challengeDefs[challenge.id].target} · 截止纪元 ${Math.ceil(challenge.deadline)}</small><i><em style="width:${legacyEngine.clamp(challenge.progress / challengeDefs[challenge.id].target * 100, 0, 100)}%"></em></i></div>` : `<div class="legacy-next-event"><b>◇ 新挑战正在酝酿</b><span>约在纪元 ${Math.ceil(legacyState.nextChallengeYear)}</span></div>`;
    crisisList.innerHTML = eventHtml + crisisHtml + challengeHtml;
  }
  if (selectedLegacyId) inspectLegacyEntity(selectedLegacyId);
}

function renderLegacyMarkers(context, metrics) {
  for (const site of legacySites) {
    const sx = metrics.ox + (site.x + .5) * metrics.size, sy = metrics.oy + (site.y + .5) * metrics.size; if (sx < -20 || sy < -20 || sx > metrics.width + 20 || sy > metrics.height + 20) continue;
    const definition = ruinDefs[site.type]; context.save(); context.globalAlpha = site.status === "hidden" ? .55 : .92; context.fillStyle = site.status === "hidden" ? "#8b8579" : definition.color; context.strokeStyle = "#fff2c980"; context.lineWidth = Math.max(1, metrics.size * .14); const size = Math.max(3, metrics.size * .55); context.fillRect(sx - size, sy - size, size * 2, size * 2); context.strokeRect(sx - size, sy - size, size * 2, size * 2); if (metrics.size > 4) { context.font = `${Math.max(10, metrics.size * 1.2)}px sans-serif`; context.textAlign = "center"; context.fillText(site.status === "hidden" ? "?" : definition.icon, sx, sy - size - 2); } context.restore();
  }
  for (const wonder of wonders) {
    const sx = metrics.ox + (wonder.x + .5) * metrics.size, sy = metrics.oy + (wonder.y + .5) * metrics.size; if (sx < -24 || sy < -24 || sx > metrics.width + 24 || sy > metrics.height + 24) continue;
    const definition = wonderDefs[wonder.type], size = Math.max(4, metrics.size * .8); context.save(); context.globalAlpha = wonder.status === "ruined" ? .45 : .95; context.fillStyle = definition.color; context.strokeStyle = "#fff1ba"; context.lineWidth = Math.max(1, metrics.size * .18); context.beginPath(); context.moveTo(sx, sy - size); context.lineTo(sx + size, sy + size); context.lineTo(sx - size, sy + size); context.closePath(); context.fill(); context.stroke(); if (metrics.size > 4) { context.font = `${Math.max(12, metrics.size * 1.45)}px sans-serif`; context.textAlign = "center"; context.fillText(definition.icon, sx, sy - size - 3); } context.restore();
  }
}

function initializeLegacyUI() {
  if (legacyUiReady) return; legacyUiReady = true;
  document.getElementById("legacyList")?.addEventListener("click", event => { const item = event.target.closest?.("[data-legacy-entity]"); if (item) inspectLegacyEntity(item.dataset.legacyEntity); });
  document.getElementById("selectionCard")?.addEventListener("click", event => { const item = event.target.closest?.("[data-legacy-entity]"); if (item) inspectLegacyEntity(item.dataset.legacyEntity); });
  document.getElementById("crisisList")?.addEventListener("click", event => { const action = event.target.closest?.("[data-crisis-action]")?.dataset.crisisAction; if (action) interveneWorldCrisis(action); if (event.target.closest?.("[data-open-legacy-event]")) renderLegacyChoiceModal(); });
  document.getElementById("legacyEventModal")?.addEventListener("click", event => { const choice = event.target.closest?.("[data-legacy-event-choice]")?.dataset.legacyEventChoice; if (choice) resolveDynamicEvent(choice); });
}

globalThis.RealmLegacy = Object.freeze({ ruinDefs, artifactDefs, wonderDefs, dynamicEventDefs, crisisDefs, challengeDefs, activateDynamicEvent, resolveDynamicEvent, triggerWorldCrisis, interveneWorldCrisis, beginWonderProject, startWorldChallenge });
