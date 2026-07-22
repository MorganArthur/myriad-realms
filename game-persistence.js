"use strict";

// 持久化层：v22 存档、旧版本迁移、槽位与导入导出。

const saveKey = slot => `realm-save-v3-${slot}`;
const round3 = value => Math.round((value || 0) * 1000) / 1000;

function buildSaveData() {
  const worldName = document.getElementById("worldName").textContent;
  let activeKingdomCount = 0; for (const kingdom of kingdoms) if (!kingdom.defeated) activeKingdomCount++;
  return {
    version: 22, savedAt: new Date().toISOString(),
    meta: { worldName, seed: worldSeed, rules: activeWorldRuleIds(), difficulty: worldRuleDifficulty(), challengeScore: worldChallengeScore(), year: Math.floor(year), population: people.length, animals: animals.length, kingdoms: activeKingdomCount, tradeRoutes: tradeRoutes.length, caravans: caravans.length, armies: armies.length, heroes: heroes.filter(hero => hero.status === "active").length, worldEvents: worldEventState.history.length, dynasties: kingdoms.filter(kingdom => !kingdom.defeated && kingdom.dynasty?.rulerId).length, politicalSessions: kingdoms.reduce((sum, kingdom) => sum + (kingdom.politics?.sessions || 0), 0), politicalResolutions: worldStats.politicalResolutions || 0, ruins: legacySites.filter(site => site.origin !== "historical").length, historicalScars: legacySites.filter(site => site.origin === "historical").length, artifacts: artifacts.length, wonders: wonders.filter(wonder => ["complete", "damaged"].includes(wonder.status)).length, crisesResolved: worldStats.crisesResolved || 0, crisisLegacies: legacyState.crisisLegacies?.length || 0, challengesCompleted: worldStats.challengesCompleted || 0, successions: worldStats.successions || 0, marriages: worldStats.marriages || 0, season: climate.season, weather: climate.weather, renown: worldProgress.renown, achievements: Object.keys(worldProgress.achievements).length, technologyLevels: kingdoms.reduce((sum, kingdom) => sum + totalTechnologyLevel(kingdom), 0), highestEra: Math.max(0, ...kingdoms.map(kingdom => eraIndexOf(kingdom.development?.era))), completedAmbitions: kingdoms.reduce((sum, kingdom) => sum + (kingdom.development?.completedAmbitions?.length || 0), 0) },
    worldName, worldSeed, year, ticks, tiles: tiles.map(t => [t.type, t.fertility, t.biomass, t.fire || 0, t.owner ?? -1, t.moisture, t.temperature]), climate,
    people, animals, villages, kingdoms, events, chronicle, worldStats, worldProgress, activeDisasters, tradeRoutes, caravans, armies, heroes, worldEventState, legacySites, artifacts, wonders, legacyState, worldRuleState, nextPersonId, nextAnimalId, nextVillageId, nextStructureId, nextTradeRouteId, nextCaravanId, nextArmyId, nextHeroId, nextLegacySiteId, nextArtifactId, nextWonderId, nextDisasterId, nextDisasterYear,
    randomState: getRandomState(),
    settings: { camera, speed, selectedTool, brushSize, randomDisastersEnabled, disasterFrequency, worldSeed, mapMode, audioEnabled }
  };
}

function saveWorld(slot = activeSaveSlot, manual = true) {
  try {
    const data = buildSaveData(); localStorage.setItem(saveKey(slot), JSON.stringify(data));
    if (slot !== "auto") activeSaveSlot = Number(slot);
    document.getElementById("saveStatus").textContent = `${slot === "auto" ? "自动保存" : `槽位 ${slot}`} · 纪元 ${Math.floor(year)}`;
    if (manual) showToast(slot === "auto" ? "自动存档已更新" : `世界已保存至槽位 ${slot}`);
    if (!document.getElementById("archiveModal").hidden) refreshArchive();
    return true;
  } catch {
    if (manual) showToast("存档失败：浏览器空间不足"); return false;
  }
}

function scheduleAutoSave() {
  if (autoSavePending) return; autoSavePending = true;
  const run = () => { autoSavePending = false; saveWorld("auto", false); };
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 1500 }); else setTimeout(run, 0);
}

function normalizeWorldData(sourceVersion = 1) {
  worldStats = { ...createWorldStats(), ...(worldStats || {}) };
  for (const key of Object.keys(createWorldStats())) worldStats[key] = Math.max(0, Number(worldStats[key]) || 0);
  worldProgress = { ...createWorldProgress(), ...(worldProgress || {}) };
  worldProgress.achievements = worldProgress.achievements && typeof worldProgress.achievements === "object" ? worldProgress.achievements : {};
  worldProgress.completedGoals = worldProgress.completedGoals && typeof worldProgress.completedGoals === "object" ? worldProgress.completedGoals : {};
  worldProgress.renown = Math.max(0, Number(worldProgress.renown) || 0);
  chronicle = (Array.isArray(chronicle) && chronicle.length ? chronicle : events).filter(entry => entry && entry.text).slice(0, 240).map(entry => ({ year: Math.max(1, Number(entry.year) || 1), text: cleanText(entry.text), kind: ["event", "achievement", "goal", "hero", "world-event", "era", "ambition", "dynasty", "relationship", "politics", "legacy", "wonder", "crisis", "challenge"].includes(entry.kind) ? entry.kind : "event" }));
  nextStructureId = Math.max(1, Number(nextStructureId) || 1);
  nextTradeRouteId = Math.max(1, Number(nextTradeRouteId) || 1); nextCaravanId = Math.max(1, Number(nextCaravanId) || 1); nextArmyId = Math.max(1, Number(nextArmyId) || 1);
  const usedStructureIds = new Set();
  climate ||= {};
  climate.season = seasonDefs[climate.season] ? climate.season : seasonForYear(); climate.weather = weatherDefs[climate.weather] ? climate.weather : "clear";
  const climateSeason = seasonDefs[climate.season], climateWeather = weatherDefs[climate.weather];
  climate.seasonProgress = clamp(Number.isFinite(Number(climate.seasonProgress)) ? Number(climate.seasonProgress) : ((year - 1) % 1 + 1) % 1, 0, 1); climate.temperature = Number.isFinite(Number(climate.temperature)) ? Number(climate.temperature) : climateSeason.temperature + climateWeather.temperature; climate.rainfall = clamp(Number.isFinite(Number(climate.rainfall)) ? Number(climate.rainfall) : climateSeason.rainfall + climateWeather.rainfall, 0, 1); climate.weatherUntil = Number(climate.weatherUntil) || year + .8; climate.nextWeatherYear = Number(climate.nextWeatherYear) || climate.weatherUntil;
  for (let position = 0; position < tiles.length; position++) {
    const tile = tiles[position], y = Math.floor(position / MAP_W), latitudeTemperature = climate.temperature + 10 - Math.abs(y / (MAP_H - 1) - .5) * 28;
    tile.biomass ??= tile.type === "forest" ? .8 : tile.type === "grass" ? .6 : tile.type === "sand" ? .1 : 0;
    tile.moisture = clamp(Number.isFinite(Number(tile.moisture)) ? Number(tile.moisture) : tile.type === "forest" ? .7 : tile.type === "grass" ? .52 : .2, 0, 1);
    tile.temperature = clamp(Number.isFinite(Number(tile.temperature)) ? Number(tile.temperature) : latitudeTemperature - (tile.type === "mountain" ? 8 : 0), -35, 55);
  }
  for (const kingdom of kingdoms) { kingdom.race ||= ["human", "elf", "dwarf", "orc"][kingdom.id % 4]; normalizeCultureTechnology(kingdom); normalizeDevelopmentState(kingdom); }
  for (const person of people) {
    person.race ||= getKingdom(person.kingdom)?.race || "human"; person.role ||= "civilian";
    person.profession = person.role === "soldier" ? "soldier" : person.age < 16 ? "child" : professionDefs[person.profession] && person.profession !== "soldier" ? person.profession : "laborer";
    person.previousProfession = professionDefs[person.previousProfession] && person.previousProfession !== "soldier" ? person.previousProfession : null;
    person.unitType = person.role === "soldier" && unitDefs[person.unitType] ? person.unitType : person.role === "soldier" ? "militia" : null;
    person.isGeneral = person.role === "soldier" && Boolean(person.isGeneral); person.leadership = person.role === "soldier" ? clamp(Number(person.leadership) || 1, .8, 1.4) : 1;
    person.socialClass = socialClassDefs[person.socialClass] ? person.socialClass : socialClassFor(person);
    person.happiness = clamp(Number(person.happiness) || 60, 0, 100);
    const savedNeeds = person.needs || {};
    person.needs = {
      nutrition: clamp(Number(savedNeeds.nutrition) || person.food || 60, 0, 110), shelter: clamp(Number(savedNeeds.shelter) || (person.village ? 70 : 25), 0, 100),
      safety: clamp(Number(savedNeeds.safety) || 65, 0, 100), health: clamp(Number(savedNeeds.health) || person.health || 80, 0, 100)
    };
    person.attackCooldown ||= 0; person.cooldown ??= randi(0, 10); person.blessed ??= false; person.plague = Math.max(0, Number(person.plague) || 0); person.dead = false;
    normalizePersonIdentity(person);
  }
  for (const animal of animals) {
    if (!animalDefs[animal.species]) animal.species = "rabbit";
    const def = animalDefs[animal.species];
    animal.health ??= def.health; animal.hunger ??= 70; animal.cooldown ??= randi(1, 8); animal.attackCooldown ||= 0; animal.dead = false;
  }
  for (const village of villages) {
    village.hp ??= 160; village.buildCooldown ??= randi(6, 12);
    const legacyCounts = { hall: 1, house: 2, farm: 1, lumber: 0, quarry: 0, barracks: 0, road: 0, wall: 0, market: 0, dock: 0, warehouse: 0, temple: 0, ...(village.buildings || {}) };
    if (sourceVersion < 6 || !Array.isArray(village.structures) || !village.structures.length) seedVillageStructures(village, legacyCounts);
    else {
      village.structures = village.structures.filter(structure => structure && buildingDefs[structure.type]).map(structure => {
        const def = buildingDefs[structure.type], savedId = Number(structure.id);
        let id = Number.isFinite(savedId) && savedId > 0 && !usedStructureIds.has(savedId) ? savedId : nextStructureId++;
        usedStructureIds.add(id); nextStructureId = Math.max(nextStructureId, id + 1);
        const maxHp = clamp(Number(structure.maxHp) || def.maxHp, Math.max(1, def.maxHp * .5), def.maxHp * 2);
        return { ...structure, id, x: clamp(Math.round(Number(structure.x) || village.x), 0, MAP_W - 1), y: clamp(Math.round(Number(structure.y) || village.y), 0, MAP_H - 1), hp: clamp(Number(structure.hp) || maxHp, 1, maxHp), maxHp, builtYear: Math.max(1, Number(structure.builtYear) || Math.floor(year)) };
      });
      if (!village.structures.some(structure => structure.type === "hall")) addStructureEntity(village, "hall", { x: village.x, y: village.y });
      syncBuildingCounts(village);
    }
    if (!village.inventory || sourceVersion < 7) {
      const realm = getKingdom(village.kingdom), realmVillageCount = Math.max(1, villages.filter(candidate => candidate.kingdom === village.kingdom).length);
      village.inventory = { food: (realm?.resources.food || 70) / realmVillageCount * .55, wood: (realm?.resources.wood || 45) / realmVillageCount * .55, stone: (realm?.resources.stone || 18) / realmVillageCount * .55 };
    }
    const hasCompleteMarketSnapshot = sourceVersion >= 14 && village.demand && village.supply && village.prices && village.workforce;
    village.demand = { food: 0, wood: 0, stone: 0, ...(village.demand || {}) }; village.supply = { food: 0, wood: 0, stone: 0, ...(village.supply || {}) }; village.prices = { food: 1, wood: 1, stone: 1, ...(village.prices || {}) };
    village.workforce = hasCompleteMarketSnapshot ? village.workforce : professionCounts(people.filter(person => !person.dead && person.village === village.id)); village.averageHappiness = Number(village.averageHappiness) || 60; village.unrest = clamp(Number.isFinite(Number(village.unrest)) ? Number(village.unrest) : 8, 0, 100);
    if (!hasCompleteMarketSnapshot) recalculateVillageMarket(village);
  }
  for (const kingdom of kingdoms) {
    kingdom.name = cleanText(kingdom.name) || "无名王国";
    kingdom.resources = { food: 70, wood: 45, stone: 18, ...(kingdom.resources || {}) };
    kingdom.relations ||= {}; kingdom.warWeariness ||= 0; kingdom.defeated ||= false;
    kingdom.famineLevel = clamp(Number(kingdom.famineLevel) || 0, 0, 100); kingdom.famine = Boolean(kingdom.famine && kingdom.famineLevel >= 5); kingdom.famineSince = kingdom.famine ? Number(kingdom.famineSince) || Math.floor(year) : null;
    kingdom.government = governmentDefs[kingdom.government] ? kingdom.government : ({ human: "monarchy", elf: "council", dwarf: "republic", orc: "clan" }[kingdom.race] || "monarchy");
    const savedPolicies = kingdom.policies || {};
    kingdom.policies = {
      tax: policyDefs.tax[savedPolicies.tax] ? savedPolicies.tax : "standard",
      welfare: policyDefs.welfare[savedPolicies.welfare] ? savedPolicies.welfare : "balanced",
      military: policyDefs.military[savedPolicies.military] ? savedPolicies.military : kingdom.race === "orc" ? "conquest" : "defense"
    };
    kingdom.treasury = clamp(Number.isFinite(Number(kingdom.treasury)) ? Number(kingdom.treasury) : 35, 0, 99999); kingdom.legitimacy = clamp(Number.isFinite(Number(kingdom.legitimacy)) ? Number(kingdom.legitimacy) : 68, 0, 100); kingdom.unrest = clamp(Number.isFinite(Number(kingdom.unrest)) ? Number(kingdom.unrest) : 8, 0, 100);
    kingdom.welfareCoverage = clamp(Number.isFinite(Number(kingdom.welfareCoverage)) ? Number(kingdom.welfareCoverage) : 1, 0, 1); kingdom.lastTaxRevenue = Math.max(0, Number(kingdom.lastTaxRevenue) || 0); kingdom.lastPolicyYear = Number(kingdom.lastPolicyYear) || Math.floor(year); kingdom.lastReformYear = Number(kingdom.lastReformYear) || 0; kingdom.policyLockedUntil = Number(kingdom.policyLockedUntil) || 0; kingdom.rebellionCooldownUntil = Number(kingdom.rebellionCooldownUntil) || 0;
  }
  normalizeDynastyWorld(sourceVersion);
  normalizePoliticsWorld(sourceVersion);
  normalizeLegacyWorld(sourceVersion);
  for (const village of villages) village.name = cleanText(village.name) || "无名聚落";
  for (const event of events) { event.text = cleanText(event.text); event.kind = ["event", "achievement", "goal", "hero", "world-event", "era", "ambition", "dynasty", "relationship", "politics", "legacy", "wonder", "crisis", "challenge"].includes(event.kind) ? event.kind : "event"; }
  for (let i = 0; i < kingdoms.length; i++) for (let j = i + 1; j < kingdoms.length; j++) {
    if (!relationBetween(kingdoms[i].id, kingdoms[j].id)) setRelation(kingdoms[i].id, kingdoms[j].id, "peace", randi(-20, 25), true);
    else { normalizeDiplomaticRelation(relationBetween(kingdoms[i].id, kingdoms[j].id)); normalizeDiplomaticRelation(relationBetween(kingdoms[j].id, kingdoms[i].id)); }
  }
  const usedRouteIds = new Set();
  tradeRoutes = (Array.isArray(tradeRoutes) ? tradeRoutes : []).filter(route => route && getVillage(route.fromVillage) && getVillage(route.toVillage) && route.fromVillage !== route.toVillage).slice(0, 24).map(route => {
    const savedId = Number(route.id); let id = Number.isFinite(savedId) && savedId > 0 && !usedRouteIds.has(savedId) ? savedId : nextTradeRouteId++;
    usedRouteIds.add(id); nextTradeRouteId = Math.max(nextTradeRouteId, id + 1);
    const from = getVillage(route.fromVillage), to = getVillage(route.toVillage), mode = route.mode === "sea" && buildingCount(from, "dock") && buildingCount(to, "dock") ? "sea" : "land";
    let path = route.mode === mode && Array.isArray(route.path) ? route.path.filter(point => point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y))).map(point => ({ x: clamp(Math.round(Number(point.x)), 0, MAP_W - 1), y: clamp(Math.round(Number(point.y)), 0, MAP_H - 1) })) : [];
    if (path.length < 2) path = findTradePath(from, to, mode) || [];
    return { ...route, id, mode, path, status: "active", createdYear: Math.max(1, Number(route.createdYear) || Math.floor(year)), deliveries: Math.max(0, Number(route.deliveries) || 0), delivered: Math.max(0, Number(route.delivered) || 0), losses: Math.max(0, Number(route.losses) || 0), lastDispatchTick: Number(route.lastDispatchTick) || ticks, lastDeliveryYear: route.lastDeliveryYear ? Number(route.lastDeliveryYear) : null, blockadedSince: route.blockadedSince ? Number(route.blockadedSince) : null };
  }).filter(route => route.path.length >= 2);
  for (const route of tradeRoutes) route.status = routeStatus(route);
  const routeIds = new Set(tradeRoutes.map(route => route.id)), usedCaravanIds = new Set();
  caravans = (Array.isArray(caravans) ? caravans : []).filter(caravan => caravan && routeIds.has(caravan.routeId) && tradeResourceDefs[caravan.resource]).slice(0, 40).map(caravan => {
    const route = tradeRoutes.find(candidate => candidate.id === caravan.routeId), savedId = Number(caravan.id);
    let id = Number.isFinite(savedId) && savedId > 0 && !usedCaravanIds.has(savedId) ? savedId : nextCaravanId++;
    usedCaravanIds.add(id); nextCaravanId = Math.max(nextCaravanId, id + 1);
    return { ...caravan, id, fromVillage: getVillage(caravan.fromVillage) ? caravan.fromVillage : route.fromVillage, toVillage: getVillage(caravan.toVillage) ? caravan.toVillage : route.toVillage, resource: caravan.resource, amount: Math.max(.1, Number(caravan.amount) || 1), returnResource: tradeResourceDefs[caravan.returnResource] ? caravan.returnResource : null, returnAmount: Math.max(0, Number(caravan.returnAmount) || 0), x: clamp(Number(caravan.x) || route.path[0].x, 0, MAP_W - 1), y: clamp(Number(caravan.y) || route.path[0].y, 0, MAP_H - 1), pathIndex: clamp(Math.floor(Number(caravan.pathIndex) || 0), 0, route.path.length - 1), segmentProgress: Math.max(0, Number(caravan.segmentProgress) || 0), hp: clamp(Number(caravan.hp) || 100, 1, 100), status: "traveling", departedYear: Number(caravan.departedYear) || year };
  });
  const soldierIds = new Set(people.filter(person => person.role === "soldier" && !person.dead).map(person => person.id)), usedArmyIds = new Set(), assignedSoldiers = new Set();
  armies = (Array.isArray(armies) ? armies : []).filter(army => army && getKingdom(army.kingdomId) && !getKingdom(army.kingdomId).defeated).slice(0, 60).map(army => {
    const savedId = Number(army.id); let id = Number.isFinite(savedId) && savedId > 0 && !usedArmyIds.has(savedId) ? savedId : nextArmyId++;
    usedArmyIds.add(id); nextArmyId = Math.max(nextArmyId, id + 1);
    const ids = [...new Set(Array.isArray(army.soldierIds) ? army.soldierIds.map(Number) : [])].filter(personId => soldierIds.has(personId) && !assignedSoldiers.has(personId) && people.find(person => person.id === personId)?.kingdom === army.kingdomId);
    for (const personId of ids) assignedSoldiers.add(personId);
    const rally = getVillage(army.rallyVillageId)?.kingdom === army.kingdomId ? army.rallyVillageId : armyRallyVillage(army.kingdomId)?.id || null;
    const generalId = ids.includes(Number(army.generalId)) ? Number(army.generalId) : null;
    return { ...army, id, name: cleanText(army.name) || `${getKingdom(army.kingdomId).name}·军团`, soldierIds: ids, generalId, rallyVillageId: rally, targetVillageId: getVillage(army.targetVillageId) ? army.targetVillageId : null, x: clamp(Number(army.x) || getVillage(rally)?.x || 0, 0, MAP_W - 1), y: clamp(Number(army.y) || getVillage(rally)?.y || 0, 0, MAP_H - 1), morale: clamp(Number(army.morale) || 70, 0, 100), supply: Math.max(0, Number(army.supply) || 0), maxSupply: Math.max(30, Number(army.maxSupply) || 60), status: ["assembling", "garrison", "advance", "battle", "siege", "retreat"].includes(army.status) ? army.status : "garrison", createdYear: Math.max(1, Number(army.createdYear) || Math.floor(year)), casualties: Math.max(0, Number(army.casualties) || 0), siegeProgress: Math.max(0, Number(army.siegeProgress) || 0) };
  }).filter(army => army.soldierIds.length);
  reorganizeArmies(true);
  nextPersonId ||= Math.max(0, ...people.map(p => p.id)) + 1;
  nextAnimalId ||= Math.max(0, ...animals.map(a => a.id)) + 1;
  nextVillageId ||= Math.max(0, ...villages.map(v => v.id)) + 1;
  nextStructureId = Math.max(nextStructureId, 1, ...villages.flatMap(village => village.structures || []).map(structure => structure.id + 1));
  nextTradeRouteId = Math.max(nextTradeRouteId, 1, ...tradeRoutes.map(route => route.id + 1)); nextCaravanId = Math.max(nextCaravanId, 1, ...caravans.map(caravan => caravan.id + 1)); nextArmyId = Math.max(nextArmyId, 1, ...armies.map(army => army.id + 1));
  nextDisasterId = Math.max(1, Number(nextDisasterId) || 1);
  activeDisasters = activeDisasters.filter(disaster => disaster && disasterDefs[disaster.type] && Number.isFinite(Number(disaster.x)) && Number.isFinite(Number(disaster.y))).slice(0, 12).map(disaster => {
    const def = disasterDefs[disaster.type], intensity = clamp(Number(disaster.intensity) || 2, 1, 6);
    const duration = clamp(Number(disaster.duration) || def.duration, 1, def.duration + 500);
    const savedId = Number(disaster.id), id = Number.isFinite(savedId) && savedId > 0 ? savedId : nextDisasterId++;
    return {
      ...disaster, id, x: clamp(Number(disaster.x), 0, MAP_W - 1), y: clamp(Number(disaster.y), 0, MAP_H - 1), intensity,
      radius: clamp(Number(disaster.radius) || def.radius + Math.floor(intensity * .75), 1, 20), duration,
      maxDuration: Math.max(duration, Number(disaster.maxDuration) || duration), age: Math.max(0, Number(disaster.age) || 0),
      dx: disaster.type === "tornado" ? Number(disaster.dx) || .1 : disaster.dx, dy: disaster.type === "tornado" ? Number(disaster.dy) || .06 : disaster.dy
    };
  });
  nextDisasterId = Math.max(Number(nextDisasterId) || 1, ...activeDisasters.map(disaster => disaster.id + 1));
  if (!Number.isFinite(nextDisasterYear) || nextDisasterYear <= 0) scheduleNextDisaster();
  if (sourceVersion < 3 && animals.length === 0) {
    populateWildlife(habitableTileIndices());
  }
  if (sourceVersion < 10) {
    const arrivals = { boar: 8, fox: 4 };
    for (const [species, target] of Object.entries(arrivals)) {
      let count = animals.filter(animal => animal.species === species).length;
      for (let attempt = 0; count < target && attempt < target * 80; attempt++) {
        const newcomer = spawnAnimal(randi(2, MAP_W - 3), randi(2, MAP_H - 3), species);
        if (newcomer) { newcomer.hunger = 88; count++; }
      }
    }
    addEvent("野猪与赤狐种群迁入大陆，食物网出现新的竞争关系。");
  }
  if (sourceVersion < 12) {
    for (const kingdom of kingdoms) if (!kingdom.defeated) seedLegacyCultureTechnology(kingdom);
    addEvent("各文明开始整理传统与知识，文化和科技进入可记录的时代。");
  }
  if (sourceVersion < 15) addEvent("文明开始记录时代演进，并为跨越数百年的伟业立下长期野心。", "era");
  if (sourceVersion < 16) addEvent("姓名、婚姻与血缘被写入谱牒，统治者和继承法开始塑造国家命运。", "dynasty");
  if (sourceVersion < 17) addEvent("社会阶层开始组织政治派系，议会席位与政策辩论进入国家史册。", "politics");
  if (sourceVersion < 18) addEvent("古代遗迹重新显露，神器、奇观工程、全球危机与轮换挑战被写入世界史。", "legacy");
  if (sourceVersion < 19) addEvent("十二条大型事件链开始记录参与文明、路线互斥、延迟后果与人物记忆。", "world-event");
  if (sourceVersion < 20) addEvent("战争、天灾与英雄开始留下可考证和重建的历史伤痕，神器与奇观也会流转、受损和修复。", "legacy");
  if (sourceVersion < 21) addEvent("六类后期世界危机开始留下永久制度、生态与地形后果。", "crisis");
  if (sourceVersion < 22) addEvent("世界开始记录可组合挑战规则、分享码与跨世界成绩。", "challenge");
  rebuildWorldIndexes();
  worldStats.villagesFounded = Math.max(worldStats.villagesFounded, villages.length);
  worldStats.buildingsConstructed = Math.max(worldStats.buildingsConstructed, structureTotal());
  worldStats.tradeDeliveries = Math.max(worldStats.tradeDeliveries, tradeRoutes.reduce((sum, route) => sum + (route.deliveries || 0), 0));
  worldStats.tradeVolume = Math.max(worldStats.tradeVolume, tradeRoutes.reduce((sum, route) => sum + (route.delivered || 0), 0));
  evaluateWorldProgress(sourceVersion >= 12);
}

function restoreWorld(save, slot = activeSaveSlot) {
  if (!save || !Array.isArray(save.tiles) || !Array.isArray(save.people) || !Array.isArray(save.villages) || !Array.isArray(save.kingdoms)) throw new Error("invalid save");
  if (save.tiles.length !== MAP_W * MAP_H || save.people.length > 5000 || (save.animals?.length || 0) > 5000) throw new Error("unsupported save size");
  worldSeed = normalizeSeed(save.worldSeed || save.settings?.worldSeed || save.meta?.seed || `legacy-${save.worldName || save.meta?.worldName || "world"}-${save.savedAt || save.year || 1}`);
  if (!restoreRandomState(save.randomState)) setSeed(worldSeed);
  tiles = save.tiles.map(t => Array.isArray(t) ? { type: t[0], fertility: t[1], biomass: t[2], fire: t[3], owner: t[4], moisture: t[5], temperature: t[6] } : t);
  people = save.people; animals = save.animals || []; villages = save.villages; kingdoms = save.kingdoms; events = save.events || []; chronicle = save.chronicle || []; worldStats = save.worldStats || createWorldStats(); worldProgress = save.worldProgress || createWorldProgress(); activeDisasters = Array.isArray(save.activeDisasters) ? save.activeDisasters : []; tradeRoutes = Array.isArray(save.tradeRoutes) ? save.tradeRoutes : []; caravans = Array.isArray(save.caravans) ? save.caravans : []; armies = Array.isArray(save.armies) ? save.armies : []; legacySites = Array.isArray(save.legacySites) ? save.legacySites : []; artifacts = Array.isArray(save.artifacts) ? save.artifacts : []; wonders = Array.isArray(save.wonders) ? save.wonders : []; legacyState = save.legacyState || createLegacyState(); worldRuleState = save.worldRuleState || createWorldRuleState(); indexesReady = false;
  year = Number(save.year) || 1; ticks = Number(save.ticks) || 0; climate = save.climate || {}; nextPersonId = save.nextPersonId; nextAnimalId = save.nextAnimalId; nextVillageId = save.nextVillageId; nextStructureId = save.nextStructureId; nextTradeRouteId = save.nextTradeRouteId; nextCaravanId = save.nextCaravanId; nextArmyId = save.nextArmyId; nextLegacySiteId = save.nextLegacySiteId; nextArtifactId = save.nextArtifactId; nextWonderId = save.nextWonderId; nextDisasterId = save.nextDisasterId; nextDisasterYear = Number(save.nextDisasterYear);
  const settings = save.settings || {};
  camera = settings.camera || { x: 0, y: 0, zoom: 1 }; speed = settings.speed || 1; selectedTool = settings.selectedTool || "inspect"; brushSize = settings.brushSize || 2;
  randomDisastersEnabled = settings.randomDisastersEnabled ?? randomDisastersEnabled; disasterFrequency = disasterIntervals[settings.disasterFrequency] ? settings.disasterFrequency : disasterFrequency;
  normalizeExperienceState(save.heroes, save.nextHeroId, save.worldEventState); normalizeWorldRuleState(worldRuleState); normalizeWorldData(save.version || 1);
  if ((save.version || 1) < 14 && heroes.length === 0) heroStep(true);
  // 迁移与完整性修复可能需要补默认值，但不应消耗存档时间线的随机序列。
  if (save.randomState) restoreRandomState(save.randomState);
  selectedKingdomId = null; selectedTradeRouteId = null; selectedArmyId = null; selectedHeroId = null; selectedLegacyId = null; setRunning(false, false); lastAutoSaveYear = year;
  document.getElementById("worldName").textContent = cleanText(save.worldName || save.meta?.worldName) || "无名世界";
  document.getElementById("worldSeedInput").value = worldSeed; document.getElementById("worldSeedStat").textContent = `种子 ${worldSeed}`; renderWorldRuleControls();
  document.querySelectorAll(".speed-btn").forEach(b => b.classList.toggle("active", Number(b.dataset.speed) === speed));
  document.querySelectorAll(".tool").forEach(b => b.classList.toggle("active", b.dataset.tool === selectedTool));
  document.getElementById("brushSize").value = brushSize; document.getElementById("brushValue").textContent = brushSize;
  document.getElementById("randomDisasterToggle").checked = randomDisastersEnabled; document.getElementById("disasterFrequency").value = disasterFrequency;
  audioEnabled = settings.audioEnabled ?? audioEnabled; setMapMode(settings.mapMode || mapMode); const audioButton = document.getElementById("audioBtn"); if (audioButton) audioButton.textContent = audioEnabled ? "🔊" : "🔇"; renderActiveWorldEvent(); renderLegacyChoiceModal();
  if (slot !== "auto") activeSaveSlot = Number(slot) || activeSaveSlot;
  updateUI(); render();
}

function loadWorld(slot = activeSaveSlot) {
  let raw = localStorage.getItem(saveKey(slot));
  if (!raw && slot === 1) raw = localStorage.getItem("realm-save");
  if (!raw) { showToast("这个槽位还是空的"); return false; }
  try {
    const save = JSON.parse(raw); restoreWorld(save, slot);
    document.getElementById("saveStatus").textContent = `${slot === "auto" ? "自动存档" : `槽位 ${slot}`} · 纪元 ${Math.floor(year)}`;
    showToast("世界重新苏醒"); return true;
  } catch { showToast("存档损坏或版本不兼容"); return false; }
}

function readSaveMeta(slot) {
  const raw = localStorage.getItem(saveKey(slot)); if (!raw) return null;
  try { const save = JSON.parse(raw); return { ...save.meta, savedAt: save.savedAt, version: save.version }; } catch { return { corrupt: true }; }
}

function refreshArchive() {
  const slots = ["auto", 1, 2, 3];
  document.getElementById("saveSlots").innerHTML = slots.map(slot => {
    const meta = readSaveMeta(slot), title = slot === "auto" ? "自动存档" : `手动槽位 ${slot}`;
    const description = meta?.corrupt ? "存档数据损坏" : meta ? `${cleanText(meta.worldName)} · 纪元 ${Number(meta.year) || 1} · ${Number(meta.population) || 0} 人 · 难度 ${Number(meta.difficulty) || 0} · ${new Date(meta.savedAt).toLocaleString()}` : "空槽位";
    const saveAction = slot === "auto" ? "" : `<button data-save-action="save" data-slot="${slot}">保存</button>`;
    const loadAction = meta ? `<button data-save-action="load" data-slot="${slot}">读取</button><button class="delete-slot" data-save-action="delete" data-slot="${slot}">删除</button>` : "";
    return `<article class="save-slot ${slot === "auto" ? "autosave" : ""}"><div><h4>${title}</h4><p>${description}</p></div><div class="slot-actions">${saveAction}${loadAction}</div></article>`;
  }).join(""); renderCrossWorldArchive();
}

function openArchive() {
  if (running) setRunning(false);
  refreshArchive(); document.getElementById("archiveModal").hidden = false;
}
function closeArchive() { document.getElementById("archiveModal").hidden = true; }

function exportWorld() {
  const data = JSON.stringify(buildSaveData()); const blob = new Blob([data], { type: "application/json" }), url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = `${document.getElementById("worldName").textContent}-纪元${Math.floor(year)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); showToast("世界档案已导出");
}

function exportChronicle() {
  const title = document.getElementById("worldName").textContent, lines = [...chronicle].reverse().map(entry => `纪元 ${entry.year}　${entry.text}`);
  const header = `${title} · 世界编年史\n当前纪元：${Math.floor(year)}　世界声望：${Math.floor(worldProgress.renown)}\n\n`;
  const blob = new Blob([header + lines.join("\n")], { type: "text/plain;charset=utf-8" }), url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = `${title}-世界编年史.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); showToast("世界编年史已导出");
}

async function importWorld(file) {
  if (!file) return;
  try { const save = JSON.parse(await file.text()); restoreWorld(save, activeSaveSlot); saveWorld(activeSaveSlot, false); closeArchive(); showToast("外部世界已导入"); }
  catch { showToast("无法导入：文件不是有效存档"); }
}
