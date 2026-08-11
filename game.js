"use strict";

// 万象之境核心：地形、生态、居民、聚落、资源建筑、国家关系和天灾。
(() => {
  const config = globalThis.RealmConfig, engine = globalThis.WorldEngine, persistence = globalThis.RealmPersistence;
  const landTerrains = new Set(["sand", "grass", "forest", "hill", "mountain", "snow", "scorched"]);
  const disasterTools = new Set(Object.keys(config.disasters));
  const animalTypes = new Set(Object.keys(config.animals));
  const raceTypes = new Set(Object.keys(config.races));
  let state = null, lastTime = 0, accumulator = 0, lastToolCell = "", lastAutoYear = 0;

  const tileIndex = (x, y) => y * config.map.width + x;
  const getTile = (x, y) => x < 0 || y < 0 || x >= config.map.width || y >= config.map.height ? null : state.tiles[tileIndex(Math.floor(x), Math.floor(y))];
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const choice = list => list.length ? list[engine.randi(0, list.length - 1)] : null;
  const isLand = tile => Boolean(tile && landTerrains.has(tile.terrain));
  const relationKey = value => String(value);
  const settlementEndings = ["河湾", "林谷", "石丘", "青原", "溪岸", "望海", "橡林", "风坡", "湖畔", "长堤"];
  const ordinalName = value => ["", "", "二", "三", "四", "五", "六", "七", "八", "九", "十"][value] || String(value);
  function defaultStats() { return { births: 0, deaths: 0, villagesFounded: 0, villagesCaptured: 0, buildingsConstructed: 0, buildingsDestroyed: 0, warsStarted: 0, warsEnded: 0, disastersTriggered: 0, disastersSurvived: 0, resourceExchanges: 0, peakPopulation: 0, peakAnimals: 0 }; }
  function addEvent(text, important = false) { const item = { year: state.year, text: engine.cleanText(text) }; state.events.unshift(item); state.events.length = Math.min(state.events.length, 30); if (important || state.ticks % 10 === 0) { state.chronicle.push(item); if (state.chronicle.length > 300) state.chronicle.shift(); } }
  function buildIndexes() {
    const kingdomById = new Map(state.kingdoms.map(item => [item.id, item])), villageById = new Map(state.villages.map(item => [item.id, item])), peopleByVillage = new Map(), peopleByKingdom = new Map();
    for (const person of state.people) { if (!peopleByVillage.has(person.villageId)) peopleByVillage.set(person.villageId, []); peopleByVillage.get(person.villageId).push(person); if (!peopleByKingdom.has(person.kingdomId)) peopleByKingdom.set(person.kingdomId, []); peopleByKingdom.get(person.kingdomId).push(person); }
    state.indexes = { kingdomById, villageById, peopleByVillage, peopleByKingdom };
  }
  function nextName(race) { const parts = config.races[race].names; return `${choice(parts)}${choice(parts)}`; }
  function uniqueGeneratedName(items, factory, fallback) {
    const used = new Set(items.map(item => item.name)); let candidate = "";
    for (let attempt = 0; attempt < 24; attempt++) { candidate = engine.cleanText(factory()); if (candidate && !used.has(candidate)) return candidate; }
    const base = candidate || fallback; let serial = 2; while (used.has(`${base}·${ordinalName(serial)}`)) serial++; return `${base}·${ordinalName(serial)}`;
  }
  function ensureUniqueNames(items, fallback) {
    const used = new Set();
    for (const item of items) { const base = engine.cleanText(item.name) || `${fallback}${item.id}`, duplicate = used.has(base); let name = base, serial = 2; while (used.has(name)) name = `${base}·${ordinalName(serial++)}`; item.name = name; used.add(name); if (duplicate) addEvent(`${base}更名为${name}`); }
  }
  function worldMetrics() {
    let water = 0, healthy = 0, land = 0;
    for (const tile of state.tiles) { if (tile.terrain === "water" || tile.terrain === "deepWater") water++; else { land++; healthy += tile.fertility * (1 - tile.dryness) * (tile.fire > 0 ? .2 : 1); } }
    state.waterRatio = water / state.tiles.length; state.biomeHealth = land ? healthy / land : 0;
  }
  function generateTiles() {
    const width = config.map.width, height = config.map.height, heights = engine.smoothNoise(width, height, 6), moisture = engine.smoothNoise(width, height, 4), tiles = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const nx = x / (width - 1) * 2 - 1, ny = y / (height - 1) * 2 - 1, island = Math.max(0, 1 - Math.pow(Math.hypot(nx, ny) / 1.18, 1.7));
      const heightValue = engine.clamp(heights[tileIndex(x, y)] * .72 + island * .54 - .18, 0, 1), wet = engine.clamp(moisture[tileIndex(x, y)] * .9 + (1 - Math.abs(ny)) * .08, 0, 1);
      let terrain = "grass";
      if (heightValue < .31) terrain = "deepWater"; else if (heightValue < .39) terrain = "water"; else if (heightValue < .435) terrain = "sand"; else if (heightValue > .82) terrain = "snow"; else if (heightValue > .72) terrain = "mountain"; else if (heightValue > .64) terrain = "hill"; else if (wet > .55) terrain = "forest";
      const fertility = engine.clamp((wet * .72 + (1 - Math.abs(heightValue - .54)) * .28) * (terrain === "forest" ? 1.12 : terrain === "sand" || terrain === "mountain" ? .45 : 1), 0, 1);
      tiles.push({ x, y, terrain, height: heightValue, fertility, moisture: wet, dryness: 0, fire: 0, kingdomId: null });
    }
    return tiles;
  }
  function findLandNear(x, y, radius = 18, predicate = null) {
    let best = null, bestScore = Infinity;
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) { const tile = getTile(Math.floor(x + dx), Math.floor(y + dy)); if (!isLand(tile) || tile.terrain === "mountain" || tile.terrain === "snow" || (predicate && !predicate(tile))) continue; const score = Math.hypot(dx, dy) + (1 - tile.fertility) * 3 + engine.random() * 1.5; if (score < bestScore) { best = tile; bestScore = score; } }
    return best;
  }
  function structurePosition(village, offset = 0) {
    const angle = offset * 2.399 + engine.rand(-.25, .25), radius = 1 + Math.floor(offset / 5); return findLandNear(village.x + Math.cos(angle) * radius, village.y + Math.sin(angle) * radius, 3) || getTile(village.x, village.y);
  }
  function addStructure(village, type, free = false) {
    const definition = config.buildings[type]; if (!definition) return null;
    if (!free) for (const [resource, amount] of Object.entries(definition.cost || {})) if ((village.resources[resource] || 0) < amount) return null;
    if (!free) for (const [resource, amount] of Object.entries(definition.cost || {})) village.resources[resource] -= amount;
    const spot = structurePosition(village, village.structures.length), structure = { id: state.ids.structure++, type, x: spot.x, y: spot.y, health: 100 }; village.structures.push(structure); state.worldStats.buildingsConstructed++;
    if (!free) { addEvent(`${village.name}建成${definition.name}`); globalThis.RealmAudio?.play("construction", { x: spot.x, worldWidth: config.map.width }); }
    updateVillageCapacity(village); return structure;
  }
  function updateVillageCapacity(village) { village.capacity = config.balance.settlement.baseCapacity + village.structures.reduce((sum, item) => sum + (config.buildings[item.type]?.capacity || 0), 0); }
  function createKingdom(race, colorIndex = state.kingdoms.length) {
    const id = state.kingdoms.length ? Math.max(...state.kingdoms.map(item => item.id)) + 1 : 1, name = uniqueGeneratedName(state.kingdoms, () => `${nextName(race)}之地`, `${config.races[race].name}之地`), kingdom = { id, name, race, color: config.kingdomColors[colorIndex % config.kingdomColors.length], capitalId: null, villageIds: [], relations: {} };
    for (const other of state.kingdoms) { const value = engine.randi(-36, 36); kingdom.relations[relationKey(other.id)] = { status: "peace", value, weariness: 0 }; other.relations[relationKey(id)] = { status: "peace", value, weariness: 0 }; }
    state.kingdoms.push(kingdom); return kingdom;
  }
  function createVillage(kingdom, x, y, initial = false) {
    const spot = findLandNear(x, y, initial ? 25 : 12); if (!spot) return null;
    const name = uniqueGeneratedName(state.villages, () => `${nextName(kingdom.race)}${choice(settlementEndings)}`, `${config.races[kingdom.race].name}聚落`), village = { id: state.ids.village++, name, x: spot.x, y: spot.y, kingdomId: kingdom.id, founded: state.year, resources: { food: config.balance.settlement.initialFood, wood: config.balance.settlement.initialWood, stone: config.balance.settlement.initialStone }, structures: [], capacity: config.balance.settlement.baseCapacity };
    state.villages.push(village); kingdom.villageIds.push(village.id); if (kingdom.capitalId == null) kingdom.capitalId = village.id;
    addStructure(village, "hall", true); addStructure(village, "house", true); addStructure(village, "farm", true); state.worldStats.villagesFounded++;
    if (!initial) addEvent(`${kingdom.name}建立了${village.name}`, true); return village;
  }
  function createPerson(race, x, y, village = null, age = null) {
    if (state.people.length >= config.balance.simulation.populationCap) return null; const kingdomId = village?.kingdomId ?? null;
    const person = { id: state.ids.person++, name: nextName(race), race, x: engine.clamp(x + engine.rand(-.35, .35), 0, config.map.width - .001), y: engine.clamp(y + engine.rand(-.35, .35), 0, config.map.height - .001), age: age ?? engine.rand(15, 42), health: engine.rand(82, 100), happiness: engine.rand(56, 78), kingdomId, villageId: village?.id ?? null, dead: false }; state.people.push(person); return person;
  }
  function createAnimal(species, x, y, age = null) {
    if (state.animals.length >= config.balance.simulation.animalCap) return null; const spot = findLandNear(x, y, 8); if (!spot) return null;
    const animal = { id: state.ids.animal++, species, x: spot.x + engine.random(), y: spot.y + engine.random(), age: age ?? engine.rand(1, config.animals[species].life * .55), health: engine.rand(75, 100), hunger: engine.rand(0, 25), dead: false }; state.animals.push(animal); return animal;
  }
  function claimTerritory() {
    for (const tile of state.tiles) {
      if (!isLand(tile)) { tile.kingdomId = null; continue; } let nearest = null, score = Infinity;
      for (const village of state.villages) { const value = Math.hypot(tile.x - village.x, tile.y - village.y); if (value < score && value <= 13) { score = value; nearest = village; } } tile.kingdomId = nearest?.kingdomId ?? null;
    }
  }
  function populateInitialWorld() {
    const anchors = [[.28, .3], [.7, .3], [.3, .7], [.69, .7]], races = Object.keys(config.races);
    anchors.forEach(([px, py], index) => { const kingdom = createKingdom(races[index], index), village = createVillage(kingdom, config.map.width * px, config.map.height * py, true); if (!village) return; for (let amount = 0; amount < 9; amount++) createPerson(kingdom.race, village.x, village.y, village); });
    if (state.kingdoms.length >= 2) setRelation(state.kingdoms[0], state.kingdoms[1], "peace", -62);
    const animalCounts = { rabbit: 50, deer: 25, boar: 18, fox: 11, wolf: 10, bear: 5 }, land = state.tiles.filter(tile => isLand(tile) && tile.terrain !== "mountain" && tile.terrain !== "snow");
    for (const [species, amount] of Object.entries(animalCounts)) for (let index = 0; index < amount; index++) { const tile = choice(land); if (tile) createAnimal(species, tile.x, tile.y); }
    claimTerritory(); buildIndexes();
  }
  function makeState(seed) {
    const worldSeed = engine.setSeed(seed), newState = { saveVersion: persistence.VERSION, worldSeed, worldName: "", year: 1, ticks: 0, running: true, speed: 1, selectedTool: "inspect", brushSize: 2, randomDisasters: true, disasterFrequency: "normal", nextDisasterTick: config.disasterIntervals.normal, climate: { seasonIndex: 0, weather: "clear", weatherUntil: 600 }, tiles: [], people: [], animals: [], villages: [], kingdoms: [], activeDisasters: [], events: [], chronicle: [], worldStats: defaultStats(), ids: { person: 1, animal: 1, village: 1, structure: 1, disaster: 1 }, indexes: null, waterRatio: 0, biomeHealth: 0 };
    state = newState; state.worldName = choice(config.worldNames); state.tiles = generateTiles(); worldMetrics(); populateInitialWorld(); addEvent(`${state.worldName}在种子 ${worldSeed} 中诞生`, true); state.worldStats.peakPopulation = state.people.length; state.worldStats.peakAnimals = state.animals.length; return state;
  }

  function villagePopulation(village) { return state.indexes.peopleByVillage.get(village.id) || []; }
  function moveToward(person, village) {
    const pull = village ? .045 : 0, angle = engine.rand(0, Math.PI * 2); let nextX = person.x + Math.cos(angle) * config.balance.citizens.moveChance + (village?.x - person.x || 0) * pull, nextY = person.y + Math.sin(angle) * config.balance.citizens.moveChance + (village?.y - person.y || 0) * pull;
    const tile = getTile(nextX, nextY); if (isLand(tile) && tile.terrain !== "mountain") { person.x = engine.clamp(nextX, 0, config.map.width - .001); person.y = engine.clamp(nextY, 0, config.map.height - .001); }
  }
  function stepPeople() {
    buildIndexes(); const season = config.seasons[state.climate.seasonIndex], births = [];
    for (const person of state.people) {
      const definition = config.races[person.race], village = state.indexes.villageById.get(person.villageId); person.age += config.balance.simulation.yearsPerStep * config.balance.cadence.people; moveToward(person, village);
      if (village?.resources.food > 1) { person.health = Math.min(100, person.health + config.balance.citizens.naturalRecovery); person.happiness = Math.min(100, person.happiness + .025); } else { person.health -= config.balance.citizens.starvationDamage; person.happiness = Math.max(0, person.happiness - .35); }
      const oldAge = Math.max(0, (person.age - definition.life * .8) / definition.life); if (person.health <= 0 || person.age > definition.life * 1.35 || (oldAge > 0 && engine.random() < oldAge * .012)) { person.dead = true; state.worldStats.deaths++; continue; }
      const population = village ? villagePopulation(village).length : 0, room = village && population + births.filter(item => item.villageId === village.id).length < village.capacity, reserve = village && village.resources.food > population * 1.5;
      if (room && reserve && person.age >= 18 && person.age <= 50 && engine.random() < config.balance.citizens.baseBirthChance * .11 * definition.birth * season.birth) births.push({ race: person.race, x: person.x, y: person.y, villageId: village.id });
    }
    engine.removeDeadEntities(state.people); buildIndexes(); for (const birth of births.slice(0, 4)) { const village = state.indexes.villageById.get(birth.villageId); if (village && createPerson(birth.race, birth.x, birth.y, village, 0)) state.worldStats.births++; } if (births.length) buildIndexes();
  }
  function animalBuckets() { const buckets = new Map(); for (const animal of state.animals) { const key = `${Math.floor(animal.x / 5)},${Math.floor(animal.y / 5)}`; if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(animal); } return buckets; }
  function preyNear(animal, allowed, buckets) {
    let nearest = null, best = 4.5, cellX = Math.floor(animal.x / 5), cellY = Math.floor(animal.y / 5);
    for (let offsetY = -1; offsetY <= 1; offsetY++) for (let offsetX = -1; offsetX <= 1; offsetX++) for (const candidate of buckets.get(`${cellX + offsetX},${cellY + offsetY}`) || []) { if (candidate === animal || candidate.dead || !allowed.includes(candidate.species)) continue; const value = distance(animal, candidate); if (value < best) { nearest = candidate; best = value; } }
    return nearest;
  }
  function stepAnimals() {
    const additions = [], speciesCounts = {}, buckets = animalBuckets(); for (const animal of state.animals) speciesCounts[animal.species] = (speciesCounts[animal.species] || 0) + 1;
    for (const animal of state.animals) {
      const definition = config.animals[animal.species]; animal.age += config.balance.simulation.yearsPerStep * config.balance.cadence.animals; animal.hunger += definition.diet === "plant" ? .22 : .18;
      const tile = getTile(animal.x, animal.y); if (!isLand(tile)) animal.health -= 2;
      if (definition.diet === "plant" || definition.diet === "mixed") { if (tile && tile.fertility > .18) { animal.hunger = Math.max(0, animal.hunger - tile.fertility * .75); tile.fertility = Math.max(.05, tile.fertility - .0005); } }
      if (definition.prey && animal.hunger > 32) { const prey = preyNear(animal, definition.prey, buckets); if (prey) { const dx = prey.x - animal.x, dy = prey.y - animal.y, length = Math.max(.01, Math.hypot(dx, dy)); animal.x += dx / length * definition.speed * .18; animal.y += dy / length * definition.speed * .18; if (length < .8 && engine.random() < .28) { prey.dead = true; animal.hunger = Math.max(0, animal.hunger - 45); } } }
      if (!definition.prey || animal.hunger <= 32) { const angle = engine.rand(0, Math.PI * 2), nextX = animal.x + Math.cos(angle) * definition.speed * .2, nextY = animal.y + Math.sin(angle) * definition.speed * .2; if (isLand(getTile(nextX, nextY))) { animal.x = nextX; animal.y = nextY; } }
      if (animal.hunger > 80) animal.health -= (animal.hunger - 80) * .025; if (animal.hunger < 30) animal.health = Math.min(100, animal.health + .04);
      if (animal.health <= 0 || animal.age > definition.life * 1.4) animal.dead = true;
      const cap = config.animalCaps[animal.species], fertile = tile?.fertility > .3; if (!animal.dead && fertile && speciesCounts[animal.species] + additions.filter(item => item.species === animal.species).length < cap && engine.random() < definition.birth * .55) additions.push({ species: animal.species, x: animal.x, y: animal.y });
    }
    engine.removeDeadEntities(state.animals); for (const item of additions.slice(0, 5)) createAnimal(item.species, item.x, item.y, 0);
  }
  function terrainAround(village, type, radius = 5) { let count = 0; for (let y = village.y - radius; y <= village.y + radius; y++) for (let x = village.x - radius; x <= village.x + radius; x++) if (getTile(x, y)?.terrain === type) count++; return count; }
  function resourceStep() {
    buildIndexes(); const season = config.seasons[state.climate.seasonIndex], weather = config.weather[state.climate.weather], production = config.balance.production;
    for (const village of state.villages) {
      const people = villagePopulation(village), race = config.races[state.indexes.kingdomById.get(village.kingdomId)?.race || "human"], buildings = type => village.structures.filter(item => item.type === type).length;
      const fertility = season.fertility * weather.fertility * Math.max(.25, 1 - (getTile(village.x, village.y)?.dryness || 0));
      village.resources.food += (people.length * production.citizenFood + buildings("farm") * production.farm) * race.food * fertility;
      village.resources.wood += (terrainAround(village, "forest") * production.forestWood + buildings("lumber") * production.lumber) * race.wood;
      village.resources.stone += ((terrainAround(village, "mountain") + terrainAround(village, "hill")) * production.mountainStone + buildings("quarry") * production.quarry) * race.stone;
      village.resources.food = Math.max(0, village.resources.food - people.length * config.balance.citizens.foodDrain * config.balance.cadence.resources);
      const storage = 180 + buildings("warehouse") * config.buildings.warehouse.storage; for (const key of Object.keys(village.resources)) village.resources[key] = Math.min(storage, village.resources[key]);
      const temples = buildings("temple"); if (temples) for (const person of people) person.happiness = Math.min(100, person.happiness + temples * .025);
    }
    exchangeResources(); worldMetrics();
  }
  function hasExchangeBuilding(village) { return village.structures.some(item => item.type === "market" || item.type === "dock"); }
  function exchangeResources() {
    for (let firstIndex = 0; firstIndex < state.kingdoms.length; firstIndex++) for (let otherIndex = firstIndex + 1; otherIndex < state.kingdoms.length; otherIndex++) {
      const first = state.kingdoms[firstIndex], other = state.kingdoms[otherIndex], relation = first.relations[relationKey(other.id)]; if (!relation || relation.status === "war" || (relation.status !== "alliance" && relation.value < 20)) continue;
      const firstVillages = state.villages.filter(item => item.kingdomId === first.id && hasExchangeBuilding(item)), otherVillages = state.villages.filter(item => item.kingdomId === other.id && hasExchangeBuilding(item)); if (!firstVillages.length || !otherVillages.length) continue;
      const a = choice(firstVillages), b = choice(otherVillages); let moved = false;
      for (const resource of ["food", "wood", "stone"]) { const difference = a.resources[resource] - b.resources[resource]; if (Math.abs(difference) < 35) continue; const donor = difference > 0 ? a : b, receiver = difference > 0 ? b : a, amount = Math.min(8, Math.abs(difference) * .12); donor.resources[resource] -= amount; receiver.resources[resource] += amount; moved = true; }
      if (moved) state.worldStats.resourceExchanges++;
    }
  }
  function chooseBuilding(village) {
    const population = villagePopulation(village).length, count = type => village.structures.filter(item => item.type === type).length;
    if (population >= village.capacity - 2) return "house"; if (village.resources.food < population * 3 + 25) return "farm"; if (count("lumber") < Math.max(1, Math.floor(population / 20))) return "lumber"; if (count("quarry") < Math.max(1, Math.floor(population / 28))) return "quarry";
    if (population >= 14 && !count("market")) return "market"; if (population >= 22 && !count("warehouse")) return "warehouse"; if (countWarsFor(village.kingdomId) && !count("wall")) return "wall"; if (population >= 30 && !count("temple")) return "temple"; return engine.random() < .35 ? "road" : "farm";
  }
  function constructionStep() { buildIndexes(); for (const village of state.villages) { updateVillageCapacity(village); if (village.structures.length >= 18) continue; addStructure(village, chooseBuilding(village)); } }
  function expansionStep() {
    buildIndexes(); for (const kingdom of state.kingdoms) { const villages = state.villages.filter(item => item.kingdomId === kingdom.id), people = state.indexes.peopleByKingdom.get(kingdom.id) || []; if (!villages.length || villages.length >= 5 || people.length < villages.length * 18 || engine.random() > .18) continue; const origin = choice(villages), angle = engine.rand(0, Math.PI * 2), spot = findLandNear(origin.x + Math.cos(angle) * 15, origin.y + Math.sin(angle) * 15, 8, tile => tile.kingdomId == null); if (!spot) continue; const village = createVillage(kingdom, spot.x, spot.y); if (!village) continue; const settlers = people.filter(item => item.villageId === origin.id).slice(0, 4); for (const person of settlers) { person.villageId = village.id; person.x = village.x + engine.rand(-.3, .3); person.y = village.y + engine.rand(-.3, .3); } claimTerritory(); buildIndexes(); }
  }

  function setRelation(first, other, status, value = null) {
    const a = first.relations[relationKey(other.id)] || { status: "peace", value: 0, weariness: 0 }, b = other.relations[relationKey(first.id)] || { status: "peace", value: 0, weariness: 0 }; a.status = b.status = status; if (value != null) a.value = b.value = value; b.value = a.value; b.weariness = a.weariness; first.relations[relationKey(other.id)] = a; other.relations[relationKey(first.id)] = b; return a;
  }
  function countWars() { let count = 0; for (let index = 0; index < state.kingdoms.length; index++) for (let other = index + 1; other < state.kingdoms.length; other++) if (state.kingdoms[index].relations[relationKey(state.kingdoms[other].id)]?.status === "war") count++; return count; }
  function countWarsFor(kingdomId) { const kingdom = state.indexes.kingdomById.get(kingdomId); return kingdom ? Object.values(kingdom.relations).filter(item => item.status === "war").length : 0; }
  function kingdomStrength(kingdom) { const people = state.indexes.peopleByKingdom.get(kingdom.id) || [], villages = state.villages.filter(item => item.kingdomId === kingdom.id), resources = villages.reduce((sum, village) => sum + village.resources.food + village.resources.wood * .4 + village.resources.stone * .5, 0), walls = villages.reduce((sum, village) => sum + village.structures.filter(item => item.type === "wall").length, 0), health = people.length ? people.reduce((sum, person) => sum + person.health, 0) / people.length / 100 : 0; return people.length * config.races[kingdom.race].resilience * (.5 + health * .5) + resources * .025 + walls * 5; }
  function transferVillage(village, from, to) {
    village.kingdomId = to.id; from.villageIds = from.villageIds.filter(id => id !== village.id); if (!to.villageIds.includes(village.id)) to.villageIds.push(village.id); for (const person of state.people) if (person.villageId === village.id) person.kingdomId = to.id; if (from.capitalId === village.id) from.capitalId = from.villageIds[0] || null; state.worldStats.villagesCaptured++; addEvent(`${village.name}归入${to.name}`, true); claimTerritory(); buildIndexes();
  }
  function resolveConflict(first, other, relation) {
    const firstVillages = state.villages.filter(item => item.kingdomId === first.id), otherVillages = state.villages.filter(item => item.kingdomId === other.id); relation.weariness = Math.min(100, relation.weariness + config.balance.diplomacy.wearinessPerStep); const mirror = other.relations[relationKey(first.id)]; mirror.weariness = relation.weariness;
    for (const village of [...firstVillages, ...otherVillages]) { village.resources.food = Math.max(0, village.resources.food - engine.rand(1, 4)); village.resources.wood = Math.max(0, village.resources.wood - engine.rand(0, 2)); }
    for (const kingdom of [first, other]) { const people = state.indexes.peopleByKingdom.get(kingdom.id) || []; const affected = choice(people); if (affected) { affected.health = Math.max(1, affected.health - engine.rand(1, 4)); affected.happiness = Math.max(0, affected.happiness - engine.rand(1, 3)); } }
    const firstPower = kingdomStrength(first), otherPower = kingdomStrength(other), ratio = firstPower / Math.max(1, otherPower);
    if (engine.random() < .09 && Math.abs(Math.log(ratio)) > .22) { const winner = ratio > 1 ? first : other, loser = ratio > 1 ? other : first, targets = state.villages.filter(item => item.kingdomId === loser.id && item.id !== loser.capitalId); const target = choice(targets); if (target) transferVillage(target, loser, winner); }
    if (relation.weariness > 65 || !firstVillages.length || !otherVillages.length || engine.random() < config.balance.diplomacy.peaceChance * .18) { setRelation(first, other, "peace", engine.randi(-12, 18)); state.worldStats.warsEnded++; addEvent(`${first.name}与${other.name}恢复和平`, true); }
  }
  function diplomacyStep() {
    buildIndexes(); const diplomacy = config.balance.diplomacy;
    for (let index = 0; index < state.kingdoms.length; index++) for (let otherIndex = index + 1; otherIndex < state.kingdoms.length; otherIndex++) {
      const first = state.kingdoms[index], other = state.kingdoms[otherIndex], relation = first.relations[relationKey(other.id)] || setRelation(first, other, "peace", engine.randi(-25, 25));
      if (relation.status === "war") { resolveConflict(first, other, relation); continue; }
      relation.value = engine.clamp(relation.value + engine.rand(-5, 5) + (relation.status === "alliance" ? 1 : 0), -100, 100); other.relations[relationKey(first.id)].value = relation.value;
      if (relation.status === "alliance" && relation.value < 20) { setRelation(first, other, "peace", relation.value); addEvent(`${first.name}与${other.name}解除同盟`); continue; }
      if (relation.status === "peace" && relation.value <= diplomacy.warThreshold && engine.random() < diplomacy.warChance) { setRelation(first, other, "war", relation.value); state.worldStats.warsStarted++; addEvent(`${first.name}与${other.name}发生冲突`, true); }
      else if (relation.status === "peace" && relation.value >= diplomacy.allianceThreshold && engine.random() < diplomacy.allianceChance) { setRelation(first, other, "alliance", relation.value); addEvent(`${first.name}与${other.name}结成同盟`, true); }
    }
  }

  function structuresInRadius(x, y, radius) { const result = []; for (const village of state.villages) for (const structure of village.structures) if (Math.hypot(structure.x - x, structure.y - y) <= radius) result.push({ village, structure }); return result; }
  function peopleInRadius(x, y, radius) { return state.people.filter(person => Math.hypot(person.x - x, person.y - y) <= radius); }
  function damageStructures(x, y, radius, minimum, maximum) {
    for (const { village, structure } of structuresInRadius(x, y, radius)) { const protection = village.structures.some(item => item.type === "wall") ? 1 - config.buildings.wall.protection : 1; structure.health -= engine.rand(minimum, maximum) * protection; }
    for (const village of state.villages) { const before = village.structures.length; village.structures = village.structures.filter(item => item.health > 0 || item.type === "hall"); state.worldStats.buildingsDestroyed += before - village.structures.length; updateVillageCapacity(village); }
  }
  function triggerDisaster(type, x = null, y = null, manual = false) {
    const definition = config.disasters[type]; if (!definition) return null;
    let tile = x == null ? choice(state.tiles.filter(item => isLand(item) && item.terrain !== "mountain")) : findLandNear(x, y, 7); if (!tile) return null;
    const disaster = { id: state.ids.disaster++, type, x: tile.x, y: tile.y, radius: definition.radius, remaining: definition.duration, applied: false }; state.activeDisasters.push(disaster); state.worldStats.disastersTriggered++; addEvent(`${manual ? "神力引发" : "自然发生"}${definition.name}，影响${tile.x}，${tile.y}附近`, true); globalThis.RealmAudio?.play("disaster", { x: tile.x, worldWidth: config.map.width }); return disaster;
  }
  function applyDisaster(disaster) {
    if (disaster.type === "earthquake") { damageStructures(disaster.x, disaster.y, disaster.radius, 18, 50); for (const person of peopleInRadius(disaster.x, disaster.y, disaster.radius)) person.health -= engine.rand(5, 20); }
    if (disaster.type === "flood") { for (const person of peopleInRadius(disaster.x, disaster.y, disaster.radius)) person.health -= engine.rand(.1, .7); forEachTileRadius(disaster, tile => { tile.dryness = Math.max(0, tile.dryness - .1); }); }
    if (disaster.type === "tornado") { damageStructures(disaster.x, disaster.y, disaster.radius, 1, 5); for (const person of peopleInRadius(disaster.x, disaster.y, disaster.radius * .55)) person.health -= engine.rand(1, 5); disaster.x = engine.clamp(disaster.x + engine.rand(-.7, .7), 0, config.map.width - 1); disaster.y = engine.clamp(disaster.y + engine.rand(-.7, .7), 0, config.map.height - 1); }
    if (disaster.type === "volcano") { forEachTileRadius(disaster, tile => { if (isLand(tile) && engine.random() < .08) tile.fire = Math.max(tile.fire, engine.randi(20, 55)); }); if (disaster.remaining % 12 < 1) damageStructures(disaster.x, disaster.y, disaster.radius, 2, 8); }
    if (disaster.type === "plague") for (const person of peopleInRadius(disaster.x, disaster.y, disaster.radius)) if (engine.random() < .045) person.health -= engine.rand(1, 4);
    if (disaster.type === "drought") forEachTileRadius(disaster, tile => { if (isLand(tile)) { tile.dryness = Math.min(1, tile.dryness + .006); tile.fertility = Math.max(.04, tile.fertility - .0007); } });
  }
  function forEachTileRadius(disaster, callback) { const radius = Math.ceil(disaster.radius); for (let y = disaster.y - radius; y <= disaster.y + radius; y++) for (let x = disaster.x - radius; x <= disaster.x + radius; x++) { const tile = getTile(x, y); if (tile && Math.hypot(tile.x - disaster.x, tile.y - disaster.y) <= disaster.radius) callback(tile); } }
  function stepDisasters() {
    for (const disaster of state.activeDisasters) { applyDisaster(disaster); disaster.applied = true; disaster.remaining--; }
    const completed = state.activeDisasters.filter(item => item.remaining <= 0); state.worldStats.disastersSurvived += completed.length; for (const item of completed) addEvent(`${config.disasters[item.type].name}逐渐平息`, true); state.activeDisasters = state.activeDisasters.filter(item => item.remaining > 0);
    if (state.randomDisasters && state.ticks >= state.nextDisasterTick) { triggerDisaster(choice(Object.keys(config.disasters))); state.nextDisasterTick = state.ticks + Math.round(config.disasterIntervals[state.disasterFrequency] * engine.rand(.7, 1.3)); }
  }
  function stepFireAndLand() {
    for (const tile of state.tiles) { if (tile.fire > 0) { tile.fire--; tile.fertility = Math.max(.03, tile.fertility - .0015); if (tile.fire <= 0 && (tile.terrain === "forest" || tile.terrain === "grass")) tile.terrain = "scorched"; } else if (tile.dryness > 0 && state.climate.weather === "rain") tile.dryness = Math.max(0, tile.dryness - .003); else if (tile.terrain === "scorched" && tile.fertility > .25 && engine.random() < .00008) tile.terrain = "grass"; }
  }
  function updateClimate() {
    state.climate.seasonIndex = Math.floor(Math.max(0, state.year - 1)) % 4; if (state.ticks >= state.climate.weatherUntil) { const season = config.seasons[state.climate.seasonIndex].id, choices = season === "winter" ? ["clear", "frost", "frost", "storm"] : season === "summer" ? ["clear", "clear", "rain", "heatwave"] : ["clear", "rain", "rain", "storm"]; state.climate.weather = choice(choices); state.climate.weatherUntil = state.ticks + config.balance.cadence.weather * engine.rand(.65, 1.25); }
  }
  function ecologicalRecovery() { for (const tile of state.tiles) if (isLand(tile) && tile.fire <= 0 && tile.dryness < .5) { tile.fertility = Math.min(1, tile.fertility + (state.climate.weather === "rain" ? .003 : .0005)); if (tile.terrain === "grass" && tile.moisture > .6 && engine.random() < .0008) tile.terrain = "forest"; } worldMetrics(); }
  function removeEmptyKingdoms() {
    buildIndexes(); const empty = state.kingdoms.filter(kingdom => !state.villages.some(village => village.kingdomId === kingdom.id) && !(state.indexes.peopleByKingdom.get(kingdom.id)?.length)); if (!empty.length) return; const ids = new Set(empty.map(item => item.id)); state.kingdoms = state.kingdoms.filter(item => !ids.has(item.id)); for (const kingdom of state.kingdoms) for (const oldId of ids) delete kingdom.relations[relationKey(oldId)]; buildIndexes();
  }
  function simulateStep() {
    state.ticks++; state.year += config.balance.simulation.yearsPerStep; updateClimate();
    if (state.ticks % config.balance.cadence.people === 0) stepPeople(); if (state.ticks % config.balance.cadence.animals === 0) stepAnimals(); if (state.ticks % config.balance.cadence.resources === 0) resourceStep(); if (state.ticks % config.balance.cadence.construction === 0) constructionStep(); if (state.ticks % config.balance.cadence.diplomacy === 0) diplomacyStep(); if (state.ticks % 250 === 0) expansionStep(); if (state.ticks % config.balance.cadence.biodiversity === 0) ecologicalRecovery();
    stepDisasters(); stepFireAndLand(); if (state.ticks % 500 === 0) removeEmptyKingdoms(); engine.removeDeadEntities(state.people); engine.removeDeadEntities(state.animals); state.worldStats.peakPopulation = Math.max(state.worldStats.peakPopulation, state.people.length); state.worldStats.peakAnimals = Math.max(state.worldStats.peakAnimals, state.animals.length);
    const year = Math.floor(state.year); if (typeof localStorage !== "undefined" && persistence.settings().autoSave && year > lastAutoYear && year % 5 === 0) { lastAutoYear = year; try { persistence.save(state, 0); const status = document.getElementById("saveStatus"); if (status) status.textContent = `已自动保存 · 纪元 ${year}`; } catch { /* 存储空间不足时不中断模拟。 */ } }
  }

  function settleRaceAt(race, x, y) {
    const spot = findLandNear(x, y, 5); if (!spot) return false; buildIndexes(); let village = state.villages.filter(item => state.indexes.kingdomById.get(item.kingdomId)?.race === race).sort((a, b) => Math.hypot(a.x - spot.x, a.y - spot.y) - Math.hypot(b.x - spot.x, b.y - spot.y))[0];
    if (!village || Math.hypot(village.x - spot.x, village.y - spot.y) > 9) { const kingdom = createKingdom(race); village = createVillage(kingdom, spot.x, spot.y); claimTerritory(); addEvent(`${config.races[race].name}在新的土地定居`, true); }
    if (!village) return false; createPerson(race, spot.x, spot.y, village); buildIndexes(); return true;
  }
  function applyBrush(x, y, callback) { const radius = state.brushSize; for (let ty = Math.floor(y) - radius; ty <= Math.floor(y) + radius; ty++) for (let tx = Math.floor(x) - radius; tx <= Math.floor(x) + radius; tx++) { const tile = getTile(tx, ty); if (tile && Math.hypot(tx - x, ty - y) <= radius) callback(tile); } }
  function applyToolAt(x, y, dragging = false) {
    const tx = Math.floor(x), ty = Math.floor(y), key = `${state.selectedTool}:${tx}:${ty}`; if (dragging && key === lastToolCell) return; lastToolCell = key; const tool = state.selectedTool, tile = getTile(tx, ty); if (!tile) return;
    if (tool === "land") applyBrush(x, y, item => { if (item.terrain === "water" || item.terrain === "deepWater") item.terrain = "grass"; item.fertility = Math.max(.5, item.fertility); });
    else if (tool === "water") applyBrush(x, y, item => { item.terrain = "water"; item.fire = 0; item.kingdomId = null; });
    else if (tool === "forest") applyBrush(x, y, item => { if (isLand(item) && item.terrain !== "mountain" && item.terrain !== "snow") { item.terrain = "forest"; item.fertility = Math.max(.68, item.fertility); } });
    else if (raceTypes.has(tool)) settleRaceAt(tool, x, y);
    else if (animalTypes.has(tool)) createAnimal(tool, x, y, 0);
    else if (tool === "bless") { applyBrush(x, y, item => { if (isLand(item)) { item.fertility = Math.min(1, item.fertility + .16); item.dryness = Math.max(0, item.dryness - .2); item.fire = 0; } }); for (const person of peopleInRadius(x, y, state.brushSize)) { person.health = Math.min(100, person.health + 30); person.happiness = Math.min(100, person.happiness + 20); } }
    else if (tool === "fire") applyBrush(x, y, item => { if (isLand(item)) item.fire = Math.max(item.fire, engine.randi(25, 65)); });
    else if (disasterTools.has(tool)) triggerDisaster(tool, x, y, true);
    else return; worldMetrics(); globalThis.RealmUI?.invalidateTerrain(); globalThis.RealmAudio?.play("power", { x, worldWidth: config.map.width });
  }
  function describeAt(x, y) {
    const tile = getTile(x, y); if (!tile) return null; buildIndexes(); const person = state.people.filter(item => Math.hypot(item.x - x, item.y - y) < .8).sort((a, b) => distance(a, { x, y }) - distance(b, { x, y }))[0];
    if (person) { const village = state.indexes.villageById.get(person.villageId); return { x: Math.floor(person.x), y: Math.floor(person.y), icon: config.races[person.race].icon, title: person.name, lines: [config.races[person.race].name, `${Math.floor(person.age)} 岁`, `健康 ${Math.round(person.health)}`, village?.name || "独居"] }; }
    const village = state.villages.find(item => Math.hypot(item.x - x, item.y - y) < 2.2); if (village) { const kingdom = state.indexes.kingdomById.get(village.kingdomId), population = villagePopulation(village).length; return { x: village.x, y: village.y, icon: "⌂", title: village.name, lines: [kingdom?.name || "独立聚落", `${population} 人`, `${village.structures.length} 座建筑`, `🌾${Math.floor(village.resources.food)} 🪵${Math.floor(village.resources.wood)} 🪨${Math.floor(village.resources.stone)}`] }; }
    const animal = state.animals.find(item => Math.hypot(item.x - x, item.y - y) < .8); if (animal) return { x: Math.floor(animal.x), y: Math.floor(animal.y), icon: config.animals[animal.species].icon, title: config.animals[animal.species].name, lines: [`年龄 ${Math.floor(animal.age)}`, `健康 ${Math.round(animal.health)}`, `饥饿 ${Math.round(animal.hunger)}`] };
    const kingdom = state.indexes.kingdomById.get(tile.kingdomId), names = { deepWater: "深海", water: "浅海", sand: "沙滩", grass: "草地", forest: "森林", hill: "丘陵", mountain: "山地", snow: "雪峰", scorched: "焦土" }; return { x: tile.x, y: tile.y, icon: tile.terrain === "forest" ? "🌲" : tile.terrain.includes("water") ? "💧" : "◇", title: names[tile.terrain], lines: [`肥力 ${Math.round(tile.fertility * 100)}%`, `湿润 ${Math.round((1 - tile.dryness) * 100)}%`, kingdom?.name || "无归属"] };
  }

  function restore(restored) { state = restored; state.indexes = null; ensureUniqueNames(state.kingdoms, "王国"); ensureUniqueNames(state.villages, "聚落"); worldMetrics(); buildIndexes(); engine.setSeed(state.worldSeed); if (state.randomState) engine.restoreRandomState(state.randomState); lastAutoYear = Math.floor(state.year); globalThis.RealmUI?.resetCamera(); globalThis.RealmUI?.resetTools(); globalThis.RealmUI?.refreshSelection(); const input = typeof document !== "undefined" ? document.getElementById("worldSeedInput") : null; if (input) input.value = state.worldSeed; return state; }
  function save(slot = 0) { const result = persistence.save(state, slot); if (typeof document !== "undefined") document.getElementById("saveStatus").textContent = `已保存到存档 ${slot + 1} · 纪元 ${Math.floor(state.year)}`; globalThis.RealmUI?.showToast("世界已保存"); return result; }
  function load(slot = 0) { const restored = persistence.load(slot); if (!restored) { globalThis.RealmUI?.showToast("这个存档是空的"); return false; } restore(restored); globalThis.RealmUI?.showToast("世界已载入"); return true; }
  function importSave(raw) { restore(persistence.normalize(raw)); globalThis.RealmUI?.showToast("存档已导入"); return true; }
  function newWorld(seed = null) { makeState(seed || engine.createRandomSeed()); lastAutoYear = 0; globalThis.RealmUI?.resetCamera(); const input = typeof document !== "undefined" ? document.getElementById("worldSeedInput") : null; if (input) input.value = state.worldSeed; globalThis.RealmUI?.showToast("新世界已经诞生"); return state; }
  function step(amount = 1) { for (let index = 0; index < Math.max(0, Math.floor(amount)); index++) simulateStep(); return state; }
  function snapshot() { buildIndexes(); const starving = state.people.filter(person => (state.indexes.villageById.get(person.villageId)?.resources.food || 0) <= 0).length; return { seed: state.worldSeed, year: state.year, ticks: state.ticks, population: state.people.length, races: Object.fromEntries(Object.keys(config.races).map(race => [race, state.people.filter(person => person.race === race).length])), animals: state.animals.length, villages: state.villages.length, kingdoms: state.kingdoms.length, famineRatio: state.people.length ? starving / state.people.length : 0, wars: countWars(), disasters: state.activeDisasters.length, history: state.chronicle.length, buildings: state.villages.reduce((sum, village) => sum + village.structures.length, 0) }; }
  function loop(time) {
    if (!lastTime) lastTime = time; const delta = Math.min(100, time - lastTime); lastTime = time; if (state.running) { accumulator += delta * state.speed; let steps = 0; while (accumulator >= 70 && steps < 8) { simulateStep(); accumulator -= 70; steps++; } }
    globalThis.RealmUI?.frame(state, time); globalThis.RealmExperience?.updateAudio(state); requestAnimationFrame(loop);
  }
  const api = {
    getState: () => state, newWorld, step, snapshot, applyToolAt, describeAt, triggerDisaster, countWars,
    toggleRunning() { state.running = !state.running; return state.running; }, setSpeed(value) { if ([1, 2, 4].includes(value)) state.speed = value; }, setTool(value) { state.selectedTool = value; globalThis.RealmAudio?.play("click"); }, setBrush(value) { state.brushSize = engine.clamp(Math.floor(value), 1, 6); }, setRandomDisasters(value) { state.randomDisasters = Boolean(value); }, setDisasterFrequency(value) { if (Object.hasOwn(config.disasterIntervals, value)) { state.disasterFrequency = value; state.nextDisasterTick = state.ticks + config.disasterIntervals[value]; } }, save, load, importSave, restore, toast(message) { globalThis.RealmUI?.showToast(message); }, setRelation(firstId, otherId, status, value = 0) { buildIndexes(); const first = state.indexes.kingdomById.get(firstId), other = state.indexes.kingdomById.get(otherId); return first && other ? setRelation(first, other, status, value) : null; }
  };
  globalThis.RealmGame = Object.freeze(api);
  makeState("myriad-realms");
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => { globalThis.RealmUI.initialize(api); globalThis.RealmExperience.initialize(api); requestAnimationFrame(loop); });
})();
