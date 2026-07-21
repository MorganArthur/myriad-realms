"use strict";

const { random, rand, randi, clamp, cleanText, smoothNoise, removeDeadEntities, setSeed, getRandomState, restoreRandomState, createRandomSeed, normalizeSeed } = globalThis.WorldEngine;
const {
  map, terrainColors, kingdomColors, worldNames, races: raceDefs, animals: animalDefs, animalCaps, buildings: buildingDefs,
  tradeResources: tradeResourceDefs, professions: professionDefs, units: unitDefs, governments: governmentDefs, policies: policyDefs,
  socialClasses: socialClassDefs, cultureValues: cultureValueDefs, cultureEthos: cultureEthosDefs, technologies: technologyDefs,
  traditions: traditionDefs, seasons: seasonDefs, weather: weatherDefs, statusLabels, disasters: disasterDefs, disasterIntervals,
  balance: BALANCE
} = globalThis.RealmConfig;
const canvas = document.getElementById("worldCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const MAP_W = map.width, MAP_H = map.height;

const achievementDefs = {
  first_civilizations: { name: "文明火种", icon: "🏛", description: "世界中同时存在 4 个聚落", points: 5, unlocked: () => villages.length >= 4 },
  many_peoples: { name: "万族共生", icon: "🌍", description: "四个种族都拥有至少 3 名成员", points: 10, unlocked: () => Object.keys(raceDefs).every(race => people.filter(person => person.race === race).length >= 3) },
  living_world: { name: "万物有灵", icon: "🦋", description: "六种野生动物同时繁衍于世界", points: 10, unlocked: () => Object.keys(animalDefs).every(species => (animalCounts()[species] || 0) > 0) },
  great_city: { name: "宏伟城镇", icon: "🏘", description: "出现一座三级聚落", points: 15, unlocked: () => villages.some(village => village.level >= 3) },
  populous: { name: "生生不息", icon: "👥", description: "世界人口达到 50", points: 15, unlocked: () => people.length >= 50 },
  master_builders: { name: "营造时代", icon: "🏗", description: "世界拥有 40 座实体建筑", points: 15, unlocked: () => structureTotal() >= 40 },
  first_trade: { name: "商路初开", icon: "⚖", description: "完成第一笔商队交付", points: 10, unlocked: () => worldStats.tradeDeliveries >= 1 },
  first_alliance: { name: "盟约之证", icon: "🤝", description: "两个国家缔结同盟", points: 10, unlocked: () => hasRelationStatus("alliance") },
  first_war: { name: "兵戈年代", icon: "⚔", description: "见证一场战争爆发", points: 10, unlocked: () => worldStats.warsStarted >= 1 || hasRelationStatus("war") },
  survivor: { name: "劫后余生", icon: "🛡", description: "完整经历一次天灾", points: 10, unlocked: () => worldStats.disastersSurvived >= 1 },
  rebellion: { name: "旧邦新生", icon: "✊", description: "见证一个叛乱政权诞生", points: 15, unlocked: () => worldStats.rebellions >= 1 },
  century: { name: "百年史诗", icon: "📜", description: "世界延续到纪元 100", points: 25, unlocked: () => year >= 100 },
  first_discovery: { name: "知识火花", icon: "💡", description: "任意文明取得第一项科技", points: 10, unlocked: () => kingdoms.some(kingdom => totalTechnologyLevel(kingdom) >= 1) },
  renaissance: { name: "文明盛世", icon: "🌟", description: "任意文明累计达到 8 级科技", points: 25, unlocked: () => kingdoms.some(kingdom => totalTechnologyLevel(kingdom) >= 8) },
  first_hero: { name: "传奇初章", icon: "♛", description: "世界诞生第一位英雄", points: 10, unlocked: () => heroes.length >= 1 },
  world_story: { name: "时代抉择", icon: "📜", description: "完成一条世界事件链", points: 15, unlocked: () => worldEventState.history.length >= 2 }
};
const worldGoalDefs = {
  settlement_network: { name: "拓土成邦", description: "建立 6 个聚落", icon: "🏘", target: 6, points: 20, value: () => villages.length },
  thriving_population: { name: "人烟繁盛", description: "世界人口达到 60", icon: "👥", target: 60, points: 25, value: () => people.length },
  age_of_builders: { name: "百工兴盛", description: "建成 60 座实体建筑", icon: "🏗", target: 60, points: 25, value: () => structureTotal() },
  caravan_age: { name: "商路纵横", description: "完成 10 次商队交付", icon: "🐫", target: 10, points: 25, value: () => worldStats.tradeDeliveries },
  resilient_world: { name: "不屈世界", description: "度过 3 场天灾", icon: "🛡", target: 3, points: 30, value: () => worldStats.disastersSurvived },
  long_history: { name: "世纪文明", description: "抵达纪元 100", icon: "📜", target: 100, points: 40, value: () => Math.floor(year) }
};

let tiles = [], people = [], animals = [], villages = [], kingdoms = [], events = [], activeDisasters = [], tradeRoutes = [], caravans = [], armies = [];
let chronicle = [], worldStats = createWorldStats(), worldProgress = createWorldProgress();
let year = 1, ticks = 0, running = false, speed = 1, selectedTool = "inspect", brushSize = 2;
let climate = { season: "spring", weather: "clear", temperature: 16, rainfall: .72, seasonProgress: 0, weatherUntil: 1.8, nextWeatherYear: 1.8 };
let camera = { x: 0, y: 0, zoom: 1 }, dragging = false, lastMouse = null, painting = false;
let hoveredGrid = null, selectedGrid = null;
let nextPersonId = 1, nextAnimalId = 1, nextVillageId = 1, nextStructureId = 1, nextTradeRouteId = 1, nextCaravanId = 1, nextArmyId = 1, nextDisasterId = 1, selectedKingdomId = null, selectedTradeRouteId = null, selectedArmyId = null, activeSaveSlot = 1;
let autoSaveEnabled = true, lastAutoSaveYear = 0, autoSavePending = false, indexesReady = false, renderDirty = true;
let randomDisastersEnabled = true, disasterFrequency = "normal", nextDisasterYear = 10, worldSeed = "";
let debugBatchMode = false;
let worldIndex = createWorldIndex();
let performanceMetrics = { frames: 0, steps: 0, fps: 0, ups: 0, simulationMs: 0, renderMs: 0, sampleStarted: performance.now() };

const idx = (x, y) => y * MAP_W + x;
const tileAt = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H ? tiles[idx(x, y)] : null;
const isLand = t => t && !["deep", "water"].includes(t.type);
const getKingdom = id => (indexesReady ? worldIndex.kingdomById.get(id) : null) || kingdoms.find(k => k.id === id);
const getVillage = id => (indexesReady ? worldIndex.villageById.get(id) : null) || villages.find(v => v.id === id);
const getPerson = id => (indexesReady ? worldIndex.personById.get(id) : null) || people.find(person => person.id === id) || null;
const getTradeRoute = id => (indexesReady ? worldIndex.tradeRouteById.get(id) : null) || tradeRoutes.find(route => route.id === id) || null;
const getArmy = id => (indexesReady ? worldIndex.armyById.get(id) : null) || armies.find(army => army.id === id) || null;
const peopleOfVillage = id => indexesReady ? (worldIndex.peopleByVillage.get(id) || []) : people.filter(p => p.village === id && !p.dead);
const peopleOfKingdom = id => indexesReady ? (worldIndex.peopleByKingdom.get(id) || []) : people.filter(p => p.kingdom === id && !p.dead);
const villagesOfKingdom = id => indexesReady ? (worldIndex.villagesByKingdom.get(id) || []) : villages.filter(v => v.kingdom === id);
const spatialKey = (x, y) => `${Math.floor(x / 6)},${Math.floor(y / 6)}`;

function createWorldStats() {
  return {
    births: 0, deaths: 0, villagesFounded: 0, villagesCaptured: 0, buildingsConstructed: 0, buildingsDestroyed: 0,
    tradeDeliveries: 0, tradeVolume: 0, warsStarted: 0, warsEnded: 0, disastersTriggered: 0, disastersSurvived: 0, rebellions: 0,
    heroesEmerged: 0, worldEventsResolved: 0,
    peakPopulation: 0, peakVillages: 0, peakKingdoms: 0, peakAnimals: 0
  };
}

function createWorldProgress() { return { achievements: {}, completedGoals: {}, renown: 0 }; }

function createCultureState(race, kingdomName = "无名文明") {
  const ethos = { human: "civic", elf: "harmony", dwarf: "forge", orc: "warrior" }[race] || "civic", def = cultureEthosDefs[ethos];
  return { name: `${kingdomName}传统`, ethos, values: { ...def.values }, traditions: [], influence: 10, exchanges: 0 };
}

function createTechnologyState(race) {
  const focus = { human: "administration", elf: "medicine", dwarf: "engineering", orc: "metallurgy" }[race] || "agriculture";
  return { levels: Object.fromEntries(Object.keys(technologyDefs).map(id => [id, 0])), research: 0, focus, researchRate: 0, lastFocusYear: 1, focusLockedUntil: 0 };
}

function technologyLevel(kingdom, technology) { return clamp(Number(kingdom?.technology?.levels?.[technology]) || 0, 0, 3); }
function totalTechnologyLevel(kingdom) { return Object.keys(technologyDefs).reduce((sum, technology) => sum + technologyLevel(kingdom, technology), 0); }
function hasTradition(kingdom, tradition) { return Boolean(kingdom?.culture?.traditions?.includes(tradition)); }
function currentTechnologyCost(kingdom, technology = kingdom?.technology?.focus) {
  const def = technologyDefs[technology], level = technologyLevel(kingdom, technology);
  return def && level < 3 ? def.costs[level] : null;
}

function normalizeCultureTechnology(kingdom) {
  const fallbackCulture = createCultureState(kingdom.race, kingdom.name), savedCulture = kingdom.culture || {};
  kingdom.culture = { ...fallbackCulture, ...savedCulture };
  kingdom.culture.ethos = cultureEthosDefs[kingdom.culture.ethos] ? kingdom.culture.ethos : fallbackCulture.ethos;
  kingdom.culture.name = cleanText(kingdom.culture.name) || fallbackCulture.name;
  kingdom.culture.values = { ...fallbackCulture.values, ...(savedCulture.values || {}) };
  for (const value of Object.keys(cultureValueDefs)) kingdom.culture.values[value] = clamp(Number(kingdom.culture.values[value]) || fallbackCulture.values[value], 0, 100);
  kingdom.culture.traditions = [...new Set(Array.isArray(savedCulture.traditions) ? savedCulture.traditions.filter(id => traditionDefs[id]) : [])];
  kingdom.culture.influence = Math.max(0, Number(kingdom.culture.influence) || 10); kingdom.culture.exchanges = Math.max(0, Number(kingdom.culture.exchanges) || 0);
  const fallbackTechnology = createTechnologyState(kingdom.race), savedTechnology = kingdom.technology || {};
  kingdom.technology = { ...fallbackTechnology, ...savedTechnology, levels: { ...fallbackTechnology.levels, ...(savedTechnology.levels || {}) } };
  for (const technology of Object.keys(technologyDefs)) kingdom.technology.levels[technology] = clamp(Math.floor(Number(kingdom.technology.levels[technology]) || 0), 0, 3);
  kingdom.technology.focus = technologyDefs[kingdom.technology.focus] ? kingdom.technology.focus : fallbackTechnology.focus;
  kingdom.technology.research = Math.max(0, Number(kingdom.technology.research) || 0); kingdom.technology.researchRate = Math.max(0, Number(kingdom.technology.researchRate) || 0);
  kingdom.technology.lastFocusYear = Number(kingdom.technology.lastFocusYear) || Math.floor(year); kingdom.technology.focusLockedUntil = Number(kingdom.technology.focusLockedUntil) || 0;
}

function chooseResearchFocus(kingdom) {
  const candidates = Object.keys(technologyDefs).filter(id => technologyLevel(kingdom, id) < 3); if (!candidates.length) return kingdom.technology.focus;
  if (kingdom.famine && candidates.includes("agriculture")) return "agriculture";
  if (kingdomAtWar(kingdom.id) && candidates.includes("metallurgy")) return "metallurgy";
  if (peopleOfKingdom(kingdom.id).some(person => person.plague > 0) && candidates.includes("medicine")) return "medicine";
  if ((kingdom.unrest || 0) > 50 && candidates.includes("administration")) return "administration";
  const docks = villagesOfKingdom(kingdom.id).reduce((sum, village) => sum + buildingCount(village, "dock"), 0);
  if (docks && candidates.includes("navigation")) return "navigation";
  if (candidates.includes(kingdom.technology.focus)) return kingdom.technology.focus;
  return candidates.sort((a, b) => technologyLevel(kingdom, a) - technologyLevel(kingdom, b) || technologyDefs[a].costs[technologyLevel(kingdom, a)] - technologyDefs[b].costs[technologyLevel(kingdom, b)])[0];
}

function setResearchFocus(kingdomId, technology, playerAction = false) {
  const kingdom = getKingdom(kingdomId); if (!kingdom || !technologyDefs[technology] || technologyLevel(kingdom, technology) >= 3) return false;
  kingdom.technology.focus = technology; kingdom.technology.lastFocusYear = Math.floor(year);
  if (playerAction) kingdom.technology.focusLockedUntil = year + 10;
  addEvent(`${kingdom.name}将研究方向调整为“${technologyDefs[technology].name}”。`);
  if (playerAction) { showToast(`${kingdom.name}开始研究${technologyDefs[technology].name}`); updateUI(); }
  return true;
}

function syncKingdomStructureDurability(kingdom) {
  const multiplier = 1 + technologyLevel(kingdom, "engineering") * .1 + (hasTradition(kingdom, "stone_lore") ? .08 : 0);
  for (const village of villagesOfKingdom(kingdom.id)) for (const structure of village.structures || []) {
    const expected = Math.round(buildingDefs[structure.type].maxHp * multiplier), integrity = structure.hp / Math.max(1, structure.maxHp);
    if (structure.maxHp !== expected) { structure.maxHp = expected; structure.hp = clamp(expected * integrity, 1, expected); }
  }
}

function unlockTradition(kingdom, tradition) {
  if (hasTradition(kingdom, tradition)) return;
  kingdom.culture.traditions.push(tradition); addEvent(`${traditionDefs[tradition].icon} ${kingdom.name}形成文化传统“${traditionDefs[tradition].name}”。`);
  if (tradition === "stone_lore") syncKingdomStructureDurability(kingdom);
}

function updateCultureTraditions(kingdom, context) {
  if (context.farms >= 3 || technologyLevel(kingdom, "agriculture") >= 2) unlockTradition(kingdom, "harvest_rites");
  if ((kingdom.race === "elf" && context.forests >= 8) || context.forests >= 28) unlockTradition(kingdom, "forest_kin");
  if ((kingdom.race === "dwarf" && context.quarries >= 1) || context.quarries >= 2 || technologyLevel(kingdom, "engineering") >= 2) unlockTradition(kingdom, "stone_lore");
  if (context.soldiers >= 4 || (kingdomAtWar(kingdom.id) && technologyLevel(kingdom, "metallurgy") >= 1)) unlockTradition(kingdom, "warrior_code");
  if (context.markets + context.docks >= 3 || technologyLevel(kingdom, "navigation") >= 2) unlockTradition(kingdom, "merchant_guilds");
  if (context.temples >= 2 || technologyLevel(kingdom, "medicine") >= 2) unlockTradition(kingdom, "healer_orders");
}

function cultureContext(kingdom) {
  const citizens = peopleOfKingdom(kingdom.id), realmVillages = villagesOfKingdom(kingdom.id), jobs = professionCounts(citizens), countBuildings = type => realmVillages.reduce((sum, village) => sum + buildingCount(village, type), 0);
  return {
    citizens, realmVillages, jobs, farms: countBuildings("farm"), quarries: countBuildings("quarry"), markets: countBuildings("market"), docks: countBuildings("dock"),
    temples: countBuildings("temple"), barracks: countBuildings("barracks"), structures: realmVillages.reduce((sum, village) => sum + (village.structures?.length || 0), 0), soldiers: jobs.soldier || 0,
    forests: tiles.reduce((sum, tile) => sum + (tile.owner === kingdom.id && tile.type === "forest" ? 1 : 0), 0)
  };
}

function seedLegacyCultureTechnology(kingdom) {
  const context = cultureContext(kingdom), ageTier = year >= 80 ? 2 : year >= 18 ? 1 : 0;
  if (ageTier) {
    kingdom.technology.levels.agriculture = Math.min(ageTier, Math.max(1, Math.floor(context.farms / 3)));
    kingdom.technology.levels.engineering = Math.min(ageTier, Math.max(1, Math.floor(context.structures / 28)));
    kingdom.technology.levels.metallurgy = Math.min(ageTier, Math.max(context.barracks ? 1 : 0, kingdomAtWar(kingdom.id) ? 1 : 0));
    kingdom.technology.levels.navigation = Math.min(ageTier, context.docks ? 1 + Number(context.docks >= 3) : 0);
    kingdom.technology.levels.medicine = Math.min(ageTier, context.temples ? 1 + Number(context.temples >= 3) : 0);
    kingdom.technology.levels.administration = Math.min(ageTier, context.realmVillages.length >= 2 ? 1 + Number(context.realmVillages.length >= 6) : 1);
  }
  kingdom.culture.influence = Math.max(kingdom.culture.influence, 10 + Math.floor(year * .18) + context.citizens.length * .15 + context.realmVillages.length * 2);
  updateCultureTraditions(kingdom, context); syncKingdomStructureDurability(kingdom);
}

function cultureTechnologyStep() {
  for (const kingdom of kingdoms) {
    if (kingdom.defeated) continue; normalizeCultureTechnology(kingdom);
    const context = cultureContext(kingdom), { citizens, realmVillages, jobs } = context; if (!citizens.length && !realmVillages.length) continue;
    const ethos = cultureEthosDefs[kingdom.culture.ethos], administration = technologyLevel(kingdom, "administration");
    const researchRate = (1 + citizens.filter(person => person.age >= 16).length * .14 + (jobs.builder || 0) * .22 + (jobs.healer || 0) * .28 + (jobs.merchant || 0) * .16 + realmVillages.length * .3 + context.temples * .18 + context.markets * .12) * ethos.research * (1 + administration * .08);
    kingdom.technology.researchRate = researchRate; kingdom.technology.research += researchRate;
    if (technologyLevel(kingdom, kingdom.technology.focus) >= 3 || (year >= kingdom.technology.focusLockedUntil && year - kingdom.technology.lastFocusYear >= 7)) {
      const nextFocus = chooseResearchFocus(kingdom);
      if (nextFocus !== kingdom.technology.focus) setResearchFocus(kingdom.id, nextFocus); else kingdom.technology.lastFocusYear = Math.floor(year);
    }
    let focus = kingdom.technology.focus, cost = currentTechnologyCost(kingdom, focus);
    if (cost && kingdom.technology.research >= cost) {
      kingdom.technology.research -= cost; kingdom.technology.levels[focus]++; kingdom.technology.lastDiscoveryYear = Math.floor(year);
      addEvent(`${technologyDefs[focus].icon} ${kingdom.name}掌握了${technologyDefs[focus].name} ${kingdom.technology.levels[focus]}级。`);
      if (focus === "engineering") syncKingdomStructureDurability(kingdom);
      if (kingdom.technology.levels[focus] >= 3) kingdom.technology.focus = chooseResearchFocus(kingdom);
    }
    const values = kingdom.culture.values, targets = {
      community: 48 + (kingdom.policies?.welfare === "generous" ? 22 : 0) + (kingdom.government === "council" ? 12 : 0),
      nature: 32 + Math.min(42, context.forests * .6) + (kingdom.race === "elf" ? 16 : 0),
      craft: 38 + Math.min(42, (jobs.builder + jobs.miner) * 5 + technologyLevel(kingdom, "engineering") * 7),
      valor: 30 + Math.min(55, context.soldiers * 5 + (kingdomAtWar(kingdom.id) ? 24 : 0)),
      commerce: 32 + Math.min(55, jobs.merchant * 7 + context.markets * 8 + context.docks * 7),
      faith: 35 + Math.min(50, context.temples * 12 + (kingdom.policies?.welfare === "generous" ? 8 : 0))
    };
    for (const value of Object.keys(cultureValueDefs)) values[value] = clamp(values[value] + (targets[value] - values[value]) * .06, 0, 100);
    kingdom.culture.influence += (citizens.length * .025 + realmVillages.length * .45 + context.temples * .3 + totalTechnologyLevel(kingdom) * .12) * (1 + administration * .04);
    updateCultureTraditions(kingdom, context);
  }
}

function exchangeCultures(a, b) {
  if (!a || !b || a.id === b.id) return;
  for (const value of Object.keys(cultureValueDefs)) {
    const average = (a.culture.values[value] + b.culture.values[value]) / 2;
    a.culture.values[value] += (average - a.culture.values[value]) * .025; b.culture.values[value] += (average - b.culture.values[value]) * .025;
  }
  a.culture.exchanges++; b.culture.exchanges++; a.culture.influence += .5; b.culture.influence += .5;
}

function structureTotal() {
  let total = 0;
  for (const village of villages) for (const structure of village.structures || []) if (structure.hp > 0) total++;
  return total;
}

function hasRelationStatus(status) {
  for (let i = 0; i < kingdoms.length; i++) for (let j = i + 1; j < kingdoms.length; j++) {
    if (!kingdoms[i].defeated && !kingdoms[j].defeated && relationBetween(kingdoms[i].id, kingdoms[j].id)?.status === status) return true;
  }
  return false;
}

function updateWorldRecords() {
  const activeKingdoms = kingdoms.filter(kingdom => !kingdom.defeated).length;
  worldStats.peakPopulation = Math.max(worldStats.peakPopulation, people.length);
  worldStats.peakVillages = Math.max(worldStats.peakVillages, villages.length);
  worldStats.peakKingdoms = Math.max(worldStats.peakKingdoms, activeKingdoms);
  worldStats.peakAnimals = Math.max(worldStats.peakAnimals, animals.length);
}

function evaluateWorldProgress(announce = true) {
  updateWorldRecords();
  for (const [id, achievement] of Object.entries(achievementDefs)) {
    if (worldProgress.achievements[id] || !achievement.unlocked()) continue;
    worldProgress.achievements[id] = { year: Math.floor(year) };
    worldProgress.renown += achievement.points;
    addEvent(`${achievement.icon} 达成成就“${achievement.name}”：${achievement.description}。`, "achievement");
    if (announce) showToast(`成就解锁：${achievement.name}  +${achievement.points} 声望`);
  }
  for (const [id, goal] of Object.entries(worldGoalDefs)) {
    if (worldProgress.completedGoals[id] || goal.value() < goal.target) continue;
    worldProgress.completedGoals[id] = { year: Math.floor(year) };
    worldProgress.renown += goal.points;
    addEvent(`${goal.icon} 世界目标“${goal.name}”完成，获得 ${goal.points} 世界声望。`, "goal");
    if (announce) showToast(`世界目标完成：${goal.name}  +${goal.points} 声望`);
  }
}

function createWorldIndex() {
  return {
    kingdomById: new Map(), villageById: new Map(), personById: new Map(), tradeRouteById: new Map(), armyById: new Map(), peopleByVillage: new Map(), peopleByKingdom: new Map(), villagesByKingdom: new Map(),
    peopleSpatial: new Map(), animalSpatial: new Map(), structureByTile: new Map(), speciesCounts: Object.fromEntries(Object.keys(animalDefs).map(species => [species, 0]))
  };
}

function addToIndex(map, key, value) {
  const bucket = map.get(key); if (bucket) bucket.push(value); else map.set(key, [value]);
}

function rebuildWorldIndexes() {
  worldIndex = createWorldIndex();
  for (const kingdom of kingdoms) worldIndex.kingdomById.set(kingdom.id, kingdom);
  for (const village of villages) {
    worldIndex.villageById.set(village.id, village); addToIndex(worldIndex.villagesByKingdom, village.kingdom, village);
    for (const structure of village.structures || []) addToIndex(worldIndex.structureByTile, `${Math.round(structure.x)},${Math.round(structure.y)}`, structure);
  }
  for (const person of people) {
    if (person.dead) continue;
    worldIndex.personById.set(person.id, person);
    addToIndex(worldIndex.peopleByVillage, person.village, person); addToIndex(worldIndex.peopleByKingdom, person.kingdom, person);
    addToIndex(worldIndex.peopleSpatial, spatialKey(person.x, person.y), person);
  }
  for (const animal of animals) {
    if (animal.dead) continue;
    addToIndex(worldIndex.animalSpatial, spatialKey(animal.x, animal.y), animal);
    if (worldIndex.speciesCounts[animal.species] !== undefined) worldIndex.speciesCounts[animal.species]++;
  }
  for (const route of tradeRoutes) worldIndex.tradeRouteById.set(route.id, route);
  for (const army of armies) worldIndex.armyById.set(army.id, army);
  indexesReady = true;
}

function structureAt(x, y, type = null) {
  const structures = indexesReady ? (worldIndex.structureByTile.get(`${Math.round(x)},${Math.round(y)}`) || []) : villages.flatMap(village => village.structures || []).filter(structure => Math.round(structure.x) === Math.round(x) && Math.round(structure.y) === Math.round(y));
  return structures.find(structure => structure.hp > 0 && (!type || structure.type === type)) || null;
}

function indexStructure(structure) {
  if (!indexesReady) return;
  addToIndex(worldIndex.structureByTile, `${Math.round(structure.x)},${Math.round(structure.y)}`, structure);
}

function unindexStructure(structure) {
  if (!indexesReady) return;
  const key = `${Math.round(structure.x)},${Math.round(structure.y)}`, bucket = worldIndex.structureByTile.get(key);
  if (!bucket) return;
  const next = bucket.filter(candidate => candidate.id !== structure.id);
  if (next.length) worldIndex.structureByTile.set(key, next); else worldIndex.structureByTile.delete(key);
}

function animalCounts(forceFresh = false) {
  if (indexesReady && !forceFresh) return worldIndex.speciesCounts;
  const counts = Object.fromEntries(Object.keys(animalDefs).map(species => [species, 0]));
  for (const animal of animals) if (!animal.dead && counts[animal.species] !== undefined) counts[animal.species]++;
  return counts;
}

function nearestEntity(entities, x, y, predicate = null) {
  let nearest = null, bestDistance = Infinity;
  for (const entity of entities) {
    if (predicate && !predicate(entity)) continue;
    const dx = entity.x - x, dy = entity.y - y, distance = dx * dx + dy * dy;
    if (distance < bestDistance) { nearest = entity; bestDistance = distance; }
  }
  return nearest;
}

function habitableTileIndices() {
  const result = [];
  for (let i = 0; i < tiles.length; i++) if (isLand(tiles[i]) && tiles[i].type !== "mountain") result.push(i);
  return result;
}

function scheduleNextDisaster() {
  const range = disasterIntervals[disasterFrequency] || disasterIntervals.normal;
  nextDisasterYear = year + rand(range[0], range[1]);
}

function seasonForYear(value = year) {
  const seasons = Object.keys(seasonDefs), cycle = ((value - 1) % seasons.length + seasons.length) % seasons.length;
  return seasons[Math.floor(cycle)];
}

function weatherPool(season) {
  if (season === "spring") return ["clear", "rain", "rain", "storm"];
  if (season === "summer") return ["clear", "clear", "rain", "heatwave"];
  if (season === "autumn") return ["clear", "rain", "storm", "clear"];
  return ["clear", "frost", "frost", "storm"];
}

function updateClimate() {
  const season = seasonForYear(), previousSeason = climate.season;
  climate.season = season; climate.seasonProgress = ((year - 1) % 1 + 1) % 1;
  if (season !== previousSeason) addEvent(`${seasonDefs[season].icon} ${seasonDefs[season].name}季到来，世界气候开始转变。`);
  if (!weatherDefs[climate.weather] || year >= (climate.nextWeatherYear || 0)) {
    const pool = weatherPool(season), previousWeather = climate.weather;
    climate.weather = pool[randi(0, pool.length - 1)]; climate.weatherUntil = year + rand(.55, 1.15); climate.nextWeatherYear = climate.weatherUntil;
    if (climate.weather !== previousWeather && climate.weather !== "clear") addEvent(`${weatherDefs[climate.weather].icon} ${weatherDefs[climate.weather].name}席卷世界，生产与生态受到影响。`);
  }
  const seasonDef = seasonDefs[season], weather = weatherDefs[climate.weather] || weatherDefs.clear;
  climate.temperature = seasonDef.temperature + weather.temperature + Math.sin(year * 2.7) * 1.4;
  climate.rainfall = clamp(seasonDef.rainfall + weather.rainfall, 0, 1);
}

function findNearbyEntity(map, x, y, radius, predicate, nearest = false) {
  let match = null, bestDistance = Infinity;
  const radiusSquared = radius * radius, cellRadius = Math.ceil(radius / 6), cx = Math.floor(x / 6), cy = Math.floor(y / 6);
  for (let oy = -cellRadius; oy <= cellRadius; oy++) for (let ox = -cellRadius; ox <= cellRadius; ox++) {
    for (const entity of map.get(`${cx + ox},${cy + oy}`) || []) {
      const dx = entity.x - x, dy = entity.y - y;
      const distance = dx * dx + dy * dy;
      if (entity.dead || distance > radiusSquared || !predicate(entity)) continue;
      if (!nearest) return entity;
      if (distance < bestDistance) { match = entity; bestDistance = distance; }
    }
  }
  return match;
}

function countNearbyEntities(map, x, y, radius, predicate) {
  let count = 0;
  const radiusSquared = radius * radius, cellRadius = Math.ceil(radius / 6), cx = Math.floor(x / 6), cy = Math.floor(y / 6);
  for (let oy = -cellRadius; oy <= cellRadius; oy++) for (let ox = -cellRadius; ox <= cellRadius; ox++) {
    for (const entity of map.get(`${cx + ox},${cy + oy}`) || []) {
      const dx = entity.x - x, dy = entity.y - y;
      if (!entity.dead && dx * dx + dy * dy <= radiusSquared && predicate(entity)) count++;
    }
  }
  return count;
}

function relationBetween(aId, bId) {
  return getKingdom(aId)?.relations?.[String(bId)] || null;
}

function setRelation(aId, bId, status, score, silent = false) {
  const a = getKingdom(aId), b = getKingdom(bId); if (!a || !b || aId === bId) return;
  const previous = relationBetween(aId, bId), previousStatus = previous?.status;
  const value = createDiplomaticRelationState(previous, status, score, Math.floor(year));
  a.relations[String(bId)] = { ...value, memories: value.memories.map(memory => ({ ...memory })) };
  b.relations[String(aId)] = { ...value, memories: value.memories.map(memory => ({ ...memory })) };
  if (previousStatus && previousStatus !== status) {
    if (status === "war") worldStats.warsStarted++;
    if (previousStatus === "war" && status === "peace") worldStats.warsEnded++;
  }
  if (!silent) {
    const phrase = status === "war" ? "正式开战" : status === "alliance" ? "缔结同盟" : "恢复和平";
    addEvent(`${a.name}与${b.name}${phrase}。`);
    if (previousStatus !== status) recordDiplomaticMemory(aId, bId, status, phrase, status === "alliance" ? 10 : status === "peace" ? 4 : -12, status === "war" ? 18 : -6);
  }
}

function interveneDiplomacy(aId, bId, action) {
  const a = getKingdom(aId), b = getKingdom(bId), relation = relationBetween(aId, bId);
  if (!a || !b || a.defeated || b.defeated || !relation) return;
  if (action === "war" && relation.status !== "war") {
    setRelation(aId, bId, "war", Math.min(-55, relation.score));
    a.warWeariness = Math.min(a.warWeariness || 0, 12); b.warWeariness = Math.min(b.warWeariness || 0, 12);
    updateMilitaryRoles();
    showToast("战争已经被神力点燃");
  } else if (action === "peace" && relation.status === "war") {
    setRelation(aId, bId, "peace", Math.max(-18, relation.score));
    a.warWeariness = 0; b.warWeariness = 0;
    updateMilitaryRoles();
    showToast("交战双方接受了神谕停战");
  }
  updateTradeRoutes();
  updateUI(); renderDirty = true;
}

function createKingdom(race = "human") {
  const id = kingdoms.length ? Math.max(...kingdoms.map(k => k.id)) + 1 : 0;
  const def = raceDefs[race] || raceDefs.human;
  let raceCount = 0; for (const kingdom of kingdoms) if (kingdom.race === race) raceCount++;
  const baseName = def.names[raceCount % def.names.length], cycle = Math.floor(raceCount / def.names.length);
  const government = { human: "monarchy", elf: "council", dwarf: "republic", orc: "clan" }[race] || "monarchy";
  const kingdom = {
    id, name: cycle ? `${baseName}·${cycle + 1}` : baseName, color: kingdomColors[id % kingdomColors.length], race,
    resources: { food: BALANCE.settlement.initialFood, wood: BALANCE.settlement.initialWood, stone: BALANCE.settlement.initialStone }, relations: {}, warWeariness: 0, famine: false, famineLevel: 0, famineSince: null,
    government, policies: { tax: "standard", welfare: "balanced", military: race === "orc" ? "conquest" : "defense" }, treasury: 35,
    legitimacy: 68, unrest: 8, welfareCoverage: 1, lastTaxRevenue: 0, lastPolicyYear: 1, lastReformYear: 0, policyLockedUntil: 0, rebellionCooldownUntil: 0,
    culture: createCultureState(race, cycle ? `${baseName}·${cycle + 1}` : baseName), technology: createTechnologyState(race)
  };
  kingdoms.push(kingdom);
  for (const other of kingdoms) if (other.id !== id) {
    const affinity = other.race === race ? 12 : (race === "orc" || other.race === "orc") ? -12 : 0;
    setRelation(id, other.id, "peace", randi(-35, 35) + affinity, true);
  }
  return kingdom;
}

function generateWorld(seed = document.getElementById("worldSeedInput").value || createRandomSeed()) {
  worldSeed = setSeed(seed);
  document.getElementById("worldSeedInput").value = worldSeed;
  document.getElementById("worldSeedStat").textContent = `种子 ${worldSeed}`;
  const elevation = smoothNoise(MAP_W, MAP_H, 4);
  const moisture = smoothNoise(MAP_W, MAP_H, 3);
  tiles = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const edge = Math.min(x, y, MAP_W - 1 - x, MAP_H - 1 - y) / 13;
    const e = elevation[idx(x, y)] + Math.min(1, edge) * .22 - .13;
    let type = e < .45 ? "deep" : e < .49 ? "water" : e < .525 ? "sand" : e > .69 ? "mountain" : moisture[idx(x, y)] > .53 ? "forest" : "grass";
    const biomass = type === "forest" ? rand(.72, 1) : type === "grass" ? rand(.5, .88) : type === "sand" ? rand(.05, .16) : 0;
    const latitudeTemperature = 29 - Math.abs(y / (MAP_H - 1) - .5) * 31;
    tiles.push({ type, fertility: type === "forest" ? 1 : type === "grass" ? .75 : .25, biomass, moisture: clamp(moisture[idx(x, y)], .08, .95), temperature: latitudeTemperature - (type === "mountain" ? 8 : 0) + rand(-1.5, 1.5), fire: 0, owner: -1 });
  }
  people = []; animals = []; villages = []; kingdoms = []; events = []; chronicle = []; activeDisasters = []; tradeRoutes = []; caravans = []; armies = []; worldStats = createWorldStats(); worldProgress = createWorldProgress(); year = 1; ticks = 0; climate = { season: "spring", weather: "clear", temperature: 16, rainfall: .72, seasonProgress: 0, weatherUntil: 1.8, nextWeatherYear: 1.8 }; nextPersonId = 1; nextAnimalId = 1; nextVillageId = 1; nextStructureId = 1; nextTradeRouteId = 1; nextCaravanId = 1; nextArmyId = 1; nextDisasterId = 1; selectedKingdomId = null; selectedTradeRouteId = null; selectedArmyId = null; indexesReady = false; lastAutoSaveYear = 1;
  resetExperienceState();
  camera = { x: 0, y: 0, zoom: 1 };
  const valid = habitableTileIndices();
  const anchors = [];
  const foundingRaces = ["human", "elf", "dwarf", "orc"];
  for (let group = 0; group < 4 && valid.length; group++) {
    let anchor = null;
    for (let attempt = 0; attempt < 100; attempt++) {
      const i = valid[randi(0, valid.length - 1)], candidate = { x: i % MAP_W, y: Math.floor(i / MAP_W) };
      if (anchors.every(a => Math.hypot(a.x - candidate.x, a.y - candidate.y) > 20)) { anchor = candidate; break; }
    }
    if (!anchor) continue; anchors.push(anchor);
    spawnPerson(anchor.x, anchor.y, null, foundingRaces[group]);
    const founder = people[people.length - 1]; createVillage(founder);
    for (let n = 1; n < 5; n++) {
      let placed = false;
      for (let attempt = 0; attempt < 20 && !placed; attempt++) {
        const x = anchor.x + randi(-4, 4), y = anchor.y + randi(-4, 4);
        if (isLand(tileAt(x, y)) && tileAt(x, y).type !== "mountain") {
          spawnPerson(x, y, founder.kingdom, founder.race); people[people.length - 1].village = founder.village; placed = true;
        }
      }
    }
  }
  populateWildlife(valid);
  updateProfessions();
  heroStep(true);
  scheduleNextDisaster();
  rebuildWorldIndexes();
  document.getElementById("worldName").textContent = worldNames[randi(0, worldNames.length - 1)];
  document.getElementById("saveStatus").textContent = "尚未保存";
  addEvent("新的世界从混沌中苏醒。");
  addEvent("第一批流浪者踏上了大陆。");
  evaluateWorldProgress(false);
  updateUI(); render();
}

function spawnPerson(x, y, kingdom = null, race = null) {
  if (!isLand(tileAt(x, y)) || tileAt(x, y).type === "mountain") return;
  race ||= getKingdom(kingdom)?.race || "human";
  people.push({
    id: nextPersonId++, x, y, age: randi(16, 35), health: 100, food: rand(45, 90),
    kingdom, race, village: null, role: "civilian", profession: "laborer", previousProfession: null, socialClass: "peasant",
    unitType: null, isGeneral: false, leadership: 1,
    happiness: rand(48, 72), needs: { nutrition: 65, shelter: 45, safety: 65, health: 80 },
    cooldown: randi(0, 20), attackCooldown: 0, blessed: false, dead: false
  });
}

function spawnAnimal(x, y, species, age = null) {
  const def = animalDefs[species], tile = tileAt(x, y); if (!def || !isLand(tile) || !def.habitats.includes(tile.type)) return null;
  const animal = {
    id: nextAnimalId++, species, x, y, age: age ?? rand(def.adult, def.maxAge * .55), health: def.health,
    hunger: rand(55, 95), cooldown: randi(1, 12), attackCooldown: 0, dead: false
  };
  animals.push(animal); return animal;
}

function populateWildlife(validTiles) {
  const counts = { rabbit: 120, deer: 60, boar: 28, fox: 10, wolf: 14, bear: 4 };
  for (const [species, count] of Object.entries(counts)) for (let n = 0; n < count; n++) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const i = validTiles[randi(0, validTiles.length - 1)], x = i % MAP_W, y = Math.floor(i / MAP_W);
      if (spawnAnimal(x, y, species)) break;
    }
  }
}

function addEvent(text, kind = "event") {
  const entry = { year: Math.max(1, Math.floor(year)), text: cleanText(text), kind };
  events.unshift(entry);
  events = events.slice(0, 14);
  chronicle.unshift(entry);
  chronicle = chronicle.slice(0, 240);
}

function emptyBuildingCounts() {
  return Object.fromEntries(Object.keys(buildingDefs).map(type => [type, 0]));
}

function syncBuildingCounts(village) {
  const counts = emptyBuildingCounts();
  for (const structure of village.structures || []) if (buildingDefs[structure.type] && structure.hp > 0) counts[structure.type]++;
  village.buildings = counts;
  return counts;
}

function buildingCount(village, type) {
  return village.buildings?.[type] || 0;
}

function villageMaxHp(village) {
  const kingdom = getKingdom(village.kingdom), durability = 1 + technologyLevel(kingdom, "engineering") * .08 + (hasTradition(kingdom, "stone_lore") ? .06 : 0);
  return Math.round((160 + village.level * 50 + buildingCount(village, "wall") * 24) * durability);
}

function adjacentWaterCount(x, y) {
  let water = 0;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if ((ox || oy) && ["water", "deep"].includes(tileAt(x + ox, y + oy)?.type)) water++;
  return water;
}

function villageIsWaterfront(village) {
  const radius = 10 + village.level * 2;
  for (let y = village.y - radius; y <= village.y + radius; y++) for (let x = village.x - radius; x <= village.x + radius; x++) {
    if (isLand(tileAt(x, y)) && adjacentWaterCount(x, y)) return true;
  }
  return false;
}

function structureSiteScore(village, type, x, y) {
  const tile = tileAt(x, y), distance = Math.hypot(x - village.x, y - village.y);
  if (!tile || (!isLand(tile) && type !== "dock") || tile.fire || (tile.owner >= 0 && tile.owner !== village.kingdom)) return -Infinity;
  if ((village.structures || []).some(structure => structure.hp > 0 && Math.hypot(structure.x - x, structure.y - y) < .8)) return -Infinity;
  if (type === "dock") {
    const water = adjacentWaterCount(x, y); if (!isLand(tile) || !water) return -Infinity;
    return water * 3 - distance * .12 + random();
  }
  if (type !== "quarry" && tile.type === "mountain") return -Infinity;
  if (type === "farm") return (tile.fertility || 0) * 5 + (tile.type === "grass" ? 2 : 0) - distance * .08 + random();
  if (type === "lumber") return (tile.type === "forest" ? 7 : (tile.biomass || 0) * 2) - distance * .08 + random();
  if (type === "quarry") return (tile.type === "mountain" ? 9 : 0) + [tileAt(x + 1, y), tileAt(x - 1, y), tileAt(x, y + 1), tileAt(x, y - 1)].filter(candidate => candidate?.type === "mountain").length * 2 - distance * .05 + random();
  if (type === "wall") return 6 - Math.abs(distance - (3.2 + village.level)) * 2 + random();
  return 4 - Math.abs(distance - 2.8) * .45 + (tile.type === "grass" ? .8 : 0) + random();
}

function findStructureSite(village, type) {
  if (type === "hall") return { x: village.x, y: village.y };
  let best = null, bestScore = -Infinity;
  const radius = type === "dock" || type === "quarry" ? 12 + village.level * 2 : 6 + village.level * 2;
  for (let y = Math.max(0, village.y - radius); y <= Math.min(MAP_H - 1, village.y + radius); y++) for (let x = Math.max(0, village.x - radius); x <= Math.min(MAP_W - 1, village.x + radius); x++) {
    if (Math.hypot(x - village.x, y - village.y) > radius) continue;
    const score = structureSiteScore(village, type, x, y);
    if (score > bestScore) { bestScore = score; best = { x, y }; }
  }
  return best;
}

function addStructureEntity(village, type, site = null) {
  const def = buildingDefs[type]; if (!def) return null;
  site ||= findStructureSite(village, type); if (!site) return null;
  village.structures ||= [];
  const kingdom = getKingdom(village.kingdom), durability = 1 + technologyLevel(kingdom, "engineering") * .1 + (hasTradition(kingdom, "stone_lore") ? .08 : 0), maxHp = Math.round(def.maxHp * durability);
  const structure = { id: nextStructureId++, type, x: site.x, y: site.y, hp: maxHp, maxHp, builtYear: Math.floor(year) };
  village.structures.push(structure);
  worldStats.buildingsConstructed++;
  const tile = tileAt(Math.round(site.x), Math.round(site.y)); if (tile && isLand(tile) && tile.owner < 0) tile.owner = village.kingdom;
  syncBuildingCounts(village); indexStructure(structure);
  return structure;
}

function buildRoadProject(village, segmentLimit = 3) {
  const destinations = (village.structures || []).filter(structure => !["hall", "road", "wall"].includes(structure.type)).sort((a, b) => Math.hypot(b.x - village.x, b.y - village.y) - Math.hypot(a.x - village.x, a.y - village.y));
  const otherVillage = nearestEntity(villages, village.x, village.y, candidate => candidate.id !== village.id && candidate.kingdom === village.kingdom);
  const target = destinations.find(structure => Math.hypot(structure.x - village.x, structure.y - village.y) > 2.2) || otherVillage;
  if (!target) return 0;
  const distance = Math.max(1, Math.ceil(Math.hypot(target.x - village.x, target.y - village.y))), created = [];
  for (let step = 1; step < distance && created.length < segmentLimit; step++) {
    const x = Math.round(village.x + (target.x - village.x) * step / distance), y = Math.round(village.y + (target.y - village.y) * step / distance), tile = tileAt(x, y);
    if (!isLand(tile) || tile.type === "mountain" || structureAt(x, y)) continue;
    const structure = addStructureEntity(village, "road", { x, y }); if (structure) created.push(structure);
  }
  return created.length;
}

function seedVillageStructures(village, legacyCounts) {
  village.structures = [];
  addStructureEntity(village, "hall", { x: village.x, y: village.y });
  for (const type of ["house", "farm", "lumber", "quarry", "barracks", "wall", "market", "dock", "warehouse", "temple"]) {
    const amount = clamp(Math.floor(Number(legacyCounts?.[type]) || 0), 0, 60);
    for (let n = 0; n < amount; n++) if (!addStructureEntity(village, type)) break;
  }
  const roadAmount = clamp(Math.floor(Number(legacyCounts?.road) || 0), 0, 80);
  for (let n = 0; n < roadAmount;) { const made = buildRoadProject(village, Math.min(3, roadAmount - n)); if (!made) break; n += made; }
  syncBuildingCounts(village);
}

function createVillage(founder) {
  if (villages.some(v => Math.hypot(v.x - founder.x, v.y - founder.y) < 10)) return;
  let kingdom = getKingdom(founder.kingdom);
  if (!kingdom) {
    kingdom = createKingdom(founder.race); founder.kingdom = kingdom.id;
    addEvent(`${kingdom.name}在荒野中诞生。`);
  }
  const village = {
    id: nextVillageId++, x: founder.x, y: founder.y,
    name: `${["河湾", "绿林", "星丘", "橡木", "晨风", "望海"][randi(0,5)]}村`,
    kingdom: kingdom.id, level: 1, hp: 160,
    buildings: { hall: 1, house: 2, farm: 1, lumber: 0, quarry: 0, barracks: 0, road: 2, wall: 0, market: 0, dock: 0, warehouse: 0, temple: 0 }, structures: [],
    inventory: { food: 45, wood: 24, stone: 12 }, demand: { food: 0, wood: 0, stone: 0 }, supply: { food: 0, wood: 0, stone: 0 }, prices: { food: 1, wood: 1, stone: 1 },
    buildCooldown: randi(8, 16), workforce: {}, averageHappiness: 60, unrest: 8
  };
  villages.push(village); founder.village = village.id; seedVillageStructures(village, village.buildings);
  worldStats.villagesFounded++;
  claimTerritory(village, 3);
  addEvent(`${village.name}建立，炊烟第一次升起。`);
}

function claimTerritory(village, radius) {
  for (let y = village.y - radius; y <= village.y + radius; y++) for (let x = village.x - radius; x <= village.x + radius; x++) {
    const t = tileAt(x, y); if (!t || !isLand(t) || Math.hypot(x - village.x, y - village.y) > radius + random() * 1.7) continue;
    if (t.owner < 0 || t.owner === village.kingdom) t.owner = village.kingdom;
  }
}

function villageCapacity(village) { return BALANCE.settlement.baseCapacity + (village.buildings?.house || 0) * BALANCE.settlement.peoplePerHouse; }

function ownedTerrainCounts(kingdomId, village) {
  const result = { grass: 0, forest: 0, mountain: 0, sand: 0 };
  const radius = 5 + village.level * 2;
  for (let y = village.y - radius; y <= village.y + radius; y++) for (let x = village.x - radius; x <= village.x + radius; x++) {
    const t = tileAt(x, y); if (t?.owner === kingdomId && result[t.type] !== undefined) result[t.type]++;
  }
  return result;
}

function professionCounts(citizens) {
  const counts = Object.fromEntries(Object.keys(professionDefs).map(key => [key, 0]));
  for (const person of citizens) {
    const profession = person.role === "soldier" ? "soldier" : professionDefs[person.profession] ? person.profession : "laborer";
    counts[profession]++;
  }
  return counts;
}

function averageHappiness(citizens) {
  if (!citizens.length) return 0;
  let total = 0; for (const person of citizens) total += Number(person.happiness) || 0;
  return total / citizens.length;
}

function governmentOf(kingdom) { return governmentDefs[kingdom?.government] || governmentDefs.monarchy; }
function policyOf(kingdom, domain) {
  const fallback = { tax: "standard", welfare: "balanced", military: "defense" }[domain];
  return policyDefs[domain]?.[kingdom?.policies?.[domain]] || policyDefs[domain][fallback];
}

function socialClassFor(person) {
  if (person.age < 16 || person.profession === "child") return "dependent";
  if (person.isGeneral) return "elite";
  if (person.role === "soldier") return "warrior";
  if (person.profession === "merchant") return "merchant";
  if (["builder", "healer"].includes(person.profession)) return "artisan";
  return "peasant";
}

function assignSocialClasses(citizens = people) {
  for (const person of citizens) person.socialClass = socialClassFor(person);
}

function socialClassCounts(citizens) {
  const counts = Object.fromEntries(Object.keys(socialClassDefs).map(key => [key, 0]));
  for (const person of citizens) counts[socialClassDefs[person.socialClass] ? person.socialClass : socialClassFor(person)]++;
  return counts;
}

function setKingdomPolicy(kingdomId, domain, value, playerAction = false) {
  const kingdom = getKingdom(kingdomId); if (!kingdom || !policyDefs[domain]?.[value] || kingdom.policies?.[domain] === value) return false;
  kingdom.policies ||= { tax: "standard", welfare: "balanced", military: "defense" };
  kingdom.policies[domain] = value; kingdom.lastPolicyYear = Math.floor(year);
  if (playerAction) kingdom.policyLockedUntil = year + 8;
  const domainLabel = { tax: "税制", welfare: "民生", military: "军事方针" }[domain];
  addEvent(`${kingdom.name}将${domainLabel}调整为“${policyDefs[domain][value].name}”。`);
  if (domain === "military") updateMilitaryRoles();
  if (playerAction) { showToast(`${kingdom.name}的${domainLabel}已经改变`); updateUI(); renderDirty = true; }
  return true;
}

function rebellionCandidate(kingdom) {
  const realmVillages = villagesOfKingdom(kingdom.id); if (realmVillages.length < 2) return null;
  const capital = [...realmVillages].sort((a, b) => peopleOfVillage(b.id).length - peopleOfVillage(a.id).length)[0];
  return [...realmVillages].filter(village => village.id !== capital?.id && peopleOfVillage(village.id).length >= 2).sort((a, b) => (b.unrest || 0) - (a.unrest || 0) || Math.hypot(b.x - capital.x, b.y - capital.y) - Math.hypot(a.x - capital.x, a.y - capital.y))[0] || null;
}

function triggerRebellion(parent, village) {
  if (!parent || !village || village.kingdom !== parent.id || villagesOfKingdom(parent.id).length < 2 || year < (parent.rebellionCooldownUntil || 0)) return null;
  const residents = peopleOfVillage(village.id), raceTotals = Object.fromEntries(Object.keys(raceDefs).map(race => [race, 0]));
  for (const resident of residents) raceTotals[resident.race] = (raceTotals[resident.race] || 0) + 1;
  const dominantRace = Object.entries(raceTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || parent.race;
  const rebel = createKingdom(dominantRace), rootName = village.name.replace(/[村镇城]$/, "");
  rebel.name = `${rootName}${dominantRace === "orc" ? "战团" : "自由领"}`; rebel.government = dominantRace === "orc" ? "clan" : "republic";
  rebel.culture.name = `${rootName}新传统`; rebel.culture.values = Object.fromEntries(Object.keys(cultureValueDefs).map(value => [value, clamp(parent.culture.values[value] * .72 + rebel.culture.values[value] * .28, 0, 100)])); rebel.culture.traditions = parent.culture.traditions.slice(0, 3);
  rebel.technology.levels = Object.fromEntries(Object.keys(technologyDefs).map(technology => [technology, Math.max(0, technologyLevel(parent, technology) - (random() < .25 ? 1 : 0))]));
  rebel.policies = { tax: "low", welfare: "balanced", military: "defense" }; rebel.legitimacy = 58; rebel.unrest = 22; rebel.rebellionCooldownUntil = year + 10;
  for (const resource of ["food", "wood", "stone"]) {
    const seized = Math.max(0, (parent.resources[resource] || 0) * .18); parent.resources[resource] -= seized; rebel.resources[resource] = seized;
  }
  const seizedTreasury = Math.max(0, (parent.treasury || 0) * .2); parent.treasury = Math.max(0, (parent.treasury || 0) - seizedTreasury); rebel.treasury = seizedTreasury;
  village.kingdom = rebel.id; village.unrest = 24;
  for (const resident of residents) { resident.kingdom = rebel.id; resident.happiness = Math.min(100, resident.happiness + 10); }
  const transferRadius = 4 + village.level * 2;
  for (let y = Math.max(0, village.y - transferRadius); y <= Math.min(MAP_H - 1, village.y + transferRadius); y++) for (let x = Math.max(0, village.x - transferRadius); x <= Math.min(MAP_W - 1, village.x + transferRadius); x++) {
    const tile = tileAt(x, y); if (tile?.owner === parent.id && Math.hypot(x - village.x, y - village.y) <= transferRadius) tile.owner = rebel.id;
  }
  parent.unrest = Math.max(35, parent.unrest - 18); parent.legitimacy = Math.max(0, parent.legitimacy - 15); parent.rebellionCooldownUntil = year + 8;
  worldStats.rebellions++;
  setRelation(parent.id, rebel.id, "war", -88, true); addEvent(`${village.name}发动叛乱，脱离${parent.name}并建立${rebel.name}！`);
  updateMilitaryRoles(); updateTradeRoutes(); indexesReady = false; renderDirty = true;
  return rebel;
}

function interveneUnrest(kingdomId, amount) {
  const kingdom = getKingdom(kingdomId); if (!kingdom || kingdom.defeated) return;
  kingdom.unrest = clamp((kingdom.unrest || 0) + amount, 0, 100);
  addEvent(amount > 0 ? `神力煽动了${kingdom.name}的反对势力。` : `神谕暂时安抚了${kingdom.name}的民心。`);
  const candidate = rebellionCandidate(kingdom);
  if (amount > 0 && kingdom.unrest >= 88 && candidate) triggerRebellion(kingdom, candidate);
  showToast(amount > 0 ? "动乱正在蔓延" : "民心暂时安定"); updateUI(); renderDirty = true;
}

function governanceStep() {
  for (const kingdom of kingdoms) {
    if (kingdom.defeated) continue;
    const citizens = peopleOfKingdom(kingdom.id), realmVillages = villagesOfKingdom(kingdom.id); if (!citizens.length && !realmVillages.length) continue;
    assignSocialClasses(citizens);
    const classes = socialClassCounts(citizens), government = governmentOf(kingdom), tax = policyOf(kingdom, "tax"), welfare = policyOf(kingdom, "welfare"), military = policyOf(kingdom, "military");
    const adults = citizens.length - classes.dependent, markets = realmVillages.reduce((sum, village) => sum + buildingCount(village, "market"), 0);
    const economicBase = adults * .55 + classes.merchant * 1.8 + classes.artisan * .7 + markets * 2.2;
    const administrationBonus = 1 + technologyLevel(kingdom, "administration") * .08;
    kingdom.lastTaxRevenue = economicBase * tax.rate * 4 * government.tax * administrationBonus; kingdom.treasury = clamp((kingdom.treasury || 0) + kingdom.lastTaxRevenue, 0, 99999);
    const welfareCost = citizens.length * welfare.cost * government.welfare, paid = Math.min(kingdom.treasury, welfareCost);
    kingdom.treasury -= paid; kingdom.welfareCoverage = welfareCost > 0 ? paid / welfareCost : 1;
    const happiness = averageHappiness(citizens), lowCoverage = (1 - kingdom.welfareCoverage) * 24;
    const unrestTarget = clamp(Math.max(0, 56 - happiness) * 1.12 + (kingdom.famineLevel || 0) * .5 + (kingdom.warWeariness || 0) * .27 + tax.unrest + welfare.unrest + lowCoverage + (military.happiness < 0 && !kingdomAtWar(kingdom.id) ? -military.happiness : 0) - government.stability, 0, 100);
    kingdom.unrest = clamp((kingdom.unrest || 0) + (unrestTarget - (kingdom.unrest || 0)) * .14, 0, 100);
    const treasurySecurity = Math.min(10, kingdom.treasury / Math.max(1, citizens.length) * .45), legitimacyTarget = clamp(happiness * .68 + government.stability + treasurySecurity + technologyLevel(kingdom, "administration") * 2 - kingdom.unrest * .32 - (kingdom.warWeariness || 0) * .12, 0, 100);
    kingdom.legitimacy = clamp((kingdom.legitimacy || 60) + (legitimacyTarget - (kingdom.legitimacy || 60)) * .1, 0, 100);
    const capital = [...realmVillages].sort((a, b) => peopleOfVillage(b.id).length - peopleOfVillage(a.id).length)[0];
    for (const village of realmVillages) {
      const localHappiness = averageHappiness(peopleOfVillage(village.id)), distance = capital ? Math.hypot(village.x - capital.x, village.y - capital.y) : 0;
      const localTarget = clamp(kingdom.unrest + Math.max(0, 58 - localHappiness) * .75 + Math.max(0, distance - 30) * .25, 0, 100);
      village.unrest = clamp((village.unrest || kingdom.unrest) + (localTarget - (village.unrest || kingdom.unrest)) * .18, 0, 100);
    }
    if (year >= (kingdom.policyLockedUntil || 0) && year - (kingdom.lastPolicyYear || 0) >= 8) {
      const desiredTax = kingdom.unrest > 56 ? "low" : kingdom.treasury < citizens.length * .32 ? "high" : "standard";
      const desiredWelfare = kingdom.famine || kingdom.unrest > 48 ? "generous" : kingdom.treasury < citizens.length * .22 ? "austerity" : "balanced";
      const desiredMilitary = kingdomAtWar(kingdom.id) ? (kingdom.race === "orc" && kingdom.warWeariness < 35 ? "conquest" : "defense") : kingdom.warWeariness > 30 ? "pacifist" : kingdom.race === "orc" ? "conquest" : "defense";
      setKingdomPolicy(kingdom.id, "tax", desiredTax); setKingdomPolicy(kingdom.id, "welfare", desiredWelfare); setKingdomPolicy(kingdom.id, "military", desiredMilitary);
      kingdom.lastPolicyYear = Math.floor(year);
    }
    if (kingdom.legitimacy < 28 && kingdom.unrest > 56 && year - (kingdom.lastReformYear || 0) > 15 && random() < .12) {
      const oldGovernment = governmentOf(kingdom).name, nextGovernment = kingdom.government === "republic" ? "council" : kingdom.race === "orc" ? "clan" : "republic";
      kingdom.government = nextGovernment; kingdom.lastReformYear = Math.floor(year); kingdom.legitimacy = Math.min(100, kingdom.legitimacy + 16); kingdom.unrest = Math.max(0, kingdom.unrest - 14);
      addEvent(`${kingdom.name}废除${oldGovernment}，改组为${governmentDefs[nextGovernment].name}。`);
    }
    const candidate = rebellionCandidate(kingdom);
    if (candidate && kingdom.unrest > 78 && (candidate.unrest || 0) > 68 && random() < (kingdom.unrest - 72) * .012) triggerRebellion(kingdom, candidate);
  }
}

function desiredProfessionCounts(village, adults) {
  const terrain = ownedTerrainCounts(village.kingdom, village), buildings = village.buildings, kingdom = getKingdom(village.kingdom);
  const infected = peopleOfVillage(village.id).filter(person => person.plague > 0).length;
  return {
    farmer: Math.min(adults, Math.max(1, buildings.farm * 2 + (kingdom?.famine ? 1 : 0))),
    healer: adults >= 7 ? Math.min(3, 1 + (infected >= 4 ? 1 : 0) + Math.min(1, buildings.temple || 0)) : 0,
    builder: adults >= 3 ? Math.min(4, 1 + Math.floor(adults / 24) + ((village.structures || []).some(structure => structure.hp < structure.maxHp * .7) ? 1 : 0)) : 0,
    lumberjack: Math.min(4, buildings.lumber * 2 + (terrain.forest >= 8 ? 1 : 0)),
    miner: Math.min(4, buildings.quarry * 2 + (terrain.mountain >= 3 ? 1 : 0)),
    merchant: adults >= 8 && ((buildings.market || 0) + (buildings.dock || 0) + (buildings.warehouse || 0) > 0) ? Math.min(4, 1 + buildings.market + buildings.dock + Math.floor(adults / 30)) : 0
  };
}

function demobilizePerson(person) {
  person.role = "civilian";
  person.profession = professionDefs[person.previousProfession] && person.previousProfession !== "soldier" ? person.previousProfession : "laborer";
  person.previousProfession = null; person.unitType = null; person.isGeneral = false; person.leadership = 1;
}

function updateProfessions() {
  for (const person of people) {
    if (person.age < 16) { person.profession = "child"; continue; }
    if (person.role === "soldier") { person.profession = "soldier"; continue; }
    if (!person.village) person.profession = "laborer";
  }
  const priority = ["farmer", "healer", "builder", "lumberjack", "miner", "merchant"];
  for (const village of villages) {
    const residents = peopleOfVillage(village.id), adults = residents.filter(person => person.age >= 16 && person.role !== "soldier");
    const desired = desiredProfessionCounts(village, adults.length), assigned = Object.fromEntries(priority.map(job => [job, 0])), available = [];
    for (const person of adults) {
      if (desired[person.profession] > (assigned[person.profession] || 0)) assigned[person.profession]++;
      else { person.profession = "laborer"; available.push(person); }
    }
    for (const job of priority) while (assigned[job] < desired[job] && available.length) {
      const person = available.shift(); person.profession = job; assigned[job]++;
    }
    village.workforce = professionCounts(residents); village.averageHappiness = averageHappiness(residents);
  }
  assignSocialClasses();
}

function performHealerWork(village, healerCount) {
  if (!healerCount) return;
  const kingdom = getKingdom(village.kingdom), medicine = technologyLevel(kingdom, "medicine"), multiplier = 1 + medicine * .14 + (hasTradition(kingdom, "healer_orders") ? .12 : 0);
  healerCount = (healerCount + buildingCount(village, "temple") * .35) * multiplier;
  for (const person of peopleOfVillage(village.id)) {
    const maxHealth = person.blessed ? 140 : person.role === "soldier" ? 110 : 100;
    if (person.health < maxHealth) person.health = Math.min(maxHealth, person.health + healerCount * .28);
    if (person.plague > 0) person.plague = Math.max(0, person.plague - healerCount * 7);
  }
}

function updateFamineState(kingdom, citizens) {
  const previous = Boolean(kingdom.famine), reservePerPerson = kingdom.resources.food / Math.max(1, citizens.length), safeReserve = 2.5;
  kingdom.famineLevel = Number(kingdom.famineLevel) || 0;
  if (citizens.length && reservePerPerson < safeReserve) kingdom.famineLevel = clamp(kingdom.famineLevel + 2.5 + (safeReserve - reservePerPerson) * 3, 0, 100);
  else kingdom.famineLevel = Math.max(0, kingdom.famineLevel - Math.max(1.5, (reservePerPerson - safeReserve) * .9));
  kingdom.famine = kingdom.famineLevel >= 12 || (previous && kingdom.famineLevel >= 5);
  if (kingdom.famine && !previous) { kingdom.famineSince = Math.floor(year); addEvent(`${kingdom.name}爆发饥荒，居民开始争夺粮食。`); }
  if (!kingdom.famine && previous) { kingdom.famineSince = null; addEvent(`${kingdom.name}的粮食供应恢复，饥荒宣告结束。`); }
  if (kingdom.famine) {
    const severity = kingdom.famineLevel / 100;
    for (const person of citizens) { person.food = Math.max(0, person.food - .35 - severity); person.happiness = Math.max(0, person.happiness - .4 - severity); }
  }
}

function personNearDisaster(person) {
  for (const disaster of activeDisasters) {
    const dx = person.x - disaster.x, dy = person.y - disaster.y, radius = disaster.radius + 4;
    if (dx * dx + dy * dy <= radius * radius) return true;
  }
  return false;
}

function updatePersonWellbeing(person, home, realm) {
  person.needs ||= { nutrition: person.food, shelter: home ? 70 : 25, safety: 65, health: person.health };
  const residents = home ? peopleOfVillage(home.id).length : 0, capacity = home ? villageCapacity(home) : 1;
  const overcrowding = home ? Math.max(0, residents - capacity) / Math.max(1, capacity) : 1;
  const shelterTarget = home ? clamp(92 - overcrowding * 75, 15, 96) : 22;
  const atWar = realm ? kingdomAtWar(realm.id) : false, danger = personNearDisaster(person), walls = home ? buildingCount(home, "wall") : 0;
  const safetyTarget = clamp(88 + Math.min(12, walls * 2.5) - (atWar ? 24 : 0) - (danger ? 32 : 0) - (person.plague > 0 ? 18 : 0), 5, 100);
  const maxHealth = person.blessed ? 140 : person.role === "soldier" ? 110 : 100, healthTarget = clamp(person.health / maxHealth * 100, 0, 100);
  person.needs.nutrition = person.food;
  person.needs.shelter += (shelterTarget - person.needs.shelter) * .04;
  person.needs.safety += (safetyTarget - person.needs.safety) * .05;
  person.needs.health += (healthTarget - person.needs.health) * .05;
  const employed = !["laborer", "child"].includes(person.profession) ? 6 : person.profession === "laborer" ? -3 : 0;
  const civicBonus = home ? Math.min(10, buildingCount(home, "temple") * 4 + buildingCount(home, "market") * 1.5) : 0;
  const faminePenalty = realm?.famine ? 15 + (realm.famineLevel || 0) * .22 : 0;
  const taxMood = realm ? policyOf(realm, "tax").happiness : 0, welfare = realm ? policyOf(realm, "welfare") : null, welfareMood = welfare ? welfare.happiness * (realm.welfareCoverage ?? 1) : 0;
  const militaryPolicy = realm?.policies?.military || "defense", militaryMood = atWar ? militaryPolicy === "conquest" ? 4 : militaryPolicy === "pacifist" ? -7 : 1 : policyDefs.military[militaryPolicy]?.happiness || 0;
  const socialClass = socialClassDefs[person.socialClass] ? person.socialClass : socialClassFor(person);
  const classMood = realm?.government === "monarchy" && socialClass === "elite" ? 5 : realm?.government === "republic" && socialClass === "merchant" ? 4 : militaryPolicy === "conquest" && socialClass === "warrior" ? 3 : realm?.policies?.tax === "high" && socialClass === "peasant" ? -2 : 0;
  const happinessTarget = clamp(person.needs.nutrition * .34 + person.needs.shelter * .22 + person.needs.safety * .22 + person.needs.health * .22 + employed + civicBonus + taxMood + welfareMood + militaryMood + classMood + (person.blessed ? 8 : 0) - faminePenalty, 0, 100);
  person.happiness += (happinessTarget - person.happiness) * .025;
  if (person.happiness < 10) person.health -= .015;
  else if (person.happiness > 82 && !person.plague) person.health = Math.min(maxHealth, person.health + .008);
}

function professionTileBias(person, x, y, tile, home) {
  const roadBonus = structureAt(x, y, "road") ? .9 : 0;
  if (person.profession === "farmer") return roadBonus + (tile.fertility || 0) * .9 + (tile.type === "grass" ? .55 : 0);
  if (person.profession === "lumberjack") return roadBonus + (tile.type === "forest" ? 1.4 : 0);
  if (person.profession === "miner") {
    let mountains = 0; for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (tileAt(x + ox, y + oy)?.type === "mountain") mountains++;
    return roadBonus + mountains * .32;
  }
  if (["builder", "merchant", "healer"].includes(person.profession) && home) return roadBonus + Math.max(0, 6 - Math.hypot(x - home.x, y - home.y)) * .14;
  return roadBonus;
}

function villageInventoryCapacity(village, resource) {
  const warehouses = buildingCount(village, "warehouse"), buildings = village.structures?.length || 0;
  const specialized = resource === "food" ? buildingCount(village, "farm") * 42 : resource === "wood" ? buildingCount(village, "lumber") * 32 : buildingCount(village, "quarry") * 30;
  return 65 + village.level * 25 + warehouses * 135 + specialized + buildings * 2;
}

function recalculateVillageMarket(village) {
  village.inventory ||= { food: 45, wood: 24, stone: 12 };
  village.demand ||= { food: 0, wood: 0, stone: 0 }; village.supply ||= { food: 0, wood: 0, stone: 0 }; village.prices ||= { food: 1, wood: 1, stone: 1 };
  const population = peopleOfVillage(village.id).length, structures = village.structures?.length || 0;
  const targets = {
    food: 28 + population * 4.2,
    wood: 24 + structures * 3.2 + village.level * 12,
    stone: 16 + buildingCount(village, "wall") * 8 + buildingCount(village, "temple") * 7 + village.level * 10
  };
  for (const resource of Object.keys(tradeResourceDefs)) {
    const capacity = villageInventoryCapacity(village, resource);
    village.inventory[resource] = clamp(Number(village.inventory[resource]) || 0, 0, capacity);
    village.demand[resource] = Math.max(0, targets[resource] - village.inventory[resource]);
    village.supply[resource] = Math.max(0, village.inventory[resource] - targets[resource] * 1.22);
    village.prices[resource] = clamp(targets[resource] / Math.max(targets[resource] * .34, village.inventory[resource]), .45, 2.6);
  }
}

function tradeFacilityScore(village) {
  return buildingCount(village, "market") * 3 + buildingCount(village, "dock") * 2 + buildingCount(village, "warehouse") * 2;
}

function routeAnchor(village, mode) {
  if (mode === "sea") {
    const dock = (village.structures || []).find(structure => structure.type === "dock" && structure.hp > 0);
    if (dock) return { x: Math.round(dock.x), y: Math.round(dock.y) };
  }
  return { x: Math.round(village.x), y: Math.round(village.y) };
}

function findTradePath(fromVillage, toVillage, mode = "land") {
  const start = routeAnchor(fromVillage, mode), end = routeAnchor(toVillage, mode), startKey = `${start.x},${start.y}`, endKey = `${end.x},${end.y}`;
  const open = [{ x: start.x, y: start.y, g: 0, f: Math.hypot(end.x - start.x, end.y - start.y) }], best = new Map([[startKey, 0]]), cameFrom = new Map();
  const directions = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for (let visited = 0; open.length && visited < 5200; visited++) {
    let bestIndex = 0; for (let index = 1; index < open.length; index++) if (open[index].f < open[bestIndex].f) bestIndex = index;
    const current = open.splice(bestIndex, 1)[0], currentKey = `${current.x},${current.y}`;
    if (currentKey === endKey) {
      const path = [{ x: end.x, y: end.y }]; let key = endKey;
      while (key !== startKey) { key = cameFrom.get(key); if (!key) return null; const [x, y] = key.split(",").map(Number); path.push({ x, y }); }
      return path.reverse();
    }
    for (const [dx, dy] of directions) {
      const x = current.x + dx, y = current.y + dy, tile = tileAt(x, y), key = `${x},${y}`;
      if (!tile) continue;
      const endpoint = key === startKey || key === endKey;
      const passable = mode === "sea" ? endpoint || ["water", "deep"].includes(tile.type) : isLand(tile) && tile.type !== "mountain" && !tile.fire;
      if (!passable) continue;
      const diagonal = dx && dy ? 1.42 : 1, roadDiscount = mode === "land" && structureAt(x, y, "road") ? .58 : 1;
      const nextG = current.g + diagonal * roadDiscount;
      if (nextG >= (best.get(key) ?? Infinity)) continue;
      best.set(key, nextG); cameFrom.set(key, currentKey);
      open.push({ x, y, g: nextG, f: nextG + Math.hypot(end.x - x, end.y - y) });
    }
  }
  return null;
}

function tradeRouteBetween(aId, bId) {
  return tradeRoutes.find(route => (route.fromVillage === aId && route.toVillage === bId) || (route.fromVillage === bId && route.toVillage === aId)) || null;
}

function routeStatus(route) {
  const from = getVillage(route.fromVillage), to = getVillage(route.toVillage); if (!from || !to) return "broken";
  if (!tradeFacilityScore(from) || !tradeFacilityScore(to)) return "dormant";
  if (from.kingdom === to.kingdom) return "active";
  const relation = relationBetween(from.kingdom, to.kingdom);
  if (!relation || relation.status === "war") return "blockaded";
  return "active";
}

function updateTradeRoutes() {
  const validVillageIds = new Set(villages.map(village => village.id));
  const removedRoutes = new Set(tradeRoutes.filter(route => !validVillageIds.has(route.fromVillage) || !validVillageIds.has(route.toVillage)).map(route => route.id));
  tradeRoutes = tradeRoutes.filter(route => !removedRoutes.has(route.id));
  if (removedRoutes.size) caravans = caravans.filter(caravan => !removedRoutes.has(caravan.routeId));
  for (const route of tradeRoutes) {
    const previous = route.status, next = routeStatus(route); route.status = next;
    if (next === "blockaded" && previous !== "blockaded") { route.blockadedSince = Math.floor(year); addEvent(`战争封锁了${getVillage(route.fromVillage)?.name}与${getVillage(route.toVillage)?.name}之间的贸易路线。`); }
    if (next === "active" && previous === "blockaded") { route.blockadedSince = null; addEvent(`${getVillage(route.fromVillage)?.name}与${getVillage(route.toVillage)?.name}之间的贸易恢复通行。`); }
  }
  if (tradeRoutes.length >= 24) return;
  const eligible = villages.filter(village => tradeFacilityScore(village) > 0), candidates = [];
  for (let i = 0; i < eligible.length; i++) for (let j = i + 1; j < eligible.length; j++) {
    const a = eligible[i], b = eligible[j]; if (tradeRouteBetween(a.id, b.id)) continue;
    const distance = Math.hypot(a.x - b.x, a.y - b.y); if (distance > 78) continue;
    const relation = a.kingdom === b.kingdom ? { status: "internal", score: 30 } : relationBetween(a.kingdom, b.kingdom);
    if (!relation || relation.status === "war") continue;
    const maritime = buildingCount(a, "dock") > 0 && buildingCount(b, "dock") > 0 && distance > 18;
    let complement = 0; for (const resource of Object.keys(tradeResourceDefs)) complement += Math.min(a.supply?.[resource] || 0, b.demand?.[resource] || 0) + Math.min(b.supply?.[resource] || 0, a.demand?.[resource] || 0);
    const score = complement + tradeFacilityScore(a) * 5 + tradeFacilityScore(b) * 5 + (relation.status === "alliance" ? 24 : 0) + (maritime ? 16 : 0) - distance * .28;
    candidates.push({ a, b, score, distance, maritime });
  }
  candidates.sort((a, b) => b.score - a.score);
  const routeDegree = new Map(); for (const route of tradeRoutes) { routeDegree.set(route.fromVillage, (routeDegree.get(route.fromVillage) || 0) + 1); routeDegree.set(route.toVillage, (routeDegree.get(route.toVillage) || 0) + 1); }
  for (const candidate of candidates) {
    if (tradeRoutes.length >= 24) break;
    if ((routeDegree.get(candidate.a.id) || 0) >= 3 || (routeDegree.get(candidate.b.id) || 0) >= 3) continue;
    const bothDocks = buildingCount(candidate.a, "dock") > 0 && buildingCount(candidate.b, "dock") > 0;
    let mode = candidate.maritime ? "sea" : "land", path = findTradePath(candidate.a, candidate.b, mode);
    if (!path && mode === "sea") { mode = "land"; path = findTradePath(candidate.a, candidate.b, mode); }
    if (!path && mode === "land" && bothDocks) { mode = "sea"; path = findTradePath(candidate.a, candidate.b, mode); }
    if (!path || path.length < 2) continue;
    tradeRoutes.push({ id: nextTradeRouteId++, fromVillage: candidate.a.id, toVillage: candidate.b.id, mode, status: "active", path, createdYear: Math.floor(year), deliveries: 0, delivered: 0, losses: 0, lastDispatchTick: ticks - randi(20, 70), lastDeliveryYear: null, blockadedSince: null });
    routeDegree.set(candidate.a.id, (routeDegree.get(candidate.a.id) || 0) + 1); routeDegree.set(candidate.b.id, (routeDegree.get(candidate.b.id) || 0) + 1);
    addEvent(`${candidate.a.name}与${candidate.b.name}开通了${mode === "sea" ? "海上" : "陆上"}贸易路线。`);
  }
}

function bestShipment(from, to, maximum, requireSupply = true) {
  let best = null;
  for (const resource of Object.keys(tradeResourceDefs)) {
    const available = requireSupply ? from.supply?.[resource] || 0 : from.inventory?.[resource] || 0;
    const amount = Math.min(maximum, available, to.demand?.[resource] || maximum);
    const score = amount * (1 + (to.prices?.[resource] || 1) - (from.prices?.[resource] || 1) * .35);
    if (amount >= 2 && (!best || score > best.score)) best = { resource, amount: Math.max(2, Math.floor(amount * 10) / 10), score };
  }
  return best;
}

function dispatchCaravans() {
  if (caravans.length >= 40) return;
  for (const route of tradeRoutes) {
    if (route.status !== "active" || ticks - (route.lastDispatchTick || 0) < 65 || caravans.some(caravan => caravan.routeId === route.id)) continue;
    const a = getVillage(route.fromVillage), b = getVillage(route.toVillage); if (!a || !b) continue;
    const tradeKnowledge = (technologyLevel(getKingdom(a.kingdom), "navigation") + technologyLevel(getKingdom(b.kingdom), "navigation")) / 2;
    const guildBonus = hasTradition(getKingdom(a.kingdom), "merchant_guilds") || hasTradition(getKingdom(b.kingdom), "merchant_guilds") ? 1.1 : 1;
    const maximum = (10 + (buildingCount(a, "warehouse") + buildingCount(b, "warehouse")) * 7 + (buildingCount(a, "market") + buildingCount(b, "market")) * 2) * (1 + tradeKnowledge * .1) * guildBonus;
    const aToB = bestShipment(a, b, maximum), bToA = bestShipment(b, a, maximum);
    let source = a, destination = b, shipment = aToB;
    if (bToA && (!shipment || bToA.score > shipment.score)) { source = b; destination = a; shipment = bToA; }
    if (!shipment) continue;
    let payment = null;
    if (source.kingdom !== destination.kingdom) {
      payment = bestShipment(destination, source, shipment.amount);
      if (!payment) continue;
      shipment.amount = Math.min(shipment.amount, getKingdom(source.kingdom)?.resources?.[shipment.resource] || 0);
      payment.amount = Math.min(payment.amount, getKingdom(destination.kingdom)?.resources?.[payment.resource] || 0);
      if (shipment.amount < 2 || payment.amount < 2) continue;
    }
    source.inventory[shipment.resource] = Math.max(0, source.inventory[shipment.resource] - shipment.amount);
    if (payment) destination.inventory[payment.resource] = Math.max(0, destination.inventory[payment.resource] - payment.amount);
    if (source.kingdom !== destination.kingdom) {
      getKingdom(source.kingdom).resources[shipment.resource] = Math.max(0, getKingdom(source.kingdom).resources[shipment.resource] - shipment.amount);
      getKingdom(destination.kingdom).resources[payment.resource] = Math.max(0, getKingdom(destination.kingdom).resources[payment.resource] - payment.amount);
    }
    const path = route.fromVillage === source.id ? route.path : [...route.path].reverse(), start = path[0];
    caravans.push({ id: nextCaravanId++, routeId: route.id, fromVillage: source.id, toVillage: destination.id, resource: shipment.resource, amount: shipment.amount, returnResource: payment?.resource || null, returnAmount: payment?.amount || 0, x: start.x, y: start.y, pathIndex: 0, segmentProgress: 0, hp: 100, status: "traveling", departedYear: year });
    route.lastDispatchTick = ticks; recalculateVillageMarket(source); recalculateVillageMarket(destination);
  }
}

function completeCaravan(caravan, route) {
  const source = getVillage(caravan.fromVillage), destination = getVillage(caravan.toVillage); if (!source || !destination) return;
  destination.inventory[caravan.resource] = Math.min(villageInventoryCapacity(destination, caravan.resource), destination.inventory[caravan.resource] + caravan.amount);
  if (caravan.returnResource) source.inventory[caravan.returnResource] = Math.min(villageInventoryCapacity(source, caravan.returnResource), source.inventory[caravan.returnResource] + caravan.returnAmount);
  if (source.kingdom !== destination.kingdom) {
    getKingdom(destination.kingdom).resources[caravan.resource] = clamp(getKingdom(destination.kingdom).resources[caravan.resource] + caravan.amount, 0, 9999);
    getKingdom(source.kingdom).resources[caravan.returnResource] = clamp(getKingdom(source.kingdom).resources[caravan.returnResource] + caravan.returnAmount, 0, 9999);
    const relation = relationBetween(source.kingdom, destination.kingdom);
    if (relation) { relation.score = clamp(relation.score + 1, -100, 100); getKingdom(destination.kingdom).relations[String(source.kingdom)].score = relation.score; }
    exchangeCultures(getKingdom(source.kingdom), getKingdom(destination.kingdom));
  }
  route.deliveries++; route.delivered += caravan.amount + caravan.returnAmount; route.lastDeliveryYear = Math.floor(year);
  worldStats.tradeDeliveries++; worldStats.tradeVolume += caravan.amount + caravan.returnAmount;
  if (route.deliveries === 1 || route.deliveries % 5 === 0) addEvent(`商队抵达${destination.name}，交付了${tradeResourceDefs[caravan.resource].name}${Math.floor(caravan.amount)}份。`);
  recalculateVillageMarket(source); recalculateVillageMarket(destination);
}

function simulateCaravans() {
  const survivors = [];
  for (const caravan of caravans) {
    const route = getTradeRoute(caravan.routeId), path = route ? (route.fromVillage === caravan.fromVillage ? route.path : [...route.path].reverse()) : null;
    if (!route || !path?.length) continue;
    if (route.status === "blockaded") caravan.hp -= .28;
    const nearbyDisaster = activeDisasters.some(disaster => disasterFalloff(disaster, caravan.x, caravan.y));
    if (nearbyDisaster) caravan.hp -= .16;
    if (tileAt(Math.round(caravan.x), Math.round(caravan.y))?.fire) caravan.hp -= 1.8;
    if (caravan.hp <= 0) { route.losses++; addEvent(`一支往返${getVillage(caravan.toVillage)?.name || "远方"}的商队失联，货物全部损失。`); continue; }
    const caravanKingdom = getKingdom(getVillage(caravan.fromVillage)?.kingdom), navigationBonus = 1 + technologyLevel(caravanKingdom, "navigation") * .1;
    let travel = (route.mode === "sea" ? .3 : .22) * (route.status === "blockaded" ? .35 : 1) * navigationBonus;
    while (travel > 0 && caravan.pathIndex < path.length - 1) {
      const from = path[caravan.pathIndex], to = path[caravan.pathIndex + 1], segmentLength = Math.max(.1, Math.hypot(to.x - from.x, to.y - from.y));
      const roadBoost = route.mode === "land" && structureAt(to.x, to.y, "road") ? 1.55 : 1, step = travel * roadBoost, remaining = segmentLength - caravan.segmentProgress;
      if (step >= remaining) { caravan.pathIndex++; caravan.segmentProgress = 0; caravan.x = to.x; caravan.y = to.y; travel -= remaining / roadBoost; }
      else { caravan.segmentProgress += step; const ratio = caravan.segmentProgress / segmentLength; caravan.x = from.x + (to.x - from.x) * ratio; caravan.y = from.y + (to.y - from.y) * ratio; travel = 0; }
    }
    if (caravan.pathIndex >= path.length - 1) completeCaravan(caravan, route); else survivors.push(caravan);
  }
  caravans = survivors;
}

function produceResources() {
  const season = seasonDefs[climate.season] || seasonDefs.spring, weather = weatherDefs[climate.weather] || weatherDefs.clear, climateFoodMultiplier = season.crops * weather.crops;
  for (const kingdom of kingdoms) {
    const realmVillages = villagesOfKingdom(kingdom.id);
    const realmPeople = peopleOfKingdom(kingdom.id);
    const race = raceDefs[kingdom.race] || raceDefs.human;
    const agricultureBonus = 1 + technologyLevel(kingdom, "agriculture") * .1 + (hasTradition(kingdom, "harvest_rites") ? .08 : 0);
    const woodBonus = 1 + technologyLevel(kingdom, "engineering") * .04 + (hasTradition(kingdom, "forest_kin") ? .08 : 0);
    const stoneBonus = 1 + technologyLevel(kingdom, "engineering") * .05 + (hasTradition(kingdom, "stone_lore") ? .08 : 0);
    let food = 0, wood = 0, stone = 0;
    for (const village of realmVillages) {
      const residents = peopleOfVillage(village.id), jobs = professionCounts(residents), terrain = ownedTerrainCounts(kingdom.id, village), b = village.buildings;
      const farmerOutput = jobs.farmer * (BALANCE.production.farmerBase + b.farm * BALANCE.production.farmerPerFarm);
      const lumberOutput = jobs.lumberjack * (BALANCE.production.lumberBase + b.lumber * BALANCE.production.lumberPerBuilding);
      const minerOutput = jobs.miner * (BALANCE.production.minerBase + b.quarry * BALANCE.production.minerPerBuilding);
      const dockOutput = b.dock * (.45 + residents.length * .018);
      const localFood = (terrain.grass * .025 + terrain.forest * .008 + farmerOutput + dockOutput + jobs.laborer * BALANCE.production.laborerFood + jobs.merchant * BALANCE.production.merchantFood) * race.food * climateFoodMultiplier * agricultureBonus;
      const localWood = (terrain.forest * .018 + lumberOutput + jobs.laborer * .018) * race.wood * woodBonus;
      const localStone = (terrain.mountain * .014 + minerOutput) * race.stone * stoneBonus;
      food += localFood; wood += localWood; stone += localStone;
      village.inventory ||= { food: 45, wood: 24, stone: 12 };
      village.inventory.food = clamp(village.inventory.food + localFood - residents.length * BALANCE.citizens.localFoodUse, 0, villageInventoryCapacity(village, "food"));
      village.inventory.wood = clamp(village.inventory.wood + localWood, 0, villageInventoryCapacity(village, "wood"));
      village.inventory.stone = clamp(village.inventory.stone + localStone, 0, villageInventoryCapacity(village, "stone"));
      village.buildCooldown -= 1 + jobs.builder * .42 + Math.min(.7, b.road * .08);
      village.hp = Math.min(villageMaxHp(village), village.hp + jobs.builder * .08 + b.temple * .02);
      const damaged = (village.structures || []).filter(structure => structure.hp < structure.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
      for (let repair = 0; repair < Math.min(damaged.length, Math.max(1, jobs.builder)); repair++) damaged[repair].hp = Math.min(damaged[repair].maxHp, damaged[repair].hp + jobs.builder * .55 + b.temple * .12);
      performHealerWork(village, jobs.healer);
      village.workforce = jobs; village.averageHappiness = averageHappiness(residents);
      recalculateVillageMarket(village);
      if (village.buildCooldown <= 0) attemptConstruction(village, peopleOfVillage(village.id).length);
    }
    const merchants = realmVillages.reduce((sum, village) => sum + (village.workforce?.merchant || 0), 0);
    const markets = realmVillages.reduce((sum, village) => sum + buildingCount(village, "market"), 0), docks = realmVillages.reduce((sum, village) => sum + buildingCount(village, "dock"), 0);
    const tradeBonus = 1 + merchants * .006 + markets * .01 + docks * .012 + technologyLevel(kingdom, "navigation") * .025, warCost = 1 + Math.min(1, kingdom.warWeariness / 100);
    const farms = realmVillages.reduce((sum, village) => sum + (village.buildings?.farm || 0), 0);
    const warehouses = realmVillages.reduce((sum, village) => sum + buildingCount(village, "warehouse"), 0);
    const foodCapacity = (50 + realmPeople.length * 6 + realmVillages.length * 35 + farms * 45 + warehouses * 120) * (1 + technologyLevel(kingdom, "agriculture") * .06);
    const surplusSpoilage = Math.max(0, kingdom.resources.food - foodCapacity * .72) * .045;
    kingdom.resources.food = clamp(kingdom.resources.food + food * tradeBonus - realmPeople.length * BALANCE.citizens.kingdomFoodUse * warCost - surplusSpoilage, 0, foodCapacity);
    kingdom.resources.wood = clamp(kingdom.resources.wood + wood * tradeBonus, 0, 9999);
    kingdom.resources.stone = clamp(kingdom.resources.stone + stone * tradeBonus, 0, 9999);
    if (kingdom.resources.food <= 1) realmPeople.forEach(p => { p.food = Math.max(0, p.food - .8); });
    else realmPeople.forEach(p => { p.food = Math.min(105, p.food + .35); });
    updateFamineState(kingdom, realmPeople);
  }
}

function attemptConstruction(village, population) {
  const kingdom = getKingdom(village.kingdom), b = village.buildings; if (!kingdom) return;
  const terrain = ownedTerrainCounts(kingdom.id, village), realmPopulation = peopleOfKingdom(kingdom.id).length;
  const choices = [], consider = (condition, type) => { if (condition && !choices.includes(type)) choices.push(type); };
  consider(kingdomAtWar(kingdom.id) && b.barracks < 1, "barracks");
  consider(kingdomAtWar(kingdom.id) && b.wall < Math.min(8, 2 + village.level * 2), "wall");
  consider(population >= villageCapacity(village) - 3, "house");
  consider(kingdom.resources.food < Math.max(45, realmPopulation * 2.5), "farm");
  consider(terrain.forest > 4 && b.lumber < Math.ceil(village.level / 2), "lumber");
  consider(terrain.mountain > 2 && b.quarry < Math.ceil(village.level / 2), "quarry");
  consider(population >= 6 && b.market < Math.ceil(village.level / 2), "market");
  consider(population >= 5 && b.dock < 1 && villageIsWaterfront(village), "dock");
  consider(population >= 8 && b.warehouse < Math.ceil(village.level / 2), "warehouse");
  consider(population >= 9 && b.temple < Math.ceil(village.level / 2), "temple");
  consider(b.road < Math.min(10, 2 + Math.ceil((village.structures?.length || 1) / 2)), "road");
  consider(village.level >= 2 && b.wall < village.level * 2, "wall");
  consider(realmPopulation > 8 && b.barracks < village.level, "barracks");
  for (const fallback of ["house", "farm", "lumber", "quarry", "road", "wall"]) consider(true, fallback);
  for (const choice of choices) {
    const def = buildingDefs[choice], costMultiplier = Math.max(.78, 1 - technologyLevel(kingdom, "engineering") * .05 - (hasTradition(kingdom, "stone_lore") ? .03 : 0));
    const woodCost = def.wood * costMultiplier, stoneCost = def.stone * costMultiplier;
    if (kingdom.resources.wood < woodCost || kingdom.resources.stone < stoneCost) continue;
    let created = 0;
    if (choice === "road") created = buildRoadProject(village, 3);
    else created = addStructureEntity(village, choice) ? 1 : 0;
    if (!created) continue;
    kingdom.resources.wood -= woodCost; kingdom.resources.stone -= stoneCost;
    addEvent(choice === "road" ? `${kingdom.name}在${village.name}铺设了${created}段道路。` : `${kingdom.name}在${village.name}建成了${def.name}。`);
    village.buildCooldown = randi(15, 28); return;
  }
  village.buildCooldown = randi(5, 10);
}

function simulationStep() {
  const simulationStarted = performance.now();
  ticks++; year += BALANCE.simulation.yearsPerStep; updateClimate(); if (!indexesReady) rebuildWorldIndexes();
  if (ticks % 25 === 0) triggerRandomDisaster();
  simulateDisasters();
  simulateCaravans();
  simulateArmies();
  const ecologyStride = people.length + animals.length > BALANCE.simulation.adaptiveEcologyThreshold ? 3 : 2;
  regenerateBiomass(); if (ticks % ecologyStride === 0) simulateAnimals(ecologyStride);
  if (ticks % BALANCE.cadence.resources === 0) produceResources();
  if (ticks % BALANCE.cadence.culture === 0) { dispatchCaravans(); governanceStep(); cultureTechnologyStep(); }
  if (ticks % BALANCE.cadence.professions === 0) { updateMilitaryRoles(); updateProfessions(); }
  if (ticks % BALANCE.cadence.diplomacy === 0) { diplomacyStep(); updateTradeRoutes(); }
  if (ticks % BALANCE.cadence.colonies === 0) attemptColonies();
  if (ticks % BALANCE.cadence.biodiversity === 0) maintainBiodiversity();
  experienceSimulationStep();

  const peopleAtStepStart = people.length;
  for (let personIndex = 0; personIndex < peopleAtStepStart; personIndex++) {
    const person = people[personIndex];
    if (person.dead) continue;
    const race = raceDefs[person.race] || raceDefs.human;
    person.age += .02;
    const tile = tileAt(person.x, person.y);
    const forage = !person.village && tile ? Math.min(tile.biomass || 0, .012) : 0;
    if (tile) tile.biomass = Math.max(0, (tile.biomass || 0) - forage);
    const climateCost = climate.season === "winter" ? .045 : climate.weather === "heatwave" ? .035 : 0;
    person.food = clamp(person.food + (tile?.fertility || 0) * .2 + forage * 800 - BALANCE.citizens.foodDrain - climateCost, 0, 110);
    if (person.food <= 0) person.health -= BALANCE.citizens.starvationDamage;
    if (tile?.fire > 0) person.health -= 4;
    if (person.blessed) person.health = Math.min(140, person.health + .08);
    if (person.health <= 0 || person.age > race.life + rand(-7, 13)) { if (person.role === "soldier") recordSoldierCasualty(person); person.dead = true; continue; }

    person.cooldown--;
    person.attackCooldown = Math.max(0, (person.attackCooldown || 0) - 1);
    if (person.cooldown <= 0) {
      person.cooldown = randi(3, 10);
      if (person.role === "soldier" && kingdomAtWar(person.kingdom)) militaryBehavior(person);
      else {
        const home = getVillage(person.village);
        let bestX = person.x, bestY = person.y, bestScore = -Infinity;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const t = tileAt(person.x + ox, person.y + oy);
          if (isLand(t) && t.type !== "mountain" && !t.fire) {
            const homeBias = home ? Math.max(0, 5 - Math.hypot(person.x + ox - home.x, person.y + oy - home.y)) * .08 : 0;
            const score = t.fertility + homeBias + professionTileBias(person, person.x + ox, person.y + oy, t, home) + random();
            if (score > bestScore) { bestScore = score; bestX = person.x + ox; bestY = person.y + oy; }
          }
        }
            if (bestScore > -Infinity && random() < .72) { person.x = bestX; person.y = bestY; if (structureAt(bestX, bestY, "road")) person.cooldown = Math.max(1, person.cooldown - 3); }
      }
    }

    if (!person.village && person.age > 20 && person.food > 72 && random() < BALANCE.citizens.pioneerSettlementChance) createVillage(person);
    if (person.kingdom === null || person.kingdom === undefined) {
      const close = nearestEntity(villages, person.x, person.y);
      if (close) {
        const dx = close.x - person.x, dy = close.y - person.y;
        if (dx * dx + dy * dy < 64) { person.kingdom = close.kingdom; person.village = close.id; }
      }
    }
    const home = getVillage(person.village), homePop = home ? peopleOfVillage(home.id).length : 0, realm = getKingdom(person.kingdom);
    if (person.age >= 16 && person.profession === "child") person.profession = "laborer";
    updatePersonWellbeing(person, home, realm);
    const happinessBirthRate = clamp((person.happiness - 35) / 45, .2, 1.15);
    const seasonalBirthRate = seasonDefs[climate.season]?.reproduction || 1;
    if (home && person.role === "civilian" && person.age > 17 && person.food > 76 && person.happiness > 45 && !realm?.famine && realm?.resources.food > 10 && homePop < villageCapacity(home) && people.length < BALANCE.simulation.populationCap && random() < BALANCE.citizens.baseBirthChance * race.birth * happinessBirthRate * seasonalBirthRate) {
      spawnPerson(person.x, person.y, person.kingdom, person.race);
      const baby = people[people.length - 1]; baby.age = 0; baby.village = person.village; baby.food = 60; baby.profession = "child"; baby.happiness = 68; baby.needs = { nutrition: 60, shelter: 78, safety: 72, health: 100 };
      worldStats.births++;
      person.food -= 18; realm.resources.food = Math.max(0, realm.resources.food - 1.5);
    }
  }

  for (const village of villages) {
    const pop = peopleOfVillage(village.id).length;
    village.level = pop > 42 ? 3 : pop > 17 ? 2 : 1;
    village.hp = Math.min(villageMaxHp(village), village.hp + .04 + buildingCount(village, "temple") * .006);
    if (ticks % 5 === 0) for (const structure of [...(village.structures || [])]) if (tileAt(Math.round(structure.x), Math.round(structure.y))?.fire > 0) damageStructure(village, structure, 3, false);
    if (ticks % 16 === 0) claimTerritory(village, 3 + village.level * 2);
  }
  for (const t of tiles) if (t.fire > 0) {
    t.fire--; t.biomass = Math.max(0, (t.biomass || 0) - .08);
    if (t.fire === 0) { t.type = "ash"; t.fertility = .12; t.biomass = 0; }
  }
  worldStats.deaths += people.reduce((sum, person) => sum + (person.dead ? 1 : 0), 0);
  removeDeadEntities(people); removeDeadEntities(animals); rebuildWorldIndexes();
  if (ticks % 20 === 0) evaluateWorldProgress();
  if (!debugBatchMode && autoSaveEnabled && year - lastAutoSaveYear >= 5) { scheduleAutoSave(); lastAutoSaveYear = year; }
  renderDirty = true;
  if (!debugBatchMode && ticks % (people.length + animals.length > BALANCE.simulation.uiHeavyPopulationThreshold ? 30 : 20) === 0) updateUI();
  performanceMetrics.steps++;
  const elapsed = performance.now() - simulationStarted;
  performanceMetrics.simulationMs = performanceMetrics.simulationMs ? performanceMetrics.simulationMs * .9 + elapsed * .1 : elapsed;
}

function regenerateBiomass() {
  const capacities = { forest: 1, grass: .82, sand: .14, ash: .38, mountain: .08, water: 0, deep: 0 };
  const season = seasonDefs[climate.season] || seasonDefs.spring, weather = weatherDefs[climate.weather] || weatherDefs.clear, growthMultiplier = season.growth * weather.growth;
  for (let i = ticks % 12; i < tiles.length; i += 12) {
    const tile = tiles[i], x = i % MAP_W, y = Math.floor(i / MAP_W), baseCap = capacities[tile.type] || 0; tile.biomass ??= baseCap * .5; tile.moisture ??= tile.type === "forest" ? .7 : tile.type === "grass" ? .52 : .2;
    const waterInfluence = adjacentWaterCount(x, y) ? .16 : 0, drought = activeDisasters.reduce((sum, disaster) => disaster.type === "drought" ? Math.max(sum, disasterFalloff(disaster, x, y)) : sum, 0);
    const evaporation = Math.max(0, climate.temperature - 20) * .006 + (climate.weather === "heatwave" ? .12 : 0), moistureTarget = clamp(climate.rainfall * .72 + waterInfluence - evaporation - drought * .55, .02, 1);
    tile.moisture += (moistureTarget - tile.moisture) * .035;
    const latitude = 10 - Math.abs(y / (MAP_H - 1) - .5) * 28, temperatureTarget = climate.temperature + latitude - (tile.type === "mountain" ? 8 : 0);
    tile.temperature = (Number(tile.temperature) || temperatureTarget) + (temperatureTarget - (Number(tile.temperature) || temperatureTarget)) * .06;
    const moistureHealth = clamp(.22 + tile.moisture * 1.2, .12, 1.15), temperatureHealth = tile.temperature < -5 ? .25 : tile.temperature > 38 ? .35 : tile.temperature < 3 ? .58 : 1;
    const cap = baseCap * moistureHealth * temperatureHealth;
    if (!tile.fire && tile.biomass < cap) tile.biomass = Math.min(cap, tile.biomass + (tile.type === "grass" ? .012 : .008) * growthMultiplier * moistureHealth);
    else if (tile.biomass > cap) tile.biomass = Math.max(cap, tile.biomass - .004 * (1 + Math.max(0, 20 - tile.temperature) * .02));
    if (tile.type === "ash" && tile.biomass > .28 && tile.moisture > .35 && random() < .03 * growthMultiplier) { tile.type = "grass"; tile.fertility = Math.max(.48, tile.fertility); }
    if (tile.type === "grass" && tile.biomass > .72 && tile.moisture > .64 && tile.fertility > .65 && random() < .006 * growthMultiplier) { tile.type = "forest"; tile.fertility = Math.min(1, tile.fertility + .05); }
    if (tile.type === "forest" && tile.moisture < .12 && tile.biomass < .18 && random() < .018) { tile.type = "grass"; tile.fertility = Math.max(.25, tile.fertility - .08); }
    if (tile.type === "grass" && tile.moisture < .08 && tile.biomass < .09 && random() < .012) { tile.type = "sand"; tile.fertility = Math.max(.08, tile.fertility - .12); }
    if (tile.type === "sand" && tile.moisture > .68 && tile.biomass > .1 && tile.fertility > .32 && random() < .01 * growthMultiplier) tile.type = "grass";
    if (!tile.fire && climate.weather === "heatwave" && tile.type === "forest" && tile.moisture < .14 && random() < .0007) tile.fire = randi(45, 90);
  }
}

function moveAnimal(animal, target = null, flee = false) {
  const def = animalDefs[animal.species];
  let bestX = animal.x, bestY = animal.y, bestScore = -Infinity;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    if (!ox && !oy) continue;
    const x = animal.x + ox, y = animal.y + oy, tile = tileAt(x, y); if (!isLand(tile) || tile.fire) continue;
    let score = (def.habitats.includes(tile.type) ? 1.8 : 0) + (tile.biomass || 0) * (def.diet === "herbivore" ? 1.3 : .25) + random();
    if (target) score += Math.hypot(x - target.x, y - target.y) * (flee ? .35 : -.35);
    if (score > bestScore) { bestScore = score; bestX = x; bestY = y; }
  }
  if (bestScore > -Infinity) { animal.x = bestX; animal.y = bestY; }
}

function simulateAnimals(timeFactor = 1) {
  const speciesCounts = animalCounts();
  const season = seasonDefs[climate.season] || seasonDefs.spring, weather = weatherDefs[climate.weather] || weatherDefs.clear;
  const animalsAtStepStart = animals.length;
  for (let animalIndex = 0; animalIndex < animalsAtStepStart; animalIndex++) {
    const animal = animals[animalIndex];
    if (animal.dead) continue;
    const def = animalDefs[animal.species], tile = tileAt(animal.x, animal.y);
    const climateHunger = climate.weather === "heatwave" || climate.season === "winter" ? 1.3 : 1;
    animal.age += .006 * timeFactor; animal.hunger = Math.max(0, animal.hunger - def.hungerRate * timeFactor * climateHunger); animal.cooldown -= timeFactor; animal.attackCooldown = Math.max(0, animal.attackCooldown - timeFactor);
    if (tile?.fire) animal.health -= 7;
    if ((tile?.temperature ?? climate.temperature) < -8 && !["forest", "mountain"].includes(tile?.type)) animal.health -= .018 * timeFactor;
    if ((tile?.temperature ?? climate.temperature) > 39 && animal.hunger < 45) animal.health -= .02 * timeFactor;
    if (animal.hunger <= 0) animal.health -= 1.2;
    if (animal.health <= 0 || animal.age > def.maxAge + rand(-2, 3)) { animal.dead = true; continue; }

    if (def.diet === "herbivore") {
      if (tile && animal.hunger < 94 && tile.biomass > .01) {
        const bite = Math.min(tile.biomass, animal.species === "rabbit" ? .018 : animal.species === "boar" ? .05 : .038); tile.biomass -= bite; animal.hunger = Math.min(100, animal.hunger + bite * 900);
      }
      if (animal.cooldown <= 0) {
        const threat = findNearbyEntity(worldIndex.animalSpatial, animal.x, animal.y, def.vision, other => animalDefs[other.species]?.prey?.includes(animal.species));
        moveAnimal(animal, threat || null, Boolean(threat)); animal.cooldown = randi(2, 7);
      }
    } else {
      const prey = findNearbyEntity(worldIndex.animalSpatial, animal.x, animal.y, def.vision, other => other.id !== animal.id && def.prey.includes(other.species), true);
      if (prey) {
        const distance = Math.hypot(prey.x - animal.x, prey.y - animal.y);
        if (distance <= 1.4 && animal.attackCooldown <= 0) {
          prey.health -= def.damage; animal.attackCooldown = 5;
          if (prey.health <= 0) { prey.dead = true; animal.hunger = Math.min(100, animal.hunger + 62); }
        } else if (animal.cooldown <= 0) { moveAnimal(animal, prey); animal.cooldown = randi(2, 6); }
      } else if (animal.hunger < 18) {
        const victim = findNearbyEntity(worldIndex.peopleSpatial, animal.x, animal.y, Math.max(3, def.vision / 2), p => p.role !== "soldier");
        if (victim && Math.hypot(victim.x - animal.x, victim.y - animal.y) <= 1.4 && animal.attackCooldown <= 0) {
          victim.health -= def.damage; animal.attackCooldown = 6; if (victim.health <= 0) { victim.dead = true; animal.hunger = Math.min(100, animal.hunger + 75); }
        } else if (victim && animal.cooldown <= 0) moveAnimal(animal, victim);
      } else if (animal.cooldown <= 0) { moveAnimal(animal); animal.cooldown = randi(3, 8); }
    }

    const mateRadius = def.diet === "predator" ? 12 : 4, matingHunger = def.diet === "predator" ? 52 : 72;
    const mate = animal.age >= def.adult && animal.hunger > matingHunger && findNearbyEntity(worldIndex.animalSpatial, animal.x, animal.y, mateRadius, other => other.id !== animal.id && other.species === animal.species && other.age >= def.adult);
    if (mate && speciesCounts[animal.species] < animalCaps[animal.species] && animals.length < 520 && random() < def.reproduce * timeFactor * season.reproduction * Math.min(1.15, weather.growth)) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const x = animal.x + randi(-1, 1), y = animal.y + randi(-1, 1), baby = spawnAnimal(x, y, animal.species, 0);
        if (baby) { baby.hunger = 60; speciesCounts[animal.species]++; animal.hunger -= 18; break; }
      }
    }
  }
}

function maintainBiodiversity() {
  const minimums = { rabbit: 28, deer: 16, boar: 8, fox: 4, wolf: 5, bear: 2 };
  const counts = animalCounts(true);
  for (const [species, minimum] of Object.entries(minimums)) {
    if (counts[species] >= minimum) continue;
    const def = animalDefs[species], preyAvailable = def.diet === "herbivore" || (def.prey || []).reduce((sum, prey) => sum + counts[prey], 0) >= 24;
    if (!preyAvailable) continue;
    let arrivals = 0;
    for (let n = counts[species]; n < minimum; n++) for (let attempt = 0; attempt < 50; attempt++) {
      const x = randi(2, MAP_W - 3), y = randi(2, MAP_H - 3), newcomer = spawnAnimal(x, y, species);
      if (newcomer) { newcomer.hunger = 88; arrivals++; break; }
    }
    if (arrivals) addEvent(`${def.name}种群从远方迁入，重新填补了生态空缺。`);
  }
}

function nearestLandPoint(x, y) {
  const originX = clamp(Math.round(x), 0, MAP_W - 1), originY = clamp(Math.round(y), 0, MAP_H - 1);
  if (isLand(tileAt(originX, originY))) return { x: originX, y: originY };
  for (let radius = 1; radius <= 14; radius++) {
    for (let oy = -radius; oy <= radius; oy++) for (let ox = -radius; ox <= radius; ox++) {
      if (Math.abs(ox) !== radius && Math.abs(oy) !== radius) continue;
      const candidateX = originX + ox, candidateY = originY + oy;
      if (isLand(tileAt(candidateX, candidateY))) return { x: candidateX, y: candidateY };
    }
  }
  const valid = habitableTileIndices(), position = valid.length ? valid[randi(0, valid.length - 1)] : 0;
  return { x: position % MAP_W, y: Math.floor(position / MAP_W) };
}

function randomDisasterTarget(type) {
  if ((type === "plague" || random() < .58) && villages.length) {
    const village = villages[randi(0, villages.length - 1)]; return { x: village.x, y: village.y };
  }
  const valid = habitableTileIndices();
  if (!valid.length) return { x: MAP_W / 2, y: MAP_H / 2 };
  if (type === "flood") {
    for (let attempt = 0; attempt < 120; attempt++) {
      const position = valid[randi(0, valid.length - 1)], x = position % MAP_W, y = Math.floor(position / MAP_W);
      if (!isLand(tileAt(x + 3, y)) || !isLand(tileAt(x - 3, y)) || !isLand(tileAt(x, y + 3)) || !isLand(tileAt(x, y - 3))) return { x, y };
    }
  }
  const position = valid[randi(0, valid.length - 1)];
  return { x: position % MAP_W, y: Math.floor(position / MAP_W) };
}

function disasterLocation(disaster) {
  const village = nearestEntity(villages, disaster.x, disaster.y);
  if (village) {
    const dx = village.x - disaster.x, dy = village.y - disaster.y;
    if (dx * dx + dy * dy < 225) return `${village.name}附近`;
  }
  return `坐标 ${Math.round(disaster.x)}, ${Math.round(disaster.y)}`;
}

function disasterFalloff(disaster, x, y, radius = disaster.radius) {
  const distance = Math.hypot(x - disaster.x, y - disaster.y);
  return distance > radius ? 0 : 1 - distance / Math.max(1, radius);
}

function forEachDisasterTile(disaster, callback, radius = disaster.radius) {
  const minX = Math.max(0, Math.floor(disaster.x - radius)), maxX = Math.min(MAP_W - 1, Math.ceil(disaster.x + radius));
  const minY = Math.max(0, Math.floor(disaster.y - radius)), maxY = Math.min(MAP_H - 1, Math.ceil(disaster.y + radius));
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const strength = disasterFalloff(disaster, x, y, radius); if (strength <= 0) continue;
    callback(tileAt(x, y), x, y, strength);
  }
}

function damageStructure(village, structure, amount, announce = true) {
  structure.hp -= Math.max(0, amount);
  if (structure.hp > 0 || structure.type === "hall") { structure.hp = Math.max(structure.type === "hall" ? 1 : 0, structure.hp); return false; }
  const def = buildingDefs[structure.type];
  village.structures = (village.structures || []).filter(candidate => candidate.id !== structure.id);
  worldStats.buildingsDestroyed++;
  syncBuildingCounts(village); unindexStructure(structure);
  if (announce && def) addEvent(`${village.name}的一座${def.name}被摧毁。`);
  return true;
}

function damageRandomBuilding(village, chance, amount = rand(22, 48), preferredType = null) {
  if (random() >= chance) return false;
  let candidates = (village.structures || []).filter(structure => structure.hp > 0 && structure.type !== "hall");
  if (preferredType && candidates.some(structure => structure.type === preferredType)) candidates = candidates.filter(structure => structure.type === preferredType);
  if (!candidates.length) return false;
  return damageStructure(village, candidates[randi(0, candidates.length - 1)], amount);
}

function damageStructuresInArea(disaster, baseDamage, chance = 1) {
  for (const village of villages) {
    for (const structure of [...(village.structures || [])]) {
      const force = disasterFalloff(disaster, structure.x, structure.y); if (!force || random() >= chance * force) continue;
      damageStructure(village, structure, baseDamage * disaster.intensity * force);
    }
  }
}

function strikeEarthquake(disaster, aftershock = 1) {
  for (const person of people) {
    const force = disasterFalloff(disaster, person.x, person.y); if (!force) continue;
    person.health -= rand(4, 11) * disaster.intensity * force * aftershock;
  }
  for (const animal of animals) {
    const force = disasterFalloff(disaster, animal.x, animal.y); if (!force) continue;
    animal.health -= rand(3, 9) * disaster.intensity * force * aftershock;
  }
  for (const village of villages) {
    const force = disasterFalloff(disaster, village.x, village.y); if (!force) continue;
    village.hp = Math.max(5, village.hp - rand(8, 18) * disaster.intensity * force * aftershock);
  }
  damageStructuresInArea(disaster, rand(7, 14) * aftershock, .42 * aftershock);
  forEachDisasterTile(disaster, tile => {
    if (!isLand(tile)) return; tile.biomass = Math.max(0, (tile.biomass || 0) * rand(.7, .94)); tile.fertility = Math.max(.05, tile.fertility - .015 * aftershock);
  });
}

function initializeVolcano(disaster) {
  forEachDisasterTile(disaster, (tile, x, y, force) => {
    if (!tile || force < .58) return;
    if (force > .82) { tile.type = "mountain"; tile.fire = 0; }
    else { tile.type = "ash"; tile.fire = randi(90, 190); }
    tile.fertility = .08; tile.biomass = 0; tile.owner = -1;
  }, Math.max(2, disaster.radius * .48));
}

function volcanicBurst(disaster) {
  const burstRadius = disaster.radius + 4;
  for (let n = 0; n < 2 + disaster.intensity; n++) {
    const angle = rand(0, Math.PI * 2), distance = rand(1, burstRadius);
    const x = Math.round(disaster.x + Math.cos(angle) * distance), y = Math.round(disaster.y + Math.sin(angle) * distance), tile = tileAt(x, y);
    if (!tile || !isLand(tile)) continue;
    tile.type = random() < .3 ? "ash" : tile.type; tile.fire = Math.max(tile.fire || 0, randi(70, 160)); tile.biomass = 0;
  }
  for (const person of people) {
    const force = disasterFalloff(disaster, person.x, person.y, burstRadius); if (force) person.health -= rand(1.5, 4) * disaster.intensity * force;
  }
  for (const animal of animals) {
    const force = disasterFalloff(disaster, animal.x, animal.y, burstRadius); if (force) animal.health -= rand(1, 3) * disaster.intensity * force;
  }
  for (const village of villages) {
    const force = disasterFalloff(disaster, village.x, village.y, burstRadius); if (!force) continue;
    village.hp = Math.max(5, village.hp - rand(2, 5) * disaster.intensity * force);
  }
  damageStructuresInArea(disaster, rand(4, 9), .26);
}

function seedPlague(disaster) {
  let infected = 0;
  for (const person of people) {
    if (person.blessed || !disasterFalloff(disaster, person.x, person.y)) continue;
    const resistance = 1 - technologyLevel(getKingdom(person.kingdom), "medicine") * .16;
    if (random() < .16 * disaster.intensity * resistance) { person.plague = randi(160, 300); infected++; }
  }
  if (!infected) {
    const patient = nearestEntity(people, disaster.x, disaster.y, person => !person.blessed);
    if (patient) patient.plague = randi(180, 300);
  }
}

function triggerDisaster(type, x, y, randomSource = false) {
  const def = disasterDefs[type]; if (!def) return null;
  if (activeDisasters.length >= 12) { if (!randomSource) showToast("同时存在的灾害太多了"); return null; }
  const point = nearestLandPoint(x, y), intensity = randomSource ? randi(2, 4) : clamp(brushSize, 1, 6);
  const disaster = {
    id: nextDisasterId++, type, x: point.x, y: point.y, intensity,
    radius: def.radius + Math.floor(intensity * .75), duration: def.duration + intensity * 18,
    maxDuration: def.duration + intensity * 18, age: 0, randomSource
  };
  if (type === "tornado") {
    const angle = rand(0, Math.PI * 2); disaster.dx = Math.cos(angle) * (.08 + intensity * .015); disaster.dy = Math.sin(angle) * (.08 + intensity * .015);
  }
  activeDisasters.push(disaster);
  worldStats.disastersTriggered++;
  if (type === "earthquake") strikeEarthquake(disaster);
  if (type === "volcano") { initializeVolcano(disaster); volcanicBurst(disaster); }
  if (type === "plague") seedPlague(disaster);
  const cause = randomSource ? "天灾预警" : "神力降灾";
  addEvent(`${def.icon} ${cause}：${disasterLocation(disaster)}发生${def.name}。`);
  spawnExperienceEffect("power", disaster.x, disaster.y, def.color); playExperienceSound("disaster");
  if (!randomSource) showToast(`${def.icon} ${def.name}已经降临`);
  renderDirty = true; updateUI(); return disaster;
}

function triggerRandomDisaster() {
  if (!randomDisastersEnabled || year < nextDisasterYear) return;
  if (activeDisasters.length >= 2) { nextDisasterYear = year + 1; return; }
  const types = Object.keys(disasterDefs).filter(type => type !== "plague" || people.length);
  const type = types[randi(0, types.length - 1)], target = randomDisasterTarget(type);
  triggerDisaster(type, target.x, target.y, true); scheduleNextDisaster();
}

function simulateFlood(disaster) {
  if (disaster.age % 3) return;
  forEachDisasterTile(disaster, tile => {
    if (!isLand(tile)) return; tile.moisture = Math.min(1, (tile.moisture || .4) + .012 * disaster.intensity); tile.biomass = Math.max(0, (tile.biomass || 0) - .006 * disaster.intensity); tile.fertility = Math.max(.08, tile.fertility - .0007 * disaster.intensity);
  });
  for (const person of people) {
    const force = disasterFalloff(disaster, person.x, person.y); if (!force) continue;
    person.food = Math.max(0, person.food - .1 * disaster.intensity * force); person.health -= .018 * disaster.intensity * force;
  }
  for (const animal of animals) {
    const force = disasterFalloff(disaster, animal.x, animal.y); if (force) animal.health -= .03 * disaster.intensity * force;
  }
  for (const village of villages) {
    const force = disasterFalloff(disaster, village.x, village.y); if (!force) continue;
    village.hp = Math.max(5, village.hp - .11 * disaster.intensity * force);
  }
  if (disaster.age % 45 === 0) damageStructuresInArea(disaster, 8, .28);
}

function simulateTornado(disaster) {
  disaster.x += disaster.dx; disaster.y += disaster.dy;
  if (disaster.x < 1 || disaster.x > MAP_W - 2) disaster.dx *= -1;
  if (disaster.y < 1 || disaster.y > MAP_H - 2) disaster.dy *= -1;
  disaster.x = clamp(disaster.x, 1, MAP_W - 2); disaster.y = clamp(disaster.y, 1, MAP_H - 2);
  if (disaster.age % 18 === 0) {
    const angle = rand(-.45, .45), cos = Math.cos(angle), sin = Math.sin(angle), oldX = disaster.dx;
    disaster.dx = oldX * cos - disaster.dy * sin; disaster.dy = oldX * sin + disaster.dy * cos;
  }
  for (const person of people) {
    const force = disasterFalloff(disaster, person.x, person.y); if (force) person.health -= .28 * disaster.intensity * force;
  }
  for (const animal of animals) {
    const force = disasterFalloff(disaster, animal.x, animal.y); if (force) animal.health -= .34 * disaster.intensity * force;
  }
  for (const village of villages) {
    const force = disasterFalloff(disaster, village.x, village.y); if (!force) continue;
    village.hp = Math.max(5, village.hp - .38 * disaster.intensity * force);
  }
  if (disaster.age % 20 === 0) damageStructuresInArea(disaster, 11, .34);
  forEachDisasterTile(disaster, tile => { if (isLand(tile)) tile.biomass = Math.max(0, (tile.biomass || 0) - .035 * disaster.intensity); });
}

function simulatePlague(disaster) {
  if (disaster.age % 12) return;
  for (const person of people) {
    if (person.plague > 0 || person.blessed || !disasterFalloff(disaster, person.x, person.y)) continue;
    const resistance = 1 - technologyLevel(getKingdom(person.kingdom), "medicine") * .16;
    if (random() < .018 * disaster.intensity * resistance) person.plague = randi(140, 260);
  }
}

function simulateDrought(disaster) {
  if (disaster.age % 3) return;
  forEachDisasterTile(disaster, (tile, x, y, force) => {
    if (!isLand(tile)) return;
    tile.moisture = Math.max(.01, (tile.moisture || .4) - .009 * disaster.intensity * force);
    tile.biomass = Math.max(0, (tile.biomass || 0) - .004 * disaster.intensity * force);
    tile.fertility = Math.max(.06, tile.fertility - .00025 * disaster.intensity * force);
    if (!tile.fire && tile.type === "forest" && tile.biomass < .15 && random() < .0007 * disaster.intensity) tile.fire = randi(50, 110);
  });
  for (const person of people) {
    const force = disasterFalloff(disaster, person.x, person.y); if (force) person.food = Math.max(0, person.food - .025 * disaster.intensity * force);
  }
  for (const animal of animals) {
    const force = disasterFalloff(disaster, animal.x, animal.y); if (force) animal.hunger = Math.max(0, animal.hunger - .04 * disaster.intensity * force);
  }
  if (disaster.age % 30 === 0) for (const village of villages) {
    const force = disasterFalloff(disaster, village.x, village.y); if (!force) continue;
    const kingdom = getKingdom(village.kingdom), residents = peopleOfVillage(village.id).length;
    if (kingdom) kingdom.resources.food = Math.max(0, kingdom.resources.food - disaster.intensity * force * (2 + residents * .12));
  }
}

function simulateSickness() {
  for (const person of people) {
    if (!(person.plague > 0)) continue;
    person.plague -= person.blessed ? 3 : 1;
    if (person.blessed) continue;
    person.health -= .045; person.food = Math.max(0, person.food - .06);
    if (ticks % 10 === 0 && random() < .05) {
      const target = findNearbyEntity(worldIndex.peopleSpatial, person.x, person.y, 2.2, other => other.id !== person.id && !(other.plague > 0) && !other.blessed);
      if (target && random() < 1 - technologyLevel(getKingdom(target.kingdom), "medicine") * .16) target.plague = randi(120, 240);
    }
  }
}

function simulateDisasters() {
  simulateSickness();
  for (const disaster of activeDisasters) {
    disaster.age++; disaster.duration--;
    if (disaster.type === "earthquake" && disaster.age % 18 === 0 && disaster.duration > 12) strikeEarthquake(disaster, .32);
    if (disaster.type === "flood") simulateFlood(disaster);
    if (disaster.type === "tornado") simulateTornado(disaster);
    if (disaster.type === "volcano" && disaster.age % 18 === 0) volcanicBurst(disaster);
    if (disaster.type === "plague") simulatePlague(disaster);
    if (disaster.type === "drought") simulateDrought(disaster);
  }
  for (const disaster of activeDisasters) if (disaster.duration <= 0) { worldStats.disastersSurvived++; addEvent(`${disasterDefs[disaster.type].icon} ${disasterDefs[disaster.type].name}逐渐平息。`); }
  activeDisasters = activeDisasters.filter(disaster => disaster.duration > 0);
}

function kingdomAtWar(kingdomId) {
  const kingdom = getKingdom(kingdomId);
  if (!kingdom) return false;
  for (const id in kingdom.relations) if (kingdom.relations[id].status === "war") return true;
  return false;
}

function enemyKingdomIds(kingdomId) {
  const kingdom = getKingdom(kingdomId); if (!kingdom) return [];
  const ids = [];
  for (const id in kingdom.relations) if (kingdom.relations[id].status === "war") ids.push(Number(id));
  return ids;
}

const armyNames = ["第一军团", "铁壁军", "远征军", "王庭卫队", "赤旗军", "边境军", "风暴军", "山岳军"];
const armySoldiers = army => (army?.soldierIds || []).map(getPerson).filter(person => person?.role === "soldier" && !person.dead);
const armyOfSoldier = personId => armies.find(army => army.soldierIds?.includes(personId)) || null;

function recordSoldierCasualty(person) {
  const army = armyOfSoldier(person.id); if (!army) return;
  army.casualties = (army.casualties || 0) + 1;
  army.soldierIds = army.soldierIds.filter(id => id !== person.id);
  if (army.generalId === person.id) army.generalId = null;
}

function unitCountsFor(soldiers) {
  const counts = Object.fromEntries(Object.keys(unitDefs).map(type => [type, 0]));
  for (const soldier of soldiers) counts[unitDefs[soldier.unitType] ? soldier.unitType : "militia"]++;
  return counts;
}

function assignUnitTypes(kingdom, soldiers) {
  const realmVillages = villagesOfKingdom(kingdom.id), total = type => realmVillages.reduce((sum, village) => sum + buildingCount(village, type), 0), atWar = kingdomAtWar(kingdom.id);
  const plan = {
    siege: atWar ? Math.min(Math.floor(soldiers.length / 8), total("quarry") + Math.floor(total("barracks") / 2)) : 0,
    cavalry: Math.min(Math.floor(soldiers.length / 5), total("market") + Math.floor(total("farm") / 2)),
    archer: Math.min(Math.floor(soldiers.length / 4), total("lumber") * 2),
    infantry: Math.min(Math.ceil(soldiers.length * .48), total("barracks") * 4)
  };
  const ordered = [...soldiers].sort((a, b) => Number(b.isGeneral) - Number(a.isGeneral) || a.id - b.id), assigned = new Set();
  for (const type of ["siege", "cavalry", "archer", "infantry"]) for (let count = 0; count < plan[type]; count++) {
    const soldier = ordered.find(candidate => !assigned.has(candidate.id)); if (!soldier) break;
    soldier.unitType = type; assigned.add(soldier.id);
  }
  for (const soldier of ordered) if (!assigned.has(soldier.id)) soldier.unitType = total("barracks") ? "infantry" : "militia";
}

function armyRallyVillage(kingdomId) {
  return [...villagesOfKingdom(kingdomId)].sort((a, b) => peopleOfVillage(b.id).length + buildingCount(b, "warehouse") * 8 + buildingCount(b, "barracks") * 6 - peopleOfVillage(a.id).length - buildingCount(a, "warehouse") * 8 - buildingCount(a, "barracks") * 6)[0] || null;
}

function reorganizeArmies(preserveAssignments = false) {
  const soldierById = new Map(people.filter(person => person.role === "soldier" && !person.dead).map(person => [person.id, person]));
  armies = armies.filter(army => getKingdom(army.kingdomId) && !getKingdom(army.kingdomId).defeated).map(army => ({ ...army, soldierIds: (army.soldierIds || []).filter(id => soldierById.get(id)?.kingdom === army.kingdomId) })).filter(army => army.soldierIds.length);
  for (const person of soldierById.values()) { person.isGeneral = false; person.leadership = clamp(Number(person.leadership) || 1, .8, 1.4); }
  for (const kingdom of kingdoms) {
    if (kingdom.defeated) continue;
    const soldiers = [...soldierById.values()].filter(person => person.kingdom === kingdom.id), atWar = kingdomAtWar(kingdom.id);
    if (!soldiers.length) { armies = armies.filter(army => army.kingdomId !== kingdom.id); continue; }
    const desiredCount = atWar ? Math.max(1, Math.ceil(soldiers.length / 10)) : soldiers.length >= 4 ? 1 : 0;
    let realmArmies = armies.filter(army => army.kingdomId === kingdom.id);
    while (realmArmies.length > desiredCount) {
      const removed = realmArmies.pop(), receiver = realmArmies[0]; if (receiver) receiver.soldierIds.push(...removed.soldierIds);
      armies = armies.filter(army => army.id !== removed.id);
    }
    while (realmArmies.length < desiredCount) {
      const rally = armyRallyVillage(kingdom.id), army = { id: nextArmyId++, kingdomId: kingdom.id, name: `${kingdom.name}·${armyNames[(nextArmyId - 2) % armyNames.length]}`, soldierIds: [], generalId: null, rallyVillageId: rally?.id || null, targetVillageId: null, x: rally?.x || soldiers[0].x, y: rally?.y || soldiers[0].y, morale: 72, supply: 60, maxSupply: 60, status: atWar ? "assembling" : "garrison", createdYear: Math.floor(year), casualties: 0, siegeProgress: 0 };
      armies.push(army); realmArmies.push(army); if (soldiers.length >= 3) addEvent(`${kingdom.name}组建了${army.name.split("·").pop()}。`);
    }
    if (!desiredCount) continue;
    const assignedIds = preserveAssignments ? new Set(realmArmies.flatMap(army => army.soldierIds)) : new Set();
    if (!preserveAssignments) for (const army of realmArmies) army.soldierIds = [];
    let cursor = 0;
    for (const soldier of soldiers) if (!assignedIds.has(soldier.id)) { realmArmies[cursor % realmArmies.length].soldierIds.push(soldier.id); cursor++; }
    for (const army of realmArmies) {
      const members = armySoldiers(army); if (!members.length) continue;
      let general = members.find(person => person.id === army.generalId);
      if (!general && !preserveAssignments) {
        general = [...members].sort((a, b) => (b.leadership || 1) + b.age * .002 + b.health * .001 - ((a.leadership || 1) + a.age * .002 + a.health * .001))[0];
        const replacing = Boolean(army.generalId); army.generalId = general.id; general.leadership = rand(1.04, 1.34);
        if (atWar && replacing) addEvent(`${army.name}推举${unitDefs[general.unitType]?.name || "军官"} #${general.id}接任将领。`);
      }
      if (general) general.isGeneral = true; else army.generalId = null;
      const rally = getVillage(army.rallyVillageId) || armyRallyVillage(kingdom.id); army.rallyVillageId = rally?.id || null;
      const calculatedMaxSupply = Math.max(45, members.reduce((sum, person) => sum + (unitDefs[person.unitType]?.supply || 1) * 11, 0) + buildingCount(rally || {}, "warehouse") * 28);
      army.maxSupply = preserveAssignments ? Math.max(45, Number(army.maxSupply) || calculatedMaxSupply) : calculatedMaxSupply;
      army.supply = clamp(Number(army.supply) || army.maxSupply * .65, 0, army.maxSupply);
      army.morale = clamp(Number(army.morale) || 70, 0, 100);
      army.x = members.reduce((sum, person) => sum + person.x, 0) / members.length; army.y = members.reduce((sum, person) => sum + person.y, 0) / members.length;
    }
  }
}

function updateMilitaryRoles() {
  for (const kingdom of kingdoms) {
    const citizens = [], soldiers = [], recruits = [];
    for (const person of peopleOfKingdom(kingdom.id)) {
      if (person.age < 16) continue;
      citizens.push(person); (person.role === "soldier" ? soldiers : recruits).push(person);
    }
    const barracks = villagesOfKingdom(kingdom.id).reduce((sum, v) => sum + (v.buildings.barracks || 0), 0);
    const militaryPolicy = policyOf(kingdom, "military"), government = governmentOf(kingdom);
    const desired = kingdomAtWar(kingdom.id)
      ? Math.min(Math.floor(citizens.length * .38 * militaryPolicy.mobilization), Math.floor((8 + barracks * 6) * government.recruitment))
      : Math.min(Math.floor(citizens.length * militaryPolicy.standing), Math.floor(barracks * 2 * government.recruitment) + (kingdom.policies?.military === "conquest" && citizens.length >= 10 ? 1 : 0));
    for (let i = 0; i < desired - soldiers.length && i < recruits.length; i++) {
      recruits[i].previousProfession = recruits[i].profession; recruits[i].role = "soldier"; recruits[i].profession = "soldier"; recruits[i].unitType = barracks ? "infantry" : "militia"; recruits[i].health = Math.max(recruits[i].health, 110);
    }
    for (let i = desired; i < soldiers.length; i++) demobilizePerson(soldiers[i]);
    assignUnitTypes(kingdom, peopleOfKingdom(kingdom.id).filter(person => person.role === "soldier"));
  }
  reorganizeArmies(); assignSocialClasses();
}

function nearestFriendlySupplyVillage(army) {
  return nearestEntity(villagesOfKingdom(army.kingdomId), army.x, army.y);
}

function simulateArmies() {
  const survivors = [];
  for (const army of armies) {
    const members = armySoldiers(army), kingdom = getKingdom(army.kingdomId); if (!members.length || !kingdom || kingdom.defeated) continue;
    army.x = members.reduce((sum, person) => sum + person.x, 0) / members.length; army.y = members.reduce((sum, person) => sum + person.y, 0) / members.length;
    const general = members.find(person => person.id === army.generalId), leadership = general?.leadership || 1, enemyIds = new Set(enemyKingdomIds(army.kingdomId));
    const currentTarget = getVillage(army.targetVillageId);
    if (!currentTarget || !enemyIds.has(currentTarget.kingdom)) {
      const targets = villages.filter(village => enemyIds.has(village.kingdom));
      const target = nearestEntity(targets, army.x, army.y); army.targetVillageId = target?.id || null; army.siegeProgress = 0;
    }
    const target = getVillage(army.targetVillageId), rally = getVillage(army.rallyVillageId) || nearestFriendlySupplyVillage(army);
    const supplyVillage = nearestFriendlySupplyVillage(army), supplyDistance = supplyVillage ? Math.hypot(supplyVillage.x - army.x, supplyVillage.y - army.y) : Infinity;
    const nearbyEnemies = countNearbyEntities(worldIndex.peopleSpatial, army.x, army.y, 7, person => enemyIds.has(person.kingdom));
    if (!enemyIds.size) { army.status = "garrison"; army.targetVillageId = null; army.siegeProgress = 0; }
    else if (army.morale < 18 || army.supply <= 0) army.status = "retreat";
    else if (nearbyEnemies) army.status = "battle";
    else if (target && Math.hypot(target.x - army.x, target.y - army.y) < 4) army.status = "siege";
    else army.status = "advance";
    const consumption = members.reduce((sum, person) => sum + (unitDefs[person.unitType]?.supply || 1), 0) * .022 * (["battle", "siege"].includes(army.status) ? 1.75 : .75);
    army.supply = Math.max(0, army.supply - consumption);
    if (supplyDistance < 5.5 && supplyVillage) {
      const realm = getKingdom(army.kingdomId), loadRate = 1.1 + buildingCount(supplyVillage, "warehouse") * 1.8 + buildingCount(supplyVillage, "barracks") * .7;
      const available = Math.min(supplyVillage.inventory?.food || 0, realm.resources.food || 0), loaded = Math.min(army.maxSupply - army.supply, loadRate, available);
      if (loaded > 0) { army.supply += loaded; supplyVillage.inventory.food -= loaded; realm.resources.food -= loaded; }
    }
    const supplyRatio = army.supply / Math.max(1, army.maxSupply), culturalMorale = hasTradition(kingdom, "warrior_code") ? 6 : 0, targetMorale = clamp(42 + supplyRatio * 38 + (leadership - 1) * 55 + culturalMorale - kingdom.warWeariness * .12 - (army.status === "retreat" ? 12 : 0), 5, 96);
    army.morale += (targetMorale - army.morale) * .018;
    if (army.supply <= 0) for (const person of members) { person.health -= .025; person.happiness = Math.max(0, person.happiness - .04); }
    if (army.status === "retreat" && rally && Math.hypot(rally.x - army.x, rally.y - army.y) < 5 && army.supply > army.maxSupply * .3) army.morale = Math.min(65, army.morale + .2);
    survivors.push(army);
  }
  armies = survivors;
}

function walkToward(person, targetX, targetY) {
  let bestX = person.x, bestY = person.y, bestDistance = Infinity;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    if (!ox && !oy) continue;
    const x = person.x + ox, y = person.y + oy, t = tileAt(x, y);
    if (isLand(t) && t.type !== "mountain" && !t.fire) {
      const distance = Math.hypot(x - targetX, y - targetY) + random() * .7 - (structureAt(x, y, "road") ? .55 : 0);
      if (distance < bestDistance) { bestDistance = distance; bestX = x; bestY = y; }
    }
  }
  if (bestDistance < Infinity) { person.x = bestX; person.y = bestY; }
}

function militaryBehavior(person) {
  const enemyIds = new Set(enemyKingdomIds(person.kingdom));
  if (!enemyIds.size) { demobilizePerson(person); return; }
  const army = armyOfSoldier(person.id), unit = unitDefs[person.unitType] || unitDefs.militia, general = army ? people.find(candidate => candidate.id === army.generalId) : null;
  const realm = getKingdom(person.kingdom), metallurgyBonus = 1 + technologyLevel(realm, "metallurgy") * .08 + (hasTradition(realm, "warrior_code") ? .06 : 0);
  const moraleFactor = army ? clamp(.45 + army.morale / 100 * .75, .45, 1.2) : .85, supplyFactor = army ? clamp(.45 + army.supply / Math.max(1, army.maxSupply), .45, 1.25) : .8, leadership = general?.leadership || 1;
  person.cooldown = Math.max(2, Math.round(person.cooldown / unit.speed));
  if (army?.status === "retreat") {
    const rally = getVillage(army.rallyVillageId); if (rally) walkToward(person, rally.x, rally.y); return;
  }
  const nearbyEnemy = findNearbyEntity(worldIndex.peopleSpatial, person.x, person.y, Math.max(5, unit.range + 1), candidate => candidate.id !== person.id && enemyIds.has(candidate.kingdom), true);
  if (nearbyEnemy) {
    const distance = Math.hypot(nearbyEnemy.x - person.x, nearbyEnemy.y - person.y);
    if (distance <= unit.range && person.attackCooldown <= 0) {
      const enemyUnit = unitDefs[nearbyEnemy.unitType] || unitDefs.militia, damage = rand(10, 21) * unit.attack * (raceDefs[person.race]?.combat || 1) * moraleFactor * supplyFactor * leadership * metallurgyBonus * heroCombatMultiplier(person) * (person.blessed ? 1.3 : 1) / enemyUnit.defense;
      nearbyEnemy.health -= damage;
      if (distance <= enemyUnit.range && unit.range < 2.5) person.health -= rand(1, 6) * enemyUnit.attack / unit.defense;
      person.attackCooldown = unit.range > 2 ? 7 : unit.speed > 1.2 ? 4 : 5;
      if (nearbyEnemy.health <= 0) { if (nearbyEnemy.role === "soldier") recordSoldierCasualty(nearbyEnemy); nearbyEnemy.dead = true; recordHeroVictory(person); spawnExperienceEffect("battle", nearbyEnemy.x, nearbyEnemy.y, "#e56f57"); playExperienceSound("battle"); }
    } else walkToward(person, nearbyEnemy.x, nearbyEnemy.y);
    return;
  }
  const target = getVillage(army?.targetVillageId) || nearestEntity(villages, person.x, person.y, village => enemyIds.has(village.kingdom));
  if (!target) return;
  const distance = Math.hypot(target.x - person.x, target.y - person.y);
  if (distance <= unit.range + .55 && person.attackCooldown <= 0) {
    const walls = buildingCount(target, "wall"), siegePower = unit.siege || .72, wallResistance = unit.siege ? 1 + walls * .04 : 1 + walls * .22;
    const siegeDamage = rand(1.8, 4.2) * siegePower * moraleFactor * supplyFactor * leadership * metallurgyBonus / wallResistance;
    target.hp -= siegeDamage; person.attackCooldown = 5;
    if (army) army.siegeProgress += siegeDamage;
    if (walls && random() < .08 * siegePower) damageRandomBuilding(target, 1, rand(3, 7) * siegePower, "wall");
    if (target.hp <= 0) captureVillage(target, person.kingdom);
  } else {
    walkToward(person, target.x, target.y);
    if (unit.speed > 1.3 && random() < .4 && Math.hypot(target.x - person.x, target.y - person.y) > 4) walkToward(person, target.x, target.y);
  }
}

function captureVillage(village, newKingdomId) {
  const oldKingdomId = village.kingdom; if (oldKingdomId === newKingdomId) return;
  const oldKingdom = getKingdom(oldKingdomId), newKingdom = getKingdom(newKingdomId);
  worldStats.villagesCaptured++;
  village.kingdom = newKingdomId; village.hp = 100; village.unrest = Math.max(68, village.unrest || 0);
  if (oldKingdom) { oldKingdom.unrest = clamp((oldKingdom.unrest || 0) + 8, 0, 100); oldKingdom.legitimacy = Math.max(0, (oldKingdom.legitimacy || 60) - 6); }
  if (newKingdom) newKingdom.unrest = clamp((newKingdom.unrest || 0) + 3, 0, 100);
  const capturedHouse = (village.structures || []).find(structure => structure.type === "house");
  if (capturedHouse && buildingCount(village, "house") > 1) damageStructure(village, capturedHouse, capturedHouse.maxHp, false);
  for (const army of armies) if (army.targetVillageId === village.id) { army.targetVillageId = null; army.siegeProgress = 0; army.status = "advance"; }
  for (let position = 0; position < tiles.length; position++) {
    const t = tiles[position]; if (t.owner !== oldKingdomId) continue;
    const x = position % MAP_W, y = Math.floor(position / MAP_W);
    if (Math.hypot(x - village.x, y - village.y) < 8) t.owner = newKingdomId;
  }
  for (const structure of village.structures || []) { const tile = tileAt(Math.round(structure.x), Math.round(structure.y)); if (tile && isLand(tile)) tile.owner = newKingdomId; }
  for (const resident of peopleOfVillage(village.id)) {
    if (resident.role === "civilian" && random() < .7) resident.kingdom = newKingdomId;
  }
  addEvent(`${newKingdom?.name}攻占了${oldKingdom?.name}的${village.name}。`);
  if (!villages.some(v => v.kingdom === oldKingdomId)) {
    oldKingdom.defeated = true;
    peopleOfKingdom(oldKingdomId).forEach(p => { p.kingdom = newKingdomId; if (p.role === "soldier") demobilizePerson(p); });
    addEvent(`${oldKingdom.name}失去最后一座聚落，宣告覆灭。`);
    for (const other of kingdoms) if (other.id !== oldKingdomId && relationBetween(oldKingdomId, other.id)) setRelation(oldKingdomId, other.id, "peace", -20, true);
  }
}

function shareBorder(aId, bId) {
  for (let y = 1; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) {
    const owner = tileAt(x, y).owner; if (owner !== aId && owner !== bId) continue;
    const otherId = owner === aId ? bId : aId;
    if (tileAt(x + 1, y)?.owner === otherId || tileAt(x - 1, y)?.owner === otherId || tileAt(x, y + 1)?.owner === otherId || tileAt(x, y - 1)?.owner === otherId) return true;
  }
  return false;
}

function kingdomsAreClose(aId, bId) {
  const aVillages = villagesOfKingdom(aId), bVillages = villagesOfKingdom(bId);
  return aVillages.some(a => bVillages.some(b => Math.hypot(a.x - b.x, a.y - b.y) < 55));
}

function attemptColonies() {
  for (const kingdom of kingdoms) {
    if (kingdom.defeated) continue;
    const realmVillages = villagesOfKingdom(kingdom.id), citizens = peopleOfKingdom(kingdom.id);
    if (!realmVillages.length || citizens.length < realmVillages.length * 12 || kingdom.resources.food < 80 || kingdom.resources.wood < 35) continue;
    const origin = realmVillages[randi(0, realmVillages.length - 1)];
    for (let attempt = 0; attempt < 30; attempt++) {
      const angle = rand(0, Math.PI * 2), distance = randi(10, 18);
      const x = Math.round(origin.x + Math.cos(angle) * distance), y = Math.round(origin.y + Math.sin(angle) * distance), t = tileAt(x, y);
      if (!isLand(t) || t.type === "mountain" || villages.some(v => Math.hypot(v.x - x, v.y - y) < 10)) continue;
      const settler = citizens.find(p => p.role === "civilian" && p.age > 18); if (!settler) break;
      settler.x = x; settler.y = y; settler.village = null; createVillage(settler);
      kingdom.resources.food -= 40; kingdom.resources.wood -= 35;
      addEvent(`${kingdom.name}的拓荒者建立了一处新殖民地。`);
      break;
    }
  }
}

function diplomacyStep() {
  const active = kingdoms.filter(k => !k.defeated && (villagesOfKingdom(k.id).length || peopleOfKingdom(k.id).length));
  for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
    const a = active[i], b = active[j];
    let relation = relationBetween(a.id, b.id);
    if (!relation) { setRelation(a.id, b.id, "peace", randi(-15, 25), true); relation = relationBetween(a.id, b.id); }
    const bordered = shareBorder(a.id, b.id), nearby = kingdomsAreClose(a.id, b.id), strengthA = peopleOfKingdom(a.id).length, strengthB = peopleOfKingdom(b.id).length;
    const intelligence = evaluateDiplomaticPair(a, b, relation, { bordered, nearby, strengthA, strengthB });
    if (relation.status === "war") {
      const warYears = year - relation.since;
      relation.score = Math.max(-100, relation.score - randi(0, 3));
      getKingdom(b.id).relations[String(a.id)].score = relation.score;
      a.warWeariness += BALANCE.diplomacy.wearinessPerCycle; b.warWeariness += BALANCE.diplomacy.wearinessPerCycle;
      if (intelligence.seekPeace || (warYears > 7 && random() < .28) || Math.min(strengthA, strengthB) < 5 || Math.max(a.warWeariness, b.warWeariness) > BALANCE.diplomacy.forcedPeaceWeariness) {
        setRelation(a.id, b.id, "peace", randi(-28, -8)); a.warWeariness = 0; b.warWeariness = 0;
      }
    } else {
      const resourceGap = Math.abs(a.resources.food - b.resources.food) > 120 ? -2 : 1;
      const raceAffinity = a.race === b.race ? 1 : (a.race === "orc" || b.race === "orc") ? -1 : 0;
      const proximityDrift = bordered ? BALANCE.diplomacy.borderDrift : nearby ? BALANCE.diplomacy.nearbyDrift : BALANCE.diplomacy.distantDrift;
      relation.score = clamp(relation.score + randi(BALANCE.diplomacy.relationRandomMin, BALANCE.diplomacy.relationRandomMax) + proximityDrift + resourceGap + raceAffinity + intelligence.drift, -100, 100);
      getKingdom(b.id).relations[String(a.id)].score = relation.score;
      if (relation.status === "alliance" && relation.score < BALANCE.diplomacy.allianceBreakThreshold) setRelation(a.id, b.id, "peace", relation.score);
      else if (relation.status === "peace" && relation.score > BALANCE.diplomacy.allianceThreshold) setRelation(a.id, b.id, "alliance", relation.score);
      else if (relation.status === "peace" && relation.score < BALANCE.diplomacy.warThreshold + intelligence.escalation && (bordered || nearby) && strengthA >= 5 && strengthB >= 5) setRelation(a.id, b.id, "war", relation.score);
    }
  }
}

function applyTool(gx, gy) {
  gx = Math.floor(gx); gy = Math.floor(gy);
  renderDirty = true;
  if (selectedTool === "inspect") { inspectAt(gx, gy); return; }
  if (raceDefs[selectedTool]) { spawnPerson(gx, gy, null, selectedTool); indexesReady = false; updateUI(); return; }
  if (animalDefs[selectedTool]) {
    for (let n = 0; n < Math.max(1, brushSize); n++) spawnAnimal(gx + randi(-brushSize, brushSize), gy + randi(-brushSize, brushSize), selectedTool);
    indexesReady = false; updateUI(); return;
  }
  if (disasterDefs[selectedTool]) { triggerDisaster(selectedTool, gx, gy, false); return; }
  if (selectedTool === "meteor") { meteor(gx, gy); return; }
  const radius = brushSize;
  for (let y = gy - radius; y <= gy + radius; y++) for (let x = gx - radius; x <= gx + radius; x++) {
    if (Math.hypot(x - gx, y - gy) > radius + .3) continue;
    const t = tileAt(x, y); if (!t) continue;
    if (selectedTool === "land") { t.type = random() < .28 ? "forest" : "grass"; t.fertility = .8; t.biomass = .65; t.moisture = Math.max(.48, t.moisture || 0); }
    if (selectedTool === "water") { t.type = "water"; t.fertility = 0; t.biomass = 0; t.moisture = 1; t.owner = -1; }
    if (selectedTool === "forest" && isLand(t)) { t.type = "forest"; t.fertility = 1; t.biomass = 1; t.moisture = Math.max(.68, t.moisture || 0); }
    if (selectedTool === "fire" && ["grass", "forest", "sand"].includes(t.type)) t.fire = randi(80, 160);
    if (selectedTool === "bless") {
      people.filter(p => p.x === x && p.y === y).forEach(p => { p.blessed = true; p.health = 140; p.food = 110; });
      animals.filter(a => a.x === x && a.y === y).forEach(a => { a.health = animalDefs[a.species].health * 1.4; a.hunger = 100; });
    }
  }
}

function meteor(gx, gy) {
  for (let y = gy - brushSize * 2; y <= gy + brushSize * 2; y++) for (let x = gx - brushSize * 2; x <= gx + brushSize * 2; x++) {
    const d = Math.hypot(x - gx, y - gy), t = tileAt(x, y); if (!t || d > brushSize * 2) continue;
    t.type = d < brushSize * .7 ? "water" : "ash"; t.fertility = 0; t.biomass = 0; t.moisture = d < brushSize * .7 ? 1 : .05; t.fire = d > brushSize * .7 ? randi(50, 130) : 0; t.owner = -1;
  }
  people = people.filter(p => Math.hypot(p.x - gx, p.y - gy) > brushSize * 2.2);
  animals = animals.filter(a => Math.hypot(a.x - gx, a.y - gy) > brushSize * 2.2);
  villages = villages.filter(v => Math.hypot(v.x - gx, v.y - gy) > brushSize * 1.8);
  indexesReady = false; addEvent("一颗陨星撞击大地，留下炽热的伤痕。"); updateUI();
}


function showToast(msg) { const el = document.getElementById("toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.classList.remove("show"), 1700); }
function setRunning(value, refreshUI = true) {
  running = Boolean(value);
  const button = document.getElementById("pauseBtn");
  button.textContent = running ? "Ⅱ" : "▶"; button.classList.toggle("active", !running);
  if (running) tutorialSignal("start-time");
  if (!running && refreshUI && tiles.length) updateUI();
}

document.querySelectorAll(".tool").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".tool").forEach(b => b.classList.remove("active")); btn.classList.add("active"); selectedTool = btn.dataset.tool;
  if (selectedTool === "forest") tutorialSignal("select-tool"); playExperienceSound("click");
}));
document.querySelectorAll(".speed-btn").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active")); btn.classList.add("active"); speed = Number(btn.dataset.speed);
}));
document.getElementById("pauseBtn").addEventListener("click", () => setRunning(!running));
document.getElementById("brushSize").addEventListener("input", e => { brushSize = Number(e.target.value); document.getElementById("brushValue").textContent = brushSize; });
document.getElementById("newWorldBtn").addEventListener("click", () => { if (confirm("生成新世界会抹去当前未保存的进度，继续吗？")) generateWorld(document.getElementById("worldSeedInput").value); });
document.getElementById("randomSeedBtn").addEventListener("click", () => { document.getElementById("worldSeedInput").value = createRandomSeed(); });
document.getElementById("worldSeedInput").addEventListener("keydown", event => { if (event.key === "Enter") document.getElementById("newWorldBtn").click(); });
document.getElementById("saveBtn").addEventListener("click", () => saveWorld(activeSaveSlot, true));
document.getElementById("loadBtn").addEventListener("click", openArchive);
document.getElementById("closeArchiveBtn").addEventListener("click", closeArchive);
document.getElementById("archiveModal").addEventListener("click", e => { if (e.target.id === "archiveModal") closeArchive(); });
document.getElementById("saveSlots").addEventListener("click", e => {
  const button = e.target.closest("[data-save-action]"); if (!button) return;
  const slot = button.dataset.slot === "auto" ? "auto" : Number(button.dataset.slot), action = button.dataset.saveAction;
  if (action === "save") { if (!readSaveMeta(slot) || confirm(`覆盖手动槽位 ${slot} 吗？`)) saveWorld(slot, true); }
  if (action === "load" && loadWorld(slot)) closeArchive();
  if (action === "delete" && confirm(`删除${slot === "auto" ? "自动存档" : `槽位 ${slot}`}吗？此操作无法撤销。`)) { localStorage.removeItem(saveKey(slot)); refreshArchive(); showToast("存档已删除"); }
});
document.getElementById("autoSaveToggle").addEventListener("change", e => { autoSaveEnabled = e.target.checked; localStorage.setItem("realm-autosave-enabled", String(autoSaveEnabled)); });
document.getElementById("randomDisasterToggle").addEventListener("change", e => {
  randomDisastersEnabled = e.target.checked; localStorage.setItem("realm-random-disasters", String(randomDisastersEnabled));
  if (randomDisastersEnabled && nextDisasterYear <= year) scheduleNextDisaster(); updateUI();
});
document.getElementById("disasterFrequency").addEventListener("change", e => {
  disasterFrequency = disasterIntervals[e.target.value] ? e.target.value : "normal"; localStorage.setItem("realm-disaster-frequency", disasterFrequency); scheduleNextDisaster(); updateUI();
});
document.getElementById("exportSaveBtn").addEventListener("click", exportWorld);
document.getElementById("exportChronicleBtn").addEventListener("click", exportChronicle);
document.getElementById("importSaveInput").addEventListener("change", e => { importWorld(e.target.files?.[0]); e.target.value = ""; });
window.addEventListener("keydown", e => { if (e.key === "Escape") closeArchive(); });
document.getElementById("kingdomList").addEventListener("click", e => {
  const item = e.target.closest("[data-kingdom]"); if (item) inspectKingdom(Number(item.dataset.kingdom));
});
document.getElementById("tradeList").addEventListener("click", e => {
  const item = e.target.closest("[data-trade-route]"); if (item) inspectTradeRoute(Number(item.dataset.tradeRoute));
});
document.getElementById("armyList").addEventListener("click", e => {
  const item = e.target.closest("[data-army]"); if (item) inspectArmy(Number(item.dataset.army));
});
document.getElementById("governanceList").addEventListener("click", e => {
  const item = e.target.closest("[data-governance]"); if (item) inspectKingdom(Number(item.dataset.governance));
});
document.getElementById("cultureList").addEventListener("click", e => {
  const item = e.target.closest("[data-culture]"); if (item) inspectKingdom(Number(item.dataset.culture));
});
document.getElementById("diplomacyList").addEventListener("click", e => {
  const button = e.target.closest("[data-diplomacy-action]"); if (!button) return;
  interveneDiplomacy(Number(button.dataset.kingdomA), Number(button.dataset.kingdomB), button.dataset.diplomacyAction);
});
document.getElementById("selectionCard").addEventListener("click", e => {
  const technologyButton = e.target.closest("[data-tech-focus]");
  if (technologyButton && selectedKingdomId !== null) { setResearchFocus(selectedKingdomId, technologyButton.dataset.techFocus, true); return; }
  const policyButton = e.target.closest("[data-policy-domain]");
  if (policyButton && selectedKingdomId !== null) { setKingdomPolicy(selectedKingdomId, policyButton.dataset.policyDomain, policyButton.dataset.policyValue, true); return; }
  const unrestButton = e.target.closest("[data-unrest-action]");
  if (unrestButton && selectedKingdomId !== null) interveneUnrest(selectedKingdomId, unrestButton.dataset.unrestAction === "incite" ? 24 : -22);
});
canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("mousedown", e => {
  if (e.button === 2) { dragging = true; lastMouse = { x: e.clientX, y: e.clientY }; }
  if (e.button === 0) {
    painting = true; const p = screenToGrid(e.clientX, e.clientY); applyTool(p.x, p.y);
    if (selectedTool === "inspect") tutorialSignal("inspect-map");
    else { tutorialSignal("use-tool"); if (!disasterDefs[selectedTool]) spawnExperienceEffect("power", p.x, p.y, selectedTool === "water" ? "#70cbe2" : selectedTool === "fire" || selectedTool === "meteor" ? "#ed7657" : "#e8cc70"); playExperienceSound("power"); }
  }
});
window.addEventListener("mouseup", () => { dragging = false; painting = false; });
canvas.addEventListener("mousemove", e => {
  const hover = screenToGrid(e.clientX, e.clientY), hoverX = Math.floor(hover.x), hoverY = Math.floor(hover.y);
  hoveredGrid = hoverX >= 0 && hoverY >= 0 && hoverX < MAP_W && hoverY < MAP_H ? { x: hoverX, y: hoverY } : null; renderDirty = true;
  if (dragging) { camera.x += e.clientX - lastMouse.x; camera.y += e.clientY - lastMouse.y; lastMouse = { x: e.clientX, y: e.clientY }; renderDirty = true; }
  if (painting && selectedTool !== "inspect" && selectedTool !== "meteor" && !raceDefs[selectedTool] && !animalDefs[selectedTool] && !disasterDefs[selectedTool]) { const p = screenToGrid(e.clientX, e.clientY); applyTool(p.x, p.y); }
});
canvas.addEventListener("mouseleave", () => { hoveredGrid = null; renderDirty = true; });
canvas.addEventListener("wheel", e => {
  e.preventDefault(); const before = screenToGrid(e.clientX, e.clientY);
  camera.zoom = clamp(camera.zoom * (e.deltaY < 0 ? 1.12 : .89), .7, 4);
  const m = viewMetrics(), rect = canvas.getBoundingClientRect();
  camera.x += (e.clientX - rect.left) - (m.ox + before.x * m.size);
  camera.y += (e.clientY - rect.top) - (m.oy + before.y * m.size);
  renderDirty = true;
}, { passive: false });
window.addEventListener("resize", resizeCanvas);

let last = performance.now(), accumulator = 0;
function updatePerformanceDisplay(now) {
  const elapsed = now - performanceMetrics.sampleStarted;
  if (elapsed < 1000) return;
  performanceMetrics.fps = Math.round(performanceMetrics.frames * 1000 / elapsed);
  performanceMetrics.ups = Math.round(performanceMetrics.steps * 1000 / elapsed);
  document.getElementById("performanceStat").textContent = `${performanceMetrics.fps} FPS · ${performanceMetrics.ups} UPS · 模拟 ${performanceMetrics.simulationMs.toFixed(1)}ms · 绘制 ${performanceMetrics.renderMs.toFixed(1)}ms`;
  performanceMetrics.frames = 0; performanceMetrics.steps = 0; performanceMetrics.sampleStarted = now;
}
function frame(now) {
  performanceMetrics.frames++;
  const dt = Math.min(100, now - last); last = now;
  updateExperienceEffects(dt);
  if (running) {
    accumulator += dt * speed; let steps = 0;
    while (accumulator >= 80 && steps < 2) { simulationStep(); accumulator -= 80; steps++; }
    if (steps === 2) accumulator = Math.min(accumulator, 160);
  }
  if (renderDirty) { render(); renderDirty = false; }
  updatePerformanceDisplay(now); requestAnimationFrame(frame);
}
function debugSnapshot() {
  const terrain = Object.fromEntries(Object.keys(terrainColors).map(type => [type, 0]));
  for (const tile of tiles) terrain[tile.type] = (terrain[tile.type] || 0) + 1;
  const populationByRace = Object.fromEntries(Object.keys(raceDefs).map(race => [race, 0]));
  for (const person of people) populationByRace[person.race] = (populationByRace[person.race] || 0) + 1;
  const activeKingdoms = kingdoms.filter(kingdom => !kingdom.defeated);
  const diplomacy = [];
  for (let first = 0; first < activeKingdoms.length; first++) for (let second = first + 1; second < activeKingdoms.length; second++) {
    const relation = relationBetween(activeKingdoms[first].id, activeKingdoms[second].id); if (relation) diplomacy.push([activeKingdoms[first].id, activeKingdoms[second].id, relation.status, round3(relation.score), Math.round(relation.trust || 0), Math.round(relation.fear || 0), Math.round(relation.grievance || 0), relation.intent]);
  }
  return {
    seed: worldSeed, year: round3(year), ticks, terrain, population: people.length, populationByRace, animals: animalCounts(true), villages: villages.length,
    kingdoms: activeKingdoms.length, wars: activeKingdoms.reduce((sum, kingdom) => sum + Object.values(kingdom.relations || {}).filter(relation => relation.status === "war").length, 0) / 2,
    famineRealms: activeKingdoms.filter(kingdom => kingdom.famine).length, disasters: activeDisasters.map(disaster => [disaster.type, round3(disaster.x), round3(disaster.y), disaster.duration]),
    resources: activeKingdoms.map(kingdom => [kingdom.id, round3(kingdom.resources.food), round3(kingdom.resources.wood), round3(kingdom.resources.stone)]),
    technology: activeKingdoms.map(kingdom => [kingdom.id, totalTechnologyLevel(kingdom)]), diplomacy, randomState: getRandomState(),
    heroes: heroes.filter(hero => hero.status === "active").map(hero => [hero.id, hero.kingdomId, hero.level, round3(hero.renown), hero.victories]),
    worldEvents: worldEventState.history.map(entry => [entry.chain, entry.stage, entry.choice, entry.year]),
    history: { births: worldStats.births, deaths: worldStats.deaths, warsStarted: worldStats.warsStarted, warsEnded: worldStats.warsEnded, disastersTriggered: worldStats.disastersTriggered, tradeDeliveries: worldStats.tradeDeliveries }
  };
}
globalThis.RealmDebug = Object.freeze({
  generate: seed => { generateWorld(seed); return debugSnapshot(); },
  step: (count = 1) => {
    debugBatchMode = true;
    try { for (let index = 0; index < clamp(Math.floor(Number(count) || 1), 1, 20000); index++) simulationStep(); }
    finally { debugBatchMode = false; }
    return debugSnapshot();
  },
  snapshot: debugSnapshot,
  setRandomDisasters: enabled => { randomDisastersEnabled = Boolean(enabled); return randomDisastersEnabled; },
  saveData: buildSaveData,
  restore: save => { restoreWorld(structuredClone(save)); return debugSnapshot(); }
});
autoSaveEnabled = localStorage.getItem("realm-autosave-enabled") !== "false";
randomDisastersEnabled = localStorage.getItem("realm-random-disasters") !== "false";
disasterFrequency = disasterIntervals[localStorage.getItem("realm-disaster-frequency")] ? localStorage.getItem("realm-disaster-frequency") : "normal";
document.getElementById("autoSaveToggle").checked = autoSaveEnabled;
document.getElementById("randomDisasterToggle").checked = randomDisastersEnabled;
document.getElementById("disasterFrequency").value = disasterFrequency;
document.getElementById("worldSeedInput").value = createRandomSeed();
initializeExperienceUI(); resizeCanvas(); generateWorld(document.getElementById("worldSeedInput").value); maybeStartTutorial(); requestAnimationFrame(frame);
