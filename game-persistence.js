"use strict";

// 存档只记录核心世界状态；载入旧版时会主动丢弃已经退役的复杂系统字段。
(() => {
  const VERSION = 23, PREFIX = "myriad-realms-save-v23-", SETTINGS_KEY = "myriad-realms-save-settings-v23";
  const config = globalThis.RealmConfig, engine = globalThis.WorldEngine;
  const allowedTerrain = new Set(["deepWater", "water", "sand", "grass", "forest", "hill", "mountain", "snow", "scorched"]);
  const allowedBuildings = new Set(Object.keys(config.buildings));
  const number = (value, fallback = 0, minimum = -Infinity, maximum = Infinity) => engine.clamp(Number.isFinite(Number(value)) ? Number(value) : fallback, minimum, maximum);
  const text = (value, fallback = "") => engine.cleanText(value || fallback);
  const clone = value => JSON.parse(JSON.stringify(value));
  const id = (value, fallback) => Math.max(1, Math.floor(number(value, fallback, 1, 1e9)));
  const realmId = (value, fallback = 0) => Math.max(0, Math.floor(number(value, fallback, 0, 1e9)));

  function cleanTile(tile, index) {
    const legacy = Array.isArray(tile), source = legacy ? { terrain: tile[0], fertility: tile[1], fire: tile[3], kingdomId: Number(tile[4]) >= 0 ? tile[4] : null, moisture: tile[5] } : tile, x = index % config.map.width, y = Math.floor(index / config.map.width), legacyTerrain = source?.type, terrain = allowedTerrain.has(source?.terrain) ? source.terrain : allowedTerrain.has(legacyTerrain) ? legacyTerrain : "grass";
    return { x, y, terrain, height: number(source?.height, { deepWater: .2, water: .35, sand: .42, grass: .52, forest: .55, hill: .68, mountain: .78, snow: .88, scorched: .5 }[terrain] || .5, 0, 1), fertility: number(source?.fertility, .5, 0, 1), moisture: number(source?.moisture, .5, 0, 1), dryness: number(source?.dryness, 0, 0, 1), fire: number(source?.fire, 0, 0, 100), kingdomId: source?.kingdomId == null && source?.owner == null ? null : number(source?.kingdomId ?? source?.owner, -1) < 0 ? null : realmId(source?.kingdomId ?? source?.owner) };
  }
  function cleanPerson(person, index) {
    const race = Object.hasOwn(config.races, person?.race) ? person.race : "human";
    return { id: id(person?.id, index + 1), name: text(person?.name || `${person?.givenName || ""}${person?.surname || ""}`, `${config.races[race].name}${index + 1}`), race, x: number(person?.x, 0, 0, config.map.width - .001), y: number(person?.y, 0, 0, config.map.height - .001), age: number(person?.age, 18, 0, 300), health: number(person?.health, 100, 0, 100), happiness: number(person?.happiness, 65, 0, 100), kingdomId: person?.kingdomId == null && person?.kingdom == null ? null : realmId(person.kingdomId ?? person.kingdom), villageId: person?.villageId == null && person?.village == null ? null : id(person.villageId ?? person.village, 1), dead: false };
  }
  function cleanAnimal(animal, index) {
    const species = Object.hasOwn(config.animals, animal?.species) ? animal.species : "rabbit";
    return { id: id(animal?.id, index + 1), species, x: number(animal?.x, 0, 0, config.map.width - .001), y: number(animal?.y, 0, 0, config.map.height - .001), age: number(animal?.age, 1, 0, 100), health: number(animal?.health, 100, 0, 100), hunger: number(animal?.hunger, 0, 0, 100), dead: false };
  }
  function cleanStructure(structure, index) {
    if (!allowedBuildings.has(structure?.type)) return null;
    const legacyHealth = Number(structure?.maxHp) > 0 ? Number(structure.hp) / Number(structure.maxHp) * 100 : structure?.hp;
    return { id: id(structure?.id, index + 1), type: structure.type, x: number(structure?.x, 0, 0, config.map.width - 1), y: number(structure?.y, 0, 0, config.map.height - 1), health: number(structure?.health ?? legacyHealth, 100, 1, 100) };
  }
  function cleanVillage(village, index) {
    return { id: id(village?.id, index + 1), name: text(village?.name, `聚落 ${index + 1}`), x: number(village?.x, 0, 0, config.map.width - 1), y: number(village?.y, 0, 0, config.map.height - 1), kingdomId: village?.kingdomId == null && village?.kingdom == null ? null : realmId(village.kingdomId ?? village.kingdom), founded: number(village?.founded ?? village?.builtYear, 1, 0, 1e7), resources: { food: number(village?.resources?.food ?? village?.inventory?.food ?? village?.food, 40, 0, 1e7), wood: number(village?.resources?.wood ?? village?.inventory?.wood ?? village?.wood, 25, 0, 1e7), stone: number(village?.resources?.stone ?? village?.inventory?.stone ?? village?.stone, 10, 0, 1e7) }, structures: (Array.isArray(village?.structures) ? village.structures : []).map(cleanStructure).filter(Boolean), capacity: number(village?.capacity, 12, 1, 5000) };
  }
  function relationStatus(value) { return value === "war" || value === "alliance" ? value : "peace"; }
  function cleanKingdom(kingdom, index) {
    const race = Object.hasOwn(config.races, kingdom?.race) ? kingdom.race : "human", relations = {};
    for (const [otherId, relation] of Object.entries(kingdom?.relations || {})) relations[realmId(otherId, index + 1)] = { status: relationStatus(relation?.status), value: number(relation?.value ?? relation?.score, 0, -100, 100), weariness: number(relation?.weariness, 0, 0, 100) };
    return { id: realmId(kingdom?.id, index), name: text(kingdom?.name, `${config.races[race].name}之国`), race, color: /^#[0-9a-f]{6}$/i.test(kingdom?.color || "") ? kingdom.color : config.kingdomColors[index % config.kingdomColors.length], capitalId: kingdom?.capitalId == null ? null : id(kingdom.capitalId, 1), villageIds: (kingdom?.villageIds || kingdom?.villages || []).map(value => id(typeof value === "object" ? value.id : value, 1)), relations };
  }
  function cleanDisaster(disaster, index) {
    if (!Object.hasOwn(config.disasters, disaster?.type)) return null; const definition = config.disasters[disaster.type];
    return { id: id(disaster?.id, index + 1), type: disaster.type, x: number(disaster?.x, 0, 0, config.map.width - 1), y: number(disaster?.y, 0, 0, config.map.height - 1), radius: number(disaster?.radius, definition.radius, 1, 20), remaining: number(disaster?.remaining ?? (Number(disaster?.duration) - Number(disaster?.age || 0)), definition.duration, 0, 1000), applied: Boolean(disaster?.applied || Number(disaster?.age) > 0) };
  }
  function cleanStats(source = {}) { const result = {}; for (const key of ["births", "deaths", "villagesFounded", "villagesCaptured", "buildingsConstructed", "buildingsDestroyed", "warsStarted", "warsEnded", "disastersTriggered", "disastersSurvived", "resourceExchanges", "peakPopulation", "peakAnimals"]) result[key] = number(source[key], 0, 0, 1e9); return result; }

  function normalize(raw) {
    if (!raw || typeof raw !== "object") throw new Error("存档格式无效");
    const source = raw.state && typeof raw.state === "object" ? raw.state : raw, expectedTiles = config.map.width * config.map.height;
    if (!Array.isArray(source.tiles) || source.tiles.length !== expectedTiles) throw new Error("存档地图尺寸不兼容");
    const seed = engine.normalizeSeed(source.worldSeed || raw.seed || raw.meta?.seed), kingdoms = (source.kingdoms || []).filter(item => !item?.defeated).map(cleanKingdom), villages = (source.villages || []).map(cleanVillage), people = (source.people || source.citizens || []).filter(item => !item?.dead).map(cleanPerson), animals = (source.animals || []).filter(item => !item?.dead).map(cleanAnimal);
    const validKingdoms = new Set(kingdoms.map(item => item.id)), validVillages = new Set(villages.map(item => item.id));
    for (const person of people) { if (!validKingdoms.has(person.kingdomId)) person.kingdomId = null; if (!validVillages.has(person.villageId)) person.villageId = null; }
    for (const village of villages) if (!validKingdoms.has(village.kingdomId)) village.kingdomId = null;
    for (const kingdom of kingdoms) { kingdom.villageIds = villages.filter(village => village.kingdomId === kingdom.id).map(village => village.id); if (!kingdom.villageIds.includes(kingdom.capitalId)) kingdom.capitalId = kingdom.villageIds[0] || null; }
    const legacySeason = config.seasons.findIndex(item => item.id === source.climate?.season), seasonIndex = legacySeason >= 0 ? legacySeason : number(source.climate?.seasonIndex, 0, 0, 3), oldSettings = source.settings || {};
    return {
      saveVersion: VERSION, worldSeed: seed, worldName: text(source.worldName, "无名世界"), year: number(source.year, 1, 1, 1e7), ticks: number(source.ticks, 0, 0, 1e12), running: source.running !== false, speed: [1, 2, 4].includes(Number(source.speed)) ? Number(source.speed) : 1,
      selectedTool: "inspect", brushSize: number(source.brushSize ?? oldSettings.brushSize, 2, 1, 6), randomDisasters: (source.randomDisasters ?? oldSettings.randomDisastersEnabled) !== false, disasterFrequency: ["rare", "normal", "frequent"].includes(source.disasterFrequency ?? oldSettings.disasterFrequency) ? (source.disasterFrequency ?? oldSettings.disasterFrequency) : "normal", nextDisasterTick: number(source.nextDisasterTick, number(source.ticks, 0) + config.disasterIntervals.normal, 1, 1e12),
      climate: { seasonIndex, weather: Object.hasOwn(config.weather, source.climate?.weather) ? source.climate.weather : "clear", weatherUntil: number(source.climate?.weatherUntil, number(source.ticks, 0) + config.balance.cadence.weather, 0, 1e12) },
      tiles: source.tiles.map(cleanTile), people, animals, villages, kingdoms, activeDisasters: (source.activeDisasters || source.disasters || []).map(cleanDisaster).filter(Boolean), events: (source.events || []).slice(0, 30).map(item => ({ year: number(item?.year, 1, 1, 1e7), text: text(item?.text || item, "世界发生了变化") })), chronicle: (source.chronicle || source.history || []).slice(-300).map(item => ({ year: number(item?.year, 1, 1, 1e7), text: text(item?.text || item, "世界发生了变化") })), worldStats: cleanStats(source.worldStats), ids: { person: id(source.ids?.person ?? source.nextPersonId, people.length + 1), animal: id(source.ids?.animal ?? source.nextAnimalId, animals.length + 1), village: id(source.ids?.village ?? source.nextVillageId, villages.length + 1), structure: id(source.ids?.structure ?? source.nextStructureId, 1), disaster: id(source.ids?.disaster ?? source.nextDisasterId, 1) }, randomState: source.randomState || raw.randomState || null
    };
  }
  function build(state) { const payload = clone(state); delete payload.indexes; delete payload.camera; delete payload.selection; payload.saveVersion = VERSION; payload.randomState = engine.getRandomState(); return { format: "myriad-realms", version: VERSION, savedAt: new Date().toISOString(), state: payload }; }
  function key(slot) { return `${PREFIX}${Math.max(0, Math.min(2, Number(slot) || 0))}`; }
  function save(state, slot = 0) { const payload = build(state); localStorage.setItem(key(slot), JSON.stringify(payload)); return payload; }
  function load(slot = 0) { const value = localStorage.getItem(key(slot)); return value ? normalize(JSON.parse(value)) : null; }
  function list() { return [0, 1, 2].map(slot => { try { const value = JSON.parse(localStorage.getItem(key(slot)) || "null"); return value ? { slot, savedAt: value.savedAt, worldName: text(value.state?.worldName, "无名世界"), year: number(value.state?.year, 1) } : { slot, empty: true }; } catch { return { slot, empty: true }; } }); }
  function remove(slot) { localStorage.removeItem(key(slot)); }
  function settings() { try { return { autoSave: JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null")?.autoSave !== false }; } catch { return { autoSave: true }; } }
  function setSettings(value) { const next = { autoSave: value?.autoSave !== false }; localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); return next; }

  globalThis.RealmPersistence = Object.freeze({ VERSION, build, normalize, save, load, list, remove, settings, setSettings });
})();
