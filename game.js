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
  house: { name: "住宅", icon: "⌂", wood: 24, stone: 5 },
  farm: { name: "农场", icon: "▦", wood: 18, stone: 2 },
  lumber: { name: "伐木场", icon: "♣", wood: 14, stone: 8 },
  quarry: { name: "采石场", icon: "◆", wood: 20, stone: 6 },
  barracks: { name: "兵营", icon: "⚔", wood: 32, stone: 18 }
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

let tiles = [], people = [], animals = [], villages = [], kingdoms = [], events = [], activeDisasters = [];
let year = 1, ticks = 0, running = false, speed = 1, selectedTool = "inspect", brushSize = 2;
let camera = { x: 0, y: 0, zoom: 1 }, dragging = false, lastMouse = null, painting = false;
let nextPersonId = 1, nextAnimalId = 1, nextVillageId = 1, nextDisasterId = 1, selectedKingdomId = null, activeSaveSlot = 1;
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
    peopleSpatial: new Map(), animalSpatial: new Map(), speciesCounts: Object.fromEntries(Object.keys(animalDefs).map(species => [species, 0]))
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
    resources: { food: 70, wood: 45, stone: 18 }, relations: {}, warWeariness: 0
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
  people = []; animals = []; villages = []; kingdoms = []; events = []; activeDisasters = []; year = 1; ticks = 0; nextPersonId = 1; nextAnimalId = 1; nextVillageId = 1; nextDisasterId = 1; selectedKingdomId = null; indexesReady = false; lastAutoSaveYear = 1;
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
    kingdom, race, village: null, role: "civilian", cooldown: randi(0, 20), attackCooldown: 0, blessed: false, dead: false
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
    buildings: { hall: 1, house: 2, farm: 1, lumber: 0, quarry: 0, barracks: 0 },
    buildCooldown: randi(8, 16)
  };
  villages.push(village); founder.village = village.id;
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

function produceResources() {
  for (const kingdom of kingdoms) {
    const realmVillages = villagesOfKingdom(kingdom.id);
    const realmPeople = peopleOfKingdom(kingdom.id);
    const race = raceDefs[kingdom.race] || raceDefs.human;
    let food = 0, wood = 0, stone = 0;
    for (const village of realmVillages) {
      const terrain = ownedTerrainCounts(kingdom.id, village), b = village.buildings;
      food += (terrain.grass * .045 + terrain.forest * .012 + b.farm * 2.8) * race.food;
      wood += (terrain.forest * .035 + b.lumber * 1.8) * race.wood;
      stone += (terrain.mountain * .025 + b.quarry * 1.25) * race.stone;
      village.buildCooldown--;
      if (village.buildCooldown <= 0) attemptConstruction(village, peopleOfVillage(village.id).length);
    }
    let allies = 0; for (const id in kingdom.relations) if (kingdom.relations[id].status === "alliance") allies++;
    const tradeBonus = 1 + allies * .07, warCost = 1 + Math.min(1, kingdom.warWeariness / 100);
    kingdom.resources.food = clamp(kingdom.resources.food + food * tradeBonus - realmPeople.length * .16 * warCost, 0, 9999);
    kingdom.resources.wood = clamp(kingdom.resources.wood + wood * tradeBonus, 0, 9999);
    kingdom.resources.stone = clamp(kingdom.resources.stone + stone * tradeBonus, 0, 9999);
    if (kingdom.resources.food <= 1) realmPeople.forEach(p => { p.food = Math.max(0, p.food - .8); });
    else realmPeople.forEach(p => { p.food = Math.min(105, p.food + .35); });
  }
}

function attemptConstruction(village, population) {
  const kingdom = getKingdom(village.kingdom), b = village.buildings; if (!kingdom) return;
  const terrain = ownedTerrainCounts(kingdom.id, village);
  let choice = null;
  if (kingdomAtWar(kingdom.id) && b.barracks < 1) choice = "barracks";
  else if (population >= villageCapacity(village) - 3) choice = "house";
  else if (kingdom.resources.food < Math.max(45, peopleOfKingdom(kingdom.id).length * 2.5)) choice = "farm";
  else if (terrain.forest > 4 && b.lumber < Math.ceil(village.level / 2)) choice = "lumber";
  else if (terrain.mountain > 2 && b.quarry < Math.ceil(village.level / 2)) choice = "quarry";
  else if (peopleOfKingdom(kingdom.id).length > 8 && b.barracks < village.level) choice = "barracks";
  else choice = ["house", "farm", "lumber", "quarry"][randi(0, 3)];
  const def = buildingDefs[choice];
  if (kingdom.resources.wood >= def.wood && kingdom.resources.stone >= def.stone) {
    kingdom.resources.wood -= def.wood; kingdom.resources.stone -= def.stone; b[choice]++;
    addEvent(`${kingdom.name}在${village.name}建成了${def.name}。`);
    village.buildCooldown = randi(15, 28);
  } else village.buildCooldown = randi(5, 10);
}

function simulationStep() {
  ticks++; year += .02; rebuildWorldIndexes();
  if (ticks % 25 === 0) triggerRandomDisaster();
  simulateDisasters();
  regenerateBiomass(); if (ticks % 2 === 0) simulateAnimals(2);
  if (ticks % 10 === 0) produceResources();
  if (ticks % 45 === 0) updateMilitaryRoles();
  if (ticks % 120 === 0) diplomacyStep();
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
            const score = t.fertility + homeBias + Math.random();
            if (score > bestScore) { bestScore = score; bestX = person.x + ox; bestY = person.y + oy; }
          }
        }
        if (bestScore > -Infinity && Math.random() < .72) { person.x = bestX; person.y = bestY; }
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
    if (home && person.role === "civilian" && person.age > 17 && person.food > 76 && realm?.resources.food > 10 && homePop < villageCapacity(home) && people.length < 800 && Math.random() < .0028 * race.birth) {
      spawnPerson(person.x, person.y, person.kingdom, person.race);
      const baby = people[people.length - 1]; baby.age = 0; baby.village = person.village; baby.food = 60;
      person.food -= 18; realm.resources.food = Math.max(0, realm.resources.food - 1.5);
    }
  }

  for (const village of villages) {
    const pop = peopleOfVillage(village.id).length;
    village.level = pop > 42 ? 3 : pop > 17 ? 2 : 1;
    village.hp = Math.min(160 + village.level * 50, village.hp + .04);
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

function damageRandomBuilding(village, chance) {
  if (Math.random() >= chance) return;
  const candidates = ["house", "farm", "lumber", "quarry", "barracks"].filter(key => (village.buildings[key] || 0) > 0);
  if (candidates.length) village.buildings[candidates[randi(0, candidates.length - 1)]]--;
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
    damageRandomBuilding(village, .1 * disaster.intensity * force * aftershock);
  }
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
    village.hp = Math.max(5, village.hp - rand(2, 5) * disaster.intensity * force); damageRandomBuilding(village, .045 * disaster.intensity * force);
  }
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
    if (disaster.age % 45 === 0) damageRandomBuilding(village, .08 * disaster.intensity * force);
  }
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
    if (disaster.age % 20 === 0) damageRandomBuilding(village, .1 * disaster.intensity * force);
  }
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
    const kingdom = getKingdom(village.kingdom); if (kingdom) kingdom.resources.food = Math.max(0, kingdom.resources.food - disaster.intensity * force);
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
      recruits[i].role = "soldier"; recruits[i].health = Math.max(recruits[i].health, 110);
    }
    for (let i = desired; i < soldiers.length; i++) soldiers[i].role = "civilian";
  }
}

function walkToward(person, targetX, targetY) {
  let bestX = person.x, bestY = person.y, bestDistance = Infinity;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    if (!ox && !oy) continue;
    const x = person.x + ox, y = person.y + oy, t = tileAt(x, y);
    if (isLand(t) && t.type !== "mountain" && !t.fire) {
      const distance = Math.hypot(x - targetX, y - targetY) + Math.random() * .7;
      if (distance < bestDistance) { bestDistance = distance; bestX = x; bestY = y; }
    }
  }
  if (bestDistance < Infinity) { person.x = bestX; person.y = bestY; }
}

function militaryBehavior(person) {
  const enemyIds = new Set(enemyKingdomIds(person.kingdom));
  if (!enemyIds.size) { person.role = "civilian"; return; }
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
    target.hp -= rand(2, 5); person.attackCooldown = 5;
    if (target.hp <= 0) captureVillage(target, person.kingdom);
  } else walkToward(person, target.x, target.y);
}

function captureVillage(village, newKingdomId) {
  const oldKingdomId = village.kingdom; if (oldKingdomId === newKingdomId) return;
  const oldKingdom = getKingdom(oldKingdomId), newKingdom = getKingdom(newKingdomId);
  village.kingdom = newKingdomId; village.hp = 100;
  village.buildings.house = Math.max(1, village.buildings.house - 1);
  for (let position = 0; position < tiles.length; position++) {
    const t = tiles[position]; if (t.owner !== oldKingdomId) continue;
    const x = position % MAP_W, y = Math.floor(position / MAP_W);
    if (Math.hypot(x - village.x, y - village.y) < 8) t.owner = newKingdomId;
  }
  for (const resident of peopleOfVillage(village.id)) {
    if (resident.role === "civilian" && Math.random() < .7) resident.kingdom = newKingdomId;
  }
  addEvent(`${newKingdom?.name}攻占了${oldKingdom?.name}的${village.name}。`);
  if (!villages.some(v => v.kingdom === oldKingdomId)) {
    oldKingdom.defeated = true;
    peopleOfKingdom(oldKingdomId).forEach(p => { p.kingdom = newKingdomId; p.role = "civilian"; });
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

function inspectAt(x, y) {
  selectedKingdomId = null;
  const person = people.find(p => Math.hypot(p.x - x, p.y - y) < 1.5);
  const animal = animals.find(a => Math.hypot(a.x - x, a.y - y) < 1.5);
  const village = villages.find(v => Math.hypot(v.x - x, v.y - y) < 2);
  const box = document.getElementById("selectionCard"); box.classList.remove("empty");
  if (person) {
    const k = getKingdom(person.kingdom), v = getVillage(person.village);
    const race = raceDefs[person.race] || raceDefs.human;
    box.innerHTML = `<h4>${person.blessed ? "✨ " : ""}${person.plague > 0 ? "☣ " : ""}${race.icon} ${person.role === "soldier" ? "士兵" : race.name} #${person.id}</h4><div class="detail-row"><span>年龄</span><b>${Math.floor(person.age)} 岁</b></div><div class="detail-row"><span>种族</span><b>${race.name}</b></div><div class="detail-row"><span>生命</span><b>${Math.floor(person.health)}</b></div><div class="detail-row"><span>健康</span><b>${person.plague > 0 ? "感染瘟疫" : "正常"}</b></div><div class="detail-row"><span>身份</span><b>${person.role === "soldier" ? "军队" : "平民"}</b></div><div class="detail-row"><span>归属</span><b>${k?.name || "流浪者"}</b></div><div class="detail-row"><span>家园</span><b>${v?.name || "尚无家园"}</b></div>`;
  } else if (animal) {
    const def = animalDefs[animal.species];
    box.innerHTML = `<h4>${def.icon} ${def.name} #${animal.id}</h4><div class="detail-row"><span>年龄</span><b>${animal.age.toFixed(1)} 岁</b></div><div class="detail-row"><span>生命</span><b>${Math.max(0, Math.floor(animal.health))}</b></div><div class="detail-row"><span>饱食度</span><b>${Math.floor(animal.hunger)}%</b></div><div class="detail-row"><span>食性</span><b>${def.diet === "herbivore" ? "草食" : "捕食"}</b></div>`;
  } else if (village) {
    const k = getKingdom(village.kingdom), pop = peopleOfVillage(village.id).length, b = village.buildings;
    box.innerHTML = `<h4>🏠 ${village.name}</h4><div class="detail-row"><span>王国</span><b>${k?.name}</b></div><div class="detail-row"><span>人口容量</span><b>${pop} / ${villageCapacity(village)}</b></div><div class="detail-row"><span>防御</span><b>${Math.round(village.hp)}</b></div><div class="detail-row"><span>规模</span><b>${["营地", "村落", "城镇"][village.level - 1]}</b></div><div class="building-grid">${Object.entries(buildingDefs).map(([key, def]) => `<span class="building-chip">${def.icon} ${def.name} ×${b[key] || 0}</span>`).join("")}</div>`;
  } else {
    const t = tileAt(x, y), labels = { deep:"深海",water:"浅海",sand:"沙滩",grass:"草原",forest:"森林",mountain:"山地",ash:"焦土" };
    box.innerHTML = `<h4>▦ ${labels[t?.type] || "世界之外"}</h4><div class="detail-row"><span>坐标</span><b>${x}, ${y}</b></div><div class="detail-row"><span>肥沃度</span><b>${Math.round((t?.fertility || 0) * 100)}%</b></div><div class="detail-row"><span>植被量</span><b>${Math.round((t?.biomass || 0) * 100)}%</b></div>`;
  }
}

function inspectKingdom(kingdomId) {
  const kingdom = getKingdom(kingdomId); if (!kingdom) return;
  selectedKingdomId = kingdomId;
  const box = document.getElementById("selectionCard"), citizens = peopleOfKingdom(kingdomId), realmVillages = villagesOfKingdom(kingdomId), race = raceDefs[kingdom.race] || raceDefs.human;
  const raceCounts = Object.fromEntries(Object.keys(raceDefs).map(key => [key, 0]));
  let soldiers = 0;
  for (const citizen of citizens) {
    if (citizen.role === "soldier") soldiers++;
    if (raceCounts[citizen.race] !== undefined) raceCounts[citizen.race]++;
  }
  const demographics = Object.entries(raceDefs).map(([key, def]) => `${def.icon}${raceCounts[key]}`).join(" ");
  const relations = Object.entries(kingdom.relations || {}).map(([id, r]) => `${getKingdom(Number(id))?.name || "未知"}：${statusLabels[r.status]}`).join(" · ") || "尚无外交关系";
  box.classList.remove("empty");
  box.innerHTML = `<h4><span style="color:${kingdom.color}">◆</span> ${race.icon} ${kingdom.name}${kingdomAtWar(kingdomId) ? '<i class="war-badge">战争中</i>' : ""}</h4><div class="detail-row"><span>主体种族</span><b>${race.name}</b></div><div class="detail-row"><span>人口 / 军队</span><b>${citizens.length} / ${soldiers}</b></div><div class="detail-row"><span>人口构成</span><b>${demographics}</b></div><div class="detail-row"><span>聚落</span><b>${realmVillages.length}</b></div><div class="detail-row"><span>粮食</span><b>🌾 ${Math.floor(kingdom.resources.food)}</b></div><div class="detail-row"><span>木材 / 石料</span><b>🪵 ${Math.floor(kingdom.resources.wood)} · 🪨 ${Math.floor(kingdom.resources.stone)}</b></div><p class="muted">${relations}</p>`;
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
    const sx = m.ox + (v.x + .5) * m.size, sy = m.oy + (v.y + .5) * m.size, k = getKingdom(v.kingdom), b = v.buildings;
    if (sx < -30 || sy < -30 || sx > m.width + 30 || sy > m.height + 30) continue;
    const dots = Math.min(7, (b.house || 0) + (b.farm || 0) + (b.barracks || 0));
    for (let n = 0; n < dots; n++) {
      const angle = n / Math.max(1, dots) * Math.PI * 2, bx = sx + Math.cos(angle) * m.size * 1.35, by = sy + Math.sin(angle) * m.size * 1.05;
      ctx.fillStyle = n < (b.farm || 0) ? "#d2b65f" : n >= dots - (b.barracks || 0) ? "#6e3029" : "#6b4930";
      ctx.fillRect(bx - m.size * .28, by - m.size * .25, m.size * .56, m.size * .5);
    }
    ctx.fillStyle = "#3b2518"; ctx.fillRect(sx - m.size * .8, sy - m.size * .65, m.size * 1.6, m.size * 1.3);
    ctx.fillStyle = k?.color || "#ddd"; ctx.fillRect(sx - m.size * .9, sy - m.size * .9, m.size * 1.8, m.size * .35);
    const maxHp = 160 + v.level * 50;
    if (v.hp < maxHp * .9) { ctx.fillStyle = "#351a17"; ctx.fillRect(sx - m.size, sy + m.size, m.size * 2, Math.max(2, m.size * .2)); ctx.fillStyle = "#d65a43"; ctx.fillRect(sx - m.size, sy + m.size, m.size * 2 * clamp(v.hp / maxHp, 0, 1), Math.max(2, m.size * .2)); }
    if (m.size > 5) { ctx.fillStyle = "#fff0c9"; ctx.font = `${Math.max(9, m.size * 1.25)}px Microsoft YaHei`; ctx.textAlign = "center"; ctx.fillText(v.name, sx, sy - m.size * 1.3); }
  }
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
  document.getElementById("disasterList").innerHTML = activeDisasters.length ? activeDisasters.map(disaster => {
    const def = disasterDefs[disaster.type], progress = clamp(disaster.duration / Math.max(1, disaster.maxDuration) * 100, 0, 100);
    return `<div class="disaster-item ${disaster.type}"><div><b>${def.icon} ${def.name}</b><span>${disasterLocation(disaster)} · 约 ${(disaster.duration * .02).toFixed(1)} 纪元</span></div><i style="width:${progress}%"></i></div>`;
  }).join("") : `<p class="muted disaster-calm">${randomDisastersEnabled ? `世界暂时平静 · 风险预计在纪元 ${Math.ceil(nextDisasterYear)}` : "随机天灾已关闭"}</p>`;
  document.getElementById("kingdomList").innerHTML = activeKingdoms.length ? activeKingdoms.map(k => {
    const citizens = peopleOfKingdom(k.id), pop = citizens.length, towns = villagesOfKingdom(k.id).length, race = raceDefs[k.race] || raceDefs.human;
    let soldiers = 0; for (const citizen of citizens) if (citizen.role === "soldier") soldiers++;
    return `<button class="kingdom-item" data-kingdom="${k.id}" style="border-color:${k.color}"><b>${race.icon} ${k.name}${kingdomAtWar(k.id) ? '<i class="war-badge">交战</i>' : ""}</b><span>${race.name} · ${pop} 人 · ⚔ ${soldiers} · ${towns} 个聚落</span><span class="resource-line"><i>🌾 ${Math.floor(k.resources.food)}</i><i>🪵 ${Math.floor(k.resources.wood)}</i><i>🪨 ${Math.floor(k.resources.stone)}</i></span></button>`;
  }).join("") : `<p class="muted">世界尚无文明</p>`;
  const relationOrder = { war: 0, alliance: 1, peace: 2 };
  const sortedRelations = relationPairs.sort((a, b) => relationOrder[a.status] - relationOrder[b.status]);
  document.getElementById("diplomacyList").innerHTML = sortedRelations.length ? sortedRelations.map(r => `<div class="relation-item ${r.status}"><b>${r.a.name} ↔ ${r.b.name}</b><span>${statusLabels[r.status]} <i class="relation-score">${r.score}</i></span></div>`).join("") : `<p class="muted">尚未建立国家关系</p>`;
  if (selectedKingdomId !== null) inspectKingdom(selectedKingdomId);
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
    version: 4, savedAt: new Date().toISOString(),
    meta: { worldName, year: Math.floor(year), population: people.length, animals: animals.length, kingdoms: activeKingdomCount },
    worldName, year, ticks, tiles: tiles.map(t => [t.type, round3(t.fertility), round3(t.biomass), t.fire || 0, t.owner ?? -1]),
    people, animals, villages, kingdoms, events, activeDisasters, nextPersonId, nextAnimalId, nextVillageId, nextDisasterId, nextDisasterYear,
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
  for (const tile of tiles) { tile.biomass ??= tile.type === "forest" ? .8 : tile.type === "grass" ? .6 : tile.type === "sand" ? .1 : 0; }
  for (const kingdom of kingdoms) kingdom.race ||= ["human", "elf", "dwarf", "orc"][kingdom.id % 4];
  for (const person of people) {
    person.race ||= getKingdom(person.kingdom)?.race || "human"; person.role ||= "civilian"; person.attackCooldown ||= 0; person.cooldown ??= randi(0, 10); person.blessed ??= false; person.plague = Math.max(0, Number(person.plague) || 0); person.dead = false;
  }
  for (const animal of animals) {
    if (!animalDefs[animal.species]) animal.species = "rabbit";
    const def = animalDefs[animal.species];
    animal.health ??= def.health; animal.hunger ??= 70; animal.cooldown ??= randi(1, 8); animal.attackCooldown ||= 0; animal.dead = false;
  }
  for (const village of villages) {
    village.hp ??= 160; village.buildCooldown ??= randi(6, 12);
    village.buildings = { hall: 1, house: 2, farm: 1, lumber: 0, quarry: 0, barracks: 0, ...(village.buildings || {}) };
  }
  for (const kingdom of kingdoms) {
    kingdom.name = cleanText(kingdom.name) || "无名王国";
    kingdom.resources = { food: 70, wood: 45, stone: 18, ...(kingdom.resources || {}) };
    kingdom.relations ||= {}; kingdom.warWeariness ||= 0; kingdom.defeated ||= false;
  }
  for (const village of villages) village.name = cleanText(village.name) || "无名聚落";
  for (const event of events) event.text = cleanText(event.text);
  for (let i = 0; i < kingdoms.length; i++) for (let j = i + 1; j < kingdoms.length; j++) {
    if (!relationBetween(kingdoms[i].id, kingdoms[j].id)) setRelation(kingdoms[i].id, kingdoms[j].id, "peace", randi(-20, 25), true);
  }
  nextPersonId ||= Math.max(0, ...people.map(p => p.id)) + 1;
  nextAnimalId ||= Math.max(0, ...animals.map(a => a.id)) + 1;
  nextVillageId ||= Math.max(0, ...villages.map(v => v.id)) + 1;
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
  people = save.people; animals = save.animals || []; villages = save.villages; kingdoms = save.kingdoms; events = save.events || []; activeDisasters = Array.isArray(save.activeDisasters) ? save.activeDisasters : [];
  year = Number(save.year) || 1; ticks = Number(save.ticks) || 0; nextPersonId = save.nextPersonId; nextAnimalId = save.nextAnimalId; nextVillageId = save.nextVillageId; nextDisasterId = save.nextDisasterId; nextDisasterYear = Number(save.nextDisasterYear);
  const settings = save.settings || {};
  camera = settings.camera || { x: 0, y: 0, zoom: 1 }; speed = settings.speed || 1; selectedTool = settings.selectedTool || "inspect"; brushSize = settings.brushSize || 2;
  randomDisastersEnabled = settings.randomDisastersEnabled ?? randomDisastersEnabled; disasterFrequency = disasterIntervals[settings.disasterFrequency] ? settings.disasterFrequency : disasterFrequency;
  normalizeWorldData(save.version || 1); selectedKingdomId = null; setRunning(false, false); lastAutoSaveYear = year;
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
