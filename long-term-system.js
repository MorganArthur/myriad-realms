"use strict";

// 长期内容层：文明时代、文明野心、里程碑与永久传承。

const eraDefs = Object.freeze([
  { id: "kindling", name: "火种纪", icon: "✦", color: "#bca36b", effect: "文明初生，尚在荒野中寻找立足之地。" },
  { id: "settlement", name: "聚落纪", icon: "⌂", color: "#8fbd72", effect: "资源产出 +3%，研究效率 +2%。" },
  { id: "city_state", name: "城邦纪", icon: "🏛", color: "#74b7c7", effect: "资源产出 +6%，研究效率 +6%，建造消耗 -3%。" },
  { id: "flourishing", name: "盛世纪", icon: "☀", color: "#e2ba5d", effect: "资源产出 +10%，研究效率 +12%，建造消耗 -6%。" },
  { id: "legendary", name: "传奇纪", icon: "♛", color: "#d58bca", effect: "资源产出 +15%，研究效率 +20%，军队战力 +6%。" }
]);

const ambitionDefs = Object.freeze({
  unity: {
    name: "一统山河", icon: "◆", color: "#d8975d", summary: "扩张人口、聚落与行政网络，建立统一而稳定的国度。", legacy: "王土传承：合法性恢复加快，社会动乱更易平息。", renown: 14,
    score: (context, kingdom) => context.villages * 9 + context.population * .7 + technologyLevel(kingdom, "administration") * 15 + (kingdom.race === "human" ? 28 : 0),
    goals: (context, kingdom) => [
      { id: "population", label: "国民", value: context.population, target: 28 },
      { id: "villages", label: "聚落", value: context.villages, target: 4 },
      { id: "administration", label: "行政学", value: technologyLevel(kingdom, "administration"), target: 2 }
    ]
  },
  trade_hegemony: {
    name: "商路霸权", icon: "⚖", color: "#cfaa62", summary: "以市场、商队与充盈国库连接整个世界。", legacy: "金路传承：资源产出提高，国库持续获得商贸收益。", renown: 14,
    score: context => context.tradeRoutes * 14 + context.tradeDeliveries * 2 + context.treasury * .12 + context.markets * 6,
    goals: context => [
      { id: "routes", label: "商路", value: context.tradeRoutes, target: 3 },
      { id: "deliveries", label: "交付", value: context.tradeDeliveries, target: 10 },
      { id: "treasury", label: "国库", value: context.treasury, target: 120 }
    ]
  },
  knowledge: {
    name: "求知长明", icon: "💡", color: "#7ebbcf", summary: "推动多门知识共同进步，让学术成为文明的根基。", legacy: "启明传承：研究效率永久提高。", renown: 15,
    score: (context, kingdom) => context.technology * 9 + context.advancedFields * 16 + kingdom.technology.researchRate * 3 + (kingdom.race === "elf" ? 10 : 0),
    goals: context => [
      { id: "technology", label: "总科技", value: context.technology, target: 10 },
      { id: "fields", label: "精研领域", value: context.advancedFields, target: 3 },
      { id: "rate", label: "研究效率", value: context.researchRate, target: 5 }
    ]
  },
  cultural_legacy: {
    name: "文脉千秋", icon: "❖", color: "#a889cf", summary: "积累文化影响、传统与跨国交流，留下共同记忆。", legacy: "文脉传承：文化影响与科技组织力持续增长。", renown: 14,
    score: context => context.influence * .45 + context.traditions * 18 + context.exchanges * 2.5,
    goals: context => [
      { id: "influence", label: "影响力", value: context.influence, target: 110 },
      { id: "traditions", label: "传统", value: context.traditions, target: 4 },
      { id: "exchanges", label: "文化交流", value: context.exchanges, target: 12 }
    ]
  },
  harmony: {
    name: "万物和鸣", icon: "❧", color: "#79b978", summary: "守护森林、粮食与医药，使文明和自然共同繁荣。", legacy: "翠境传承：粮食产出提高，并缓慢修复民生。", renown: 14,
    score: (context, kingdom) => context.forests * 1.2 + context.foodReserve * 5 + technologyLevel(kingdom, "medicine") * 17 + (kingdom.race === "elf" ? 30 : 0),
    goals: (context, kingdom) => [
      { id: "reserve", label: "人均储粮", value: context.foodReserve, target: 6 },
      { id: "forests", label: "领内森林", value: context.forests, target: 20 },
      { id: "medicine", label: "医药学", value: technologyLevel(kingdom, "medicine"), target: 2 }
    ]
  },
  wonder: {
    name: "不朽营造", icon: "🏗", color: "#d7a96e", summary: "以工程、城镇与宏大建筑证明文明的创造力。", legacy: "巨匠传承：木石产出提高，建造消耗永久降低。", renown: 16,
    score: (context, kingdom) => context.structures * 1.4 + context.greatTowns * 22 + technologyLevel(kingdom, "engineering") * 22 + (kingdom.race === "dwarf" ? 34 : 0),
    goals: (context, kingdom) => [
      { id: "structures", label: "建筑", value: context.structures, target: 35 },
      { id: "engineering", label: "工程学", value: technologyLevel(kingdom, "engineering"), target: 3 },
      { id: "towns", label: "三级城镇", value: context.greatTowns, target: 1 }
    ]
  },
  hegemony: {
    name: "铁血霸业", icon: "⚔", color: "#d76f5a", summary: "锻造强军、赢得征服并让尚武精神统领时代。", legacy: "战魂传承：军队战力提高，战争疲劳恢复加快。", renown: 16,
    score: (context, kingdom) => context.soldiers * 4 + context.conquests * 28 + kingdom.culture.values.valor * .5 + (kingdom.race === "orc" ? 38 : 0),
    goals: (context, kingdom) => [
      { id: "soldiers", label: "士兵", value: context.soldiers, target: 12 },
      { id: "conquests", label: "征服聚落", value: context.conquests, target: 2 },
      { id: "valor", label: "尚武价值", value: kingdom.culture.values.valor, target: 70 }
    ]
  },
  lasting_peace: {
    name: "天下弭兵", icon: "🤝", color: "#76b8a7", summary: "缔结盟约、维持长期和平并建立被认可的秩序。", legacy: "盟誓传承：外交关系与合法性更容易改善。", renown: 16,
    score: context => context.alliances * 24 + context.peaceYears * 2 + context.legitimacy * .45 - context.wars * 18,
    goals: context => [
      { id: "alliances", label: "同盟", value: context.alliances, target: 2 },
      { id: "peace", label: "连续和平", value: context.peaceYears, target: 12 },
      { id: "legitimacy", label: "合法性", value: context.legitimacy, target: 70 }
    ]
  }
});

let developmentMetricsCache = null;

function developmentWorldMetrics() {
  const signature = `${ticks}:${kingdoms.length}:${villages.length}:${people.length}:${tradeRoutes.length}:${heroes.length}`;
  if (developmentMetricsCache?.signature === signature && developmentMetricsCache.tiles === tiles) return developmentMetricsCache;
  const forests = new Map(), routeIds = new Map(), deliveries = new Map(), activeHeroes = new Map();
  for (const tile of tiles) if (tile.owner >= 0 && tile.type === "forest") forests.set(tile.owner, (forests.get(tile.owner) || 0) + 1);
  for (const route of tradeRoutes) {
    const realmIds = new Set([getVillage(route.fromVillage)?.kingdom, getVillage(route.toVillage)?.kingdom]);
    for (const kingdomId of realmIds) if (kingdomId !== null && kingdomId !== undefined) {
      if (!routeIds.has(kingdomId)) routeIds.set(kingdomId, new Set());
      routeIds.get(kingdomId).add(route.id); deliveries.set(kingdomId, (deliveries.get(kingdomId) || 0) + (Number(route.deliveries) || 0));
    }
  }
  for (const hero of heroes) if (hero.status === "active") activeHeroes.set(hero.kingdomId, (activeHeroes.get(hero.kingdomId) || 0) + 1);
  developmentMetricsCache = { signature, tiles, forests, routeIds, deliveries, activeHeroes };
  return developmentMetricsCache;
}

function createDevelopmentState(race = "human") {
  const ambition = { human: "unity", elf: "harmony", dwarf: "wonder", orc: "hegemony" }[race] || "cultural_legacy";
  return {
    era: "kindling", reached: [{ era: "kindling", year: 1 }], ambition, ambitionStartedYear: 1, ambitionLockedUntil: 5,
    milestones: {}, completedAmbitions: [], nextAmbitionYear: 1, peaceStartedYear: 1
  };
}

function eraIndexOf(era) {
  const index = eraDefs.findIndex(definition => definition.id === era);
  return index < 0 ? 0 : index;
}

function normalizeDevelopmentState(kingdom) {
  const fallback = createDevelopmentState(kingdom.race), saved = kingdom.development && typeof kingdom.development === "object" ? kingdom.development : {};
  const era = eraDefs.some(definition => definition.id === saved.era) ? saved.era : fallback.era;
  const eraIndex = eraIndexOf(era), reached = Array.isArray(saved.reached) ? saved.reached.filter(entry => entry && eraDefs.some(definition => definition.id === entry.era)).map(entry => ({ era: entry.era, year: Math.max(1, Number(entry.year) || 1) })) : [];
  for (let index = 0; index <= eraIndex; index++) if (!reached.some(entry => entry.era === eraDefs[index].id)) reached.push({ era: eraDefs[index].id, year: 1 });
  const completedAmbitions = Array.isArray(saved.completedAmbitions) ? saved.completedAmbitions.filter(entry => entry && ambitionDefs[entry.id]).map(entry => ({ id: entry.id, year: Math.max(1, Number(entry.year) || 1) })).filter((entry, index, values) => values.findIndex(candidate => candidate.id === entry.id) === index) : [];
  const milestones = {};
  if (saved.milestones && typeof saved.milestones === "object") for (const [ambition, ids] of Object.entries(saved.milestones)) if (ambitionDefs[ambition] && Array.isArray(ids)) milestones[ambition] = [...new Set(ids.map(String))].slice(0, 8);
  kingdom.development = {
    era, reached: reached.sort((a, b) => a.year - b.year),
    ambition: ambitionDefs[saved.ambition] && !completedAmbitions.some(entry => entry.id === saved.ambition) ? saved.ambition : null,
    ambitionStartedYear: Math.max(1, Number(saved.ambitionStartedYear) || Math.floor(year)), ambitionLockedUntil: Math.max(0, Number(saved.ambitionLockedUntil) || 0),
    milestones, completedAmbitions, nextAmbitionYear: Math.max(1, Number(saved.nextAmbitionYear) || 1), peaceStartedYear: Math.max(1, Number(saved.peaceStartedYear) || 1)
  };
  kingdom.conquests = Math.max(0, Math.floor(Number(kingdom.conquests) || 0));
  return kingdom.development;
}

function developmentContext(kingdom) {
  const metrics = developmentWorldMetrics(), citizens = peopleOfKingdom(kingdom.id), realmVillages = villagesOfKingdom(kingdom.id);
  const structures = realmVillages.reduce((sum, village) => sum + (village.structures?.length || 0), 0);
  const relations = Object.entries(kingdom.relations || {}).filter(([id]) => { const other = getKingdom(Number(id)); return other && !other.defeated; }).map(([, relation]) => relation);
  return {
    population: citizens.length, villages: realmVillages.length, structures, greatTowns: realmVillages.filter(village => village.level >= 3).length,
    technology: totalTechnologyLevel(kingdom), advancedFields: Object.keys(technologyDefs).filter(technology => technologyLevel(kingdom, technology) >= 2).length,
    researchRate: Number(kingdom.technology.researchRate) || 0, influence: Number(kingdom.culture.influence) || 0, traditions: kingdom.culture.traditions.length, exchanges: Number(kingdom.culture.exchanges) || 0,
    tradeRoutes: metrics.routeIds.get(kingdom.id)?.size || 0, tradeDeliveries: metrics.deliveries.get(kingdom.id) || 0, markets: realmVillages.reduce((sum, village) => sum + buildingCount(village, "market"), 0),
    treasury: Number(kingdom.treasury) || 0, forests: metrics.forests.get(kingdom.id) || 0, foodReserve: (Number(kingdom.resources.food) || 0) / Math.max(1, citizens.length), soldiers: citizens.filter(person => person.role === "soldier").length,
    conquests: Number(kingdom.conquests) || 0, alliances: relations.filter(relation => relation.status === "alliance").length, wars: relations.filter(relation => relation.status === "war").length,
    peaceYears: Math.max(0, year - (kingdom.development?.peaceStartedYear || year)), legitimacy: Number(kingdom.legitimacy) || 0,
    activeHeroes: metrics.activeHeroes.get(kingdom.id) || 0, completedAmbitions: kingdom.development?.completedAmbitions?.length || 0
  };
}

function eraRequirements(index, context) {
  const requirements = {
    1: [["人口", context.population, 8], ["聚落", context.villages, 1], ["建筑", context.structures, 5], ["科技", context.technology, 1]],
    2: [["人口", context.population, 16], ["聚落", context.villages, 2], ["建筑", context.structures, 16], ["科技", context.technology, 3], ["合法性", context.legitimacy, 45]],
    3: [["人口", context.population, 28], ["聚落", context.villages, 3], ["建筑", context.structures, 30], ["科技", context.technology, 7], ["商队交付", context.tradeDeliveries, 3]],
    4: [["人口", context.population, 42], ["聚落", context.villages, 5], ["建筑", context.structures, 50], ["科技", context.technology, 11], ["完成野心", context.completedAmbitions, 1], ["活跃英雄", context.activeHeroes, 1]]
  };
  return (requirements[index] || []).map(([label, value, target]) => ({ label, value, target }));
}

function eraProgressFor(kingdom, context = developmentContext(kingdom)) {
  const currentIndex = eraIndexOf(kingdom.development?.era), next = eraDefs[currentIndex + 1];
  if (!next) return { complete: true, percent: 100, next: null, requirements: [] };
  const requirements = eraRequirements(currentIndex + 1, context);
  const percent = requirements.length ? requirements.reduce((sum, requirement) => sum + Math.min(1, requirement.value / requirement.target), 0) / requirements.length * 100 : 0;
  return { complete: requirements.every(requirement => requirement.value >= requirement.target), percent, next, requirements };
}

function ambitionProgressFor(kingdom, context = developmentContext(kingdom)) {
  const id = kingdom.development?.ambition, definition = ambitionDefs[id];
  if (!definition) return { id: null, definition: null, goals: [], percent: 0, complete: false };
  const goals = definition.goals(context, kingdom).map(goal => ({ ...goal, value: Math.max(0, Number(goal.value) || 0) }));
  const percent = goals.length ? goals.reduce((sum, goal) => sum + Math.min(1, goal.value / goal.target), 0) / goals.length * 100 : 0;
  return { id, definition, goals, percent, complete: goals.every(goal => goal.value >= goal.target) };
}

function developmentHasLegacy(kingdom, ambition) {
  return Boolean(kingdom?.development?.completedAmbitions?.some(entry => entry.id === ambition));
}

function developmentResourceMultiplier(kingdom, resource) {
  if (!kingdom?.development) return 1;
  const eraBonus = [0, .03, .06, .1, .15][eraIndexOf(kingdom.development.era)] || 0;
  let bonus = eraBonus;
  if (kingdom.development.ambition === "trade_hegemony") bonus += .02;
  if (kingdom.development.ambition === "harmony" && resource === "food") bonus += .04;
  if (developmentHasLegacy(kingdom, "trade_hegemony")) bonus += .04;
  if (developmentHasLegacy(kingdom, "harmony") && resource === "food") bonus += .08;
  if (developmentHasLegacy(kingdom, "wonder") && ["wood", "stone"].includes(resource)) bonus += .05;
  return 1 + bonus;
}

function developmentResearchMultiplier(kingdom) {
  if (!kingdom?.development) return 1;
  let bonus = [0, .02, .06, .12, .2][eraIndexOf(kingdom.development.era)] || 0;
  if (kingdom.development.ambition === "knowledge") bonus += .04;
  if (developmentHasLegacy(kingdom, "knowledge")) bonus += .1;
  if (developmentHasLegacy(kingdom, "cultural_legacy")) bonus += .04;
  return 1 + bonus;
}

function developmentCombatMultiplier(kingdom) {
  if (!kingdom?.development) return 1;
  let bonus = [0, 0, .02, .04, .06][eraIndexOf(kingdom.development.era)] || 0;
  if (kingdom.development.ambition === "hegemony") bonus += .04;
  if (developmentHasLegacy(kingdom, "hegemony")) bonus += .08;
  return 1 + bonus;
}

function developmentConstructionCostMultiplier(kingdom) {
  if (!kingdom?.development) return 1;
  let reduction = [0, .01, .03, .06, .1][eraIndexOf(kingdom.development.era)] || 0;
  if (kingdom.development.ambition === "wonder") reduction += .04;
  if (developmentHasLegacy(kingdom, "wonder")) reduction += .08;
  return Math.max(.72, 1 - reduction);
}

function chooseKingdomAmbition(kingdom) {
  const development = normalizeDevelopmentState(kingdom), completed = new Set(development.completedAmbitions.map(entry => entry.id)), context = developmentContext(kingdom);
  const candidates = Object.entries(ambitionDefs).filter(([id]) => !completed.has(id));
  if (!candidates.length) return null;
  candidates.sort((a, b) => b[1].score(context, kingdom) - a[1].score(context, kingdom) || a[0].localeCompare(b[0]));
  return candidates[0][0];
}

function setKingdomAmbition(kingdom, ambition, guided = false) {
  const development = normalizeDevelopmentState(kingdom);
  if (!ambitionDefs[ambition] || development.completedAmbitions.some(entry => entry.id === ambition) || development.ambition === ambition) return false;
  development.ambition = ambition; development.ambitionStartedYear = Math.floor(year); development.ambitionLockedUntil = guided ? year + 12 : year + 6;
  development.milestones[ambition] ||= [];
  addEvent(`${guided ? "创世者引导" : "时代潮流推动"}${kingdom.name}立下文明野心“${ambitionDefs[ambition].name}”。`, "ambition");
  return true;
}

function guideKingdomAmbition(kingdomId, ambition) {
  const kingdom = getKingdom(kingdomId); if (!kingdom || kingdom.defeated) return false;
  if (year < (kingdom.development?.ambitionLockedUntil || 0)) { showToast(`野心将在纪元 ${Math.ceil(kingdom.development.ambitionLockedUntil)} 后允许调整`); return false; }
  if (!setKingdomAmbition(kingdom, ambition, true)) { showToast("这个野心当前无法选择"); return false; }
  showToast(`${kingdom.name}开始追求${ambitionDefs[ambition].name}`); updateUI(); renderDirty = true; return true;
}

function completeAmbition(kingdom, progress) {
  const development = kingdom.development, definition = progress.definition;
  development.completedAmbitions.push({ id: progress.id, year: Math.floor(year) });
  development.ambition = null; development.nextAmbitionYear = year + 4; development.ambitionLockedUntil = year + 4;
  kingdom.treasury = Math.min(99999, kingdom.treasury + 18); kingdom.legitimacy = Math.min(100, kingdom.legitimacy + 7); kingdom.unrest = Math.max(0, kingdom.unrest - 6); kingdom.technology.research += 5;
  worldStats.ambitionsCompleted = (worldStats.ambitionsCompleted || 0) + 1; worldProgress.renown += definition.renown;
  addEvent(`${definition.icon} ${kingdom.name}完成文明野心“${definition.name}”，获得${definition.legacy}`, "ambition");
  const capital = villagesOfKingdom(kingdom.id)[0]; if (capital) spawnExperienceEffect("event", capital.x, capital.y, definition.color);
  playExperienceSound("event");
}

function updateAmbition(kingdom, context) {
  let development = kingdom.development;
  if (!development.ambition && year >= development.nextAmbitionYear) {
    const next = chooseKingdomAmbition(kingdom); if (next) setKingdomAmbition(kingdom, next, false);
    development = kingdom.development;
  }
  const progress = ambitionProgressFor(kingdom, context); if (!progress.definition) return;
  const reached = development.milestones[progress.id] ||= [];
  for (const goal of progress.goals) if (goal.value >= goal.target && !reached.includes(goal.id)) {
    reached.push(goal.id); kingdom.treasury = Math.min(99999, kingdom.treasury + 4); kingdom.legitimacy = Math.min(100, kingdom.legitimacy + 1.5);
    addEvent(`${progress.definition.icon} ${kingdom.name}推进“${progress.definition.name}”：达成${goal.label}里程碑。`, "ambition");
  }
  if (progress.complete) completeAmbition(kingdom, progress);
}

function updateEra(kingdom, context) {
  const progress = eraProgressFor(kingdom, context); if (!progress.complete || !progress.next) return;
  kingdom.development.era = progress.next.id; kingdom.development.reached.push({ era: progress.next.id, year: Math.floor(year) });
  const index = eraIndexOf(progress.next.id); kingdom.treasury = Math.min(99999, kingdom.treasury + index * 9); kingdom.technology.research += index * 3; kingdom.legitimacy = Math.min(100, kingdom.legitimacy + 4);
  worldStats.erasReached = (worldStats.erasReached || 0) + 1; worldProgress.renown += index * 3;
  addEvent(`${progress.next.icon} ${kingdom.name}跨入${progress.next.name}。${progress.next.effect}`, "era");
  const capital = villagesOfKingdom(kingdom.id)[0]; if (capital) spawnExperienceEffect("event", capital.x, capital.y, progress.next.color);
  playExperienceSound("event");
}

function applyDevelopmentEffects(kingdom) {
  const development = kingdom.development, eraIndex = eraIndexOf(development.era);
  kingdom.legitimacy = Math.min(100, kingdom.legitimacy + eraIndex * .035);
  kingdom.culture.influence += eraIndex * .08;
  if (development.ambition === "unity" || developmentHasLegacy(kingdom, "unity")) kingdom.unrest = Math.max(0, kingdom.unrest - (developmentHasLegacy(kingdom, "unity") ? .16 : .07));
  if (development.ambition === "trade_hegemony" || developmentHasLegacy(kingdom, "trade_hegemony")) kingdom.treasury = Math.min(99999, kingdom.treasury + (developmentHasLegacy(kingdom, "trade_hegemony") ? .45 : .18));
  if (development.ambition === "cultural_legacy" || developmentHasLegacy(kingdom, "cultural_legacy")) kingdom.culture.influence += developmentHasLegacy(kingdom, "cultural_legacy") ? .35 : .16;
  if (development.ambition === "harmony" || developmentHasLegacy(kingdom, "harmony")) kingdom.resources.food = Math.min(9999, kingdom.resources.food + (developmentHasLegacy(kingdom, "harmony") ? .45 : .18));
  if (development.ambition === "hegemony" || developmentHasLegacy(kingdom, "hegemony")) kingdom.warWeariness = Math.max(0, kingdom.warWeariness - (developmentHasLegacy(kingdom, "hegemony") ? .22 : .08));
  if (development.ambition === "wonder" || developmentHasLegacy(kingdom, "wonder")) {
    const damaged = villagesOfKingdom(kingdom.id).flatMap(village => village.structures || []).find(structure => structure.hp < structure.maxHp);
    if (damaged) damaged.hp = Math.min(damaged.maxHp, damaged.hp + (developmentHasLegacy(kingdom, "wonder") ? .8 : .3));
  }
  if (development.ambition === "lasting_peace" || developmentHasLegacy(kingdom, "lasting_peace")) for (const [otherId, relation] of Object.entries(kingdom.relations || {})) {
    if (relation.status === "war") continue;
    const gain = developmentHasLegacy(kingdom, "lasting_peace") ? .16 : .07; relation.score = Math.min(100, relation.score + gain);
    const mirror = getKingdom(Number(otherId))?.relations?.[String(kingdom.id)]; if (mirror) mirror.score = relation.score;
  }
}

function longTermDevelopmentStep() {
  for (const kingdom of kingdoms) {
    if (kingdom.defeated) continue;
    normalizeDevelopmentState(kingdom);
    if (kingdomAtWar(kingdom.id)) kingdom.development.peaceStartedYear = year;
    const context = developmentContext(kingdom);
    updateEra(kingdom, context); updateAmbition(kingdom, context); applyDevelopmentEffects(kingdom);
  }
}

function formatDevelopmentValue(value) {
  return Number(value) >= 10 ? Math.floor(Number(value)) : Math.round(Number(value) * 10) / 10;
}

function ambitionControlsHtml(kingdom) {
  normalizeDevelopmentState(kingdom);
  const completed = new Set(kingdom.development.completedAmbitions.map(entry => entry.id));
  return Object.entries(ambitionDefs).map(([id, definition]) => `<button class="ambition-choice ${kingdom.development.ambition === id ? "active" : ""} ${completed.has(id) ? "completed" : ""}" data-ambition="${id}" ${completed.has(id) ? "disabled" : ""} title="${definition.summary}">${definition.icon} ${definition.name}${completed.has(id) ? " ✓" : ""}</button>`).join("");
}

function developmentDetailHtml(kingdom) {
  normalizeDevelopmentState(kingdom);
  const context = developmentContext(kingdom), era = eraDefs[eraIndexOf(kingdom.development.era)], eraProgress = eraProgressFor(kingdom, context), ambition = ambitionProgressFor(kingdom, context);
  const eraRequirementsHtml = eraProgress.next ? eraProgress.requirements.map(requirement => `<span class="development-requirement ${requirement.value >= requirement.target ? "met" : ""}">${requirement.label} ${formatDevelopmentValue(requirement.value)}/${requirement.target}</span>`).join("") : `<span class="development-requirement met">已抵达最高时代</span>`;
  const ambitionGoalsHtml = ambition.definition ? ambition.goals.map(goal => `<span class="development-requirement ${goal.value >= goal.target ? "met" : ""}">${goal.label} ${formatDevelopmentValue(goal.value)}/${goal.target}</span>`).join("") : `<span class="development-requirement met">所有文明野心均已完成</span>`;
  const legacyHtml = kingdom.development.completedAmbitions.map(entry => { const definition = ambitionDefs[entry.id]; return `<span class="legacy-chip" title="${definition.legacy}">${definition.icon} ${definition.name}</span>`; }).join("") || `<span class="muted">尚未形成永久传承</span>`;
  return `<h3>文明发展</h3><div class="era-banner" style="--era-color:${era.color}"><b>${era.icon} ${era.name}</b><span>${era.effect}</span></div><small class="development-caption">${eraProgress.next ? `迈向${eraProgress.next.name} · ${Math.floor(eraProgress.percent)}%` : "文明已进入最高时代"}</small><div class="development-track"><i style="width:${eraProgress.percent}%"></i></div><div class="development-requirements">${eraRequirementsHtml}</div><div class="ambition-detail" style="--ambition-color:${ambition.definition?.color || "#777"}"><b>${ambition.definition ? `${ambition.definition.icon} ${ambition.definition.name}` : "◇ 等待新野心"}</b><span>${ambition.definition?.summary || "文明正在回望已经完成的伟业。"}</span></div><small class="development-caption">野心进度 · ${Math.floor(ambition.percent)}%</small><div class="development-track ambition"><i style="width:${ambition.percent}%"></i></div><div class="development-requirements">${ambitionGoalsHtml}</div><div class="legacy-list">${legacyHtml}</div><div class="ambition-guide"><b>创世者引导文明野心</b><div>${ambitionControlsHtml(kingdom)}</div><small>调整后锁定 12 纪元；世界状态决定进度，已完成野心不会重复。</small></div>`;
}

function renderLongTermPanels() {
  const list = document.getElementById("developmentList"); if (!list) return;
  const active = kingdoms.filter(kingdom => !kingdom.defeated);
  list.innerHTML = active.length ? active.map(kingdom => {
    normalizeDevelopmentState(kingdom); const era = eraDefs[eraIndexOf(kingdom.development.era)], nextEra = eraProgressFor(kingdom), ambition = ambitionProgressFor(kingdom);
    return `<button class="development-item" data-development="${kingdom.id}" style="--kingdom-color:${kingdom.color};--era-color:${era.color}"><b>${era.icon} ${kingdom.name}</b><span>${era.name}${nextEra.next ? ` → ${nextEra.next.name} ${Math.floor(nextEra.percent)}%` : " · 巅峰"}</span><small>${ambition.definition ? `${ambition.definition.icon} ${ambition.definition.name} · ${Math.floor(ambition.percent)}%` : "全部野心已经完成"}</small><i><em style="width:${ambition.percent}%"></em></i></button>`;
  }).join("") : `<p class="muted">文明尚未点燃时代火种</p>`;
}

globalThis.RealmLongTerm = Object.freeze({ eraDefs, ambitionDefs, createDevelopmentState, normalizeDevelopmentState, developmentContext, eraProgressFor, ambitionProgressFor });
