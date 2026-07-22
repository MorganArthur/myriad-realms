"use strict";

// 内部政治层：社会派系、议会席位、政策议题、政治妥协与派系危机。

const factionDefs = Object.freeze({
  court: { name: "宫廷派", icon: "♛", color: "#d7b45e", description: "王族、权贵与行政精英，重视统治权威和制度延续。", agenda: { tax: "high", welfare: "balanced", military: "defense" } },
  commons: { name: "民生派", icon: "⚒", color: "#80b979", description: "农民、劳工与眷属，要求减税、救济和远离长期战争。", agenda: { tax: "low", welfare: "generous", military: "pacifist" } },
  guilds: { name: "行会派", icon: "⚖", color: "#68afc4", description: "商贾与工匠，希望降低税负、维持秩序并扩张贸易。", agenda: { tax: "low", welfare: "balanced", military: "defense" } },
  faith: { name: "信仰派", icon: "✦", color: "#a88bcb", description: "祭司、治疗师与虔诚信众，关心救济、传统与社会和解。", agenda: { tax: "standard", welfare: "generous", military: "pacifist" } },
  military: { name: "军功派", icon: "⚔", color: "#d66b58", description: "士兵、将领与尚武英雄，主张军备、荣誉和主动扩张。", agenda: { tax: "standard", welfare: "austerity", military: "conquest" } }
});

const councilSizeByGovernment = Object.freeze({ monarchy: 9, council: 15, republic: 18, clan: 12 });
const neutralPolicies = Object.freeze({ tax: "standard", welfare: "balanced", military: "defense" });

function createFactionState() {
  return Object.fromEntries(Object.keys(factionDefs).map((id, index) => [id, { support: 54 - index, influence: 20, radicalization: 8, leaderId: null, seats: 0 }]));
}

function createPoliticsState(kingdomId, government) {
  return {
    councilName: { monarchy: "御前会议", council: "长老议庭", republic: "公民议会", clan: "氏族大会" }[government] || "国家议会",
    councilSize: councilSizeByGovernment[government] || 12, factions: createFactionState(), dominantFaction: "court",
    authority: 58, cohesion: 55, corruption: 12, activeIssue: null, nextIssueYear: year + 4.5 + kingdomId * .45,
    lastCrisisYear: 0, sessions: 0, history: []
  };
}

function normalizeFactionState(saved, fallback) {
  return {
    support: clamp(Number.isFinite(Number(saved?.support)) ? Number(saved.support) : fallback.support, 0, 100),
    influence: clamp(Number.isFinite(Number(saved?.influence)) ? Number(saved.influence) : fallback.influence, 0, 100),
    radicalization: clamp(Number.isFinite(Number(saved?.radicalization)) ? Number(saved.radicalization) : fallback.radicalization, 0, 100),
    leaderId: Number.isFinite(Number(saved?.leaderId)) ? Number(saved.leaderId) : null,
    seats: Math.max(0, Math.floor(Number(saved?.seats) || 0))
  };
}

function normalizePoliticalIssue(issue) {
  if (!issue || !factionDefs[issue.faction] || !policyDefs[issue.domain]?.[issue.proposed]) return null;
  return {
    id: cleanText(issue.id) || `issue-${Math.floor(year)}`, faction: issue.faction, domain: issue.domain, proposed: issue.proposed,
    openedYear: Math.max(1, Number(issue.openedYear) || Math.floor(year)), resolveYear: Math.max(1, Number(issue.resolveYear) || year + 3),
    text: cleanText(issue.text) || "议会正在辩论一项政策提案。"
  };
}

function normalizePoliticsState(kingdom) {
  const fallback = createPoliticsState(kingdom.id, kingdom.government), saved = kingdom.politics && typeof kingdom.politics === "object" ? kingdom.politics : {}, savedFactions = saved.factions || {};
  const factions = Object.fromEntries(Object.keys(factionDefs).map(id => [id, normalizeFactionState(savedFactions[id], fallback.factions[id])]));
  kingdom.politics = {
    ...fallback, ...saved, factions,
    councilName: cleanText(saved.councilName) || fallback.councilName,
    councilSize: clamp(Math.floor(Number(saved.councilSize) || fallback.councilSize), 5, 30),
    dominantFaction: factionDefs[saved.dominantFaction] ? saved.dominantFaction : fallback.dominantFaction,
    authority: clamp(Number.isFinite(Number(saved.authority)) ? Number(saved.authority) : fallback.authority, 0, 100),
    cohesion: clamp(Number.isFinite(Number(saved.cohesion)) ? Number(saved.cohesion) : fallback.cohesion, 0, 100),
    corruption: clamp(Number.isFinite(Number(saved.corruption)) ? Number(saved.corruption) : fallback.corruption, 0, 100),
    activeIssue: normalizePoliticalIssue(saved.activeIssue), nextIssueYear: Math.max(1, Number(saved.nextIssueYear) || fallback.nextIssueYear),
    lastCrisisYear: Math.max(0, Number(saved.lastCrisisYear) || 0), sessions: Math.max(0, Math.floor(Number(saved.sessions) || 0)),
    history: (Array.isArray(saved.history) ? saved.history : []).filter(entry => entry && entry.text).slice(0, 50).map(entry => ({ year: Math.max(1, Number(entry.year) || 1), type: cleanText(entry.type) || "politics", text: cleanText(entry.text), faction: factionDefs[entry.faction] ? entry.faction : null }))
  };
  return kingdom.politics;
}

function factionMembershipWeight(person, factionId) {
  const hero = heroForPerson(person.id), elite = person.socialClass === "elite", artisan = person.socialClass === "artisan", warrior = person.socialClass === "warrior";
  if (factionId === "court") return person.isRuler ? 12 : person.isHeir || person.isRegent ? 8 : elite ? 5 : hero?.archetype === "statesman" ? 4 : 0;
  if (factionId === "commons") return person.socialClass === "peasant" ? 5 : person.socialClass === "dependent" ? 2 : ["farmer", "laborer", "lumberjack", "miner"].includes(person.profession) ? 3 : 0;
  if (factionId === "guilds") return person.socialClass === "merchant" ? 7 : artisan ? 5 : ["builder", "merchant"].includes(person.profession) ? 4 : hero?.archetype === "artificer" || hero?.archetype === "explorer" ? 3 : 0;
  if (factionId === "faith") return person.profession === "healer" ? 8 : hero?.archetype === "healer" ? 6 : person.blessed ? 2 : 0;
  if (factionId === "military") return person.isGeneral ? 9 : person.role === "soldier" || warrior ? 6 : hero?.archetype === "champion" ? 5 : 0;
  return 0;
}

function politicalContext(kingdom) {
  const citizens = peopleOfKingdom(kingdom.id), realmVillages = villagesOfKingdom(kingdom.id), buildings = type => realmVillages.reduce((sum, village) => sum + buildingCount(village, type), 0);
  const realmArmies = armies.filter(army => army.kingdomId === kingdom.id), armyMorale = realmArmies.length ? realmArmies.reduce((sum, army) => sum + army.morale, 0) / realmArmies.length : 62;
  return {
    citizens, villages: realmVillages, happiness: averageHappiness(citizens), markets: buildings("market"), temples: buildings("temple"), barracks: buildings("barracks"),
    armyMorale, atWar: kingdomAtWar(kingdom.id), trade: tradeRoutes.filter(route => getVillage(route.fromVillage)?.kingdom === kingdom.id || getVillage(route.toVillage)?.kingdom === kingdom.id).length
  };
}

function factionInstitutionalBase(factionId, kingdom, context) {
  if (factionId === "court") return 5 + technologyLevel(kingdom, "administration") * 2 + (kingdom.dynasty?.prestige || 45) * .04;
  if (factionId === "commons") return 5 + context.villages.length * 1.5;
  if (factionId === "guilds") return 4 + context.markets * 4 + context.trade * 1.5;
  if (factionId === "faith") return 3 + context.temples * 5 + (kingdom.culture?.values?.faith || 0) * .06;
  if (factionId === "military") return 4 + context.barracks * 4 + (context.atWar ? 5 : 0);
  return 1;
}

function policyAlignmentScore(kingdom, factionId) {
  const agenda = factionDefs[factionId].agenda;
  return Object.entries(agenda).reduce((sum, [domain, preferred]) => sum + (kingdom.policies?.[domain] === preferred ? 7 : kingdom.policies?.[domain] === neutralPolicies[domain] ? 2 : -5), 0);
}

function factionSupportTarget(factionId, kingdom, context) {
  let target = 20 + context.happiness * .42 + kingdom.legitimacy * .16 + policyAlignmentScore(kingdom, factionId);
  if (factionId === "court") target += (kingdom.dynasty?.prestige || 45) * .12 - (kingdom.dynasty?.disputed ? 15 : 0) + kingdom.politics.authority * .06;
  if (factionId === "commons") target += kingdom.welfareCoverage * 9 - (kingdom.famineLevel || 0) * .24 - kingdom.unrest * .12;
  if (factionId === "guilds") target += Math.min(9, kingdom.treasury / Math.max(1, context.citizens.length) * .18) + Math.min(8, context.trade * 1.5) - (context.atWar ? 5 : 0);
  if (factionId === "faith") target += context.temples * 3 + (kingdom.culture?.values?.faith || 0) * .08 + kingdom.welfareCoverage * 5 - (kingdom.famine ? 8 : 0);
  if (factionId === "military") target += context.armyMorale * .12 + (context.atWar ? 7 : -2) - (kingdom.warWeariness || 0) * .15;
  return clamp(target, 0, 100);
}

function selectFactionLeader(kingdom, factionId, citizens) {
  const adults = citizens.filter(person => person.age >= 16), candidates = adults.filter(person => factionMembershipWeight(person, factionId) > 0), usedLeaders = new Set(Object.entries(kingdom.politics.factions).filter(([id]) => id !== factionId).map(([, faction]) => faction.leaderId).filter(Boolean));
  const preferredUnique = candidates.filter(person => !usedLeaders.has(person.id)), fallbackUnique = adults.filter(person => !usedLeaders.has(person.id));
  const ranked = preferredUnique.length ? preferredUnique : fallbackUnique.length ? fallbackUnique : candidates.length ? candidates : adults;
  return [...ranked].sort((a, b) => factionMembershipWeight(b, factionId) * 12 + personInfluence(b) - factionMembershipWeight(a, factionId) * 12 - personInfluence(a) || a.id - b.id)[0] || null;
}

function allocateCouncilSeats(politics) {
  const entries = Object.entries(politics.factions), quotas = entries.map(([id, faction]) => ({ id, exact: faction.influence / 100 * politics.councilSize }));
  let assigned = 0; for (const quota of quotas) { politics.factions[quota.id].seats = Math.floor(quota.exact); assigned += politics.factions[quota.id].seats; }
  quotas.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)) || b.exact - a.exact);
  for (let index = 0; assigned < politics.councilSize; index++, assigned++) politics.factions[quotas[index % quotas.length].id].seats++;
}

function updateFactionStates(kingdom) {
  const politics = normalizePoliticsState(kingdom), context = politicalContext(kingdom), rawInfluence = {};
  for (const factionId of Object.keys(factionDefs)) rawInfluence[factionId] = factionInstitutionalBase(factionId, kingdom, context) + context.citizens.reduce((sum, person) => sum + factionMembershipWeight(person, factionId), 0);
  const influenceTotal = Math.max(1, Object.values(rawInfluence).reduce((sum, value) => sum + value, 0));
  for (const factionId of Object.keys(factionDefs)) {
    const faction = politics.factions[factionId], targetInfluence = rawInfluence[factionId] / influenceTotal * 100, targetSupport = factionSupportTarget(factionId, kingdom, context);
    faction.influence = clamp(faction.influence + (targetInfluence - faction.influence) * .32, 0, 100); faction.support = clamp(faction.support + (targetSupport - faction.support) * .2, 0, 100);
    faction.radicalization = clamp(faction.radicalization + (faction.support < 40 ? (40 - faction.support) * .045 : faction.support > 58 ? -(faction.support - 58) * .025 : -.1), 0, 100);
  }
  const normalizedTotal = Object.values(politics.factions).reduce((sum, faction) => sum + faction.influence, 0) || 1;
  for (const faction of Object.values(politics.factions)) faction.influence = faction.influence / normalizedTotal * 100;
  for (const faction of Object.values(politics.factions)) faction.leaderId = null;
  for (const factionId of Object.keys(factionDefs)) politics.factions[factionId].leaderId = selectFactionLeader(kingdom, factionId, context.citizens)?.id || null;
  politics.dominantFaction = Object.entries(politics.factions).sort((a, b) => b[1].influence - a[1].influence)[0]?.[0] || "court";
  allocateCouncilSeats(politics);
  const weightedSupport = Object.values(politics.factions).reduce((sum, faction) => sum + faction.support * faction.influence / 100, 0), weightedRadical = Object.values(politics.factions).reduce((sum, faction) => sum + faction.radicalization * faction.influence / 100, 0);
  const cohesionTarget = clamp(weightedSupport - weightedRadical * .35 + kingdom.legitimacy * .2, 0, 100), authorityTarget = clamp(kingdom.legitimacy * .56 + (kingdom.dynasty?.prestige || 45) * .25 + politics.factions.court.support * .16 - (politics.activeIssue ? 3 : 0), 0, 100);
  const corruptionTarget = clamp(8 + politics.factions.court.influence * .18 + (kingdom.policies?.tax === "high" ? 5 : 0) - technologyLevel(kingdom, "administration") * 3 - politics.factions.guilds.influence * .06, 0, 100);
  politics.cohesion = clamp(politics.cohesion + (cohesionTarget - politics.cohesion) * .12, 0, 100); politics.authority = clamp(politics.authority + (authorityTarget - politics.authority) * .1, 0, 100); politics.corruption = clamp(politics.corruption + (corruptionTarget - politics.corruption) * .08, 0, 100);
  return politics;
}

function issueDomainFor(kingdom, factionId) {
  const agenda = factionDefs[factionId].agenda, priorities = factionId === "commons" || factionId === "faith" ? ["welfare", "tax", "military"] : factionId === "military" ? ["military", "tax", "welfare"] : ["tax", "military", "welfare"];
  return priorities.find(domain => kingdom.policies?.[domain] !== agenda[domain]) || null;
}

function openPoliticalIssue(kingdom) {
  const politics = kingdom.politics; if (politics.activeIssue || year < politics.nextIssueYear) return false;
  const candidates = Object.entries(politics.factions).filter(([id, faction]) => issueDomainFor(kingdom, id) && faction.influence >= 10).sort((a, b) => (b[1].influence * (110 - b[1].support + b[1].radicalization)) - (a[1].influence * (110 - a[1].support + a[1].radicalization)));
  const selected = candidates[0]; if (!selected) { politics.nextIssueYear = year + 4; return false; }
  const [factionId] = selected, domain = issueDomainFor(kingdom, factionId), proposed = factionDefs[factionId].agenda[domain], domainLabel = { tax: "税制", welfare: "民生", military: "军事方针" }[domain];
  const text = `${factionDefs[factionId].name}要求将${domainLabel}调整为“${policyDefs[domain][proposed].name}”。`;
  politics.activeIssue = { id: `issue-${kingdom.id}-${Math.floor(year * 10)}`, faction: factionId, domain, proposed, openedYear: Math.floor(year), resolveYear: year + 3, text };
  politics.sessions++; politics.nextIssueYear = year + 8; addEvent(`${factionDefs[factionId].icon} ${kingdom.name}的${politics.councilName}开始辩论：${text}`, "politics");
  return true;
}

function politicalCompromisePolicy(domain) { return neutralPolicies[domain]; }

function resolvePoliticalIssue(kingdomId, action = "compromise", guided = true) {
  const kingdom = getKingdom(kingdomId), politics = kingdom?.politics, issue = politics?.activeIssue; if (!kingdom || !issue || !["support", "compromise", "reject"].includes(action)) return false;
  const faction = politics.factions[issue.faction], definition = factionDefs[issue.faction], domainLabel = { tax: "税制", welfare: "民生", military: "军事方针" }[issue.domain];
  let result;
  if (action === "support") {
    setKingdomPolicy(kingdom.id, issue.domain, issue.proposed, false); faction.support = clamp(faction.support + 11, 0, 100); faction.radicalization = clamp(faction.radicalization - 16, 0, 100); politics.authority = clamp(politics.authority + 2, 0, 100); kingdom.unrest = Math.max(0, kingdom.unrest - 4); result = `接受${definition.name}提案，将${domainLabel}调整为${policyDefs[issue.domain][issue.proposed].name}`;
  } else if (action === "compromise") {
    const compromise = politicalCompromisePolicy(issue.domain); setKingdomPolicy(kingdom.id, issue.domain, compromise, false); faction.support = clamp(faction.support + 4, 0, 100); faction.radicalization = clamp(faction.radicalization - 7, 0, 100); politics.cohesion = clamp(politics.cohesion + 4, 0, 100); result = `促成妥协，将${domainLabel}维持在${policyDefs[issue.domain][compromise].name}`;
  } else {
    faction.support = clamp(faction.support - 12, 0, 100); faction.radicalization = clamp(faction.radicalization + 17, 0, 100); politics.authority = clamp(politics.authority + 1, 0, 100); kingdom.legitimacy = Math.max(0, kingdom.legitimacy - 2); kingdom.unrest = clamp(kingdom.unrest + 3 + faction.influence * .06, 0, 100); result = `否决${definition.name}关于${domainLabel}的提案`;
  }
  const text = `${kingdom.name}${result}。`; politics.history.unshift({ year: Math.floor(year), type: "resolution", text, faction: issue.faction }); politics.history = politics.history.slice(0, 50); politics.activeIssue = null; politics.nextIssueYear = Math.max(politics.nextIssueYear, year + 5);
  worldStats.politicalResolutions = (worldStats.politicalResolutions || 0) + 1; addEvent(`⚖ ${text}`, "politics");
  if (guided) { showToast(result); updateUI(); renderDirty = true; }
  return true;
}

function automatedPoliticalChoice(kingdom, issue) {
  const faction = kingdom.politics.factions[issue.faction], expensiveWelfare = issue.domain === "welfare" && issue.proposed === "generous" && kingdom.treasury < peopleOfKingdom(kingdom.id).length * .5;
  if (expensiveWelfare) return "compromise";
  if (kingdom.unrest > 52 || faction.influence > 29 || faction.radicalization > 52) return "support";
  if (kingdom.politics.authority > 72 && faction.support > 45 && faction.influence < 18) return "reject";
  return "compromise";
}

function triggerFactionCrisis(kingdom, factionId) {
  const politics = kingdom.politics, faction = politics.factions[factionId], definition = factionDefs[factionId], leader = getPerson(faction.leaderId), ruler = getPerson(kingdom.dynasty?.rulerId);
  let consequence;
  if (factionId === "military") { kingdom.legitimacy = Math.max(0, kingdom.legitimacy - 12); kingdom.unrest = clamp(kingdom.unrest + 14, 0, 100); if (kingdom.dynasty) { kingdom.dynasty.disputed = true; kingdom.dynasty.crisisUntil = Math.max(kingdom.dynasty.crisisUntil || 0, year + 6); } consequence = "军中强硬派公开质疑统治权，政变阴影笼罩首都"; }
  else if (factionId === "court") { kingdom.legitimacy = Math.max(0, kingdom.legitimacy - 9); kingdom.unrest = clamp(kingdom.unrest + 10, 0, 100); if (leader) leader.claimStrength = Math.max(leader.claimStrength || 0, 55); consequence = "宫廷权贵另立政治核心，继承秩序受到挑战"; }
  else if (factionId === "commons") { kingdom.unrest = clamp(kingdom.unrest + 16, 0, 100); const village = rebellionCandidate(kingdom); if (village) village.unrest = clamp((village.unrest || 0) + 18, 0, 100); consequence = "民众组织拒绝服从征税，地方抗命迅速蔓延"; }
  else if (factionId === "guilds") { kingdom.treasury = Math.max(0, kingdom.treasury * .88); kingdom.unrest = clamp(kingdom.unrest + 8, 0, 100); consequence = "行会发动罢市，税收与物流网络遭受冲击"; }
  else { kingdom.legitimacy = Math.max(0, kingdom.legitimacy - 6); kingdom.unrest = clamp(kingdom.unrest + 9, 0, 100); consequence = "信仰派宣布拒绝国家仪式，社会共识出现裂痕"; }
  if (leader && ruler && leader.id !== ruler.id) {
    const bond = ensurePersonBond(leader, ruler, "rival", 28, 22, 72), mirror = ruler.bonds?.[String(leader.id)];
    if (bond && !["spouse", "parent", "child", "kin"].includes(bond.type)) { bond.type = "rival"; if (mirror) mirror.type = "rival"; }
    recordPersonalMemory(leader.id, ruler.id, "political-crisis", `${leader.name}在${definition.name}危机中公开反对${ruler.name}`, -10, -15, 22);
  }
  faction.radicalization = Math.max(45, faction.radicalization - 22); politics.cohesion = Math.max(0, politics.cohesion - 12); politics.lastCrisisYear = Math.floor(year);
  const text = `${definition.icon} ${kingdom.name}爆发${definition.name}危机：${consequence}。`; politics.history.unshift({ year: Math.floor(year), type: "crisis", text, faction: factionId }); politics.history = politics.history.slice(0, 50); worldStats.politicalCrises = (worldStats.politicalCrises || 0) + 1; addEvent(text, "politics");
}

function politicalGovernanceModifiers(kingdom) {
  const politics = kingdom?.politics; if (!politics) return { stability: 0, legitimacy: 0, tax: 1 };
  const radical = Math.max(...Object.values(politics.factions || {}).map(faction => faction.radicalization || 0), 0);
  return {
    stability: clamp((politics.cohesion - 50) * .07 + (politics.authority - 50) * .035 - radical * .025 - (politics.activeIssue ? 1 : 0), -10, 9),
    legitimacy: clamp((politics.authority - 50) * .055 - politics.corruption * .045, -8, 7),
    tax: clamp(1 - politics.corruption * .0018 + (politics.factions?.guilds?.support - 50) * .0008, .84, 1.08)
  };
}

function politicalPolicyPreference(kingdom, domain, fallback) {
  const politics = kingdom?.politics; if (!politics || !policyDefs[domain]) return fallback;
  const pressure = Object.entries(politics.factions).map(([id, faction]) => ({ id, faction, score: faction.influence * (110 - faction.support + faction.radicalization * .7) })).sort((a, b) => b.score - a.score)[0];
  return pressure && pressure.faction.influence >= 14 ? factionDefs[pressure.id].agenda[domain] : fallback;
}

function onPoliticsGovernmentChanged(kingdom) {
  if (!kingdom) return; const politics = normalizePoliticsState(kingdom), fallback = createPoliticsState(kingdom.id, kingdom.government);
  politics.councilName = fallback.councilName; politics.councilSize = fallback.councilSize; politics.cohesion = Math.max(0, politics.cohesion - 8); politics.activeIssue = null; politics.nextIssueYear = year + 4; allocateCouncilSeats(politics);
}

function normalizePoliticsWorld(sourceVersion = 1) {
  for (const kingdom of kingdoms) normalizePoliticsState(kingdom);
  if (sourceVersion < 17) for (const kingdom of kingdoms) {
    updateFactionStates(kingdom); if (!kingdom.defeated) kingdom.politics.nextIssueYear = Math.max(kingdom.politics.nextIssueYear, year + 2);
  }
}

function politicsSimulationStep() {
  for (const kingdom of kingdoms) {
    if (kingdom.defeated) continue; const politics = updateFactionStates(kingdom);
    if (politics.activeIssue && year >= politics.activeIssue.resolveYear) resolvePoliticalIssue(kingdom.id, automatedPoliticalChoice(kingdom, politics.activeIssue), false);
    else if (!politics.activeIssue) openPoliticalIssue(kingdom);
    if (year - politics.lastCrisisYear >= 10) {
      const crisis = Object.entries(politics.factions).filter(([, faction]) => faction.radicalization >= 78 && faction.support < 30 && faction.influence >= 16).sort((a, b) => b[1].radicalization * b[1].influence - a[1].radicalization * a[1].influence)[0];
      if (crisis) triggerFactionCrisis(kingdom, crisis[0]);
    }
  }
}

function markKingdomPoliticsDefeated(kingdom) {
  if (!kingdom?.politics) return; kingdom.politics.activeIssue = null; kingdom.politics.history.unshift({ year: Math.floor(year), type: "fall", text: `${kingdom.politics.councilName}随国家覆灭而解散。`, faction: null });
}

function factionMeter(value, className) { return `<i class="faction-meter"><em class="${className}" style="width:${clamp(value, 0, 100)}%"></em></i>`; }

function politicsIssueHtml(kingdom) {
  const issue = kingdom.politics.activeIssue; if (!issue) return `<div class="politics-calm">议会暂无紧急提案 · 下一轮议题约在纪元 ${Math.ceil(kingdom.politics.nextIssueYear)}</div>`;
  const definition = factionDefs[issue.faction]; return `<div class="politics-issue" style="--faction-color:${definition.color}"><b>${definition.icon} ${definition.name}提案</b><p>${issue.text}</p><small>若不干预，将在纪元 ${Math.ceil(issue.resolveYear)} 由国家自行决断。</small><div><button data-politics-action="support">接受提案</button><button data-politics-action="compromise">推动妥协</button><button class="danger" data-politics-action="reject">否决提案</button></div></div>`;
}

function politicsDetailHtml(kingdom) {
  const politics = normalizePoliticsState(kingdom), dominant = factionDefs[politics.dominantFaction];
  const factionCards = Object.entries(factionDefs).map(([id, definition]) => { const faction = politics.factions[id], leader = getPerson(faction.leaderId); return `<div class="faction-card ${id === politics.dominantFaction ? "dominant" : ""}" style="--faction-color:${definition.color}"><div><b>${definition.icon} ${definition.name}</b><span>${faction.seats} 席 · 影响 ${Math.round(faction.influence)}</span></div>${leader ? `<button class="person-link inline" data-person-id="${leader.id}">${leader.name}</button>` : `<small>暂无领袖</small>`}<small>支持 ${Math.round(faction.support)} · 激进 ${Math.round(faction.radicalization)}</small>${factionMeter(faction.support, "support")}${factionMeter(faction.radicalization, "radical")}</div>`; }).join("");
  const history = politics.history.slice(0, 3).map(entry => `<div class="dynasty-history"><time>纪元 ${entry.year}</time><span>${entry.text}</span></div>`).join("");
  return `<h3>派系与议会</h3><div class="politics-banner"><b>⚖ ${politics.councilName}</b><span>${politics.councilSize} 席 · ${dominant.icon} ${dominant.name}主导</span></div><div class="need-list">${needMeter("议会凝聚", politics.cohesion)}${needMeter("政权权威", politics.authority)}${needMeter("制度廉洁", 100 - politics.corruption)}</div>${politicsIssueHtml(kingdom)}<div class="faction-grid">${factionCards}</div>${history ? `<div class="dynasty-history-list">${history}</div>` : ""}`;
}

function renderPoliticsPanels() {
  const list = document.getElementById("politicsList"); if (!list) return;
  const active = kingdoms.filter(kingdom => !kingdom.defeated); list.innerHTML = active.length ? active.map(kingdom => {
    const politics = normalizePoliticsState(kingdom), faction = factionDefs[politics.dominantFaction], issue = politics.activeIssue;
    return `<button class="politics-item ${issue ? "debating" : ""}" data-politics="${kingdom.id}" style="--kingdom-color:${kingdom.color};--faction-color:${faction.color}"><b>⚖ ${kingdom.name}</b><span>${politics.councilName} · ${faction.icon} ${faction.name}</span><small>${issue ? `${factionDefs[issue.faction].name}正在推动${policyDefs[issue.domain][issue.proposed].name}` : `凝聚 ${Math.round(politics.cohesion)} · 权威 ${Math.round(politics.authority)}`}</small></button>`;
  }).join("") : `<p class="muted">尚未形成内部政治秩序</p>`;
}

globalThis.RealmPolitics = Object.freeze({ factionDefs, createPoliticsState, normalizePoliticsState, politicalGovernanceModifiers, politicalPolicyPreference, resolvePoliticalIssue });
