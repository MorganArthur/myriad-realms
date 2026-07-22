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
let worldEventState = { nextYear: 14, active: null, pending: null, history: [] };
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

const worldEventChains = Object.freeze({
  starfall: {
    name: "星落之谜", icon: "☄", first: "omen", stages: {
      omen: { title: "群星异动", text: "一道苍白星痕横贯夜空，各文明争论这是祝福、警告还是尚未理解的自然现象。", next: "expedition", choices: [
        { id: "observe", label: "组织观星", hint: "推动所有文明研究", effect: "research" },
        { id: "pray", label: "举行祈星祭", hint: "提高合法性与信仰", effect: "faith" },
        { id: "ignore", label: "安抚民众", hint: "减少动乱并保存国库", effect: "calm" }
      ] },
      expedition: { title: "坠星远征", text: "斥候找到了星体坠落之处。灼热晶体蕴含奇异力量，但远征路线穿过危险荒野。", choices: [
        { id: "shared", label: "联合考察", hint: "改善外交并获得知识", effect: "cooperate" },
        { id: "claim", label: "强者独占", hint: "强国获益但积累怨恨", effect: "claim" },
        { id: "seal", label: "封存遗迹", hint: "换取长期稳定", effect: "seal" }
      ] }
    }
  },
  council: {
    name: "万邦议会", icon: "⚖", first: "summons", stages: {
      summons: { title: "议会召集令", text: "商路冲突与边境摩擦日益增多。使节建议召开一次跨文明议会，为共同规则奠定基础。", next: "charter", choices: [
        { id: "host", label: "共同出资", hint: "消耗国库，增加互信", effect: "host" },
        { id: "neutral", label: "保持观望", hint: "小幅改善关系", effect: "neutral" },
        { id: "reject", label: "拒绝议会", hint: "鼓励扩张，增加猜忌", effect: "reject" }
      ] },
      charter: { title: "万邦宪章", text: "数月辩论后，使节提出贸易、边界与战俘三项准则。是否签署，将改变未来数十年的外交秩序。", choices: [
        { id: "peace", label: "签署和平宪章", hint: "大幅提高信任并缓和战争", effect: "charter" },
        { id: "trade", label: "只签贸易条款", hint: "增加资源与商贸关系", effect: "commerce" },
        { id: "walkout", label: "退出谈判", hint: "提高尚武文明影响", effect: "walkout" }
      ] }
    }
  },
  blight: {
    name: "灰穗之年", icon: "🌾", first: "warning", stages: {
      warning: { title: "作物异变", text: "灰色斑点正在农田间蔓延。治疗师警告歉收将至，各国必须在冬季前做出准备。", next: "hunger", choices: [
        { id: "stores", label: "建立储备", hint: "消耗木材，保护粮食", effect: "stores" },
        { id: "study", label: "研究病穗", hint: "推动农业与医药", effect: "study" },
        { id: "burn", label: "焚烧病田", hint: "损失部分粮食，快速遏制", effect: "burn" }
      ] },
      hunger: { title: "饥馑考验", text: "歉收如期而至。富裕聚落仍有余粮，边境村庄却已出现饥饿，援助还是自保成为时代难题。", choices: [
        { id: "relief", label: "跨国赈济", hint: "重新分配粮食，提高互信", effect: "relief" },
        { id: "ration", label: "严格配给", hint: "保存粮食但降低幸福", effect: "ration" },
        { id: "open", label: "开放粮市", hint: "国库换取粮食与贸易", effect: "open_market" }
      ] }
    }
  }
});

function resetExperienceState() {
  heroes = []; nextHeroId = 1; selectedHeroId = null;
  worldEventState = { nextYear: 12 + experienceEngine.randi(0, 6), active: null, pending: null, history: [] };
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
  const names = heroNames[person.race] || heroNames.human, baseName = names[(person.id + kingdom.id * 3) % names.length];
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
  worldEventState = savedEvents && typeof savedEvents === "object" ? { nextYear: Number(savedEvents.nextYear) || year + 12, active: savedEvents.active || null, pending: savedEvents.pending || null, history: Array.isArray(savedEvents.history) ? savedEvents.history.slice(0, 40) : [] } : { nextYear: year + 12, active: null, pending: null, history: [] };
}

function eventStage(active = worldEventState.active) { return active ? worldEventChains[active.chain]?.stages?.[active.stage] || null : null; }

function activateWorldEvent(chain, stage) {
  const definition = worldEventChains[chain], chapter = definition?.stages?.[stage]; if (!chapter) return;
  const resumeAfterChoice = typeof running !== "undefined" && running && !debugBatchMode;
  worldEventState.active = { chain, stage, startedYear: Math.floor(year), resumeAfterChoice }; worldEventState.pending = null;
  addEvent(`${definition.icon} 世界事件“${chapter.title}”正在等待抉择。`, "world-event");
  if (resumeAfterChoice) setRunning(false, false);
  renderActiveWorldEvent(); renderExperiencePanels(); playExperienceSound("event");
}

function applyWorldEventEffect(effect) {
  const active = kingdoms.filter(kingdom => !kingdom.defeated), sorted = [...active].sort((a, b) => peopleOfKingdom(b.id).length - peopleOfKingdom(a.id).length);
  if (effect === "research" || effect === "study") for (const kingdom of active) { kingdom.technology.research += effect === "study" ? 10 : 7; if (effect === "study") kingdom.resources.food = Math.max(0, kingdom.resources.food - 5); }
  if (effect === "faith") for (const kingdom of active) { kingdom.legitimacy = experienceEngine.clamp(kingdom.legitimacy + 6, 0, 100); kingdom.culture.values.faith = experienceEngine.clamp(kingdom.culture.values.faith + 4, 0, 100); }
  if (["calm", "seal"].includes(effect)) for (const kingdom of active) kingdom.unrest = experienceEngine.clamp(kingdom.unrest - 7, 0, 100);
  if (["cooperate", "host", "charter", "relief", "neutral"].includes(effect)) for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
    const relation = relationBetween(active[i].id, active[j].id); if (!relation) continue;
    const cooperationGain = effect === "charter" ? 10 : effect === "neutral" ? 1 : effect === "relief" ? 3 : 4;
    relation.score = experienceEngine.clamp(relation.score + cooperationGain, -100, 100);
    const reverse = relationBetween(active[j].id, active[i].id); if (reverse) reverse.score = relation.score;
    recordDiplomaticMemory(active[i].id, active[j].id, "cooperation", "共同应对了一场世界事件", effect === "neutral" ? 1 : effect === "charter" ? 6 : 3, effect === "neutral" ? 0 : -3);
    if (effect === "charter" && relation.status === "war") setRelation(active[i].id, active[j].id, "peace", Math.max(-8, relation.score));
  }
  if (effect === "claim" && sorted[0]) { sorted[0].technology.research += 22; sorted[0].treasury += 25; for (const other of sorted.slice(1)) recordDiplomaticMemory(sorted[0].id, other.id, "grievance", "独占了坠星遗物", -10, 16); }
  if (effect === "stores") for (const kingdom of active) { kingdom.resources.wood = Math.max(0, kingdom.resources.wood - 12); kingdom.resources.food += 16; }
  if (effect === "burn") for (const kingdom of active) { kingdom.resources.food = Math.max(0, kingdom.resources.food - 12); kingdom.unrest = experienceEngine.clamp(kingdom.unrest - 3, 0, 100); }
  if (effect === "relief" && sorted.length) { const average = sorted.reduce((sum, kingdom) => sum + kingdom.resources.food, 0) / sorted.length; for (const kingdom of sorted) kingdom.resources.food = kingdom.resources.food * .55 + average * .45; }
  if (effect === "ration") for (const kingdom of active) { kingdom.resources.food += 12; for (const person of peopleOfKingdom(kingdom.id).slice(0, 30)) person.happiness = experienceEngine.clamp(person.happiness - 5, 0, 100); }
  if (["commerce", "open_market"].includes(effect)) for (const kingdom of active) { kingdom.treasury = Math.max(0, kingdom.treasury - (effect === "open_market" ? 8 : 0)) + 8; kingdom.resources.food += effect === "open_market" ? 14 : 4; }
  if (["reject", "walkout"].includes(effect)) for (const kingdom of active) { kingdom.culture.values.valor = experienceEngine.clamp(kingdom.culture.values.valor + 3, 0, 100); kingdom.unrest = experienceEngine.clamp(kingdom.unrest + 2, 0, 100); }
}

function resolveWorldEvent(choiceId, automatic = false) {
  const active = worldEventState.active, stage = eventStage(active); if (!active || !stage) return false;
  const resumeAfterChoice = Boolean(active.resumeAfterChoice);
  const choice = stage.choices.find(candidate => candidate.id === choiceId) || stage.choices[0];
  applyWorldEventEffect(choice.effect);
  worldStats.worldEventsResolved = (worldStats.worldEventsResolved || 0) + 1;
  worldEventState.history.unshift({ chain: active.chain, stage: active.stage, choice: choice.id, year: Math.floor(year) }); worldEventState.history = worldEventState.history.slice(0, 40);
  addEvent(`${worldEventChains[active.chain].name}：${automatic ? "各文明最终" : "创世者引导文明"}选择了“${choice.label}”。`, "world-event");
  spawnExperienceEffect("event", MAP_W / 2, MAP_H / 2, "#e7c269");
  if (stage.next) worldEventState.pending = { chain: active.chain, stage: stage.next, availableYear: year + 3 + experienceEngine.randi(0, 3) };
  else worldEventState.nextYear = year + 13 + experienceEngine.randi(0, 10);
  worldEventState.active = null; renderActiveWorldEvent(); updateUI(); if (resumeAfterChoice && !automatic) setRunning(true, false); return true;
}

function worldEventStep() {
  if (worldEventState.active) {
    if (year - worldEventState.active.startedYear > 2.5) { const stage = eventStage(); resolveWorldEvent(stage.choices[experienceEngine.randi(0, stage.choices.length - 1)].id, true); }
    return;
  }
  if (worldEventState.pending && year >= worldEventState.pending.availableYear) { activateWorldEvent(worldEventState.pending.chain, worldEventState.pending.stage); return; }
  if (!worldEventState.pending && year >= worldEventState.nextYear) {
    const ids = Object.keys(worldEventChains), chain = ids[experienceEngine.randi(0, ids.length - 1)]; activateWorldEvent(chain, worldEventChains[chain].first);
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
  const chain = worldEventChains[active.chain];
  document.getElementById("worldEventContent").innerHTML = `<div class="world-event-icon">${chain.icon}</div><small>${chain.name} · 阶段事件</small><h2>${stage.title}</h2><p>${stage.text}</p><div class="world-event-choices">${stage.choices.map(choice => `<button data-world-event-choice="${choice.id}"><b>${choice.label}</b><span>${choice.hint}</span></button>`).join("")}</div><small class="muted">若不选择，文明将在约 2.5 个纪元后自行决定。</small>`;
}

function inspectHero(heroId) {
  const hero = heroes.find(candidate => candidate.id === heroId); if (!hero) return;
  selectedHeroId = hero.id; selectedKingdomId = null; selectedTradeRouteId = null; selectedArmyId = null;
  const person = getPerson(hero.personId), kingdom = getKingdom(hero.kingdomId), def = heroArchetypes[hero.archetype], box = document.getElementById("selectionCard");
  box.classList.remove("empty");
  box.innerHTML = `<h4 style="color:${def.color}">${def.icon} ${hero.title}${hero.name}</h4><div class="detail-row"><span>所属文明</span><b>${kingdom?.name || "失落文明"}</b></div><div class="detail-row"><span>状态 / 等级</span><b>${hero.status === "active" ? "活跃" : `传奇 · 纪元 ${hero.fallenYear || "?"}`} / ${hero.level}</b></div><div class="detail-row"><span>声望 / 胜绩</span><b>${Math.floor(hero.renown)} / ${hero.victories}</b></div><div class="detail-row"><span>现职</span><b>${person ? (professionDefs[person.profession]?.name || unitDefs[person.unitType]?.name || "居民") : "历史人物"}</b></div><p class="muted">${hero.status === "active" ? def.effect : hero.legacy || "事迹被编入世界史"}</p>`;
}

function renderExperiencePanels() {
  const heroList = document.getElementById("heroList");
  if (heroList) {
    const ordered = [...heroes].sort((a, b) => Number(a.status !== "active") - Number(b.status !== "active") || b.level - a.level || b.renown - a.renown).slice(0, 12);
    heroList.innerHTML = ordered.length ? ordered.map(hero => { const kingdom = getKingdom(hero.kingdomId), def = heroArchetypes[hero.archetype]; return `<button class="hero-item ${hero.status}" data-hero="${hero.id}" style="--hero-color:${def.color}"><b>${def.icon} ${hero.title}${hero.name}</b><span>${kingdom?.name || "失落文明"} · ${hero.level}级 · 声望 ${Math.floor(hero.renown)}</span></button>`; }).join("") : `<p class="muted">英雄尚未在历史中崭露头角</p>`;
  }
  const eventSummary = document.getElementById("worldEventSummary");
  if (eventSummary) {
    const active = worldEventState.active, pending = worldEventState.pending;
    eventSummary.innerHTML = active ? `<button class="world-event-summary active" data-open-world-event><b>${worldEventChains[active.chain].icon} ${eventStage(active).title}</b><span>等待世界抉择</span></button>` : pending ? `<div class="world-event-summary"><b>${worldEventChains[pending.chain].icon} ${worldEventChains[pending.chain].name}</b><span>下一阶段约在纪元 ${Math.ceil(pending.availableYear)}</span></div>` : `<div class="world-event-summary"><b>◌ 世界暂时平静</b><span>下一重大事件约在纪元 ${Math.ceil(worldEventState.nextYear)}</span></div>`;
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
      { icon: "📜", title: "世界事件链", text: "重大事件分阶段展开，抉择会改变资源、研究、社会和外交。" },
      { icon: "🗺", title: "地图模式", text: "自然、政治、肥力、人口和外交视图从不同维度解释同一世界。" },
      { icon: "💾", title: "确定性存档", text: "世界种子与随机状态共同保存，可从同一时间线继续演化。" }
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
