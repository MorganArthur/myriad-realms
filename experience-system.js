"use strict";

// 体验系统：教程、外交记忆、英雄、事件链、地图模式、视觉特效与音频。

const experienceEngine = globalThis.WorldEngine;
const experienceConfig = globalThis.RealmConfig;

const tutorialSteps = Object.freeze([
  { title: "欢迎来到万象之境", text: "这里不是一张静止地图。文明、生态、贸易、战争和天灾都会在同一个世界中持续演化。", target: ".brand", action: "开始导览" },
  { title: "先观察世界", text: "点击地图任意位置，查看地块、居民、聚落或建筑的详细信息。", target: "#worldCanvas", signal: "inspect-map", action: "等待点击地图" },
  { title: "选择创世工具", text: "选择“播种森林”。左侧工具可以塑造地形、创造生物，也能降下神力与天灾。", target: '[data-tool="forest"]', signal: "select-tool", action: "等待选择工具" },
  { title: "在地图上施展神力", text: "现在点击地图，把一片合适的陆地变成森林。拖动可以连续塑造。", target: "#worldCanvas", signal: "use-tool", action: "等待使用工具" },
  { title: "让时间流动", text: "点击播放按钮。1×、2×、4×可以调整模拟速度，暂停时仍然可以观察和编辑世界。", target: "#pauseBtn", signal: "start-time", action: "等待开始模拟" },
  { title: "阅读世界纪事", text: "右侧会汇总目标、生态、贸易、军事、英雄和外交。点击国家、军团或英雄可以继续深入查看。", target: ".inspector", action: "继续" },
  { title: "你已掌握创世之力", text: "顶部的“？”可以随时重开教程；“百科”包含全部种族、建筑、生物和系统规则。接下来，让世界书写自己的历史。", target: "#helpBtn", action: "完成教程" }
]);

let tutorialState = { active: false, step: 0 };
let experienceUiReady = false;
let heroes = [], nextHeroId = 1;
let worldEventState = createWorldEventState(14);
let mapMode = "natural";
let experienceParticles = [];
let experienceAudioContext = null;
let audioEnabled = false;
let selectedHeroId = null;

const mapModeDefs = Object.freeze({
  natural: { name: "自然地貌", legend: "季节、地形与文明边界" },
  political: { name: "政治疆域", legend: "国家领土与未控制地区" },
  fertility: { name: "土地肥力", legend: "红色贫瘠 · 黄色一般 · 绿色丰饶" },
  population: { name: "人口密度", legend: "颜色越亮，所属国家人口越多" },
  diplomacy: { name: "外交关系", legend: "以当前选中国家为中心：绿同盟 · 红战争 · 金和平" }
});
const fertilityModePalette = Object.freeze(["#7d3434a0", "#945039a0", "#a9683da0", "#b88043a0", "#b99a45a0", "#a4a948a0", "#85ad48a0", "#67aa46a0", "#48a447a0", "#2c9949a0", "#158c4aa0"]);
const populationModePalette = Object.freeze(["#392d22a8", "#4a3825a8", "#5d4528a8", "#71532aa8", "#87622da8", "#9c7130a8", "#b18132a8", "#c89139a8", "#dda548a8", "#efbc5ca8", "#ffd979a8"]);

const heroArchetypes = Object.freeze({
  statesman: { name: "贤王", icon: "♛", color: "#f0ca68", effect: "提高国家合法性与外交信任" },
  warden: { name: "守望者", icon: "✦", color: "#78d59b", effect: "守护自然并鼓舞同盟" },
  artificer: { name: "锻造大师", icon: "◆", color: "#a8b6c4", effect: "推动工程与冶金研究" },
  champion: { name: "战团勇士", icon: "⚔", color: "#ef755d", effect: "提高个人战力与军团士气" },
  healer: { name: "济世者", icon: "✚", color: "#72d8bd", effect: "改善健康并抵御瘟疫" },
  explorer: { name: "远行者", icon: "➶", color: "#d99ee7", effect: "促进贸易、航运与文化交流" }
});

const heroNames = Object.freeze({
  human: ["阿尔登", "伊莲", "罗文", "塞拉", "凯恩", "米拉"],
  elf: ["艾洛温", "瑟兰", "露希雅", "费伦", "涅芙", "莱奥拉"],
  dwarf: ["布罗克", "杜林", "赫尔达", "托尔姆", "贝拉", "奥林"],
  orc: ["格罗玛", "乌拉克", "莎迦", "莫格", "拉卡", "杜戈"]
});

const worldEventChains = globalThis.RealmWorldEventContent?.chains || Object.freeze({});

function createWorldEventState(nextYear = 14) {
  return { nextYear, active: null, pending: null, consequences: [], history: [], memories: [], completed: {}, locked: [], nextConsequenceId: 1, lastChain: null };
}

function resetExperienceState() {
  heroes = []; nextHeroId = 1; selectedHeroId = null;
  worldEventState = createWorldEventState(12 + experienceEngine.randi(0, 6));
  experienceParticles = [];
}

function tutorialTarget() {
  return document.querySelector?.(tutorialSteps[tutorialState.step]?.target) || null;
}

function renderTutorial() {
  const panel = document.getElementById("tutorialPanel"); if (!panel) return;
  document.querySelectorAll?.(".tutorial-focus").forEach(element => element.classList.remove("tutorial-focus"));
  panel.hidden = !tutorialState.active;
  if (!tutorialState.active) return;
  const step = tutorialSteps[tutorialState.step], target = tutorialTarget();
  if (target) target.classList.add("tutorial-focus");
  panel.innerHTML = `<div class="tutorial-progress"><i style="width:${(tutorialState.step + 1) / tutorialSteps.length * 100}%"></i></div><small>创世指引 ${tutorialState.step + 1} / ${tutorialSteps.length}</small><h2>${step.title}</h2><p>${step.text}</p><div class="tutorial-actions"><button data-tutorial-action="skip">跳过</button><button class="primary" data-tutorial-action="next" ${step.signal ? "disabled" : ""}>${step.action}</button></div>`;
  if (target?.getBoundingClientRect) {
    const rect = target.getBoundingClientRect(), viewportWidth = document.documentElement?.clientWidth || 1280, viewportHeight = document.documentElement?.clientHeight || 720;
    const width = Math.min(360, viewportWidth - 24), panelHeight = 240;
    let left;
    if (rect.right + 14 + width <= viewportWidth - 12) left = rect.right + 14;
    else if (rect.left - width - 14 >= 12) left = rect.left - width - 14;
    else left = experienceEngine.clamp(rect.left + rect.width / 2 - width / 2, 12, viewportWidth - width - 12);
    let top = experienceEngine.clamp(rect.top, 12, Math.max(12, viewportHeight - panelHeight - 12));
    if (left < rect.right && left + width > rect.left && rect.bottom + 14 + panelHeight <= viewportHeight) top = rect.bottom + 14;
    panel.style.left = `${left}px`; panel.style.top = `${top}px`;
  }
}

function startTutorial(force = false) {
  if (!force && localStorage.getItem("realm-tutorial-complete") === "true") return;
  tutorialState = { active: true, step: 0 }; renderTutorial();
}

function finishTutorial() {
  tutorialState.active = false; localStorage.setItem("realm-tutorial-complete", "true"); renderTutorial();
  if (typeof showToast === "function") showToast("创世指引已完成，可通过顶部“？”重开");
}

function advanceTutorial() {
  if (!tutorialState.active) return;
  if (tutorialState.step >= tutorialSteps.length - 1) { finishTutorial(); return; }
  tutorialState.step++; renderTutorial();
}

function tutorialSignal(signal) {
  if (!tutorialState.active || tutorialSteps[tutorialState.step]?.signal !== signal) return;
  setTimeout(advanceTutorial, 180);
}

function normalizeDiplomaticRelation(relation) {
  if (!relation) return null;
  relation.trust = experienceEngine.clamp(Number.isFinite(Number(relation.trust)) ? Number(relation.trust) : 50 + relation.score * .25, 0, 100);
  relation.fear = experienceEngine.clamp(Number(relation.fear) || 10, 0, 100);
  relation.grievance = experienceEngine.clamp(Number(relation.grievance) || (relation.status === "war" ? 35 : 0), 0, 100);
  relation.intent ||= relation.status === "war" ? "征战" : "观望";
  relation.lastReason ||= "关系仍在形成";
  relation.memories = Array.isArray(relation.memories) ? relation.memories.slice(0, 6) : [];
  return relation;
}

function createDiplomaticRelationState(previous, status, score, since) {
  const source = normalizeDiplomaticRelation(previous || { status, score });
  return { status, score: experienceEngine.clamp(Math.round(score), -100, 100), since, trust: source.trust, fear: source.fear, grievance: source.grievance, intent: source.intent, lastReason: source.lastReason, memories: source.memories.map(memory => ({ ...memory })) };
}

function recordDiplomaticMemory(aId, bId, type, text, trustDelta = 0, grievanceDelta = 0) {
  const a = typeof getKingdom === "function" ? getKingdom(aId) : null, b = typeof getKingdom === "function" ? getKingdom(bId) : null;
  if (!a || !b) return;
  for (const [realm, other] of [[a, b], [b, a]]) {
    const relation = normalizeDiplomaticRelation(realm.relations?.[String(other.id)]); if (!relation) continue;
    relation.trust = experienceEngine.clamp(relation.trust + trustDelta, 0, 100);
    relation.grievance = experienceEngine.clamp(relation.grievance + grievanceDelta, 0, 100);
    relation.memories.unshift({ year: Math.floor(year), type, text }); relation.memories = relation.memories.slice(0, 6);
  }
}

function evaluateDiplomaticPair(a, b, relation, context) {
  normalizeDiplomaticRelation(relation);
  const reverse = normalizeDiplomaticRelation(b.relations?.[String(a.id)]);
  const powerRatio = Math.max(context.strengthA, context.strengthB) / Math.max(1, Math.min(context.strengthA, context.strengthB));
  const tradeLinks = tradeRoutes.filter(route => {
    const from = getVillage(route.fromVillage), to = getVillage(route.toVillage);
    return from && to && new Set([from.kingdom, to.kingdom]).has(a.id) && new Set([from.kingdom, to.kingdom]).has(b.id);
  }).length;
  const sharedEnemy = Object.keys(a.relations || {}).some(id => a.relations[id].status === "war" && b.relations?.[id]?.status === "war");
  const trustTarget = experienceEngine.clamp(46 + relation.score * .3 + tradeLinks * 9 + (relation.status === "alliance" ? 18 : relation.status === "war" ? -28 : 0) + (sharedEnemy ? 7 : 0) - relation.grievance * .22, 0, 100);
  relation.trust = experienceEngine.clamp(relation.trust + (trustTarget - relation.trust) * .18, 0, 100);
  relation.fear = experienceEngine.clamp(relation.fear * .88 + Math.max(0, powerRatio - 1) * 10 + (context.bordered ? 4 : 0), 0, 100);
  relation.grievance = experienceEngine.clamp(relation.grievance * (relation.status === "war" ? 1.01 : .94) + (context.bordered && relation.status !== "alliance" ? 1.15 : 0), 0, 100);
  const averageValor = ((a.culture?.values?.valor || 45) + (b.culture?.values?.valor || 45)) / 2;
  let drift = (relation.trust - 50) * .025 - relation.grievance * .045 + tradeLinks * .75 + (sharedEnemy ? 1.2 : 0);
  if (context.bordered && averageValor > 55) drift -= .6 + (averageValor - 55) * .025 + Math.max(0, relation.fear - 45) * .012;
  if (relation.status === "war") {
    relation.intent = Math.max(a.warWeariness || 0, b.warWeariness || 0) > 42 ? "寻求停战" : powerRatio > 2 ? "迫使屈服" : "消耗对手";
    relation.lastReason = relation.intent === "寻求停战" ? "战争疲劳正在压倒扩张诉求" : "战争记忆与领土冲突仍未消退";
  } else if (relation.score > 34 && relation.trust > 66 && relation.grievance < 18) {
    relation.intent = "深化合作"; relation.lastReason = tradeLinks ? "稳定商路正在积累互信" : "长期友好推动共同安全";
  } else if (context.bordered && relation.grievance > 42) {
    relation.intent = "准备冲突"; relation.lastReason = "边境摩擦与旧怨正在升级"; drift -= 2;
  } else if (relation.fear > 58) {
    relation.intent = "遏制强邻"; relation.lastReason = "力量差距引发安全焦虑"; drift -= 1;
  } else {
    relation.intent = tradeLinks ? "维持贸易" : "谨慎观望"; relation.lastReason = tradeLinks ? "经济往来高于政治分歧" : "尚无足以改变关系的共同利益";
  }
  const conquestPolicies = Number(a.policies?.military === "conquest") + Number(b.policies?.military === "conquest");
  const escalation = experienceEngine.clamp((context.bordered ? 6 : context.nearby ? 2 : 0) + conquestPolicies * 3 + Math.max(0, averageValor - 55) * .08 + relation.grievance * .12 - Math.max(0, relation.trust - 62) * .08, 0, 14);
  if (reverse) Object.assign(reverse, { trust: relation.trust, fear: relation.fear, grievance: relation.grievance, intent: relation.intent, lastReason: relation.lastReason, memories: relation.memories.map(memory => ({ ...memory })) });
  return { drift, escalation, seekPeace: relation.status === "war" && ((a.warWeariness || 0) > 45 || (b.warWeariness || 0) > 45 || relation.trust > 52) };
}

function diplomaticMemorySummary(relation) {
  normalizeDiplomaticRelation(relation);
  return `${relation.intent} · 信任 ${Math.round(relation.trust)} · 戒惧 ${Math.round(relation.fear)} · 旧怨 ${Math.round(relation.grievance)}`;
}

function heroArchetypeFor(kingdom, person) {
  if (person.role === "soldier" || kingdom.race === "orc") return "champion";
  if (kingdom.race === "elf") return "warden";
  if (kingdom.race === "dwarf") return "artificer";
  if (person.profession === "healer") return "healer";
  if (person.profession === "merchant") return "explorer";
  return "statesman";
}

function promoteHero(person, archetype = null) {
  if (!person || person.dead || person.heroId) return null;
  const kingdom = getKingdom(person.kingdom); if (!kingdom || kingdom.defeated) return null;
  archetype ||= heroArchetypeFor(kingdom, person);
  const names = heroNames[person.race] || heroNames.human, baseName = person.name || names[(person.id + kingdom.id * 3) % names.length];
  const hero = { id: nextHeroId++, personId: person.id, kingdomId: kingdom.id, name: baseName, archetype, title: heroArchetypes[archetype].name, level: 1, renown: 0, victories: 0, emergedYear: Math.floor(year), status: "active", legacy: "" };
  person.heroId = hero.id; person.health = Math.max(person.health, 115); person.blessed = true;
  if (archetype === "champion" && person.role === "soldier") { person.leadership = Math.max(person.leadership || 1, 1.16); person.isGeneral = true; }
  heroes.push(hero); worldStats.heroesEmerged = (worldStats.heroesEmerged || 0) + 1; addEvent(`${kingdom.name}的${hero.title}${hero.name}崭露头角。`, "hero");
  spawnExperienceEffect("hero", person.x, person.y, heroArchetypes[archetype].color); playExperienceSound("hero");
  return hero;
}

function heroForPerson(personId) { return heroes.find(hero => hero.personId === personId && hero.status === "active") || null; }
function heroCombatMultiplier(person) { const hero = person?.heroId ? heroes.find(candidate => candidate.id === person.heroId && candidate.status === "active") : null; return hero ? 1.08 + hero.level * .07 : 1; }

function recordHeroVictory(person) {
  const hero = heroForPerson(person?.id); if (!hero) return;
  hero.victories++; hero.renown += 8;
  const nextLevel = Math.min(5, 1 + Math.floor(hero.renown / 35));
  if (nextLevel > hero.level) { hero.level = nextLevel; addEvent(`${hero.title}${hero.name}声名远播，成长至 ${hero.level} 级。`, "hero"); playExperienceSound("hero"); }
}

function heroStep(force = false) {
  for (const hero of heroes) {
    const person = getPerson(hero.personId), kingdom = getKingdom(hero.kingdomId);
    if (hero.status !== "active") continue;
    if (!person || person.dead || !kingdom || kingdom.defeated) {
      hero.status = "legacy"; hero.fallenYear = Math.floor(year); hero.legacy = hero.victories ? `赢得 ${hero.victories} 场战斗` : "见证了文明的兴衰";
      recordHeroLegacy(hero, person);
      addEvent(`${hero.title}${hero.name}退出历史舞台，${hero.legacy}。`, "hero"); continue;
    }
    const def = heroArchetypes[hero.archetype]; hero.renown += .12;
    if (hero.archetype === "statesman") { kingdom.legitimacy = experienceEngine.clamp(kingdom.legitimacy + .25, 0, 100); kingdom.unrest = experienceEngine.clamp(kingdom.unrest - .12, 0, 100); }
    if (hero.archetype === "warden") person.needs.health = experienceEngine.clamp((person.needs.health || 70) + .4, 0, 100);
    if (hero.archetype === "artificer") kingdom.technology.research += .18;
    if (hero.archetype === "healer") for (const citizen of peopleOfKingdom(kingdom.id).slice(0, 12)) citizen.plague = Math.max(0, (citizen.plague || 0) - .3);
    if (hero.archetype === "explorer") kingdom.treasury += .08;
    person.health = Math.min(140, person.health + .12); hero.title = def.name;
  }
  const activeKingdoms = kingdoms.filter(kingdom => !kingdom.defeated);
  for (const kingdom of activeKingdoms) {
    const realmHeroes = heroes.filter(hero => hero.kingdomId === kingdom.id && hero.status === "active");
    if (realmHeroes.length >= 2 || (!force && experienceEngine.random() > .16)) continue;
    const candidates = peopleOfKingdom(kingdom.id).filter(person => !person.dead && !person.heroId && person.age >= 18).sort((a, b) => Number(b.isGeneral) - Number(a.isGeneral) || (b.happiness || 0) - (a.happiness || 0));
    if (candidates.length) promoteHero(candidates[Math.min(candidates.length - 1, experienceEngine.randi(0, Math.min(3, candidates.length - 1)))]);
  }
}

function normalizeExperienceState(savedHeroes, savedNextHeroId, savedEvents) {
  heroes = (Array.isArray(savedHeroes) ? savedHeroes : []).filter(hero => hero && Number.isFinite(Number(hero.id))).slice(0, 80).map(hero => ({ ...hero, id: Number(hero.id), personId: Number(hero.personId), kingdomId: Number(hero.kingdomId), name: experienceEngine.cleanText(hero.name) || "无名英雄", archetype: heroArchetypes[hero.archetype] ? hero.archetype : "statesman", level: experienceEngine.clamp(Math.floor(Number(hero.level) || 1), 1, 5), renown: Math.max(0, Number(hero.renown) || 0), victories: Math.max(0, Number(hero.victories) || 0), status: hero.status === "legacy" ? "legacy" : "active" }));
  nextHeroId = Math.max(Number(savedNextHeroId) || 1, 1, ...heroes.map(hero => hero.id + 1));
  for (const person of people) person.heroId = heroes.some(hero => hero.id === Number(person.heroId) && hero.personId === person.id) ? Number(person.heroId) : null;
  const source = savedEvents && typeof savedEvents === "object" ? savedEvents : createWorldEventState(year + 12);
  const normalizeParticipants = entries => (Array.isArray(entries) ? entries : []).map((entry, index) => ({ role: experienceEngine.cleanText(entry?.role) || `参与国 ${index + 1}`, kingdomId: Number(entry?.kingdomId ?? entry) })).filter(entry => getKingdom(entry.kingdomId)).slice(0, 4);
  const normalizeProgress = (progress, pending = false) => {
    const definition = worldEventChains[progress?.chain], chapter = definition?.stages?.[progress?.stage]; if (!definition || !chapter) return null;
    const participants = normalizeParticipants(progress.participants); return { chain: progress.chain, stage: progress.stage, startedYear: Math.max(1, Number(progress.startedYear) || Math.floor(year)), resumeAfterChoice: Boolean(progress.resumeAfterChoice), participants: participants.length ? participants : selectWorldEventParticipants(definition), path: Array.isArray(progress.path) ? progress.path.map(experienceEngine.cleanText).filter(Boolean).slice(-8) : [], ...(pending ? { availableYear: Math.max(year, Number(progress.availableYear) || year + 3) } : {}) };
  };
  const completed = {}; for (const [id, count] of Object.entries(source.completed || {})) if (worldEventChains[id]) completed[id] = Math.max(0, Math.floor(Number(count) || 0));
  const consequences = (Array.isArray(source.consequences) ? source.consequences : []).filter(item => item && worldEventChains[item.chain] && Array.isArray(item.effects)).slice(0, 80).map((item, index) => ({ id: Math.max(1, Number(item.id) || index + 1), chain: item.chain, choice: experienceEngine.cleanText(item.choice) || "legacy", dueYear: Math.max(year, Number(item.dueYear) || year + 1), text: experienceEngine.cleanText(item.text) || "旧日抉择产生了新的后果。", effects: item.effects, participantIds: (Array.isArray(item.participantIds) ? item.participantIds : []).map(Number).filter(id => getKingdom(id)).slice(0, 4) }));
  worldEventState = {
    nextYear: Math.max(year, Number(source.nextYear) || year + 12), active: normalizeProgress(source.active), pending: normalizeProgress(source.pending, true), consequences,
    history: (Array.isArray(source.history) ? source.history : []).filter(entry => entry && worldEventChains[entry.chain]).slice(0, 120).map(entry => ({ ...entry, year: Math.max(1, Number(entry.year) || 1), participantIds: (Array.isArray(entry.participantIds) ? entry.participantIds : []).map(Number).filter(id => getKingdom(id)).slice(0, 4) })),
    memories: (Array.isArray(source.memories) ? source.memories : []).filter(memory => memory && worldEventChains[memory.chain]).slice(0, 80).map(memory => ({ ...memory, year: Math.max(1, Number(memory.year) || 1), text: experienceEngine.cleanText(memory.text), participantIds: (Array.isArray(memory.participantIds) ? memory.participantIds : []).map(Number).filter(id => getKingdom(id)).slice(0, 4) })),
    completed, locked: [...new Set((Array.isArray(source.locked) ? source.locked : []).filter(id => worldEventChains[id]))], nextConsequenceId: Math.max(Number(source.nextConsequenceId) || 1, 1, ...consequences.map(item => item.id + 1)), lastChain: worldEventChains[source.lastChain] ? source.lastChain : null
  };
}

function eventStage(active = worldEventState.active) { return active ? worldEventChains[active.chain]?.stages?.[active.stage] || null : null; }

function worldEventContext() {
  const active = kingdoms.filter(kingdom => !kingdom.defeated), wars = active.reduce((sum, kingdom) => sum + Object.values(kingdom.relations || {}).filter(relation => relation.status === "war").length, 0) / 2;
  const average = selector => active.length ? active.reduce((sum, kingdom) => sum + selector(kingdom), 0) / active.length : 0;
  return { year, kingdoms: active.length, wars, tradeRoutes: tradeRoutes.length, dynasties: active.filter(kingdom => kingdom.dynasty?.rulerId).length, guildInfluence: average(kingdom => kingdom.politics?.factions?.guilds?.influence || 0), faith: average(kingdom => kingdom.culture?.values?.faith || 0), valor: average(kingdom => kingdom.culture?.values?.valor || 0), animals: animals.filter(animal => !animal.dead).length, disasters: worldStats.disastersTriggered || 0, ruins: typeof legacySites === "undefined" ? 0 : legacySites.length };
}

function worldEventChainEligible(chainId, context = worldEventContext()) {
  const definition = worldEventChains[chainId]; if (!definition || worldEventState.locked.includes(chainId)) return false;
  const conditions = definition.conditions || {};
  return context.year >= (conditions.minYear || 0) && context.kingdoms >= (conditions.minKingdoms || 1) && context.wars >= (conditions.minWars || 0) && context.tradeRoutes >= (conditions.minTradeRoutes || 0) && context.dynasties >= (conditions.minDynasties || 0) && context.guildInfluence >= (conditions.minGuildInfluence || 0) && context.faith >= (conditions.minFaith || 0) && context.valor >= (conditions.minValor || 0) && context.animals >= (conditions.minAnimals || 0) && context.disasters >= (conditions.minDisasters || 0) && context.ruins >= (conditions.minRuins || 0);
}

function worldEventFocusScore(kingdom, focus) {
  const population = peopleOfKingdom(kingdom.id).length, tech = typeof totalTechnologyLevel === "function" ? totalTechnologyLevel(kingdom) : Number(kingdom.technology?.research) || 0;
  if (focus === "food") return kingdom.resources?.food || 0;
  if (focus === "weakest") return -(population * 3 + (kingdom.legitimacy || 0) + (kingdom.resources?.food || 0) * .2);
  if (focus === "dynasty") return (kingdom.dynasty?.disputed ? 80 : 0) + (kingdom.dynasty?.prestige || 0) + population;
  if (focus === "guilds") return (kingdom.politics?.factions?.guilds?.influence || 0) * 2 + (kingdom.treasury || 0) * .08;
  if (focus === "faith") return (kingdom.culture?.values?.faith || 0) * 2 + (kingdom.legitimacy || 0);
  if (focus === "navigation") return (typeof technologyLevel === "function" ? technologyLevel(kingdom, "navigation") : 0) * 35 + tradeRoutes.filter(route => getVillage(route.fromVillage)?.kingdom === kingdom.id || getVillage(route.toVillage)?.kingdom === kingdom.id).length * 12;
  if (focus === "heroes") return heroes.filter(hero => hero.status === "active" && hero.kingdomId === kingdom.id).reduce((sum, hero) => sum + hero.level * 9, 0) + population;
  if (focus === "legacy") return (typeof artifacts === "undefined" ? 0 : artifacts.filter(artifact => artifact.kingdomId === kingdom.id).length * 30) + tech;
  if (focus === "military") return armies.filter(army => army.kingdomId === kingdom.id).reduce((sum, army) => sum + army.soldierIds.length, 0) * 3 + (kingdom.culture?.values?.valor || 0) + population;
  if (focus === "diplomacy") return Object.values(kingdom.relations || {}).reduce((sum, relation) => sum + (relation.trust || 0), 0) + tradeRoutes.length;
  if (focus === "disaster") return population + (kingdom.resources?.stone || 0) * .2 - (kingdom.unrest || 0);
  return tech * 10 + (kingdom.technology?.research || 0) + population;
}

function selectWorldEventParticipants(definition) {
  const active = kingdoms.filter(kingdom => !kingdom.defeated).sort((a, b) => worldEventFocusScore(b, definition.focus) - worldEventFocusScore(a, definition.focus) || a.id - b.id);
  const count = Math.min(active.length, Math.max(1, definition.roles?.length || 3));
  return active.slice(0, count).map((kingdom, index) => ({ role: definition.roles?.[index] || `参与国 ${index + 1}`, kingdomId: kingdom.id }));
}

function activateWorldEvent(chain, stage = worldEventChains[chain]?.first, options = {}) {
  const definition = worldEventChains[chain], chapter = definition?.stages?.[stage]; if (!chapter || (worldEventState.active && !options.force) || (!options.force && !worldEventChainEligible(chain))) return false;
  const resumeAfterChoice = typeof running !== "undefined" && running && !debugBatchMode;
  const participants = Array.isArray(options.participants) && options.participants.length ? options.participants : selectWorldEventParticipants(definition);
  worldEventState.active = { chain, stage, startedYear: Math.floor(year), resumeAfterChoice, participants, path: Array.isArray(options.path) ? options.path.slice(-8) : [] }; worldEventState.pending = null;
  addEvent(`${definition.icon} 世界事件“${chapter.title}”正在等待抉择。`, "world-event");
  if (resumeAfterChoice) setRunning(false, false);
  renderActiveWorldEvent(); renderExperiencePanels(); playExperienceSound("event");
  return true;
}

function worldEventTargetKingdoms(scope, participantIds) {
  const active = kingdoms.filter(kingdom => !kingdom.defeated), participants = participantIds.map(getKingdom).filter(kingdom => kingdom && !kingdom.defeated);
  if (scope === "primary") return participants.slice(0, 1);
  if (scope === "rival") return participants.slice(1, 2);
  if (scope === "participants") return participants;
  if (scope === "weakest") return [...active].sort((a, b) => peopleOfKingdom(a.id).length - peopleOfKingdom(b.id).length || a.id - b.id).slice(0, 1);
  if (scope === "strongest") return [...active].sort((a, b) => peopleOfKingdom(b.id).length - peopleOfKingdom(a.id).length || a.id - b.id).slice(0, 1);
  return active;
}

function applyRealmEventEffect(effect, participantIds) {
  for (const kingdom of worldEventTargetKingdoms(effect.scope, participantIds)) {
    for (const resource of ["food", "wood", "stone"]) if (Number.isFinite(effect[resource])) kingdom.resources[resource] = Math.max(0, (kingdom.resources[resource] || 0) + effect[resource]);
    if (Number.isFinite(effect.treasury)) kingdom.treasury = Math.max(0, (kingdom.treasury || 0) + effect.treasury);
    if (Number.isFinite(effect.research)) kingdom.technology.research = Math.max(0, (kingdom.technology.research || 0) + effect.research);
    for (const field of ["legitimacy", "unrest", "warWeariness"]) if (Number.isFinite(effect[field])) kingdom[field] = experienceEngine.clamp((kingdom[field] || 0) + effect[field], 0, 100);
    for (const field of ["faith", "valor"]) if (Number.isFinite(effect[field])) kingdom.culture.values[field] = experienceEngine.clamp((kingdom.culture.values[field] || 0) + effect[field], 0, 100);
    if (Number.isFinite(effect.influence)) kingdom.culture.influence = Math.max(0, (kingdom.culture.influence || 0) + effect.influence);
    for (const [field, target] of [["cohesion", "cohesion"], ["authority", "authority"]]) if (Number.isFinite(effect[field]) && kingdom.politics) kingdom.politics[target] = experienceEngine.clamp((kingdom.politics[target] || 0) + effect[field], 0, 100);
    if (Number.isFinite(effect.guildInfluence) && kingdom.politics?.factions?.guilds) kingdom.politics.factions.guilds.influence = experienceEngine.clamp(kingdom.politics.factions.guilds.influence + effect.guildInfluence, 0, 100);
    if (Number.isFinite(effect.armyMorale)) for (const army of armies.filter(candidate => candidate.kingdomId === kingdom.id)) army.morale = experienceEngine.clamp(army.morale + effect.armyMorale, 0, 100);
    if (["happiness", "health", "plague"].some(field => Number.isFinite(effect[field]))) for (const person of peopleOfKingdom(kingdom.id).slice(0, 50)) {
      if (Number.isFinite(effect.happiness)) person.happiness = experienceEngine.clamp((person.happiness || 0) + effect.happiness, 0, 100);
      if (Number.isFinite(effect.health)) { person.health = Math.max(1, person.health + effect.health); person.needs ||= {}; person.needs.health = experienceEngine.clamp((person.needs.health || 50) + effect.health, 0, 100); }
      if (Number.isFinite(effect.plague)) person.plague = Math.max(0, (person.plague || 0) + effect.plague);
    }
  }
}

function applyDiplomaticEventEffect(effect, participantIds) {
  const targets = worldEventTargetKingdoms(effect.scope, participantIds);
  for (let first = 0; first < targets.length; first++) for (let second = first + 1; second < targets.length; second++) {
    const a = targets[first], b = targets[second], relation = relationBetween(a.id, b.id); if (!relation) continue;
    if (effect.peace && relation.status === "war") setRelation(a.id, b.id, "peace", Math.max(-8, relation.score));
    const current = relationBetween(a.id, b.id); if (!current) continue;
    current.score = experienceEngine.clamp(current.score + (effect.score || 0), -100, 100); const reverse = relationBetween(b.id, a.id); if (reverse) reverse.score = current.score;
    recordDiplomaticMemory(a.id, b.id, effect.grievance > 0 ? "grievance" : "world-event", "共同经历了一场改变时代的事件", effect.trust || 0, effect.grievance || 0);
  }
}

function applyWorldScaleEventEffect(effect, participantIds) {
  if (Number.isFinite(effect.fertility) || Number.isFinite(effect.biomass)) for (const tile of tiles) if (isLand(tile)) {
    if (Number.isFinite(effect.fertility)) tile.fertility = experienceEngine.clamp((tile.fertility || 0) + effect.fertility, 0, 1);
    if (Number.isFinite(effect.biomass)) tile.biomass = experienceEngine.clamp((tile.biomass || 0) + effect.biomass, 0, 1);
  }
  if (Number.isFinite(effect.heroRenown)) for (const hero of heroes.filter(hero => hero.status === "active" && (!participantIds.length || participantIds.includes(hero.kingdomId)))) hero.renown += effect.heroRenown;
  if (Number.isFinite(effect.shortenDisasters)) for (const disaster of activeDisasters) disaster.duration = Math.max(1, disaster.duration - effect.shortenDisasters);
  if (Number.isFinite(effect.revealRuins) && typeof legacySites !== "undefined") {
    const primaryId = participantIds[0] ?? kingdoms.find(kingdom => !kingdom.defeated)?.id;
    for (const site of legacySites.filter(site => site.status === "hidden").slice(0, Math.max(0, Math.floor(effect.revealRuins)))) { site.status = "exploring"; site.kingdomId = primaryId ?? null; site.discoveredYear = Math.floor(year); site.progress = Math.max(site.progress || 0, 12); }
  }
  if (Number.isFinite(effect.wonderProgress) && typeof wonders !== "undefined") for (const wonder of wonders.filter(wonder => wonder.status === "building")) wonder.progress = experienceEngine.clamp(wonder.progress + effect.wonderProgress, 0, 100);
}

function applyWorldEventEffects(effects, participantIds = []) {
  for (const effect of Array.isArray(effects) ? effects : []) {
    if (effect?.type === "realm") applyRealmEventEffect(effect, participantIds);
    if (effect?.type === "diplomacy") applyDiplomaticEventEffect(effect, participantIds);
    if (effect?.type === "world") applyWorldScaleEventEffect(effect, participantIds);
  }
}

function rememberWorldEvent(active, choice, stage) {
  const participantIds = active.participants.map(participant => participant.kingdomId), chain = worldEventChains[active.chain], text = `${chain.name}·${stage.title}：${choice.ending || choice.label}`;
  const memory = { year: Math.floor(year), chain: active.chain, stage: active.stage, choice: choice.id, text, participantIds }; worldEventState.memories.unshift(memory); worldEventState.memories = worldEventState.memories.slice(0, 80);
  for (let first = 0; first < participantIds.length; first++) for (let second = first + 1; second < participantIds.length; second++) {
    recordDiplomaticMemory(participantIds[first], participantIds[second], "world-event", text, 0, 0);
    const firstRuler = getKingdom(participantIds[first])?.dynasty?.rulerId, secondRuler = getKingdom(participantIds[second])?.dynasty?.rulerId;
    if (firstRuler && secondRuler && typeof recordPersonalMemory === "function") recordPersonalMemory(firstRuler, secondRuler, "world-event", text, 0, 0, 0);
  }
  return memory;
}

function queueWorldEventConsequence(active, choice) {
  if (!choice.delayed?.effects?.length) return;
  worldEventState.consequences.push({ id: worldEventState.nextConsequenceId++, chain: active.chain, choice: choice.id, dueYear: year + Math.max(1, Number(choice.delayed.after) || 1), text: choice.delayed.text, effects: choice.delayed.effects, participantIds: active.participants.map(participant => participant.kingdomId) });
  worldEventState.consequences = worldEventState.consequences.slice(-80);
}

function processWorldEventConsequences() {
  const due = worldEventState.consequences.filter(item => item.dueYear <= year), waiting = worldEventState.consequences.filter(item => item.dueYear > year); if (!due.length) return;
  worldEventState.consequences = waiting;
  for (const consequence of due) { applyWorldEventEffects(consequence.effects, consequence.participantIds); addEvent(`⌛ ${consequence.text}`, "world-event"); worldEventState.memories.unshift({ year: Math.floor(year), chain: consequence.chain, stage: "consequence", choice: consequence.choice, text: consequence.text, participantIds: consequence.participantIds }); }
  worldEventState.memories = worldEventState.memories.slice(0, 80);
}

function resolveWorldEvent(choiceId, automatic = false) {
  const active = worldEventState.active, stage = eventStage(active); if (!active || !stage) return false;
  const resumeAfterChoice = Boolean(active.resumeAfterChoice);
  const choice = stage.choices.find(candidate => candidate.id === choiceId) || stage.choices[0];
  const participantIds = active.participants.map(participant => participant.kingdomId); applyWorldEventEffects(choice.effects, participantIds); queueWorldEventConsequence(active, choice);
  worldStats.worldEventsResolved = (worldStats.worldEventsResolved || 0) + 1;
  const memory = rememberWorldEvent(active, choice, stage); worldEventState.history.unshift({ ...memory, ending: choice.ending || null }); worldEventState.history = worldEventState.history.slice(0, 120);
  for (const locked of choice.locks || []) if (worldEventChains[locked] && !worldEventState.locked.includes(locked)) worldEventState.locked.push(locked);
  addEvent(`${worldEventChains[active.chain].name}：${automatic ? "各文明最终" : "创世者引导文明"}选择了“${choice.label}”。`, "world-event");
  spawnExperienceEffect("event", MAP_W / 2, MAP_H / 2, "#e7c269");
  const nextStage = choice.next === null ? null : choice.next || stage.next;
  if (nextStage) worldEventState.pending = { chain: active.chain, stage: nextStage, availableYear: year + 3 + experienceEngine.randi(0, 3), startedYear: Math.floor(year), resumeAfterChoice: false, participants: active.participants, path: [...active.path, choice.id].slice(-8) };
  else { worldEventState.completed[active.chain] = (worldEventState.completed[active.chain] || 0) + 1; worldEventState.lastChain = active.chain; worldEventState.nextYear = year + 10 + experienceEngine.randi(0, 8); }
  worldEventState.active = null; renderActiveWorldEvent(); updateUI(); if (resumeAfterChoice && !automatic) setRunning(true, false); return true;
}

function chooseNextWorldEventChain() {
  const eligible = Object.keys(worldEventChains).filter(id => worldEventChainEligible(id)); if (!eligible.length) return null;
  const unseen = eligible.filter(id => !(worldEventState.completed[id] > 0) && id !== worldEventState.lastChain), pool = unseen.length ? unseen : eligible.filter(id => id !== worldEventState.lastChain);
  const choices = pool.length ? pool : eligible; return choices[experienceEngine.randi(0, choices.length - 1)];
}

function worldEventStep() {
  processWorldEventConsequences();
  if (worldEventState.active) {
    if (year - worldEventState.active.startedYear > 2.5) { const stage = eventStage(); resolveWorldEvent(stage.choices[experienceEngine.randi(0, stage.choices.length - 1)].id, true); }
    return;
  }
  if (typeof legacyState !== "undefined" && (legacyState.activeEvent || legacyState.activeCrisis)) return;
  if (worldEventState.pending && year >= worldEventState.pending.availableYear) { const pending = worldEventState.pending; activateWorldEvent(pending.chain, pending.stage, { force: true, participants: pending.participants, path: pending.path }); return; }
  if (!worldEventState.pending && year >= worldEventState.nextYear) {
    const chain = chooseNextWorldEventChain(); if (chain) activateWorldEvent(chain); else worldEventState.nextYear = year + 4;
  }
}

function experienceSimulationStep() {
  if (ticks % 50 === 0) worldEventStep();
  if (ticks % 180 === 0) heroStep(false);
}

function buildMapModeContext() {
  const populationByKingdom = new Map(), active = kingdoms.filter(kingdom => !kingdom.defeated);
  for (const kingdom of active) populationByKingdom.set(kingdom.id, peopleOfKingdom(kingdom.id).length);
  const focus = getKingdom(selectedKingdomId) || active[0] || null;
  return { populationByKingdom, maxPopulation: Math.max(1, ...populationByKingdom.values()), focus };
}

function mapModeTileColor(tile, context) {
  if (!tile || mapMode === "natural") return null;
  if (mapMode === "political") return tile.owner >= 0 ? `${getKingdom(tile.owner)?.color || "#777"}a8` : "#0b1114a8";
  if (mapMode === "fertility") { if (!isLand(tile)) return "#12334482"; const value = experienceEngine.clamp(tile.fertility || 0, 0, 1); return fertilityModePalette[Math.round(value * 10)]; }
  if (mapMode === "population") { const value = tile.owner >= 0 ? (context.populationByKingdom.get(tile.owner) || 0) / context.maxPopulation : 0; return value ? populationModePalette[Math.round(experienceEngine.clamp(value, 0, 1) * 10)] : "#090d10b5"; }
  if (mapMode === "diplomacy") {
    if (!context.focus || tile.owner < 0) return "#0c1114a6";
    if (tile.owner === context.focus.id) return `${context.focus.color}ba`;
    const relation = relationBetween(context.focus.id, tile.owner);
    return relation?.status === "war" ? "#d94f47b8" : relation?.status === "alliance" ? "#4fbd83b8" : "#c9a9579a";
  }
  return null;
}

function setMapMode(mode) {
  mapMode = mapModeDefs[mode] ? mode : "natural"; localStorage.setItem("realm-map-mode", mapMode);
  const select = document.getElementById("mapModeSelect"); if (select) select.value = mapMode;
  const legend = document.getElementById("mapLegend"); if (legend) { legend.textContent = mapModeDefs[mapMode].legend; legend.hidden = mapMode === "natural"; }
  if (typeof renderDirty !== "undefined") renderDirty = true;
}

function spawnExperienceEffect(type, x, y, color = "#f1cb69") {
  const amount = type === "power" ? 16 : type === "battle" ? 10 : 12;
  for (let index = 0; index < amount; index++) {
    const angle = index / amount * Math.PI * 2 + ((Math.floor(x * 7 + y * 11) % 13) / 13), speed = .012 + index % 4 * .005;
    experienceParticles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - .012, life: 1, color, size: 1 + index % 3, type });
  }
  experienceParticles = experienceParticles.slice(-180);
}

function updateExperienceEffects(deltaMs) {
  const scale = Math.min(2, deltaMs / 16.67);
  for (const particle of experienceParticles) { particle.x += particle.vx * scale; particle.y += particle.vy * scale; particle.vy += .0008 * scale; particle.life -= .018 * scale; }
  experienceParticles = experienceParticles.filter(particle => particle.life > 0);
  if (experienceParticles.length && typeof renderDirty !== "undefined") renderDirty = true;
}

function renderExperienceEffects(context, metrics) {
  for (const particle of experienceParticles) {
    const sx = metrics.ox + (particle.x + .5) * metrics.size, sy = metrics.oy + (particle.y + .5) * metrics.size;
    context.save(); context.globalAlpha = Math.max(0, particle.life); context.fillStyle = particle.color;
    const size = Math.max(1, particle.size * metrics.size * .16); context.fillRect(sx - size / 2, sy - size / 2, size, size); context.restore();
  }
}

function renderHeroMarker(context, metrics, person, sx, sy, radius) {
  const hero = heroForPerson(person.id); if (!hero) return;
  const def = heroArchetypes[hero.archetype]; context.save(); context.strokeStyle = def.color; context.globalAlpha = .82; context.lineWidth = Math.max(1, metrics.size * .14);
  context.beginPath(); context.arc(sx, sy, radius + Math.max(2, metrics.size * .35), 0, Math.PI * 2); context.stroke();
  if (metrics.size > 5) { context.fillStyle = def.color; context.font = `${Math.max(9, metrics.size * 1.1)}px sans-serif`; context.textAlign = "center"; context.fillText(def.icon, sx, sy - radius - 4); }
  context.restore();
}

function playExperienceSound(name) {
  if (!audioEnabled) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext; if (!AudioCtor) return;
  experienceAudioContext ||= new AudioCtor();
  if (experienceAudioContext.state === "suspended") experienceAudioContext.resume();
  const presets = { click: [260, .025, .05], power: [420, .08, .18], disaster: [90, .18, .32], event: [330, .12, .28], hero: [520, .1, .3], battle: [140, .05, .12] };
  const [frequency, gainValue, duration] = presets[name] || presets.click, now = experienceAudioContext.currentTime;
  const oscillator = experienceAudioContext.createOscillator(), gain = experienceAudioContext.createGain();
  oscillator.type = name === "disaster" || name === "battle" ? "sawtooth" : "sine"; oscillator.frequency.setValueAtTime(frequency, now); oscillator.frequency.exponentialRampToValueAtTime(Math.max(55, frequency * .72), now + duration);
  gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(gainValue, now + .018); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  oscillator.connect(gain); gain.connect(experienceAudioContext.destination); oscillator.start(now); oscillator.stop(now + duration + .02);
}

function toggleExperienceAudio() {
  audioEnabled = !audioEnabled; localStorage.setItem("realm-audio-enabled", String(audioEnabled));
  const button = document.getElementById("audioBtn"); if (button) { button.textContent = audioEnabled ? "🔊" : "🔇"; button.title = audioEnabled ? "关闭世界音效" : "开启世界音效"; button.dataset.audioEnabled = String(audioEnabled); }
  if (typeof showToast === "function") showToast(audioEnabled ? "世界音效已开启" : "世界音效已关闭");
  if (audioEnabled) { try { playExperienceSound("hero"); } catch { showToast("浏览器暂时无法启用音效"); } }
}

function renderActiveWorldEvent() {
  const modal = document.getElementById("worldEventModal"); if (!modal) return;
  const active = worldEventState.active, stage = eventStage(active); modal.hidden = !active || !stage; if (!active || !stage) return;
  const chain = worldEventChains[active.chain], stages = Object.keys(chain.stages), chapter = stages.indexOf(active.stage) + 1;
  const participants = active.participants.map(participant => `${participant.role}：${getKingdom(participant.kingdomId)?.name || "失落文明"}`).join(" · ");
  document.getElementById("worldEventContent").innerHTML = `<div class="world-event-icon">${chain.icon}</div><small>${chain.name} · 第 ${chapter} / ${stages.length} 章</small><h2>${stage.title}</h2><p>${stage.text}</p><div class="world-event-participants">${participants}</div><div class="world-event-choices">${stage.choices.map(choice => `<button data-world-event-choice="${choice.id}"><b>${choice.label}</b><span>${choice.hint}</span>${choice.delayed ? `<small>⌛ 将在约 ${choice.delayed.after} 个纪元后产生后果</small>` : ""}</button>`).join("")}</div><small class="muted">若不选择，文明将在约 2.5 个纪元后自行决定；选择会写入外交、人物与世界历史。</small>`;
}

function inspectHero(heroId) {
  const hero = heroes.find(candidate => candidate.id === heroId); if (!hero) return;
  selectedHeroId = hero.id; selectedKingdomId = null; selectedTradeRouteId = null; selectedArmyId = null; selectedLegacyId = null;
  const person = getPerson(hero.personId), kingdom = getKingdom(hero.kingdomId), def = heroArchetypes[hero.archetype], box = document.getElementById("selectionCard");
  box.classList.remove("empty");
  box.innerHTML = `<h4 style="color:${def.color}">${def.icon} ${hero.title}${hero.name}</h4><div class="detail-row"><span>所属文明</span><b>${kingdom?.name || "失落文明"}</b></div><div class="detail-row"><span>状态 / 等级</span><b>${hero.status === "active" ? "活跃" : `传奇 · 纪元 ${hero.fallenYear || "?"}`} / ${hero.level}</b></div><div class="detail-row"><span>声望 / 胜绩</span><b>${Math.floor(hero.renown)} / ${hero.victories}</b></div><div class="detail-row"><span>现职</span><b>${person ? (professionDefs[person.profession]?.name || unitDefs[person.unitType]?.name || "居民") : "历史人物"}</b></div><p class="muted">${hero.status === "active" ? def.effect : hero.legacy || "事迹被编入世界史"}</p>${typeof heroArtifactDetailHtml === "function" ? heroArtifactDetailHtml(hero) : ""}`;
}

function renderExperiencePanels() {
  const heroList = document.getElementById("heroList");
  if (heroList) {
    const ordered = [...heroes].sort((a, b) => Number(a.status !== "active") - Number(b.status !== "active") || b.level - a.level || b.renown - a.renown).slice(0, 12);
    heroList.innerHTML = ordered.length ? ordered.map(hero => { const kingdom = getKingdom(hero.kingdomId), def = heroArchetypes[hero.archetype]; return `<button class="hero-item ${hero.status}" data-hero="${hero.id}" style="--hero-color:${def.color}"><b>${def.icon} ${hero.title}${hero.name}</b><span>${kingdom?.name || "失落文明"} · ${hero.level}级 · 声望 ${Math.floor(hero.renown)}</span></button>`; }).join("") : `<p class="muted">英雄尚未在历史中崭露头角</p>`;
  }
  const eventSummary = document.getElementById("worldEventSummary");
  if (eventSummary) {
    const active = worldEventState.active, pending = worldEventState.pending, consequence = [...worldEventState.consequences].sort((a, b) => a.dueYear - b.dueYear)[0], latest = worldEventState.memories[0];
    const participants = progress => progress.participants.map(item => getKingdom(item.kingdomId)?.name).filter(Boolean).join("、");
    eventSummary.innerHTML = active ? `<button class="world-event-summary active" data-open-world-event><b>${worldEventChains[active.chain].icon} ${eventStage(active).title}</b><span>${participants(active)} · 等待世界抉择</span></button>` : pending ? `<div class="world-event-summary"><b>${worldEventChains[pending.chain].icon} ${worldEventChains[pending.chain].name}</b><span>${participants(pending)} · 下一章约在纪元 ${Math.ceil(pending.availableYear)}</span></div>` : `<div class="world-event-summary"><b>◌ 世界暂时平静</b><span>下一重大事件约在纪元 ${Math.ceil(worldEventState.nextYear)}</span>${consequence ? `<small>⌛ “${consequence.text}”将在纪元 ${Math.ceil(consequence.dueYear)} 显现</small>` : latest ? `<small>最近记忆：${latest.text}</small>` : ""}</div>`;
  }
  if (selectedHeroId !== null) inspectHero(selectedHeroId);
}

function renderCodex(tab = "peoples") {
  const content = document.getElementById("codexContent"); if (!content) return;
  const config = experienceConfig;
  const collections = {
    peoples: Object.entries(config.races).map(([id, item]) => ({ icon: item.icon, title: item.name, text: `寿命 ${item.life} · 战力 ×${item.combat} · 繁衍 ×${item.birth}` })),
    ecology: Object.entries(config.animals).map(([id, item]) => ({ icon: item.icon, title: item.name, text: `${item.diet === "predator" ? "捕食者" : "草食动物"} · 寿命 ${item.maxAge} · 栖息于 ${item.habitats.map(type => ({ grass: "草原", forest: "森林", sand: "沙地", mountain: "山地" }[type])).join("、")}` })),
    buildings: Object.values(config.buildings).map(item => ({ icon: item.icon, title: item.name, text: item.effect })),
    disasters: Object.values(config.disasters).map(item => ({ icon: item.icon, title: item.name, text: `基础范围 ${item.radius} · 持续强度 ${item.duration}` })),
    systems: [
      { icon: "⚖", title: "外交记忆", text: "国家会记住合作、背叛、旧怨和力量差距，并据此调整战略意图。" },
      { icon: "♛", title: "英雄传承", text: "英雄会成长、参战、影响文明，离世后仍作为传奇留在编年史。" },
      { icon: "☀", title: "时代演进", text: "时代由人口、聚落、建筑、科技、贸易与英雄共同推动，而不是单纯随年份解锁。" },
      { icon: "❖", title: "文明野心", text: "八类长期野心各有三个里程碑，完成后会留下持续影响后世的永久传承。" },
      { icon: "♚", title: "王朝与继承", text: "四种继承法会依据血缘、年资、声望或军功选择统治者；幼主由摄政辅政，争议继承会动摇国家。" },
      { icon: "♥", title: "人物关系", text: "居民拥有姓名、性别、亲代、配偶、子女、亲近、信任、竞争和共同记忆，关系会延续至后代。" },
      { icon: "⚖", title: "派系与议会", text: "宫廷、民生、行会、信仰和军功五派争夺席位并提出政策议案；支持、妥协或否决都会留下长期政治后果。" },
      { icon: "🗿", title: "遗迹与神器", text: "斥候会发现地图遗迹，文明持续考察后可寻得具有长期效果的神器。" },
      { icon: "🏗", title: "世界奇观", text: "进入城邦纪的文明能够投入木石、国库和工程劳力，分阶段建造独一无二的奇观。" },
      { icon: "🛡", title: "危机与挑战", text: "全球危机要求各文明共同响应；轮换世界挑战则提供有期限的长期目标与声望奖励。" },
      { icon: "📜", title: "世界事件链", text: "十二条大型事件链各含三章，并记录参与文明、互斥路线、即时选择、延迟后果以及外交和人物记忆。" },
      { icon: "🗺", title: "地图模式", text: "自然、政治、肥力、人口和外交视图从不同维度解释同一世界。" },
      { icon: "💾", title: "确定性存档", text: "世界种子、随机状态、人物家谱、王朝和派系政治共同保存，可从同一时间线继续演化。" }
    ]
  };
  document.querySelectorAll?.("[data-codex-tab]").forEach(button => button.classList.toggle("active", button.dataset.codexTab === tab));
  content.innerHTML = `<div class="codex-grid">${(collections[tab] || collections.peoples).map(item => `<article><span>${item.icon}</span><div><h3>${item.title}</h3><p>${item.text}</p></div></article>`).join("")}</div>`;
}

function initializeExperienceUI() {
  if (experienceUiReady) return; experienceUiReady = true;
  mapMode = mapModeDefs[localStorage.getItem("realm-map-mode")] ? localStorage.getItem("realm-map-mode") : "natural";
  audioEnabled = localStorage.getItem("realm-audio-enabled") === "true";
  const mapSelect = document.getElementById("mapModeSelect"); if (mapSelect) { mapSelect.value = mapMode; mapSelect.addEventListener("change", event => setMapMode(event.target.value)); }
  document.getElementById("helpBtn")?.addEventListener("click", () => startTutorial(true));
  document.getElementById("audioBtn")?.addEventListener("click", toggleExperienceAudio);
  document.getElementById("codexBtn")?.addEventListener("click", () => { document.getElementById("codexModal").hidden = false; renderCodex(); });
  document.getElementById("closeCodexBtn")?.addEventListener("click", () => { document.getElementById("codexModal").hidden = true; });
  document.getElementById("codexModal")?.addEventListener("click", event => { if (event.target.id === "codexModal") event.currentTarget.hidden = true; });
  document.getElementById("codexTabs")?.addEventListener("click", event => { const button = event.target.closest?.("[data-codex-tab]"); if (button) renderCodex(button.dataset.codexTab); });
  document.getElementById("tutorialPanel")?.addEventListener("click", event => { const action = event.target.closest?.("[data-tutorial-action]")?.dataset.tutorialAction; if (action === "skip") finishTutorial(); if (action === "next") advanceTutorial(); });
  document.getElementById("worldEventModal")?.addEventListener("click", event => { const choice = event.target.closest?.("[data-world-event-choice]")?.dataset.worldEventChoice; if (choice) resolveWorldEvent(choice); });
  document.getElementById("worldEventSummary")?.addEventListener("click", event => { if (event.target.closest?.("[data-open-world-event]")) renderActiveWorldEvent(); });
  document.getElementById("heroList")?.addEventListener("click", event => { const item = event.target.closest?.("[data-hero]"); if (item) inspectHero(Number(item.dataset.hero)); });
  const audioButton = document.getElementById("audioBtn"); if (audioButton) { audioButton.textContent = audioEnabled ? "🔊" : "🔇"; audioButton.title = audioEnabled ? "关闭世界音效" : "开启世界音效"; audioButton.dataset.audioEnabled = String(audioEnabled); }
  setMapMode(mapMode);
}

function maybeStartTutorial() { if (localStorage.getItem("realm-tutorial-complete") !== "true") startTutorial(); }
