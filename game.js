"use strict";

const canvas = document.getElementById("worldCanvas");
const ctx = canvas.getContext("2d", { alpha: false });
const MAP_W = 120, MAP_H = 80;
const terrainColors = {
  deep: "#173c58", water: "#23617a", sand: "#c6ad69", grass: "#679344",
  forest: "#315d32", mountain: "#777966", fire: "#d9582e", ash: "#3d3a34"
};
const kingdomColors = ["#e05252", "#55a8e2", "#e4b642", "#9a68d3", "#52b98b", "#e88345", "#d867a8", "#ca7456", "#8d9dde", "#45a8ad", "#9b8b74", "#d18bba"];
const worldNames = ["阿斯托拉", "云海之环", "苍翠纪元", "星落原野", "伊澜大陆", "群岛之歌"];
const raceDefs = {
  human: { name: "人类", icon: "🧑", life: 78, combat: 1, birth: 1, food: 1.08, wood: 1, stone: 1, names: ["晨曦王庭", "金穗之国", "白橡公国"] },
  elf: { name: "精灵", icon: "🧝", life: 125, combat: .92, birth: .72, food: 1, wood: 1.35, stone: .78, names: ["星火联盟", "翡翠领", "银月议会"] },
  dwarf: { name: "矮人", icon: "⛏", life: 105, combat: 1.16, birth: .8, food: .88, wood: .85, stone: 1.55, names: ["远山邦", "黑石王朝", "铜炉议会"] },
  orc: { name: "兽人", icon: "👹", life: 62, combat: 1.28, birth: 1.3, food: .95, wood: 1.08, stone: .9, names: ["赤砂汗国", "铁牙部族", "灰烬战团"] }
};
const animalDefs = {
  rabbit: { name: "野兔", icon: "🐇", diet: "herbivore", maxAge: 11, health: 32, hungerRate: .08, vision: 5, reproduce: .003, adult: 1, color: "#e8dfc8", size: .21, habitats: ["grass", "forest", "sand"] },
  deer: { name: "野鹿", icon: "🦌", diet: "herbivore", maxAge: 24, health: 72, hungerRate: .1, vision: 7, reproduce: .0012, adult: 3, color: "#bd8150", size: .34, habitats: ["forest", "grass"] },
  wolf: { name: "灰狼", icon: "🐺", diet: "predator", prey: ["rabbit", "deer"], maxAge: 22, health: 88, hungerRate: .08, vision: 13, damage: 34, reproduce: .00055, adult: 3, color: "#9a9d99", size: .32, habitats: ["forest", "grass", "mountain"] },
  bear: { name: "棕熊", icon: "🐻", diet: "predator", prey: ["deer", "rabbit", "wolf"], maxAge: 28, health: 145, hungerRate: .12, vision: 8, damage: 31, reproduce: .00012, adult: 5, color: "#76513b", size: .44, habitats: ["forest", "mountain", "grass"] }
};
const animalCaps = { rabbit: 220, deer: 120, wolf: 50, bear: 24 };
const buildingDefs = {
  hall: { name: "议事厅", icon: "▣", wood: 0, stone: 0, maxHp: 240, color: "#74513a", effect: "聚落的行政与防御核心" },
  house: { name: "住宅", icon: "⌂", wood: 24, stone: 5, maxHp: 100, color: "#8b6544", effect: "提供 7 人居住容量" },
  farm: { name: "农田", icon: "▦", wood: 18, stone: 2, maxHp: 75, color: "#c4a94f", effect: "提高农民产粮与储粮能力" },
  lumber: { name: "伐木场", icon: "♣", wood: 14, stone: 8, maxHp: 90, color: "#55733c", effect: "提高伐木工木材产量" },
  quarry: { name: "采石场", icon: "◆", wood: 20, stone: 6, maxHp: 115, color: "#777a73", effect: "提高矿工石料产量" },
  barracks: { name: "兵营", icon: "⚔", wood: 32, stone: 18, maxHp: 145, color: "#773b32", effect: "训练士兵并扩大军队上限" },
  road: { name: "道路", icon: "═", wood: 7, stone: 3, maxHp: 55, color: "#b49a6c", effect: "提高居民移动与建设效率" },
  wall: { name: "城墙", icon: "▥", wood: 12, stone: 16, maxHp: 180, color: "#8c8d83", effect: "提高聚落防御与居民安全感" },
  market: { name: "市场", icon: "⚖", wood: 30, stone: 9, maxHp: 125, color: "#b67555", effect: "扩大商贸收益并吸纳商人" },
  dock: { name: "港口", icon: "⚓", wood: 36, stone: 9, maxHp: 135, color: "#587f8c", effect: "利用水域获得粮食与贸易加成" },
  warehouse: { name: "仓库", icon: "▤", wood: 32, stone: 14, maxHp: 165, color: "#8b744d", effect: "提高聚落库存容量与商队装载量" },
  temple: { name: "神殿", icon: "✦", wood: 36, stone: 18, maxHp: 155, color: "#9b79a7", effect: "提高幸福、健康与灾后恢复" }
};
const tradeResourceDefs = {
  food: { name: "粮食", icon: "🌾", color: "#d5b64d" },
  wood: { name: "木材", icon: "🪵", color: "#739557" },
  stone: { name: "石料", icon: "🪨", color: "#9a9d98" }
};
const professionDefs = {
  child: { name: "儿童", icon: "◌", color: "#d6c9a8" },
  laborer: { name: "劳工", icon: "●", color: "#a59c83" },
  farmer: { name: "农民", icon: "🌾", color: "#d5b64d" },
  lumberjack: { name: "伐木工", icon: "🪓", color: "#71934a" },
  miner: { name: "矿工", icon: "⛏", color: "#9b9f9a" },
  builder: { name: "建筑师", icon: "🔨", color: "#c88750" },
  merchant: { name: "商人", icon: "⚖", color: "#c99bd5" },
  healer: { name: "治疗师", icon: "✚", color: "#76c9ad" },
  soldier: { name: "士兵", icon: "⚔", color: "#dd6b55" }
};
const statusLabels = { peace: "和平", alliance: "同盟", war: "战争" };
const disasterDefs = {
  earthquake: { name: "地震", icon: "🌎", color: "#d7c0a1", radius: 4, duration: 70 },
  flood: { name: "洪水", icon: "🌊", color: "#53b8df", radius: 5, duration: 240 },
  tornado: { name: "龙卷风", icon: "🌪", color: "#c8d0cf", radius: 2, duration: 170 },
  volcano: { name: "火山喷发", icon: "🌋", color: "#ef673a", radius: 4, duration: 280 },
  plague: { name: "瘟疫", icon: "☣", color: "#8fc65a", radius: 8, duration: 360 },
  drought: { name: "干旱", icon: "☀", color: "#d8a94c", radius: 8, duration: 420 }
};
const disasterIntervals = { rare: [15, 24], normal: [8, 14], frequent: [4, 8] };

let tiles = [], people = [], animals = [], villages = [], kingdoms = [], events = [], activeDisasters = [], tradeRoutes = [], caravans = [];
let year = 1, ticks = 0, running = false, speed = 1, selectedTool = "inspect", brushSize = 2;
let camera = { x: 0, y: 0, zoom: 1 }, dragging = false, lastMouse = null, painting = false;
let nextPersonId = 1, nextAnimalId = 1, nextVillageId = 1, nextStructureId = 1, nextTradeRouteId = 1, nextCaravanId = 1, nextDisasterId = 1, selectedKingdomId = null, selectedTradeRouteId = null, activeSaveSlot = 1;
let autoSaveEnabled = true, lastAutoSaveYear = 0, autoSavePending = false, indexesReady = false, renderDirty = true;
let randomDisastersEnabled = true, disasterFrequency = "normal", nextDisasterYear = 10;
let worldIndex = createWorldIndex();

const rand = (a, b) => Math.random() * (b - a) + a;
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const idx = (x, y) => y * MAP_W + x;
const tileAt = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H ? tiles[idx(x, y)] : null;
const isLand = t => t && !["deep", "water"].includes(t.type);
const getKingdom = id => (indexesReady ? worldIndex.kingdomById.get(id) : null) || kingdoms.find(k => k.id === id);
const getVillage = id => (indexesReady ? worldIndex.villageById.get(id) : null) || villages.find(v => v.id === id);
const peopleOfVillage = id => indexesReady ? (worldIndex.peopleByVillage.get(id) || []) : people.filter(p => p.village === id && !p.dead);
const peopleOfKingdom = id => indexesReady ? (worldIndex.peopleByKingdom.get(id) || []) : people.filter(p => p.kingdom === id && !p.dead);
const villagesOfKingdom = id => indexesReady ? (worldIndex.villagesByKingdom.get(id) || []) : villages.filter(v => v.kingdom === id);
const spatialKey = (x, y) => `${Math.floor(x / 6)},${Math.floor(y / 6)}`;
const cleanText = value => String(value ?? "").replace(/[<>&"']/g, "").slice(0, 120);

function createWorldIndex() {
  return {
    kingdomById: new Map(), villageById: new Map(), peopleByVillage: new Map(), peopleByKingdom: new Map(), villagesByKingdom: new Map(),
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
    addToIndex(worldIndex.peopleByVillage, person.village, person); addToIndex(worldIndex.peopleByKingdom, person.kingdom, person);
    addToIndex(worldIndex.peopleSpatial, spatialKey(person.x, person.y), person);
  }
  for (const animal of animals) {
    if (animal.dead) continue;
    addToIndex(worldIndex.animalSpatial, spatialKey(animal.x, animal.y), animal);
    if (worldIndex.speciesCounts[animal.species] !== undefined) worldIndex.speciesCounts[animal.species]++;
  }
  indexesReady = true;
}

function structureAt(x, y, type = null) {
  const structures = indexesReady ? (worldIndex.structureByTile.get(`${Math.round(x)},${Math.round(y)}`) || []) : villages.flatMap(village => village.structures || []).filter(structure => Math.round(structure.x) === Math.round(x) && Math.round(structure.y) === Math.round(y));
  return structures.find(structure => structure.hp > 0 && (!type || structure.type === type)) || null;
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

function removeDeadEntities(entities) {
  let writeIndex = 0;
  for (const entity of entities) if (!entity.dead) entities[writeIndex++] = entity;
  entities.length = writeIndex;
}

function relationBetween(aId, bId) {
  return getKingdom(aId)?.relations?.[String(bId)] || null;
}

function setRelation(aId, bId, status, score, silent = false) {
  const a = getKingdom(aId), b = getKingdom(bId); if (!a || !b || aId === bId) return;
  const value = { status, score: clamp(Math.round(score), -100, 100), since: Math.floor(year) };
  a.relations[String(bId)] = { ...value };
  b.relations[String(aId)] = { ...value };
  if (!silent) {
    const phrase = status === "war" ? "正式开战" : status === "alliance" ? "缔结同盟" : "恢复和平";
    addEvent(`${a.name}与${b.name}${phrase}。`);
  }
}

function createKingdom(race = "human") {
  const id = kingdoms.length ? Math.max(...kingdoms.map(k => k.id)) + 1 : 0;
  const def = raceDefs[race] || raceDefs.human;
  let raceCount = 0; for (const kingdom of kingdoms) if (kingdom.race === race) raceCount++;
  const baseName = def.names[raceCount % def.names.length], cycle = Math.floor(raceCount / def.names.length);
  const kingdom = {
    id, name: cycle ? `${baseName}·${cycle + 1}` : baseName, color: kingdomColors[id % kingdomColors.length], race,
    resources: { food: 70, wood: 45, stone: 18 }, relations: {}, warWeariness: 0, famine: false, famineLevel: 0, famineSince: null
  };
  kingdoms.push(kingdom);
  for (const other of kingdoms) if (other.id !== id) {
    const affinity = other.race === race ? 12 : (race === "orc" || other.race === "orc") ? -12 : 0;
    setRelation(id, other.id, "peace", randi(-35, 35) + affinity, true);
  }
  return kingdom;
}

function smoothNoise(width, height, passes = 5) {
  let data = Array.from({ length: width * height }, () => Math.random());
  for (let p = 0; p < passes; p++) {
    const next = data.slice();
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) sum += data[(y + oy) * width + x + ox];
      next[y * width + x] = sum / 9;
    }
    data = next;
  }
  return data;
}

function generateWorld() {
  const elevation = smoothNoise(MAP_W, MAP_H, 4);
  const moisture = smoothNoise(MAP_W, MAP_H, 3);
  tiles = [];
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const edge = Math.min(x, y, MAP_W - 1 - x, MAP_H - 1 - y) / 13;
    const e = elevation[idx(x, y)] + Math.min(1, edge) * .22 - .13;
    let type = e < .45 ? "deep" : e < .49 ? "water" : e < .525 ? "sand" : e > .69 ? "mountain" : moisture[idx(x, y)] > .53 ? "forest" : "grass";
    const biomass = type === "forest" ? rand(.72, 1) : type === "grass" ? rand(.5, .88) : type === "sand" ? rand(.05, .16) : 0;
    tiles.push({ type, fertility: type === "forest" ? 1 : type === "grass" ? .75 : .25, biomass, fire: 0, owner: -1 });
  }
  people = []; animals = []; villages = []; kingdoms = []; events = []; activeDisasters = []; tradeRoutes = []; caravans = []; year = 1; ticks = 0; nextPersonId = 1; nextAnimalId = 1; nextVillageId = 1; nextStructureId = 1; nextTradeRouteId = 1; nextCaravanId = 1; nextDisasterId = 1; selectedKingdomId = null; selectedTradeRouteId = null; indexesReady = false; lastAutoSaveYear = 1;
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
  scheduleNextDisaster();
  rebuildWorldIndexes();
  document.getElementById("worldName").textContent = worldNames[randi(0, worldNames.length - 1)];
  document.getElementById("saveStatus").textContent = "尚未保存";
  addEvent("新的世界从混沌中苏醒。");
  addEvent("第一批流浪者踏上了大陆。");
  updateUI(); render();
}

function spawnPerson(x, y, kingdom = null, race = null) {
  if (!isLand(tileAt(x, y)) || tileAt(x, y).type === "mountain") return;
  race ||= getKingdom(kingdom)?.race || "human";
  people.push({
    id: nextPersonId++, x, y, age: randi(16, 35), health: 100, food: rand(45, 90),
    kingdom, race, village: null, role: "civilian", profession: "laborer", previousProfession: null,
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
  const counts = { rabbit: 120, deer: 60, wolf: 14, bear: 4 };
  for (const [species, count] of Object.entries(counts)) for (let n = 0; n < count; n++) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const i = validTiles[randi(0, validTiles.length - 1)], x = i % MAP_W, y = Math.floor(i / MAP_W);
      if (spawnAnimal(x, y, species)) break;
    }
  }
}

function addEvent(text) {
  events.unshift({ year: Math.max(1, Math.floor(year)), text });
  events = events.slice(0, 14);
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
  return 160 + village.level * 50 + buildingCount(village, "wall") * 24;
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
    return water * 3 - distance * .12 + Math.random();
  }
  if (type !== "quarry" && tile.type === "mountain") return -Infinity;
  if (type === "farm") return (tile.fertility || 0) * 5 + (tile.type === "grass" ? 2 : 0) - distance * .08 + Math.random();
  if (type === "lumber") return (tile.type === "forest" ? 7 : (tile.biomass || 0) * 2) - distance * .08 + Math.random();
  if (type === "quarry") return (tile.type === "mountain" ? 9 : 0) + [tileAt(x + 1, y), tileAt(x - 1, y), tileAt(x, y + 1), tileAt(x, y - 1)].filter(candidate => candidate?.type === "mountain").length * 2 - distance * .05 + Math.random();
  if (type === "wall") return 6 - Math.abs(distance - (3.2 + village.level)) * 2 + Math.random();
  return 4 - Math.abs(distance - 2.8) * .45 + (tile.type === "grass" ? .8 : 0) + Math.random();
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
  const structure = { id: nextStructureId++, type, x: site.x, y: site.y, hp: def.maxHp, maxHp: def.maxHp, builtYear: Math.floor(year) };
  village.structures.push(structure);
  const tile = tileAt(Math.round(site.x), Math.round(site.y)); if (tile && isLand(tile) && tile.owner < 0) tile.owner = village.kingdom;
  syncBuildingCounts(village); indexesReady = false;
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
    buildCooldown: randi(8, 16), workforce: {}, averageHappiness: 60
  };
  villages.push(village); founder.village = village.id; seedVillageStructures(village, village.buildings);
  claimTerritory(village, 3);
  addEvent(`${village.name}建立，炊烟第一次升起。`);
}

function claimTerritory(village, radius) {
  for (let y = village.y - radius; y <= village.y + radius; y++) for (let x = village.x - radius; x <= village.x + radius; x++) {
    const t = tileAt(x, y); if (!t || !isLand(t) || Math.hypot(x - village.x, y - village.y) > radius + Math.random() * 1.7) continue;
    if (t.owner < 0 || t.owner === village.kingdom) t.owner = village.kingdom;
  }
}

function villageCapacity(village) { return 8 + (village.buildings?.house || 0) * 7; }

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
  person.previousProfession = null;
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
}

function performHealerWork(village, healerCount) {
  if (!healerCount) return;
  healerCount += buildingCount(village, "temple") * .35;
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
  const happinessTarget = clamp(person.needs.nutrition * .34 + person.needs.shelter * .22 + person.needs.safety * .22 + person.needs.health * .22 + employed + civicBonus + (person.blessed ? 8 : 0) - faminePenalty, 0, 100);
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
    const maximum = 10 + (buildingCount(a, "warehouse") + buildingCount(b, "warehouse")) * 7 + (buildingCount(a, "market") + buildingCount(b, "market")) * 2;
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
  }
  route.deliveries++; route.delivered += caravan.amount + caravan.returnAmount; route.lastDeliveryYear = Math.floor(year);
  if (route.deliveries === 1 || route.deliveries % 5 === 0) addEvent(`商队抵达${destination.name}，交付了${tradeResourceDefs[caravan.resource].name}${Math.floor(caravan.amount)}份。`);
  recalculateVillageMarket(source); recalculateVillageMarket(destination);
}

function simulateCaravans() {
  const survivors = [];
  for (const caravan of caravans) {
    const route = tradeRoutes.find(candidate => candidate.id === caravan.routeId), path = route ? (route.fromVillage === caravan.fromVillage ? route.path : [...route.path].reverse()) : null;
    if (!route || !path?.length) continue;
    if (route.status === "blockaded") caravan.hp -= .28;
    const nearbyDisaster = activeDisasters.some(disaster => disasterFalloff(disaster, caravan.x, caravan.y));
    if (nearbyDisaster) caravan.hp -= .16;
    if (tileAt(Math.round(caravan.x), Math.round(caravan.y))?.fire) caravan.hp -= 1.8;
    if (caravan.hp <= 0) { route.losses++; addEvent(`一支往返${getVillage(caravan.toVillage)?.name || "远方"}的商队失联，货物全部损失。`); continue; }
    let travel = (route.mode === "sea" ? .3 : .22) * (route.status === "blockaded" ? .35 : 1);
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
  for (const kingdom of kingdoms) {
    const realmVillages = villagesOfKingdom(kingdom.id);
    const realmPeople = peopleOfKingdom(kingdom.id);
    const race = raceDefs[kingdom.race] || raceDefs.human;
    let food = 0, wood = 0, stone = 0;
    for (const village of realmVillages) {
      const residents = peopleOfVillage(village.id), jobs = professionCounts(residents), terrain = ownedTerrainCounts(kingdom.id, village), b = village.buildings;
      const farmerOutput = jobs.farmer * (.55 + b.farm * .22), lumberOutput = jobs.lumberjack * (.48 + b.lumber * .24), minerOutput = jobs.miner * (.4 + b.quarry * .28);
      const dockOutput = b.dock * (.45 + residents.length * .018);
      const localFood = (terrain.grass * .025 + terrain.forest * .008 + farmerOutput + dockOutput + jobs.laborer * .045 + jobs.merchant * .07) * race.food;
      const localWood = (terrain.forest * .018 + lumberOutput + jobs.laborer * .018) * race.wood;
      const localStone = (terrain.mountain * .014 + minerOutput) * race.stone;
      food += localFood; wood += localWood; stone += localStone;
      village.inventory ||= { food: 45, wood: 24, stone: 12 };
      village.inventory.food = clamp(village.inventory.food + localFood - residents.length * .16, 0, villageInventoryCapacity(village, "food"));
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
    const tradeBonus = 1 + merchants * .006 + markets * .01 + docks * .012, warCost = 1 + Math.min(1, kingdom.warWeariness / 100);
    const farms = realmVillages.reduce((sum, village) => sum + (village.buildings?.farm || 0), 0);
    const warehouses = realmVillages.reduce((sum, village) => sum + buildingCount(village, "warehouse"), 0);
    const foodCapacity = 50 + realmPeople.length * 6 + realmVillages.length * 35 + farms * 45 + warehouses * 120;
    const surplusSpoilage = Math.max(0, kingdom.resources.food - foodCapacity * .72) * .045;
    kingdom.resources.food = clamp(kingdom.resources.food + food * tradeBonus - realmPeople.length * .16 * warCost - surplusSpoilage, 0, foodCapacity);
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
    const def = buildingDefs[choice];
    if (kingdom.resources.wood < def.wood || kingdom.resources.stone < def.stone) continue;
    let created = 0;
    if (choice === "road") created = buildRoadProject(village, 3);
    else created = addStructureEntity(village, choice) ? 1 : 0;
    if (!created) continue;
    kingdom.resources.wood -= def.wood; kingdom.resources.stone -= def.stone;
    addEvent(choice === "road" ? `${kingdom.name}在${village.name}铺设了${created}段道路。` : `${kingdom.name}在${village.name}建成了${def.name}。`);
    village.buildCooldown = randi(15, 28); return;
  }
  village.buildCooldown = randi(5, 10);
}

function simulationStep() {
  ticks++; year += .02; rebuildWorldIndexes();
  if (ticks % 25 === 0) triggerRandomDisaster();
  simulateDisasters();
  simulateCaravans();
  regenerateBiomass(); if (ticks % 2 === 0) simulateAnimals(2);
  if (ticks % 10 === 0) produceResources();
  if (ticks % 60 === 0) dispatchCaravans();
  if (ticks % 45 === 0) { updateMilitaryRoles(); updateProfessions(); }
  if (ticks % 120 === 0) { diplomacyStep(); updateTradeRoutes(); }
  if (ticks % 250 === 0) attemptColonies();
  if (ticks % 300 === 0) maintainBiodiversity();

  const peopleAtStepStart = people.length;
  for (let personIndex = 0; personIndex < peopleAtStepStart; personIndex++) {
    const person = people[personIndex];
    if (person.dead) continue;
    const race = raceDefs[person.race] || raceDefs.human;
    person.age += .02;
    const tile = tileAt(person.x, person.y);
    const forage = !person.village && tile ? Math.min(tile.biomass || 0, .012) : 0;
    if (tile) tile.biomass = Math.max(0, (tile.biomass || 0) - forage);
    person.food = clamp(person.food + (tile?.fertility || 0) * .2 + forage * 800 - .19, 0, 110);
    if (person.food <= 0) person.health -= .7;
    if (tile?.fire > 0) person.health -= 4;
    if (person.blessed) person.health = Math.min(140, person.health + .08);
    if (person.health <= 0 || person.age > race.life + rand(-7, 13)) { person.dead = true; continue; }

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
            const score = t.fertility + homeBias + professionTileBias(person, person.x + ox, person.y + oy, t, home) + Math.random();
            if (score > bestScore) { bestScore = score; bestX = person.x + ox; bestY = person.y + oy; }
          }
        }
            if (bestScore > -Infinity && Math.random() < .72) { person.x = bestX; person.y = bestY; if (structureAt(bestX, bestY, "road")) person.cooldown = Math.max(1, person.cooldown - 3); }
      }
    }

    if (!person.village && person.age > 20 && person.food > 72 && Math.random() < .0011) createVillage(person);
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
    if (home && person.role === "civilian" && person.age > 17 && person.food > 76 && person.happiness > 45 && !realm?.famine && realm?.resources.food > 10 && homePop < villageCapacity(home) && people.length < 800 && Math.random() < .0028 * race.birth * happinessBirthRate) {
      spawnPerson(person.x, person.y, person.kingdom, person.race);
      const baby = people[people.length - 1]; baby.age = 0; baby.village = person.village; baby.food = 60; baby.profession = "child"; baby.happiness = 68; baby.needs = { nutrition: 60, shelter: 78, safety: 72, health: 100 };
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
  removeDeadEntities(people); removeDeadEntities(animals); rebuildWorldIndexes();
  if (autoSaveEnabled && year - lastAutoSaveYear >= 5) { scheduleAutoSave(); lastAutoSaveYear = year; }
  renderDirty = true;
  if (ticks % 20 === 0) updateUI();
}

function regenerateBiomass() {
  const capacities = { forest: 1, grass: .82, sand: .14, ash: .38, mountain: .08, water: 0, deep: 0 };
  for (let i = ticks % 12; i < tiles.length; i += 12) {
    const tile = tiles[i], cap = capacities[tile.type] || 0; tile.biomass ??= cap * .5;
    if (!tile.fire && tile.biomass < cap) tile.biomass = Math.min(cap, tile.biomass + (tile.type === "grass" ? .012 : .008));
    if (tile.type === "ash" && tile.biomass > .3 && Math.random() < .025) { tile.type = "grass"; tile.fertility = .55; }
  }
}

function moveAnimal(animal, target = null, flee = false) {
  const def = animalDefs[animal.species];
  let bestX = animal.x, bestY = animal.y, bestScore = -Infinity;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    if (!ox && !oy) continue;
    const x = animal.x + ox, y = animal.y + oy, tile = tileAt(x, y); if (!isLand(tile) || tile.fire) continue;
    let score = (def.habitats.includes(tile.type) ? 1.8 : 0) + (tile.biomass || 0) * (def.diet === "herbivore" ? 1.3 : .25) + Math.random();
    if (target) score += Math.hypot(x - target.x, y - target.y) * (flee ? .35 : -.35);
    if (score > bestScore) { bestScore = score; bestX = x; bestY = y; }
  }
  if (bestScore > -Infinity) { animal.x = bestX; animal.y = bestY; }
}

function simulateAnimals(timeFactor = 1) {
  const speciesCounts = animalCounts();
  const animalsAtStepStart = animals.length;
  for (let animalIndex = 0; animalIndex < animalsAtStepStart; animalIndex++) {
    const animal = animals[animalIndex];
    if (animal.dead) continue;
    const def = animalDefs[animal.species], tile = tileAt(animal.x, animal.y);
    animal.age += .006 * timeFactor; animal.hunger = Math.max(0, animal.hunger - def.hungerRate * timeFactor); animal.cooldown -= timeFactor; animal.attackCooldown = Math.max(0, animal.attackCooldown - timeFactor);
    if (tile?.fire) animal.health -= 7;
    if (animal.hunger <= 0) animal.health -= 1.2;
    if (animal.health <= 0 || animal.age > def.maxAge + rand(-2, 3)) { animal.dead = true; continue; }

    if (def.diet === "herbivore") {
      if (tile && animal.hunger < 94 && tile.biomass > .01) {
        const bite = Math.min(tile.biomass, animal.species === "rabbit" ? .018 : .038); tile.biomass -= bite; animal.hunger = Math.min(100, animal.hunger + bite * 900);
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
    if (mate && speciesCounts[animal.species] < animalCaps[animal.species] && animals.length < 450 && Math.random() < def.reproduce * timeFactor) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const x = animal.x + randi(-1, 1), y = animal.y + randi(-1, 1), baby = spawnAnimal(x, y, animal.species, 0);
        if (baby) { baby.hunger = 60; speciesCounts[animal.species]++; animal.hunger -= 18; break; }
      }
    }
  }
}

function maintainBiodiversity() {
  const minimums = { rabbit: 28, deer: 16, wolf: 5, bear: 2 };
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
  if ((type === "plague" || Math.random() < .58) && villages.length) {
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
  syncBuildingCounts(village); indexesReady = false;
  if (announce && def) addEvent(`${village.name}的一座${def.name}被摧毁。`);
  return true;
}

function damageRandomBuilding(village, chance, amount = rand(22, 48), preferredType = null) {
  if (Math.random() >= chance) return false;
  let candidates = (village.structures || []).filter(structure => structure.hp > 0 && structure.type !== "hall");
  if (preferredType && candidates.some(structure => structure.type === preferredType)) candidates = candidates.filter(structure => structure.type === preferredType);
  if (!candidates.length) return false;
  return damageStructure(village, candidates[randi(0, candidates.length - 1)], amount);
}

function damageStructuresInArea(disaster, baseDamage, chance = 1) {
  for (const village of villages) {
    for (const structure of [...(village.structures || [])]) {
      const force = disasterFalloff(disaster, structure.x, structure.y); if (!force || Math.random() >= chance * force) continue;
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
    tile.type = Math.random() < .3 ? "ash" : tile.type; tile.fire = Math.max(tile.fire || 0, randi(70, 160)); tile.biomass = 0;
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
    if (Math.random() < .16 * disaster.intensity) { person.plague = randi(160, 300); infected++; }
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
  if (type === "earthquake") strikeEarthquake(disaster);
  if (type === "volcano") { initializeVolcano(disaster); volcanicBurst(disaster); }
  if (type === "plague") seedPlague(disaster);
  const cause = randomSource ? "天灾预警" : "神力降灾";
  addEvent(`${def.icon} ${cause}：${disasterLocation(disaster)}发生${def.name}。`);
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
    if (!isLand(tile)) return; tile.biomass = Math.max(0, (tile.biomass || 0) - .006 * disaster.intensity); tile.fertility = Math.max(.08, tile.fertility - .0007 * disaster.intensity);
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
    if (Math.random() < .018 * disaster.intensity) person.plague = randi(140, 260);
  }
}

function simulateDrought(disaster) {
  if (disaster.age % 3) return;
  forEachDisasterTile(disaster, (tile, x, y, force) => {
    if (!isLand(tile)) return;
    tile.biomass = Math.max(0, (tile.biomass || 0) - .004 * disaster.intensity * force);
    tile.fertility = Math.max(.06, tile.fertility - .00025 * disaster.intensity * force);
    if (!tile.fire && tile.type === "forest" && tile.biomass < .15 && Math.random() < .0007 * disaster.intensity) tile.fire = randi(50, 110);
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
    if (ticks % 10 === 0 && Math.random() < .05) {
      const target = findNearbyEntity(worldIndex.peopleSpatial, person.x, person.y, 2.2, other => other.id !== person.id && !(other.plague > 0) && !other.blessed);
      if (target) target.plague = randi(120, 240);
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
  for (const disaster of activeDisasters) if (disaster.duration <= 0) addEvent(`${disasterDefs[disaster.type].icon} ${disasterDefs[disaster.type].name}逐渐平息。`);
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

function updateMilitaryRoles() {
  for (const kingdom of kingdoms) {
    const citizens = [], soldiers = [], recruits = [];
    for (const person of peopleOfKingdom(kingdom.id)) {
      if (person.age < 16) continue;
      citizens.push(person); (person.role === "soldier" ? soldiers : recruits).push(person);
    }
    const barracks = villagesOfKingdom(kingdom.id).reduce((sum, v) => sum + (v.buildings.barracks || 0), 0);
    const desired = kingdomAtWar(kingdom.id) ? Math.min(Math.floor(citizens.length * .38), 2 + barracks * 6) : Math.min(Math.floor(citizens.length * .08), barracks * 2);
    for (let i = 0; i < desired - soldiers.length && i < recruits.length; i++) {
      recruits[i].previousProfession = recruits[i].profession; recruits[i].role = "soldier"; recruits[i].profession = "soldier"; recruits[i].health = Math.max(recruits[i].health, 110);
    }
    for (let i = desired; i < soldiers.length; i++) demobilizePerson(soldiers[i]);
  }
}

function walkToward(person, targetX, targetY) {
  let bestX = person.x, bestY = person.y, bestDistance = Infinity;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    if (!ox && !oy) continue;
    const x = person.x + ox, y = person.y + oy, t = tileAt(x, y);
    if (isLand(t) && t.type !== "mountain" && !t.fire) {
      const distance = Math.hypot(x - targetX, y - targetY) + Math.random() * .7 - (structureAt(x, y, "road") ? .55 : 0);
      if (distance < bestDistance) { bestDistance = distance; bestX = x; bestY = y; }
    }
  }
  if (bestDistance < Infinity) { person.x = bestX; person.y = bestY; }
}

function militaryBehavior(person) {
  const enemyIds = new Set(enemyKingdomIds(person.kingdom));
  if (!enemyIds.size) { demobilizePerson(person); return; }
  const nearbyEnemy = findNearbyEntity(worldIndex.peopleSpatial, person.x, person.y, 5, candidate => candidate.id !== person.id && enemyIds.has(candidate.kingdom), true);
  if (nearbyEnemy) {
    const distance = Math.hypot(nearbyEnemy.x - person.x, nearbyEnemy.y - person.y);
    if (distance <= 1.5 && person.attackCooldown <= 0) {
      nearbyEnemy.health -= rand(12, 25) * (raceDefs[person.race]?.combat || 1) * (person.blessed ? 1.35 : 1);
      person.health -= rand(1, 7); person.attackCooldown = 5;
      if (nearbyEnemy.health <= 0) nearbyEnemy.dead = true;
    } else walkToward(person, nearbyEnemy.x, nearbyEnemy.y);
    return;
  }
  const target = nearestEntity(villages, person.x, person.y, village => enemyIds.has(village.kingdom));
  if (!target) return;
  const distance = Math.hypot(target.x - person.x, target.y - person.y);
  if (distance <= 2 && person.attackCooldown <= 0) {
    const walls = buildingCount(target, "wall"), siegeDamage = rand(2, 5) / (1 + walls * .2);
    target.hp -= siegeDamage; person.attackCooldown = 5;
    if (walls && Math.random() < .12) damageRandomBuilding(target, 1, rand(3, 8), "wall");
    if (target.hp <= 0) captureVillage(target, person.kingdom);
  } else walkToward(person, target.x, target.y);
}

function captureVillage(village, newKingdomId) {
  const oldKingdomId = village.kingdom; if (oldKingdomId === newKingdomId) return;
  const oldKingdom = getKingdom(oldKingdomId), newKingdom = getKingdom(newKingdomId);
  village.kingdom = newKingdomId; village.hp = 100;
  const capturedHouse = (village.structures || []).find(structure => structure.type === "house");
  if (capturedHouse && buildingCount(village, "house") > 1) damageStructure(village, capturedHouse, capturedHouse.maxHp, false);
  for (let position = 0; position < tiles.length; position++) {
    const t = tiles[position]; if (t.owner !== oldKingdomId) continue;
    const x = position % MAP_W, y = Math.floor(position / MAP_W);
    if (Math.hypot(x - village.x, y - village.y) < 8) t.owner = newKingdomId;
  }
  for (const structure of village.structures || []) { const tile = tileAt(Math.round(structure.x), Math.round(structure.y)); if (tile && isLand(tile)) tile.owner = newKingdomId; }
  for (const resident of peopleOfVillage(village.id)) {
    if (resident.role === "civilian" && Math.random() < .7) resident.kingdom = newKingdomId;
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
    const bordered = shareBorder(a.id, b.id), strengthA = peopleOfKingdom(a.id).length, strengthB = peopleOfKingdom(b.id).length;
    if (relation.status === "war") {
      const warYears = year - relation.since;
      relation.score = Math.max(-100, relation.score - randi(0, 3));
      getKingdom(b.id).relations[String(a.id)].score = relation.score;
      a.warWeariness += 7; b.warWeariness += 7;
      if ((warYears > 7 && Math.random() < .28) || Math.min(strengthA, strengthB) < 5 || Math.max(a.warWeariness, b.warWeariness) > 56) {
        setRelation(a.id, b.id, "peace", randi(-28, -8)); a.warWeariness = 0; b.warWeariness = 0;
      }
    } else {
      const resourceGap = Math.abs(a.resources.food - b.resources.food) > 120 ? -2 : 1;
      const raceAffinity = a.race === b.race ? 1 : (a.race === "orc" || b.race === "orc") ? -1 : 0;
      relation.score = clamp(relation.score + randi(-4, 5) + (bordered ? -3 : 1) + resourceGap + raceAffinity, -100, 100);
      getKingdom(b.id).relations[String(a.id)].score = relation.score;
      if (relation.status === "alliance" && relation.score < 28) setRelation(a.id, b.id, "peace", relation.score);
      else if (relation.status === "peace" && relation.score > 52) setRelation(a.id, b.id, "alliance", relation.score);
      else if (relation.status === "peace" && relation.score < -42 && (bordered || kingdomsAreClose(a.id, b.id)) && strengthA >= 5 && strengthB >= 5) setRelation(a.id, b.id, "war", relation.score);
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
    if (selectedTool === "land") { t.type = Math.random() < .28 ? "forest" : "grass"; t.fertility = .8; t.biomass = .65; }
    if (selectedTool === "water") { t.type = "water"; t.fertility = 0; t.biomass = 0; t.owner = -1; }
    if (selectedTool === "forest" && isLand(t)) { t.type = "forest"; t.fertility = 1; t.biomass = 1; }
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
    t.type = d < brushSize * .7 ? "water" : "ash"; t.fertility = 0; t.biomass = 0; t.fire = d > brushSize * .7 ? randi(50, 130) : 0; t.owner = -1;
  }
  people = people.filter(p => Math.hypot(p.x - gx, p.y - gy) > brushSize * 2.2);
  animals = animals.filter(a => Math.hypot(a.x - gx, a.y - gy) > brushSize * 2.2);
  villages = villages.filter(v => Math.hypot(v.x - gx, v.y - gy) > brushSize * 1.8);
  indexesReady = false; addEvent("一颗陨星撞击大地，留下炽热的伤痕。"); updateUI();
}

function workforceHtml(counts) {
  return Object.entries(professionDefs).filter(([key]) => key !== "child" && (counts[key] || 0) > 0).map(([key, def]) => `<span class="profession-item" style="border-color:${def.color}">${def.icon} ${def.name}<b>${counts[key]}</b></span>`).join("") || `<span class="muted">暂无成年劳动力</span>`;
}

function needMeter(label, value) {
  const score = clamp(Math.round(value || 0), 0, 100);
  return `<div class="need-row"><span>${label}</span><i><b style="width:${score}%"></b></i><em>${score}</em></div>`;
}

function inventoryHtml(village) {
  return Object.entries(tradeResourceDefs).map(([resource, def]) => {
    const stock = Math.floor(village.inventory?.[resource] || 0), capacity = Math.floor(villageInventoryCapacity(village, resource)), demand = Math.floor(village.demand?.[resource] || 0), supply = Math.floor(village.supply?.[resource] || 0), price = Number(village.prices?.[resource] || 1).toFixed(2);
    return `<div class="inventory-row"><span>${def.icon} ${def.name}</span><b>${stock}/${capacity}</b><em>${supply ? `盈余 +${supply}` : demand ? `缺口 -${demand}` : "平衡"} · 价 ${price}</em></div>`;
  }).join("");
}

function inspectAt(x, y) {
  selectedKingdomId = null; selectedTradeRouteId = null;
  const person = people.find(p => Math.hypot(p.x - x, p.y - y) < 1.5);
  const caravan = caravans.find(candidate => Math.hypot(candidate.x - x, candidate.y - y) < 1.35);
  const animal = animals.find(a => Math.hypot(a.x - x, a.y - y) < 1.5);
  let inspectedStructure = null, inspectedStructureVillage = null, inspectedDistance = Infinity;
  for (const candidateVillage of villages) for (const structure of candidateVillage.structures || []) {
    if (structure.type === "hall") continue;
    const distance = Math.hypot(structure.x - x, structure.y - y);
    if (distance < .9 && distance < inspectedDistance) { inspectedStructure = structure; inspectedStructureVillage = candidateVillage; inspectedDistance = distance; }
  }
  const village = villages.find(v => Math.hypot(v.x - x, v.y - y) < 2);
  const box = document.getElementById("selectionCard"); box.classList.remove("empty");
  if (person) {
    const k = getKingdom(person.kingdom), v = getVillage(person.village);
    const race = raceDefs[person.race] || raceDefs.human, profession = professionDefs[person.role === "soldier" ? "soldier" : person.profession] || professionDefs.laborer;
    box.innerHTML = `<h4>${person.blessed ? "✨ " : ""}${person.plague > 0 ? "☣ " : ""}${race.icon} ${profession.icon} ${profession.name} #${person.id}</h4><div class="detail-row"><span>年龄 / 种族</span><b>${Math.floor(person.age)} 岁 · ${race.name}</b></div><div class="detail-row"><span>生命 / 幸福</span><b>${Math.floor(person.health)} · ${Math.round(person.happiness)}</b></div><div class="detail-row"><span>健康</span><b>${person.plague > 0 ? "感染瘟疫" : "正常"}</b></div><div class="detail-row"><span>归属</span><b>${k?.name || "流浪者"}</b></div><div class="detail-row"><span>家园</span><b>${v?.name || "尚无家园"}</b></div><div class="need-list">${needMeter("营养", person.needs?.nutrition)}${needMeter("住所", person.needs?.shelter)}${needMeter("安全", person.needs?.safety)}${needMeter("健康", person.needs?.health)}</div>`;
  } else if (caravan) {
    const route = tradeRoutes.find(candidate => candidate.id === caravan.routeId), source = getVillage(caravan.fromVillage), destination = getVillage(caravan.toVillage), cargo = tradeResourceDefs[caravan.resource], progress = route?.path?.length > 1 ? caravan.pathIndex / (route.path.length - 1) * 100 : 0;
    box.innerHTML = `<h4>${route?.mode === "sea" ? "⛵" : "🐴"} 商队 #${caravan.id}</h4><div class="detail-row"><span>路线</span><b>${source?.name} → ${destination?.name}</b></div><div class="detail-row"><span>货物</span><b>${cargo?.icon} ${cargo?.name} ${Math.floor(caravan.amount)}</b></div><div class="detail-row"><span>交换货物</span><b>${caravan.returnResource ? `${tradeResourceDefs[caravan.returnResource].icon} ${tradeResourceDefs[caravan.returnResource].name} ${Math.floor(caravan.returnAmount)}` : "国内调拨"}</b></div><div class="detail-row"><span>状态</span><b>${route?.status === "blockaded" ? "突破封锁" : "运输中"}</b></div><div class="need-list">${needMeter("行程", progress)}${needMeter("商队安全", caravan.hp)}</div>`;
  } else if (animal) {
    const def = animalDefs[animal.species];
    box.innerHTML = `<h4>${def.icon} ${def.name} #${animal.id}</h4><div class="detail-row"><span>年龄</span><b>${animal.age.toFixed(1)} 岁</b></div><div class="detail-row"><span>生命</span><b>${Math.max(0, Math.floor(animal.health))}</b></div><div class="detail-row"><span>饱食度</span><b>${Math.floor(animal.hunger)}%</b></div><div class="detail-row"><span>食性</span><b>${def.diet === "herbivore" ? "草食" : "捕食"}</b></div>`;
  } else if (inspectedStructure) {
    const def = buildingDefs[inspectedStructure.type], kingdom = getKingdom(inspectedStructureVillage.kingdom), integrity = inspectedStructure.hp / inspectedStructure.maxHp * 100;
    box.innerHTML = `<h4>${def.icon} ${def.name} #${inspectedStructure.id}</h4><div class="detail-row"><span>所属聚落</span><b>${inspectedStructureVillage.name}</b></div><div class="detail-row"><span>所属王国</span><b>${kingdom?.name || "无主"}</b></div><div class="detail-row"><span>建造纪元</span><b>${inspectedStructure.builtYear}</b></div><div class="detail-row"><span>坐标</span><b>${inspectedStructure.x}, ${inspectedStructure.y}</b></div><div class="need-list">${needMeter("建筑耐久", integrity)}</div><p class="muted">${def.effect}</p>`;
  } else if (village) {
    const k = getKingdom(village.kingdom), pop = peopleOfVillage(village.id).length, b = village.buildings, routes = tradeRoutes.filter(route => route.fromVillage === village.id || route.toVillage === village.id);
    box.innerHTML = `<h4>🏠 ${village.name}</h4><div class="detail-row"><span>王国</span><b>${k?.name}</b></div><div class="detail-row"><span>人口容量</span><b>${pop} / ${villageCapacity(village)}</b></div><div class="detail-row"><span>平均幸福</span><b>${Math.round(village.averageHappiness || 0)}</b></div><div class="detail-row"><span>防御 / 规模</span><b>${Math.round(village.hp)} / ${villageMaxHp(village)} · ${["营地", "村落", "城镇"][village.level - 1]}</b></div><div class="detail-row"><span>贸易路线</span><b>${routes.length} 条</b></div><div class="inventory-list">${inventoryHtml(village)}</div><div class="building-grid">${Object.entries(buildingDefs).filter(([key]) => (b[key] || 0) > 0).map(([key, def]) => `<span class="building-chip">${def.icon} ${def.name} ×${b[key] || 0}</span>`).join("")}</div><h3>劳动力</h3><div class="profession-list">${workforceHtml(village.workforce || {})}</div>`;
  } else {
    const t = tileAt(x, y), labels = { deep:"深海",water:"浅海",sand:"沙滩",grass:"草原",forest:"森林",mountain:"山地",ash:"焦土" };
    box.innerHTML = `<h4>▦ ${labels[t?.type] || "世界之外"}</h4><div class="detail-row"><span>坐标</span><b>${x}, ${y}</b></div><div class="detail-row"><span>肥沃度</span><b>${Math.round((t?.fertility || 0) * 100)}%</b></div><div class="detail-row"><span>植被量</span><b>${Math.round((t?.biomass || 0) * 100)}%</b></div>`;
  }
}

function inspectKingdom(kingdomId) {
  const kingdom = getKingdom(kingdomId); if (!kingdom) return;
  selectedKingdomId = kingdomId; selectedTradeRouteId = null;
  const box = document.getElementById("selectionCard"), citizens = peopleOfKingdom(kingdomId), realmVillages = villagesOfKingdom(kingdomId), race = raceDefs[kingdom.race] || raceDefs.human;
  const raceCounts = Object.fromEntries(Object.keys(raceDefs).map(key => [key, 0]));
  let soldiers = 0;
  for (const citizen of citizens) {
    if (citizen.role === "soldier") soldiers++;
    if (raceCounts[citizen.race] !== undefined) raceCounts[citizen.race]++;
  }
  const demographics = Object.entries(raceDefs).map(([key, def]) => `${def.icon}${raceCounts[key]}`).join(" ");
  const jobs = professionCounts(citizens), happiness = averageHappiness(citizens);
  const structures = realmVillages.flatMap(village => village.structures || []), roads = structures.filter(structure => structure.type === "road").length, walls = structures.filter(structure => structure.type === "wall").length;
  const relations = Object.entries(kingdom.relations || {}).map(([id, r]) => `${getKingdom(Number(id))?.name || "未知"}：${statusLabels[r.status]}`).join(" · ") || "尚无外交关系";
  box.classList.remove("empty");
  box.innerHTML = `<h4><span style="color:${kingdom.color}">◆</span> ${race.icon} ${kingdom.name}${kingdomAtWar(kingdomId) ? '<i class="war-badge">战争中</i>' : ""}${kingdom.famine ? '<i class="famine-badge">饥荒</i>' : ""}</h4><div class="detail-row"><span>主体种族</span><b>${race.name}</b></div><div class="detail-row"><span>人口 / 军队</span><b>${citizens.length} / ${soldiers}</b></div><div class="detail-row"><span>平均幸福</span><b>${Math.round(happiness)}</b></div><div class="detail-row"><span>人口构成</span><b>${demographics}</b></div><div class="detail-row"><span>聚落 / 建筑</span><b>${realmVillages.length} / ${structures.length}</b></div><div class="detail-row"><span>道路 / 城墙</span><b>${roads} / ${walls}</b></div><div class="detail-row"><span>粮食</span><b>🌾 ${Math.floor(kingdom.resources.food)}${kingdom.famine ? ` · 饥荒 ${Math.round(kingdom.famineLevel)}%` : ""}</b></div><div class="detail-row"><span>木材 / 石料</span><b>🪵 ${Math.floor(kingdom.resources.wood)} · 🪨 ${Math.floor(kingdom.resources.stone)}</b></div><h3>职业构成</h3><div class="profession-list">${workforceHtml(jobs)}</div><p class="muted">${relations}</p>`;
}

function inspectTradeRoute(routeId) {
  const route = tradeRoutes.find(candidate => candidate.id === routeId); if (!route) { selectedTradeRouteId = null; return; }
  selectedKingdomId = null; selectedTradeRouteId = routeId;
  const from = getVillage(route.fromVillage), to = getVillage(route.toVillage), inTransit = caravans.find(caravan => caravan.routeId === route.id), box = document.getElementById("selectionCard");
  const status = route.status === "active" ? "畅通" : route.status === "blockaded" ? "战争封锁" : "设施中断";
  box.classList.remove("empty");
  box.innerHTML = `<h4>${route.mode === "sea" ? "⚓" : "═"} 贸易路线 #${route.id}</h4><div class="detail-row"><span>起讫</span><b>${from?.name} ↔ ${to?.name}</b></div><div class="detail-row"><span>运输方式</span><b>${route.mode === "sea" ? "海运" : "陆运"}</b></div><div class="detail-row"><span>路线状态</span><b>${status}</b></div><div class="detail-row"><span>交付次数</span><b>${route.deliveries || 0}</b></div><div class="detail-row"><span>累计货运</span><b>${Math.floor(route.delivered || 0)}</b></div><div class="detail-row"><span>损失商队</span><b>${route.losses || 0}</b></div><div class="detail-row"><span>在途货物</span><b>${inTransit ? `${tradeResourceDefs[inTransit.resource].icon} ${Math.floor(inTransit.amount)}` : "暂无"}</b></div>`;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); renderDirty = true;
}

function viewMetrics() {
  const rect = canvas.getBoundingClientRect();
  const base = Math.min(rect.width / MAP_W, rect.height / MAP_H), size = base * camera.zoom;
  return { size, ox: (rect.width - MAP_W * size) / 2 + camera.x, oy: (rect.height - MAP_H * size) / 2 + camera.y, width: rect.width, height: rect.height };
}
function screenToGrid(clientX, clientY) {
  const rect = canvas.getBoundingClientRect(), m = viewMetrics();
  return { x: (clientX - rect.left - m.ox) / m.size, y: (clientY - rect.top - m.oy) / m.size };
}

function renderTradeRoutes(m) {
  for (const route of tradeRoutes) {
    if (!route.path?.length) continue;
    ctx.save(); ctx.globalAlpha = route.status === "active" ? .42 : route.status === "blockaded" ? .68 : .18;
    ctx.strokeStyle = route.status === "blockaded" ? "#d76550" : route.mode === "sea" ? "#62b9d4" : "#d3ad62";
    ctx.lineWidth = Math.max(1, m.size * (route.status === "blockaded" ? .24 : .16)); ctx.setLineDash(route.status === "active" ? [] : [Math.max(3, m.size), Math.max(2, m.size * .7)]);
    ctx.beginPath();
    for (let index = 0; index < route.path.length; index++) {
      const point = route.path[index], sx = m.ox + (point.x + .5) * m.size, sy = m.oy + (point.y + .5) * m.size;
      if (!index) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke(); ctx.restore();
  }
}

function renderCaravans(m) {
  for (const caravan of caravans) {
    const route = tradeRoutes.find(candidate => candidate.id === caravan.routeId), sx = m.ox + (caravan.x + .5) * m.size, sy = m.oy + (caravan.y + .5) * m.size;
    if (!route || sx < -10 || sy < -10 || sx > m.width + 10 || sy > m.height + 10) continue;
    const size = clamp(m.size * .46, 2.2, 5.5), def = tradeResourceDefs[caravan.resource];
    ctx.save(); ctx.fillStyle = caravan.hp < 35 ? "#d85d49" : route.mode === "sea" ? "#d7e3d8" : "#4c3325"; ctx.strokeStyle = def?.color || "#e6cc86"; ctx.lineWidth = Math.max(1, m.size * .16);
    if (route.mode === "sea") { ctx.translate(sx, sy); ctx.rotate(Math.PI / 4); ctx.fillRect(-size, -size, size * 2, size * 2); ctx.strokeRect(-size, -size, size * 2, size * 2); }
    else { ctx.fillRect(sx - size, sy - size * .72, size * 2, size * 1.44); ctx.strokeRect(sx - size, sy - size * .72, size * 2, size * 1.44); }
    ctx.restore();
  }
}

function renderStructures(m) {
  for (const village of villages) for (const structure of village.structures || []) {
    if (structure.type === "hall" || structure.hp <= 0) continue;
    const def = buildingDefs[structure.type], sx = m.ox + (structure.x + .5) * m.size, sy = m.oy + (structure.y + .5) * m.size;
    if (!def || sx < -16 || sy < -16 || sx > m.width + 16 || sy > m.height + 16) continue;
    const size = Math.max(2, m.size * .72), integrity = clamp(structure.hp / structure.maxHp, .25, 1);
    ctx.save(); ctx.globalAlpha = .55 + integrity * .45; ctx.fillStyle = def.color; ctx.strokeStyle = "#2b241c"; ctx.lineWidth = Math.max(1, m.size * .12);
    if (structure.type === "road") {
      ctx.fillStyle = def.color; ctx.fillRect(sx - m.size * .55, sy - m.size * .16, m.size * 1.1, m.size * .32); ctx.fillRect(sx - m.size * .16, sy - m.size * .55, m.size * .32, m.size * 1.1);
    } else if (structure.type === "wall") {
      ctx.fillRect(sx - size * .58, sy - size * .3, size * 1.16, size * .6); ctx.strokeRect(sx - size * .58, sy - size * .3, size * 1.16, size * .6);
      ctx.fillStyle = "#b8b5a7"; ctx.fillRect(sx - size * .5, sy - size * .42, size * .22, size * .22); ctx.fillRect(sx + size * .28, sy - size * .42, size * .22, size * .22);
    } else if (structure.type === "farm") {
      ctx.fillRect(sx - size * .6, sy - size * .48, size * 1.2, size * .96); ctx.strokeStyle = "#7c6a31";
      for (let line = -1; line <= 1; line++) { ctx.beginPath(); ctx.moveTo(sx - size * .5, sy + line * size * .25); ctx.lineTo(sx + size * .5, sy + line * size * .25); ctx.stroke(); }
    } else if (structure.type === "dock") {
      ctx.fillRect(sx - size * .55, sy - size * .2, size * 1.1, size * .4); ctx.fillRect(sx - size * .12, sy - size * .65, size * .24, size * 1.3);
      ctx.fillStyle = "#d6d0ac"; ctx.fillRect(sx + size * .25, sy - size * .42, size * .12, size * .28);
    } else if (structure.type === "market") {
      ctx.fillRect(sx - size * .55, sy - size * .15, size * 1.1, size * .65); ctx.fillStyle = getKingdom(village.kingdom)?.color || "#d5c18a";
      ctx.beginPath(); ctx.moveTo(sx - size * .65, sy - size * .12); ctx.lineTo(sx, sy - size * .68); ctx.lineTo(sx + size * .65, sy - size * .12); ctx.closePath(); ctx.fill();
    } else if (structure.type === "warehouse") {
      ctx.fillRect(sx - size * .58, sy - size * .48, size * 1.16, size * .96); ctx.strokeRect(sx - size * .58, sy - size * .48, size * 1.16, size * .96);
      ctx.strokeStyle = "#d3bb82"; ctx.beginPath(); ctx.moveTo(sx - size * .5, sy - size * .12); ctx.lineTo(sx + size * .5, sy - size * .12); ctx.moveTo(sx, sy - size * .4); ctx.lineTo(sx, sy + size * .4); ctx.stroke();
    } else if (structure.type === "temple") {
      ctx.fillRect(sx - size * .4, sy - size * .15, size * .8, size * .65); ctx.beginPath(); ctx.moveTo(sx - size * .55, sy - size * .15); ctx.lineTo(sx, sy - size * .75); ctx.lineTo(sx + size * .55, sy - size * .15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#eadb91"; ctx.fillRect(sx - size * .07, sy - size * .68, size * .14, size * .25);
    } else if (structure.type === "quarry") {
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.PI / 4); ctx.fillRect(-size * .42, -size * .42, size * .84, size * .84); ctx.strokeRect(-size * .42, -size * .42, size * .84, size * .84); ctx.restore();
    } else if (structure.type === "lumber") {
      for (let log = -1; log <= 1; log++) ctx.fillRect(sx - size * .55, sy + log * size * .22 - size * .08, size * 1.1, size * .16);
    } else {
      ctx.fillRect(sx - size * .5, sy - size * .35, size, size * .85); ctx.strokeRect(sx - size * .5, sy - size * .35, size, size * .85);
      ctx.fillStyle = structure.type === "barracks" ? "#d9c7a7" : "#4f3526"; ctx.beginPath(); ctx.moveTo(sx - size * .62, sy - size * .35); ctx.lineTo(sx, sy - size * .75); ctx.lineTo(sx + size * .62, sy - size * .35); ctx.closePath(); ctx.fill();
    }
    if (m.size > 8 && integrity < .72) { ctx.fillStyle = "#2a1715"; ctx.fillRect(sx - size * .55, sy + size * .72, size * 1.1, 2); ctx.fillStyle = "#dc654f"; ctx.fillRect(sx - size * .55, sy + size * .72, size * 1.1 * integrity, 2); }
    ctx.restore();
  }
}

function render() {
  const m = viewMetrics(); ctx.clearRect(0, 0, m.width, m.height); ctx.fillStyle = "#0f2534"; ctx.fillRect(0, 0, m.width, m.height);
  const minX = clamp(Math.floor(-m.ox / m.size), 0, MAP_W), maxX = clamp(Math.ceil((m.width - m.ox) / m.size), 0, MAP_W);
  const minY = clamp(Math.floor(-m.oy / m.size), 0, MAP_H), maxY = clamp(Math.ceil((m.height - m.oy) / m.size), 0, MAP_H);
  for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) {
    const t = tileAt(x, y), sx = Math.floor(m.ox + x * m.size), sy = Math.floor(m.oy + y * m.size);
    ctx.fillStyle = t.fire ? terrainColors.fire : terrainColors[t.type]; ctx.fillRect(sx, sy, Math.ceil(m.size + .5), Math.ceil(m.size + .5));
    if (t.owner >= 0 && isLand(t)) { ctx.fillStyle = `${kingdoms[t.owner]?.color || "#fff"}35`; ctx.fillRect(sx, sy, Math.ceil(m.size), Math.ceil(m.size)); }
    if (t.owner >= 0 && m.size > 4) {
      ctx.strokeStyle = `${getKingdom(t.owner)?.color || "#fff"}a8`; ctx.lineWidth = 1;
      if (tileAt(x + 1, y)?.owner !== t.owner) { ctx.beginPath(); ctx.moveTo(sx + m.size, sy); ctx.lineTo(sx + m.size, sy + m.size); ctx.stroke(); }
      if (tileAt(x, y + 1)?.owner !== t.owner) { ctx.beginPath(); ctx.moveTo(sx, sy + m.size); ctx.lineTo(sx + m.size, sy + m.size); ctx.stroke(); }
    }
    if (isLand(t) && (t.biomass || 0) < .18) { ctx.fillStyle = "#6d593724"; ctx.fillRect(sx, sy, Math.ceil(m.size), Math.ceil(m.size)); }
    if (m.size > 7 && t.type === "forest" && (x * 7 + y * 11) % 4 === 0 && t.biomass > .25) { ctx.fillStyle = "#234825"; ctx.fillRect(sx + m.size * .35, sy + m.size * .15, Math.max(1,m.size*.35), Math.max(1,m.size*.55 * t.biomass)); }
  }
  renderTradeRoutes(m);
  renderStructures(m);
  renderDisasters(m);
  for (const animal of animals) {
    const sx = m.ox + (animal.x + .5) * m.size, sy = m.oy + (animal.y + .5) * m.size;
    if (sx < -10 || sy < -10 || sx > m.width + 10 || sy > m.height + 10) continue;
    const def = animalDefs[animal.species], r = clamp(m.size * def.size, 1.2, 4.3); ctx.fillStyle = def.color;
    if (animal.species === "rabbit") { ctx.fillRect(sx - r, sy - r * .6, r * 2, r * 1.2); if (m.size > 6) { ctx.fillRect(sx - r * .55, sy - r * 1.5, r * .35, r); ctx.fillRect(sx + r * .2, sy - r * 1.5, r * .35, r); } }
    else if (animal.species === "deer") { ctx.fillRect(sx - r, sy - r * .65, r * 2, r * 1.3); ctx.fillStyle = "#e8cf9e"; ctx.fillRect(sx + r * .55, sy - r, r * .35, r * .45); }
    else if (animal.species === "wolf") { ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r, sy + r); ctx.lineTo(sx - r, sy + r); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill(); }
  }
  for (const v of villages) {
    const sx = m.ox + (v.x + .5) * m.size, sy = m.oy + (v.y + .5) * m.size, k = getKingdom(v.kingdom);
    if (sx < -30 || sy < -30 || sx > m.width + 30 || sy > m.height + 30) continue;
    ctx.fillStyle = "#3b2518"; ctx.fillRect(sx - m.size * .8, sy - m.size * .65, m.size * 1.6, m.size * 1.3);
    ctx.fillStyle = k?.color || "#ddd"; ctx.fillRect(sx - m.size * .9, sy - m.size * .9, m.size * 1.8, m.size * .35);
    const maxHp = villageMaxHp(v);
    if (v.hp < maxHp * .9) { ctx.fillStyle = "#351a17"; ctx.fillRect(sx - m.size, sy + m.size, m.size * 2, Math.max(2, m.size * .2)); ctx.fillStyle = "#d65a43"; ctx.fillRect(sx - m.size, sy + m.size, m.size * 2 * clamp(v.hp / maxHp, 0, 1), Math.max(2, m.size * .2)); }
    if (m.size > 5) { ctx.fillStyle = "#fff0c9"; ctx.font = `${Math.max(9, m.size * 1.25)}px Microsoft YaHei`; ctx.textAlign = "center"; ctx.fillText(v.name, sx, sy - m.size * 1.3); }
  }
  renderCaravans(m);
  for (const p of people) {
    const sx = m.ox + (p.x + .5) * m.size, sy = m.oy + (p.y + .5) * m.size, k = getKingdom(p.kingdom);
    if (sx < -8 || sy < -8 || sx > m.width + 8 || sy > m.height + 8) continue;
    ctx.fillStyle = p.blessed ? "#fff18a" : p.plague > 0 ? "#9dcc58" : k?.color || "#f1d2a2";
    const r = clamp(m.size * .32, 1.5, 4.5);
    if (p.role === "soldier") { ctx.fillRect(sx - r, sy - r, r * 2, r * 2); ctx.strokeStyle = "#fff4d1"; ctx.lineWidth = 1; ctx.strokeRect(sx - r, sy - r, r * 2, r * 2); }
    else if (p.race === "elf") { ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r, sy + r); ctx.lineTo(sx - r, sy + r); ctx.fill(); }
    else if (p.race === "dwarf") ctx.fillRect(sx - r, sy - r * .72, r * 2, r * 1.44);
    else if (p.race === "orc") { ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.PI / 4); ctx.fillRect(-r * .72, -r * .72, r * 1.44, r * 1.44); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill(); }
    if (m.size > 6) { const job = professionDefs[p.role === "soldier" ? "soldier" : p.profession] || professionDefs.laborer; ctx.fillStyle = job.color; ctx.fillRect(sx - r, sy + r + 1, r * 2, Math.max(1, m.size * .16)); }
    if (p.plague > 0 && m.size > 5) { ctx.strokeStyle = "#c2ed74"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx, sy, r + 1.5, 0, Math.PI * 2); ctx.stroke(); }
  }
}

function renderDisasters(m) {
  for (const disaster of activeDisasters) {
    const def = disasterDefs[disaster.type]; if (!def) continue;
    const sx = m.ox + (disaster.x + .5) * m.size, sy = m.oy + (disaster.y + .5) * m.size, radius = disaster.radius * m.size;
    if (sx + radius < 0 || sy + radius < 0 || sx - radius > m.width || sy - radius > m.height) continue;
    const pulse = .86 + Math.sin((disaster.age || 0) * .18) * .08;
    ctx.save(); ctx.globalAlpha = .2; ctx.fillStyle = def.color; ctx.strokeStyle = def.color; ctx.lineWidth = Math.max(1.5, m.size * .35);
    if (disaster.type === "earthquake") {
      ctx.globalAlpha = .65; ctx.setLineDash([m.size * .8, m.size * .55]); ctx.beginPath(); ctx.arc(sx, sy, radius * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); for (let n = 0; n < 6; n++) { const angle = n * 1.9 + disaster.id, length = radius * (.45 + n * .07); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(angle) * length, sy + Math.sin(angle) * length); ctx.stroke(); }
    } else if (disaster.type === "flood") {
      ctx.globalAlpha = .24; ctx.beginPath(); ctx.arc(sx, sy, radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .65; for (let n = -2; n <= 2; n++) { ctx.beginPath(); ctx.arc(sx, sy + n * m.size * 1.4, radius * (.7 + n * .03), .15, Math.PI - .15); ctx.stroke(); }
    } else if (disaster.type === "tornado") {
      ctx.globalAlpha = .76; ctx.lineWidth = Math.max(2, m.size * .55); ctx.beginPath();
      for (let n = 0; n < 24; n++) { const angle = n * .6 + disaster.age * .18, spiralRadius = radius * n / 25, x = sx + Math.cos(angle) * spiralRadius, y = sy - radius * .8 + n / 23 * radius * 1.5; if (!n) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
    } else if (disaster.type === "volcano") {
      ctx.globalAlpha = .7; ctx.fillStyle = "#3f2a25"; ctx.beginPath(); ctx.moveTo(sx, sy - radius * .65); ctx.lineTo(sx + radius * .72, sy + radius * .55); ctx.lineTo(sx - radius * .72, sy + radius * .55); ctx.closePath(); ctx.fill();
      ctx.fillStyle = def.color; ctx.beginPath(); ctx.arc(sx, sy - radius * .58, Math.max(3, radius * .18 * pulse), 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.globalAlpha = disaster.type === "plague" ? .18 : .14; ctx.beginPath(); ctx.arc(sx, sy, radius * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .62; ctx.setLineDash([m.size, m.size * .65]); ctx.beginPath(); ctx.arc(sx, sy, radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    if (m.size > 4) { ctx.globalAlpha = .95; ctx.font = `${Math.max(14, m.size * 2.4)}px sans-serif`; ctx.textAlign = "center"; ctx.fillText(def.icon, sx, sy - radius - 4); }
    ctx.restore();
  }
}

function updateUI() {
  document.getElementById("yearStat").textContent = Math.floor(year);
  document.getElementById("populationStat").textContent = people.length;
  document.getElementById("animalStat").textContent = animals.length;
  document.getElementById("villageStat").textContent = villages.length;
  document.getElementById("disasterStat").textContent = activeDisasters.length;
  const activeKingdoms = kingdoms.filter(k => !k.defeated);
  document.getElementById("kingdomStat").textContent = activeKingdoms.length;
  const relationPairs = []; let warCount = 0;
  for (let i = 0; i < kingdoms.length; i++) for (let j = i + 1; j < kingdoms.length; j++) {
    const r = relationBetween(kingdoms[i].id, kingdoms[j].id);
    if (r && !kingdoms[i].defeated && !kingdoms[j].defeated) {
      relationPairs.push({ a: kingdoms[i], b: kingdoms[j], ...r });
      if (r.status === "war") warCount++;
    }
  }
  document.getElementById("warStat").textContent = warCount;
  document.getElementById("eventLog").innerHTML = events.map(e => `<div class="event"><time>纪元 ${e.year}</time>${e.text}</div>`).join("");
  const speciesCounts = animalCounts();
  document.getElementById("ecologyList").innerHTML = Object.entries(animalDefs).map(([species, def]) => `<div class="species-item"><span>${def.icon} ${def.name}</span><b>${speciesCounts[species]}</b></div>`).join("");
  const jobs = professionCounts(people), worldHappiness = averageHappiness(people), famineCount = activeKingdoms.filter(kingdom => kingdom.famine).length;
  const worldBuildings = emptyBuildingCounts();
  for (const village of villages) for (const structure of village.structures || []) if (worldBuildings[structure.type] !== undefined) worldBuildings[structure.type]++;
  const structureCount = Object.values(worldBuildings).reduce((sum, count) => sum + count, 0);
  const infrastructure = Object.entries(buildingDefs).filter(([type]) => type !== "hall" && worldBuildings[type] > 0).map(([type, def]) => `<span class="building-chip">${def.icon} ${def.name} ×${worldBuildings[type]}</span>`).join("");
  document.getElementById("societyList").innerHTML = people.length ? `<div class="society-summary"><span>平均幸福<b>${Math.round(worldHappiness)}</b></span><span>饥荒王国<b>${famineCount}</b></span><span>实体建筑<b>${structureCount}</b></span></div><div class="profession-list">${workforceHtml(jobs)}</div><div class="building-grid infrastructure-grid">${infrastructure}</div>` : `<p class="muted">尚无社会分工</p>`;
  const activeRoutes = tradeRoutes.filter(route => route.status === "active").length, blockedRoutes = tradeRoutes.filter(route => route.status === "blockaded").length, delivered = tradeRoutes.reduce((sum, route) => sum + (route.delivered || 0), 0);
  const routeOrder = { blockaded: 0, active: 1, dormant: 2 };
  const routeItems = [...tradeRoutes].sort((a, b) => (routeOrder[a.status] ?? 3) - (routeOrder[b.status] ?? 3)).slice(0, 7).map(route => {
    const from = getVillage(route.fromVillage), to = getVillage(route.toVillage), inTransit = caravans.some(caravan => caravan.routeId === route.id);
    const status = route.status === "blockaded" ? "封锁" : route.status === "active" ? (inTransit ? "运输中" : "畅通") : "中断";
    return `<button class="trade-route-item ${route.status}" data-trade-route="${route.id}"><b>${route.mode === "sea" ? "⚓" : "═"} ${from?.name || "失落聚落"} ↔ ${to?.name || "失落聚落"}</b><span>${status} · ${route.deliveries || 0} 次交付 · 货运 ${Math.floor(route.delivered || 0)}</span></button>`;
  }).join("");
  document.getElementById("tradeList").innerHTML = tradeRoutes.length ? `<div class="trade-summary"><span>畅通<b>${activeRoutes}</b></span><span>商队<b>${caravans.length}</b></span><span>封锁<b>${blockedRoutes}</b></span><span>累计货运<b>${Math.floor(delivered)}</b></span></div><div class="trade-routes">${routeItems}</div>` : `<p class="muted">市场和仓库发展后将建立贸易路线</p>`;
  document.getElementById("disasterList").innerHTML = activeDisasters.length ? activeDisasters.map(disaster => {
    const def = disasterDefs[disaster.type], progress = clamp(disaster.duration / Math.max(1, disaster.maxDuration) * 100, 0, 100);
    return `<div class="disaster-item ${disaster.type}"><div><b>${def.icon} ${def.name}</b><span>${disasterLocation(disaster)} · 约 ${(disaster.duration * .02).toFixed(1)} 纪元</span></div><i style="width:${progress}%"></i></div>`;
  }).join("") : `<p class="muted disaster-calm">${randomDisastersEnabled ? `世界暂时平静 · 风险预计在纪元 ${Math.ceil(nextDisasterYear)}` : "随机天灾已关闭"}</p>`;
  document.getElementById("kingdomList").innerHTML = activeKingdoms.length ? activeKingdoms.map(k => {
    const citizens = peopleOfKingdom(k.id), pop = citizens.length, towns = villagesOfKingdom(k.id).length, race = raceDefs[k.race] || raceDefs.human;
    const structures = villagesOfKingdom(k.id).reduce((sum, village) => sum + (village.structures?.length || 0), 0);
    let soldiers = 0; for (const citizen of citizens) if (citizen.role === "soldier") soldiers++;
    return `<button class="kingdom-item" data-kingdom="${k.id}" style="border-color:${k.color}"><b>${race.icon} ${k.name}${kingdomAtWar(k.id) ? '<i class="war-badge">交战</i>' : ""}${k.famine ? '<i class="famine-badge">饥荒</i>' : ""}</b><span>${race.name} · ${pop} 人 · ⚔ ${soldiers} · ${towns} 聚落 · 🏗 ${structures} · 🙂 ${Math.round(averageHappiness(citizens))}</span><span class="resource-line"><i>🌾 ${Math.floor(k.resources.food)}</i><i>🪵 ${Math.floor(k.resources.wood)}</i><i>🪨 ${Math.floor(k.resources.stone)}</i></span></button>`;
  }).join("") : `<p class="muted">世界尚无文明</p>`;
  const relationOrder = { war: 0, alliance: 1, peace: 2 };
  const sortedRelations = relationPairs.sort((a, b) => relationOrder[a.status] - relationOrder[b.status]);
  document.getElementById("diplomacyList").innerHTML = sortedRelations.length ? sortedRelations.map(r => `<div class="relation-item ${r.status}"><b>${r.a.name} ↔ ${r.b.name}</b><span>${statusLabels[r.status]} <i class="relation-score">${r.score}</i></span></div>`).join("") : `<p class="muted">尚未建立国家关系</p>`;
  if (selectedKingdomId !== null) inspectKingdom(selectedKingdomId);
  if (selectedTradeRouteId !== null) inspectTradeRoute(selectedTradeRouteId);
}

function showToast(msg) { const el = document.getElementById("toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.classList.remove("show"), 1700); }
function setRunning(value, refreshUI = true) {
  running = Boolean(value);
  const button = document.getElementById("pauseBtn");
  button.textContent = running ? "Ⅱ" : "▶"; button.classList.toggle("active", !running);
  if (!running && refreshUI && tiles.length) updateUI();
}
const saveKey = slot => `realm-save-v3-${slot}`;
const round3 = value => Math.round((value || 0) * 1000) / 1000;

function buildSaveData() {
  const worldName = document.getElementById("worldName").textContent;
  let activeKingdomCount = 0; for (const kingdom of kingdoms) if (!kingdom.defeated) activeKingdomCount++;
  return {
    version: 7, savedAt: new Date().toISOString(),
    meta: { worldName, year: Math.floor(year), population: people.length, animals: animals.length, kingdoms: activeKingdomCount, tradeRoutes: tradeRoutes.length, caravans: caravans.length },
    worldName, year, ticks, tiles: tiles.map(t => [t.type, round3(t.fertility), round3(t.biomass), t.fire || 0, t.owner ?? -1]),
    people, animals, villages, kingdoms, events, activeDisasters, tradeRoutes, caravans, nextPersonId, nextAnimalId, nextVillageId, nextStructureId, nextTradeRouteId, nextCaravanId, nextDisasterId, nextDisasterYear,
    settings: { camera, speed, selectedTool, brushSize, randomDisastersEnabled, disasterFrequency }
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
  nextStructureId = Math.max(1, Number(nextStructureId) || 1);
  nextTradeRouteId = Math.max(1, Number(nextTradeRouteId) || 1); nextCaravanId = Math.max(1, Number(nextCaravanId) || 1);
  const usedStructureIds = new Set();
  for (const tile of tiles) { tile.biomass ??= tile.type === "forest" ? .8 : tile.type === "grass" ? .6 : tile.type === "sand" ? .1 : 0; }
  for (const kingdom of kingdoms) kingdom.race ||= ["human", "elf", "dwarf", "orc"][kingdom.id % 4];
  for (const person of people) {
    person.race ||= getKingdom(person.kingdom)?.race || "human"; person.role ||= "civilian";
    person.profession = person.role === "soldier" ? "soldier" : person.age < 16 ? "child" : professionDefs[person.profession] && person.profession !== "soldier" ? person.profession : "laborer";
    person.previousProfession = professionDefs[person.previousProfession] && person.previousProfession !== "soldier" ? person.previousProfession : null;
    person.happiness = clamp(Number(person.happiness) || 60, 0, 100);
    const savedNeeds = person.needs || {};
    person.needs = {
      nutrition: clamp(Number(savedNeeds.nutrition) || person.food || 60, 0, 110), shelter: clamp(Number(savedNeeds.shelter) || (person.village ? 70 : 25), 0, 100),
      safety: clamp(Number(savedNeeds.safety) || 65, 0, 100), health: clamp(Number(savedNeeds.health) || person.health || 80, 0, 100)
    };
    person.attackCooldown ||= 0; person.cooldown ??= randi(0, 10); person.blessed ??= false; person.plague = Math.max(0, Number(person.plague) || 0); person.dead = false;
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
    village.demand = { food: 0, wood: 0, stone: 0, ...(village.demand || {}) }; village.supply = { food: 0, wood: 0, stone: 0, ...(village.supply || {}) }; village.prices = { food: 1, wood: 1, stone: 1, ...(village.prices || {}) };
    village.workforce = professionCounts(people.filter(person => !person.dead && person.village === village.id)); village.averageHappiness = Number(village.averageHappiness) || 60;
    recalculateVillageMarket(village);
  }
  for (const kingdom of kingdoms) {
    kingdom.name = cleanText(kingdom.name) || "无名王国";
    kingdom.resources = { food: 70, wood: 45, stone: 18, ...(kingdom.resources || {}) };
    kingdom.relations ||= {}; kingdom.warWeariness ||= 0; kingdom.defeated ||= false;
    kingdom.famineLevel = clamp(Number(kingdom.famineLevel) || 0, 0, 100); kingdom.famine = Boolean(kingdom.famine && kingdom.famineLevel >= 5); kingdom.famineSince = kingdom.famine ? Number(kingdom.famineSince) || Math.floor(year) : null;
  }
  for (const village of villages) village.name = cleanText(village.name) || "无名聚落";
  for (const event of events) event.text = cleanText(event.text);
  for (let i = 0; i < kingdoms.length; i++) for (let j = i + 1; j < kingdoms.length; j++) {
    if (!relationBetween(kingdoms[i].id, kingdoms[j].id)) setRelation(kingdoms[i].id, kingdoms[j].id, "peace", randi(-20, 25), true);
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
  nextPersonId ||= Math.max(0, ...people.map(p => p.id)) + 1;
  nextAnimalId ||= Math.max(0, ...animals.map(a => a.id)) + 1;
  nextVillageId ||= Math.max(0, ...villages.map(v => v.id)) + 1;
  nextStructureId = Math.max(nextStructureId, 1, ...villages.flatMap(village => village.structures || []).map(structure => structure.id + 1));
  nextTradeRouteId = Math.max(nextTradeRouteId, 1, ...tradeRoutes.map(route => route.id + 1)); nextCaravanId = Math.max(nextCaravanId, 1, ...caravans.map(caravan => caravan.id + 1));
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
  rebuildWorldIndexes();
}

function restoreWorld(save, slot = activeSaveSlot) {
  if (!save || !Array.isArray(save.tiles) || !Array.isArray(save.people) || !Array.isArray(save.villages) || !Array.isArray(save.kingdoms)) throw new Error("invalid save");
  if (save.tiles.length !== MAP_W * MAP_H || save.people.length > 5000 || (save.animals?.length || 0) > 5000) throw new Error("unsupported save size");
  tiles = save.tiles.map(t => Array.isArray(t) ? { type: t[0], fertility: t[1], biomass: t[2], fire: t[3], owner: t[4] } : t);
  people = save.people; animals = save.animals || []; villages = save.villages; kingdoms = save.kingdoms; events = save.events || []; activeDisasters = Array.isArray(save.activeDisasters) ? save.activeDisasters : []; tradeRoutes = Array.isArray(save.tradeRoutes) ? save.tradeRoutes : []; caravans = Array.isArray(save.caravans) ? save.caravans : []; indexesReady = false;
  year = Number(save.year) || 1; ticks = Number(save.ticks) || 0; nextPersonId = save.nextPersonId; nextAnimalId = save.nextAnimalId; nextVillageId = save.nextVillageId; nextStructureId = save.nextStructureId; nextTradeRouteId = save.nextTradeRouteId; nextCaravanId = save.nextCaravanId; nextDisasterId = save.nextDisasterId; nextDisasterYear = Number(save.nextDisasterYear);
  const settings = save.settings || {};
  camera = settings.camera || { x: 0, y: 0, zoom: 1 }; speed = settings.speed || 1; selectedTool = settings.selectedTool || "inspect"; brushSize = settings.brushSize || 2;
  randomDisastersEnabled = settings.randomDisastersEnabled ?? randomDisastersEnabled; disasterFrequency = disasterIntervals[settings.disasterFrequency] ? settings.disasterFrequency : disasterFrequency;
  normalizeWorldData(save.version || 1); selectedKingdomId = null; selectedTradeRouteId = null; setRunning(false, false); lastAutoSaveYear = year;
  document.getElementById("worldName").textContent = cleanText(save.worldName || save.meta?.worldName) || "无名世界";
  document.querySelectorAll(".speed-btn").forEach(b => b.classList.toggle("active", Number(b.dataset.speed) === speed));
  document.querySelectorAll(".tool").forEach(b => b.classList.toggle("active", b.dataset.tool === selectedTool));
  document.getElementById("brushSize").value = brushSize; document.getElementById("brushValue").textContent = brushSize;
  document.getElementById("randomDisasterToggle").checked = randomDisastersEnabled; document.getElementById("disasterFrequency").value = disasterFrequency;
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
    const description = meta?.corrupt ? "存档数据损坏" : meta ? `${cleanText(meta.worldName)} · 纪元 ${Number(meta.year) || 1} · ${Number(meta.population) || 0} 人 · ${Number(meta.animals) || 0} 生物 · ${new Date(meta.savedAt).toLocaleString()}` : "空槽位";
    const saveAction = slot === "auto" ? "" : `<button data-save-action="save" data-slot="${slot}">保存</button>`;
    const loadAction = meta ? `<button data-save-action="load" data-slot="${slot}">读取</button><button class="delete-slot" data-save-action="delete" data-slot="${slot}">删除</button>` : "";
    return `<article class="save-slot ${slot === "auto" ? "autosave" : ""}"><div><h4>${title}</h4><p>${description}</p></div><div class="slot-actions">${saveAction}${loadAction}</div></article>`;
  }).join("");
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

async function importWorld(file) {
  if (!file) return;
  try { const save = JSON.parse(await file.text()); restoreWorld(save, activeSaveSlot); saveWorld(activeSaveSlot, false); closeArchive(); showToast("外部世界已导入"); }
  catch { showToast("无法导入：文件不是有效存档"); }
}

document.querySelectorAll(".tool").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".tool").forEach(b => b.classList.remove("active")); btn.classList.add("active"); selectedTool = btn.dataset.tool;
}));
document.querySelectorAll(".speed-btn").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active")); btn.classList.add("active"); speed = Number(btn.dataset.speed);
}));
document.getElementById("pauseBtn").addEventListener("click", () => setRunning(!running));
document.getElementById("brushSize").addEventListener("input", e => { brushSize = Number(e.target.value); document.getElementById("brushValue").textContent = brushSize; });
document.getElementById("newWorldBtn").addEventListener("click", () => { if (confirm("生成新世界会抹去当前未保存的进度，继续吗？")) generateWorld(); });
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
document.getElementById("importSaveInput").addEventListener("change", e => { importWorld(e.target.files?.[0]); e.target.value = ""; });
window.addEventListener("keydown", e => { if (e.key === "Escape") closeArchive(); });
document.getElementById("kingdomList").addEventListener("click", e => {
  const item = e.target.closest("[data-kingdom]"); if (item) inspectKingdom(Number(item.dataset.kingdom));
});
document.getElementById("tradeList").addEventListener("click", e => {
  const item = e.target.closest("[data-trade-route]"); if (item) inspectTradeRoute(Number(item.dataset.tradeRoute));
});
canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("mousedown", e => {
  if (e.button === 2) { dragging = true; lastMouse = { x: e.clientX, y: e.clientY }; }
  if (e.button === 0) { painting = true; const p = screenToGrid(e.clientX, e.clientY); applyTool(p.x, p.y); }
});
window.addEventListener("mouseup", () => { dragging = false; painting = false; });
canvas.addEventListener("mousemove", e => {
  if (dragging) { camera.x += e.clientX - lastMouse.x; camera.y += e.clientY - lastMouse.y; lastMouse = { x: e.clientX, y: e.clientY }; renderDirty = true; }
  if (painting && selectedTool !== "inspect" && selectedTool !== "meteor" && !raceDefs[selectedTool] && !animalDefs[selectedTool] && !disasterDefs[selectedTool]) { const p = screenToGrid(e.clientX, e.clientY); applyTool(p.x, p.y); }
});
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
function frame(now) {
  const dt = Math.min(100, now - last); last = now;
  if (running) {
    accumulator += dt * speed; let steps = 0;
    while (accumulator >= 80 && steps < 2) { simulationStep(); accumulator -= 80; steps++; }
    if (steps === 2) accumulator = Math.min(accumulator, 160);
  }
  if (renderDirty) { render(); renderDirty = false; } requestAnimationFrame(frame);
}
autoSaveEnabled = localStorage.getItem("realm-autosave-enabled") !== "false";
randomDisastersEnabled = localStorage.getItem("realm-random-disasters") !== "false";
disasterFrequency = disasterIntervals[localStorage.getItem("realm-disaster-frequency")] ? localStorage.getItem("realm-disaster-frequency") : "normal";
document.getElementById("autoSaveToggle").checked = autoSaveEnabled;
document.getElementById("randomDisasterToggle").checked = randomDisastersEnabled;
document.getElementById("disasterFrequency").value = disasterFrequency;
resizeCanvas(); generateWorld(); requestAnimationFrame(frame);
