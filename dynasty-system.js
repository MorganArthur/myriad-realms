"use strict";

// 王朝与人物关系层：姓名、亲属、婚姻、统治者、继承法、摄政、换届与个人记忆。

const personNameParts = Object.freeze({
  human: { first: ["艾登", "贝伦", "凯尔", "达里安", "埃蒙", "芬恩", "加文", "赫克", "伊莱", "朱诺", "莱昂", "米拉"], family: ["白橡", "晨星", "河湾", "银盾", "金穗", "风歌", "赤塔", "远帆"] },
  elf: { first: ["艾洛温", "瑟兰", "莉希雅", "芬维", "奈雅", "奥瑞尔", "西尔芙", "维兰", "塔莉", "露恩", "凯兰", "伊芙琳"], family: ["月枝", "星叶", "雾歌", "青藤", "晨露", "银林", "暮风", "翠冠"] },
  dwarf: { first: ["布罗克", "杜林", "赫尔达", "格罗姆", "卡德", "莫拉", "诺林", "奥达", "芙蕾", "托尔", "维格", "尤里"], family: ["铜炉", "深砧", "铁须", "山心", "黑岩", "秘银", "熔火", "石冠"] },
  orc: { first: ["格罗", "莫格", "乌尔", "扎卡", "克拉", "鲁格", "玛卡", "纳兹", "奥戈", "塔尔", "沃什", "亚格"], family: ["铁牙", "血斧", "赤骨", "灰烬", "裂颅", "荒原", "黑矛", "战痕"] }
});

const successionLawDefs = Object.freeze({
  primogeniture: { name: "长嗣继承", icon: "♛", description: "优先由统治者的年长子嗣继位，血统稳定但可能出现幼主。" },
  seniority: { name: "宗族长老", icon: "✦", description: "优先推举统治家族中年长而有声望的成员。" },
  elective: { name: "贤能推举", icon: "⚖", description: "由权贵、商贾、英雄与地方声望共同决定继任者。" },
  merit: { name: "强者继承", icon: "⚔", description: "军事能力、英雄声望和个人影响力决定统治权。" }
});

const governmentRulerDefs = Object.freeze({
  monarchy: { title: "君主", heirTitle: "王储", defaultLaw: "primogeniture", term: 0, transition: "继承" },
  council: { title: "首席长老", heirTitle: "继任长老", defaultLaw: "seniority", term: 18, transition: "推举" },
  republic: { title: "执政官", heirTitle: "候任执政", defaultLaw: "elective", term: 12, transition: "换届" },
  clan: { title: "大酋长", heirTitle: "战嗣", defaultLaw: "merit", term: 15, transition: "挑战" }
});

function personNameFor(race, id) {
  const parts = personNameParts[race] || personNameParts.human;
  const base = `${parts.family[(id * 5 + 3) % parts.family.length]}·${parts.first[(id * 7 + 1) % parts.first.length]}`, generation = Math.floor((Math.max(1, id) - 1) / 24);
  return generation ? `${base}·${generation + 1}` : base;
}

function createPersonIdentity(race, id, lineage = null) {
  const parents = Array.isArray(lineage?.parents) ? [...new Set(lineage.parents.map(Number).filter(parentId => Number.isFinite(parentId) && parentId > 0 && parentId !== id))].slice(0, 2) : [];
  return {
    name: personNameFor(race, id), sex: lineage?.sex === "female" ? "female" : lineage?.sex === "male" ? "male" : id % 2 ? "female" : "male",
    parents, spouseId: null, childrenIds: [], houseId: lineage?.houseId || null, bonds: {},
    isRuler: false, isHeir: false, isRegent: false, nobleRank: null, claimStrength: 0
  };
}

function normalizePersonIdentity(person) {
  const fallback = createPersonIdentity(person.race, person.id), validId = value => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) !== person.id;
  person.name = cleanText(person.name) || fallback.name; person.sex = person.sex === "female" ? "female" : person.sex === "male" ? "male" : fallback.sex;
  person.parents = [...new Set((Array.isArray(person.parents) ? person.parents : []).map(Number).filter(validId))].slice(0, 2);
  person.spouseId = validId(person.spouseId) ? Number(person.spouseId) : null;
  person.childrenIds = [...new Set((Array.isArray(person.childrenIds) ? person.childrenIds : []).map(Number).filter(validId))].slice(0, 24);
  person.houseId = typeof person.houseId === "string" && person.houseId.length <= 80 ? person.houseId : null;
  const bonds = {};
  if (person.bonds && typeof person.bonds === "object") for (const [id, saved] of Object.entries(person.bonds).slice(0, 20)) {
    const otherId = Number(id); if (!validId(otherId) || !saved || typeof saved !== "object") continue;
    bonds[String(otherId)] = {
      affinity: clamp(Number(saved.affinity) || 50, 0, 100), trust: clamp(Number(saved.trust) || 45, 0, 100), rivalry: clamp(Number(saved.rivalry) || 0, 0, 100),
      type: ["spouse", "parent", "child", "kin", "confidant", "rival", "acquaintance"].includes(saved.type) ? saved.type : "acquaintance",
      memories: (Array.isArray(saved.memories) ? saved.memories : []).filter(memory => memory && memory.text).slice(0, 5).map(memory => ({ year: Math.max(1, Number(memory.year) || 1), type: cleanText(memory.type) || "memory", text: cleanText(memory.text) }))
    };
  }
  person.bonds = bonds; person.isRuler = Boolean(person.isRuler); person.isHeir = Boolean(person.isHeir); person.isRegent = Boolean(person.isRegent);
  person.nobleRank = typeof person.nobleRank === "string" ? cleanText(person.nobleRank) : null; person.claimStrength = clamp(Number(person.claimStrength) || 0, 0, 100);
  return person;
}

function inverseBondType(type) { return type === "parent" ? "child" : type === "child" ? "parent" : type; }

function ensurePersonBond(first, second, type = "acquaintance", affinity = 50, trust = 45, rivalry = 0) {
  if (!first || !second || first.id === second.id) return null;
  first.bonds ||= {}; second.bonds ||= {};
  const variance = ((Math.min(first.id, second.id) * 17 + Math.max(first.id, second.id) * 31) % 19) - 9;
  first.bonds[String(second.id)] ||= { affinity: clamp(affinity + variance, 0, 100), trust: clamp(trust + variance * .45, 0, 100), rivalry: clamp(rivalry - variance * .25, 0, 100), type, memories: [] };
  second.bonds[String(first.id)] ||= { affinity: clamp(affinity + variance, 0, 100), trust: clamp(trust + variance * .45, 0, 100), rivalry: clamp(rivalry - variance * .25, 0, 100), type: inverseBondType(type), memories: [] };
  if (["spouse", "parent", "child", "kin"].includes(type)) { first.bonds[String(second.id)].type = type; second.bonds[String(first.id)].type = inverseBondType(type); }
  return first.bonds[String(second.id)];
}

function recordPersonalMemory(firstId, secondId, type, text, affinityDelta = 0, trustDelta = 0, rivalryDelta = 0) {
  const first = getPerson(firstId), second = getPerson(secondId); if (!first || !second) return false;
  ensurePersonBond(first, second);
  for (const [person, other] of [[first, second], [second, first]]) {
    const bond = person.bonds[String(other.id)]; bond.affinity = clamp(bond.affinity + affinityDelta, 0, 100); bond.trust = clamp(bond.trust + trustDelta, 0, 100); bond.rivalry = clamp(bond.rivalry + rivalryDelta, 0, 100);
    bond.memories.unshift({ year: Math.floor(year), type, text: cleanText(text) }); bond.memories = bond.memories.slice(0, 5);
  }
  return true;
}

function registerBirthLineage(child, parentIds = []) {
  if (!child) return;
  child.parents = [...new Set(parentIds.map(Number).filter(id => getPerson(id) && id !== child.id))].slice(0, 2);
  const parents = child.parents.map(getPerson).filter(Boolean), houseParent = parents.find(parent => parent.houseId);
  if (houseParent) child.houseId = houseParent.houseId;
  for (const parent of parents) {
    parent.childrenIds ||= []; if (!parent.childrenIds.includes(child.id)) parent.childrenIds.push(child.id);
    ensurePersonBond(child, parent, "parent", 82, 78, 0);
  }
  if (parents.length === 2) ensurePersonBond(parents[0], parents[1], parents[0].spouseId === parents[1].id ? "spouse" : "confidant", 72, 68, 2);
  const kingdom = getKingdom(child.kingdom), dynasty = kingdom?.dynasty;
  if (dynasty && child.houseId === dynasty.id && parents.some(parent => parent.id === dynasty.rulerId)) {
    dynasty.history.unshift({ year: Math.floor(year), type: "birth", text: `${child.name}诞生于${dynasty.name}。`, personId: child.id }); dynasty.history = dynasty.history.slice(0, 50);
    addEvent(`♛ ${kingdom.name}统治家族迎来新成员${child.name}。`, "relationship");
  }
}

function governmentRulerDefinition(kingdom) { return governmentRulerDefs[kingdom?.government] || governmentRulerDefs.monarchy; }
function rulerTitleFor(kingdom) { return governmentRulerDefinition(kingdom).title; }
function heirTitleFor(kingdom) { return governmentRulerDefinition(kingdom).heirTitle; }

function createDynastyState(kingdomId, race, government, kingdomName) {
  const rule = governmentRulerDefs[government] || governmentRulerDefs.monarchy;
  return {
    id: `house-${kingdomId}-unfounded`, name: `${kingdomName || "无名"}统治家`, founderId: null, rulerId: null, rulerName: "尚无统治者", heirId: null, regentId: null,
    law: rule.defaultLaw, lawLockedUntil: 0, foundedYear: Math.max(1, Math.floor(year)), rulerSince: null, termEndsYear: null,
    prestige: 45, cohesion: 55, disputed: false, crisisUntil: 0, claimants: [], sequence: 0, nextMarriageYear: year + 2 + kingdomId * .35,
    previousHouses: [], history: []
  };
}

function houseNameFor(kingdom, person) {
  const root = (person?.name || kingdom.name).split("·")[0], suffix = { human: "王室", elf: "月庭", dwarf: "炉族", orc: "战脉" }[kingdom.race] || "世家";
  return `${root}${suffix}`;
}

function establishRulingHouse(kingdom, founder, silent = false) {
  if (!kingdom || !founder) return null;
  kingdom.dynasty ||= createDynastyState(kingdom.id, kingdom.race, kingdom.government, kingdom.name);
  const dynasty = kingdom.dynasty, houseId = founder.houseId || `house-${kingdom.id}-${founder.id}`;
  dynasty.id = houseId; dynasty.name = houseNameFor(kingdom, founder); dynasty.founderId ||= founder.id; dynasty.rulerId = founder.id; dynasty.rulerName = founder.name;
  dynasty.rulerSince = Math.floor(year); dynasty.sequence ||= 1; dynasty.law = successionLawDefs[dynasty.law] ? dynasty.law : governmentRulerDefinition(kingdom).defaultLaw;
  dynasty.termEndsYear = governmentRulerDefinition(kingdom).term ? year + governmentRulerDefinition(kingdom).term : null;
  founder.houseId = houseId; founder.isRuler = true; founder.isHeir = false; founder.nobleRank = rulerTitleFor(kingdom); founder.claimStrength = 100;
  if (!dynasty.history.length) dynasty.history.unshift({ year: Math.floor(year), type: "founding", text: `${founder.name}建立${dynasty.name}并成为${rulerTitleFor(kingdom)}。`, personId: founder.id });
  if (!silent) addEvent(`♛ ${founder.name}成为${kingdom.name}的首任${rulerTitleFor(kingdom)}，${dynasty.name}由此开端。`, "dynasty");
  return dynasty;
}

function normalizeDynastyState(kingdom) {
  const fallback = createDynastyState(kingdom.id, kingdom.race, kingdom.government, kingdom.name), saved = kingdom.dynasty && typeof kingdom.dynasty === "object" ? kingdom.dynasty : {};
  kingdom.dynasty = {
    ...fallback, ...saved,
    id: typeof saved.id === "string" && saved.id.length <= 80 ? saved.id : fallback.id, name: cleanText(saved.name) || fallback.name,
    founderId: Number.isFinite(Number(saved.founderId)) ? Number(saved.founderId) : null, rulerId: Number.isFinite(Number(saved.rulerId)) ? Number(saved.rulerId) : null, rulerName: cleanText(saved.rulerName) || fallback.rulerName,
    heirId: Number.isFinite(Number(saved.heirId)) ? Number(saved.heirId) : null, regentId: Number.isFinite(Number(saved.regentId)) ? Number(saved.regentId) : null,
    law: successionLawDefs[saved.law] ? saved.law : governmentRulerDefinition(kingdom).defaultLaw, lawLockedUntil: Math.max(0, Number(saved.lawLockedUntil) || 0),
    foundedYear: Math.max(1, Number(saved.foundedYear) || 1), rulerSince: saved.rulerSince === null ? null : Math.max(1, Number(saved.rulerSince) || 1), termEndsYear: saved.termEndsYear === null ? null : Math.max(1, Number(saved.termEndsYear) || 1),
    prestige: clamp(Number.isFinite(Number(saved.prestige)) ? Number(saved.prestige) : 45, 0, 100), cohesion: clamp(Number.isFinite(Number(saved.cohesion)) ? Number(saved.cohesion) : 55, 0, 100), disputed: Boolean(saved.disputed), crisisUntil: Math.max(0, Number(saved.crisisUntil) || 0),
    claimants: (Array.isArray(saved.claimants) ? saved.claimants : []).filter(claim => claim && Number.isFinite(Number(claim.personId))).slice(0, 3).map(claim => ({ personId: Number(claim.personId), claim: clamp(Number(claim.claim) || 0, 0, 100), score: Number(claim.score) || 0 })),
    sequence: Math.max(0, Math.floor(Number(saved.sequence) || 0)), nextMarriageYear: Math.max(1, Number(saved.nextMarriageYear) || year + 2),
    previousHouses: (Array.isArray(saved.previousHouses) ? saved.previousHouses : []).filter(house => house && house.name).slice(0, 12).map(house => ({ id: String(house.id || "lost"), name: cleanText(house.name), endedYear: Math.max(1, Number(house.endedYear) || 1) })),
    history: (Array.isArray(saved.history) ? saved.history : []).filter(entry => entry && entry.text).slice(0, 50).map(entry => ({ year: Math.max(1, Number(entry.year) || 1), type: cleanText(entry.type) || "history", text: cleanText(entry.text), personId: Number.isFinite(Number(entry.personId)) ? Number(entry.personId) : null }))
  };
  kingdom.conquests = Math.max(0, Number(kingdom.conquests) || 0);
  return kingdom.dynasty;
}

function normalizeDynastyWorld(sourceVersion = 1) {
  for (const person of people) normalizePersonIdentity(person);
  for (const child of people) for (const parentId of child.parents) { const parent = getPerson(parentId); if (parent) ensurePersonBond(child, parent, "parent", 82, 78, 0); }
  for (const person of people) { person.isRuler = false; person.isHeir = false; person.isRegent = false; }
  for (const kingdom of kingdoms) {
    const hadDynasty = Boolean(kingdom.dynasty); normalizeDynastyState(kingdom);
    const citizens = people.filter(person => !person.dead && person.kingdom === kingdom.id), savedRuler = citizens.find(person => person.id === kingdom.dynasty.rulerId);
    if (!hadDynasty && citizens.length) {
      const founder = [...citizens].sort((a, b) => b.age - a.age || b.happiness - a.happiness || a.id - b.id)[0]; establishRulingHouse(kingdom, founder, true);
    } else if (savedRuler) {
      savedRuler.isRuler = true; savedRuler.nobleRank = rulerTitleFor(kingdom); savedRuler.houseId ||= kingdom.dynasty.id;
      const heir = citizens.find(person => person.id === kingdom.dynasty.heirId); if (heir) { heir.isHeir = true; heir.nobleRank = heirTitleFor(kingdom); }
      const regent = citizens.find(person => person.id === kingdom.dynasty.regentId); if (regent) regent.isRegent = true;
    }
  }
  if (sourceVersion < 16) for (const kingdom of kingdoms) if (!kingdom.defeated) updateDynastyHeir(kingdom);
}

function personInfluence(person) {
  if (!person) return 0;
  const hero = heroForPerson(person.id), classBonus = { elite: 22, merchant: 13, warrior: 17, artisan: 9, peasant: 3, dependent: 0 }[person.socialClass] || 0;
  return classBonus + (person.isGeneral ? 18 : 0) + (person.leadership || 1) * 12 + (person.happiness || 50) * .18 + (hero ? hero.level * 9 + hero.renown * .18 : 0) + Math.min(18, person.age * .24);
}

function successionCandidateScore(person, kingdom, previousRulerId, law) {
  const dynasty = kingdom.dynasty, directChild = person.parents?.includes(previousRulerId), sameHouse = person.houseId === dynasty.id, adult = person.age >= 16, influence = personInfluence(person);
  if (!adult && !(law === "primogeniture" && directChild)) return { person, score: -Infinity, directChild, sameHouse };
  let score = influence;
  if (law === "primogeniture") score += directChild ? 1000 + person.age * 2 : sameHouse ? 420 + person.age : adult ? 30 : -1000;
  if (law === "seniority") score += sameHouse ? 520 + person.age * 4 : adult ? person.age * 1.5 : -1000;
  if (law === "elective") score += (person.socialClass === "elite" ? 80 : person.socialClass === "merchant" ? 55 : 20) + (heroForPerson(person.id) ? 55 : 0) + (person.isGeneral ? 20 : 0);
  if (law === "merit") score += (person.isGeneral ? 90 : 0) + (heroForPerson(person.id)?.renown || 0) * .7 + (person.role === "soldier" ? 35 : 0) + (sameHouse ? 20 : 0);
  return { person, score, directChild, sameHouse };
}

function successionCandidates(kingdom, previousRulerId = kingdom.dynasty?.rulerId, excludeId = null) {
  const law = kingdom.dynasty?.law || governmentRulerDefinition(kingdom).defaultLaw;
  return peopleOfKingdom(kingdom.id).filter(person => !person.dead && person.id !== excludeId).map(person => successionCandidateScore(person, kingdom, previousRulerId, law)).filter(candidate => Number.isFinite(candidate.score)).sort((a, b) => b.score - a.score || b.person.age - a.person.age || a.person.id - b.person.id);
}

function updateDynastyHeir(kingdom) {
  if (!kingdom?.dynasty) return null;
  for (const person of peopleOfKingdom(kingdom.id)) { person.isHeir = false; if (!person.isRuler && person.nobleRank === heirTitleFor(kingdom)) person.nobleRank = null; }
  const candidate = successionCandidates(kingdom, kingdom.dynasty.rulerId, kingdom.dynasty.rulerId)[0];
  kingdom.dynasty.heirId = candidate?.person.id || null;
  if (candidate) { candidate.person.isHeir = true; candidate.person.nobleRank = heirTitleFor(kingdom); candidate.person.claimStrength = clamp(48 + (candidate.directChild ? 30 : 0) + (candidate.sameHouse ? 14 : 0), 0, 100); }
  return candidate?.person || null;
}

function selectRegent(kingdom, rulerId) {
  return peopleOfKingdom(kingdom.id).filter(person => !person.dead && person.id !== rulerId && person.age >= 18).sort((a, b) => personInfluence(b) - personInfluence(a) || a.id - b.id)[0] || null;
}

function performSuccession(kingdom, reason = "继承", scheduled = false) {
  const dynasty = kingdom?.dynasty; if (!dynasty || kingdom.defeated) return null;
  const previousId = dynasty.rulerId, previous = getPerson(previousId), previousName = previous?.name || dynasty.rulerName || "前任统治者";
  let candidates = successionCandidates(kingdom, previousId, scheduled ? previousId : null);
  if (!candidates.length && scheduled) candidates = successionCandidates(kingdom, previousId, null);
  const winner = candidates[0];
  if (!winner) { dynasty.rulerId = null; dynasty.heirId = null; dynasty.regentId = null; dynasty.rulerName = "王位空悬"; dynasty.disputed = true; kingdom.legitimacy = Math.max(0, kingdom.legitimacy - 10); return null; }
  if (previous) { previous.isRuler = false; previous.nobleRank = scheduled ? "前任统治者" : previous.nobleRank; }
  const successor = winner.person, second = candidates[1], oldHouseId = dynasty.id, oldHouseName = dynasty.name;
  if (!successor.houseId) successor.houseId = `house-${kingdom.id}-${successor.id}`;
  if (successor.houseId !== oldHouseId) {
    dynasty.previousHouses.unshift({ id: oldHouseId, name: oldHouseName, endedYear: Math.floor(year) }); dynasty.previousHouses = dynasty.previousHouses.slice(0, 12);
    dynasty.id = successor.houseId; dynasty.name = houseNameFor(kingdom, successor); dynasty.founderId = successor.id;
  }
  successor.isRuler = true; successor.isHeir = false; successor.nobleRank = rulerTitleFor(kingdom); dynasty.rulerId = successor.id; dynasty.rulerName = successor.name; dynasty.rulerSince = Math.floor(year); dynasty.sequence++;
  const rule = governmentRulerDefinition(kingdom); dynasty.termEndsYear = rule.term ? year + rule.term : null;
  const scoreRatio = second && winner.score > 0 ? second.score / winner.score : 0, closeBloodClaims = dynasty.law === "primogeniture" && winner.directChild && second?.directChild && scoreRatio > .975;
  const contested = Boolean(second && ((dynasty.law === "primogeniture" ? closeBloodClaims : scoreRatio > .88) || second.person.bonds?.[String(successor.id)]?.rivalry > 58));
  dynasty.disputed = contested; dynasty.crisisUntil = contested ? year + 8 : 0;
  const winnerClaim = clamp(58 + (winner.directChild ? 25 : 0) + (winner.sameHouse ? 12 : 0) - (contested ? 18 : 0), 0, 100); successor.claimStrength = winnerClaim;
  dynasty.claimants = candidates.slice(0, 3).map((candidate, index) => ({ personId: candidate.person.id, score: Math.round(candidate.score * 10) / 10, claim: index ? clamp(winnerClaim - index * 14, 15, 92) : winnerClaim }));
  if (successor.age < 16) {
    const regent = selectRegent(kingdom, successor.id); dynasty.regentId = regent?.id || null; if (regent) { regent.isRegent = true; regent.nobleRank = "摄政"; ensurePersonBond(regent, successor, "confidant", 55, 46, 18); }
  } else dynasty.regentId = null;
  if (previous && successor.id !== previous.id) recordPersonalMemory(previous.id, successor.id, "succession", `${previousName}将统治责任交给${successor.name}`, 3, 4, contested ? 18 : -3);
  if (second) { ensurePersonBond(successor, second.person, contested ? "rival" : "acquaintance", contested ? 30 : 48, contested ? 24 : 42, contested ? 68 : 18); second.person.claimStrength = dynasty.claimants[1]?.claim || 30; }
  if (contested) { kingdom.legitimacy = Math.max(0, kingdom.legitimacy - 12); kingdom.unrest = Math.min(100, kingdom.unrest + 18); worldStats.successionCrises = (worldStats.successionCrises || 0) + 1; }
  else { kingdom.legitimacy = Math.min(100, kingdom.legitimacy + 4); kingdom.unrest = Math.max(0, kingdom.unrest - 3); }
  const transition = scheduled ? rule.transition : reason, text = `${previousName}${scheduled ? "卸任" : "退出统治"}，${successor.name}通过${successionLawDefs[dynasty.law].name}${transition === "继承" ? "继位" : `完成${transition}`}，成为新任${rulerTitleFor(kingdom)}。`;
  dynasty.history.unshift({ year: Math.floor(year), type: contested ? "crisis" : "succession", text, personId: successor.id }); dynasty.history = dynasty.history.slice(0, 50);
  worldStats.successions = (worldStats.successions || 0) + 1; addEvent(`${contested ? "⚠" : "♛"} ${kingdom.name}：${text}${contested ? "多名宣称者拒绝退让，继承危机爆发。" : ""}`, "dynasty");
  updateDynastyHeir(kingdom); return successor;
}

function relatedClosely(first, second) {
  if (!first || !second) return true;
  if (first.parents?.includes(second.id) || second.parents?.includes(first.id)) return true;
  return first.parents?.some(parentId => second.parents?.includes(parentId)) || false;
}

function marriageCompatibility(first, second) {
  const ageGap = Math.abs(first.age - second.age), sameVillage = first.village && first.village === second.village ? 12 : 0, heroBonus = heroForPerson(first.id) || heroForPerson(second.id) ? 4 : 0;
  return 100 - ageGap * 1.4 + sameVillage + (first.happiness + second.happiness) * .12 + heroBonus - Math.abs(first.id - second.id) * .015;
}

function arrangeMarriage(first, second, kingdom, prominent = false) {
  if (!first || !second || first.spouseId || second.spouseId || relatedClosely(first, second)) return false;
  first.spouseId = second.id; second.spouseId = first.id;
  let familyId = first.houseId || second.houseId || `family-${Math.min(first.id, second.id)}-${Math.max(first.id, second.id)}`;
  if (first.id === kingdom.dynasty.rulerId || first.id === kingdom.dynasty.heirId) familyId = kingdom.dynasty.id;
  if (second.id === kingdom.dynasty.rulerId || second.id === kingdom.dynasty.heirId) familyId = kingdom.dynasty.id;
  first.houseId = familyId; second.houseId = familyId; ensurePersonBond(first, second, "spouse", 78, 72, 0);
  recordPersonalMemory(first.id, second.id, "marriage", `${first.name}与${second.name}缔结婚姻`, 10, 12, -8);
  worldStats.marriages = (worldStats.marriages || 0) + 1;
  if (prominent || familyId === kingdom.dynasty.id) {
    const text = `${first.name}与${second.name}缔结婚姻，${kingdom.dynasty.name}的亲族关系由此改变。`;
    kingdom.dynasty.history.unshift({ year: Math.floor(year), type: "marriage", text, personId: first.id }); kingdom.dynasty.history = kingdom.dynasty.history.slice(0, 50); addEvent(`♥ ${kingdom.name}：${text}`, "relationship");
  }
  return true;
}

function findMarriagePartner(person, kingdom) {
  return peopleOfKingdom(kingdom.id).filter(candidate => candidate.id !== person.id && !candidate.dead && !candidate.spouseId && candidate.age >= 18 && candidate.sex !== person.sex && !relatedClosely(person, candidate)).sort((a, b) => marriageCompatibility(person, b) - marriageCompatibility(person, a) || a.id - b.id)[0] || null;
}

function arrangeNextMarriage(kingdom) {
  const dynasty = kingdom.dynasty; if (year < dynasty.nextMarriageYear) return false;
  dynasty.nextMarriageYear = year + 6;
  const citizens = peopleOfKingdom(kingdom.id), possible = [getPerson(dynasty.rulerId), getPerson(dynasty.heirId), ...citizens.filter(person => person.houseId === dynasty.id), ...citizens].filter(Boolean);
  const priority = possible.filter((person, index, list) => list.findIndex(candidate => candidate.id === person.id) === index && !person.spouseId && person.age >= 18);
  for (const person of priority) { const partner = findMarriagePartner(person, kingdom); if (partner && arrangeMarriage(person, partner, kingdom, person.isRuler || person.isHeir)) return true; }
  return false;
}

function updatePersonalBonds(kingdom) {
  const dynasty = kingdom.dynasty, ruler = getPerson(dynasty.rulerId), heir = getPerson(dynasty.heirId), regent = getPerson(dynasty.regentId);
  if (ruler && heir) {
    if (ruler.childrenIds?.includes(heir.id)) ensurePersonBond(heir, ruler, "parent", 62, 55, dynasty.disputed ? 38 : 8);
    else ensurePersonBond(ruler, heir, ruler.houseId === heir.houseId ? "kin" : "acquaintance", 62, 55, dynasty.disputed ? 38 : 8);
  }
  if (ruler && regent) ensurePersonBond(ruler, regent, "confidant", 54, 48, dynasty.disputed ? 32 : 10);
  for (const hero of heroes.filter(hero => hero.kingdomId === kingdom.id && hero.status === "active")) {
    const person = getPerson(hero.personId); if (!ruler || !person || person.id === ruler.id) continue;
    const bond = ensurePersonBond(ruler, person, "acquaintance", hero.archetype === "statesman" ? 66 : 52, hero.archetype === "statesman" ? 62 : 48, hero.renown > 60 && person.houseId !== dynasty.id ? 34 : 8);
    bond.trust = clamp(bond.trust + (kingdom.legitimacy > 60 ? .35 : -.2), 0, 100); bond.rivalry = clamp(bond.rivalry + (hero.renown > 80 && person.houseId !== dynasty.id ? .45 : -.12), 0, 100);
  }
  for (const person of peopleOfKingdom(kingdom.id)) for (const [otherId, bond] of Object.entries(person.bonds || {})) {
    if (person.id >= Number(otherId)) continue; const other = getPerson(Number(otherId)); if (!other) continue;
    if (person.spouseId === other.id) { bond.type = "spouse"; bond.affinity = clamp(bond.affinity + .12, 0, 100); bond.trust = clamp(bond.trust + .1, 0, 100); bond.rivalry = clamp(bond.rivalry - .14, 0, 100); }
    else if (!["parent", "child", "kin"].includes(bond.type)) { if (bond.rivalry > 65) bond.type = "rival"; else if (bond.trust > 70 && bond.affinity > 65) bond.type = "confidant"; }
    const mirror = other.bonds?.[String(person.id)]; if (mirror) { mirror.affinity = bond.affinity; mirror.trust = bond.trust; mirror.rivalry = bond.rivalry; if (!["parent", "child"].includes(mirror.type)) mirror.type = inverseBondType(bond.type); }
  }
}

function updateDynastyPrestige(kingdom) {
  const dynasty = kingdom.dynasty, ruler = getPerson(dynasty.rulerId), involved = [ruler, getPerson(dynasty.heirId), getPerson(dynasty.regentId), ruler ? getPerson(ruler.spouseId) : null].filter(Boolean);
  const bonds = [];
  for (let first = 0; first < involved.length; first++) for (let second = first + 1; second < involved.length; second++) {
    const bond = involved[first].bonds?.[String(involved[second].id)]; if (bond) bonds.push(bond.affinity * .45 + bond.trust * .45 - bond.rivalry * .3);
  }
  const cohesionTarget = bonds.length ? bonds.reduce((sum, value) => sum + value, 0) / bonds.length : dynasty.disputed ? 34 : 55;
  dynasty.cohesion = clamp(dynasty.cohesion + (cohesionTarget - dynasty.cohesion) * .12, 0, 100);
  const prestigeTarget = clamp(kingdom.legitimacy * .58 + totalTechnologyLevel(kingdom) * 2.4 + (kingdom.development?.completedAmbitions?.length || 0) * 7 + (kingdom.conquests || 0) * 3 + (ruler ? personInfluence(ruler) * .16 : 0) - (dynasty.disputed ? 16 : 0), 0, 100);
  dynasty.prestige = clamp(dynasty.prestige + (prestigeTarget - dynasty.prestige) * .09, 0, 100);
  if (dynasty.disputed && year >= dynasty.crisisUntil) { dynasty.disputed = false; dynasty.claimants = dynasty.claimants.slice(0, 1); addEvent(`${kingdom.name}的继承争议逐渐平息，${dynasty.name}重新控制政局。`, "dynasty"); }
}

function dynastyGovernanceModifiers(kingdom) {
  const dynasty = kingdom?.dynasty; if (!dynasty) return { stability: 0, legitimacy: 0, tax: 1 };
  const ruler = getPerson(dynasty.rulerId), rulerAbility = ruler ? (personInfluence(ruler) - 45) * .06 : -4, regencyPenalty = dynasty.regentId ? 2.5 : 0, crisisPenalty = dynasty.disputed ? 8 : 0;
  return {
    stability: clamp((dynasty.prestige - 50) * .07 + (dynasty.cohesion - 50) * .06 + rulerAbility - regencyPenalty - crisisPenalty, -12, 12),
    legitimacy: clamp((dynasty.prestige - 50) * .08 + (ruler?.claimStrength || 0) * .035 - crisisPenalty, -12, 12),
    tax: clamp(1 + (dynasty.prestige - 50) * .0015 - (dynasty.disputed ? .08 : 0), .82, 1.12)
  };
}

function onGovernmentChanged(kingdom, previousGovernment) {
  if (!kingdom?.dynasty) return;
  const rule = governmentRulerDefinition(kingdom), ruler = getPerson(kingdom.dynasty.rulerId);
  if (year >= kingdom.dynasty.lawLockedUntil) kingdom.dynasty.law = rule.defaultLaw;
  kingdom.dynasty.termEndsYear = rule.term ? year + rule.term : null;
  if (ruler) ruler.nobleRank = rule.title;
  kingdom.dynasty.history.unshift({ year: Math.floor(year), type: "reform", text: `${governmentDefs[previousGovernment]?.name || "旧政体"}终结，统治职位改称${rule.title}。`, personId: ruler?.id || null });
}

function setSuccessionLaw(kingdomId, law, guided = true) {
  const kingdom = getKingdom(kingdomId), dynasty = kingdom?.dynasty; if (!kingdom || !dynasty || !successionLawDefs[law] || dynasty.law === law) return false;
  if (guided && year < dynasty.lawLockedUntil) { showToast(`继承法将在纪元 ${Math.ceil(dynasty.lawLockedUntil)} 后允许改革`); return false; }
  const previous = successionLawDefs[dynasty.law].name; dynasty.law = law; dynasty.lawLockedUntil = guided ? year + 15 : year + 8; kingdom.legitimacy = Math.max(0, kingdom.legitimacy - (guided ? 3 : 1)); updateDynastyHeir(kingdom);
  addEvent(`📜 ${kingdom.name}将${previous}改革为${successionLawDefs[law].name}，继承顺序随之改变。`, "dynasty");
  if (guided) { showToast(`${kingdom.name}采用${successionLawDefs[law].name}`); updateUI(); renderDirty = true; }
  return true;
}

function dynastySimulationStep() {
  for (const person of people) {
    normalizePersonIdentity(person);
    if (person.spouseId && !getPerson(person.spouseId)) { person.spouseId = null; if (person.bonds) for (const [id, bond] of Object.entries(person.bonds)) if (!getPerson(Number(id)) && bond.type === "spouse") bond.type = "kin"; }
  }
  for (const kingdom of kingdoms) {
    if (kingdom.defeated) continue; normalizeDynastyState(kingdom);
    const dynasty = kingdom.dynasty, ruler = getPerson(dynasty.rulerId), validRuler = ruler && !ruler.dead && ruler.kingdom === kingdom.id;
    if (!validRuler) performSuccession(kingdom, "继承", false);
    else if (dynasty.termEndsYear && year >= dynasty.termEndsYear) performSuccession(kingdom, governmentRulerDefinition(kingdom).transition, true);
    const currentRuler = getPerson(dynasty.rulerId);
    if (currentRuler && currentRuler.age >= 16 && dynasty.regentId) { const regent = getPerson(dynasty.regentId); if (regent) { regent.isRegent = false; if (regent.nobleRank === "摄政") regent.nobleRank = null; } dynasty.regentId = null; addEvent(`${kingdom.name}的${currentRuler.name}已经亲政，摄政时期结束。`, "dynasty"); }
    updateDynastyHeir(kingdom); arrangeNextMarriage(kingdom); updatePersonalBonds(kingdom); updateDynastyPrestige(kingdom);
  }
}

function coParentFor(person) {
  const spouse = getPerson(person?.spouseId); return spouse && !spouse.dead && spouse.kingdom === person.kingdom ? spouse : null;
}

function markKingdomDynastyDefeated(kingdom) {
  if (!kingdom?.dynasty) return;
  const ruler = getPerson(kingdom.dynasty.rulerId); if (ruler) { ruler.isRuler = false; ruler.nobleRank = "末代统治者"; }
  kingdom.dynasty.history.unshift({ year: Math.floor(year), type: "fall", text: `${kingdom.dynasty.name}随国家覆灭而失去统治权。`, personId: ruler?.id || null }); kingdom.dynasty.rulerId = null; kingdom.dynasty.heirId = null;
}

function bondLabel(bond) {
  if (!bond) return "陌生"; if (bond.type === "spouse") return "配偶"; if (bond.type === "parent") return "父母"; if (bond.type === "child") return "子女"; if (bond.type === "kin") return "亲族"; if (bond.rivalry >= 65 || bond.type === "rival") return "宿敌"; if (bond.trust >= 70 && bond.affinity >= 65) return "知己"; return "相识";
}

function personRelationshipSummary(person) {
  const bonds = Object.entries(person?.bonds || {}).map(([id, bond]) => ({ person: getPerson(Number(id)), bond })).filter(entry => entry.person).sort((a, b) => (b.bond.trust + b.bond.affinity - b.bond.rivalry) - (a.bond.trust + a.bond.affinity - a.bond.rivalry)).slice(0, 5);
  return bonds.map(({ person: other, bond }) => { const memory = bond.memories?.[0]; return `<button class="person-link relation-person" data-person-id="${other.id}"><b>${bondLabel(bond)} · ${other.name}</b><span>亲近 ${Math.round(bond.affinity)} · 信任 ${Math.round(bond.trust)} · 竞争 ${Math.round(bond.rivalry)}</span>${memory ? `<small>纪元 ${memory.year} · ${memory.text}</small>` : ""}</button>`; }).join("") || `<span class="muted">尚未形成重要人物关系</span>`;
}

function personIdentityDetailHtml(person) {
  normalizePersonIdentity(person);
  const kingdom = getKingdom(person.kingdom), dynasty = kingdom?.dynasty, spouse = getPerson(person.spouseId), parents = person.parents.map(getPerson).filter(Boolean), children = person.childrenIds.map(getPerson).filter(Boolean);
  const role = person.isRuler ? `${rulerTitleFor(kingdom)} · 在位 ${Math.max(0, Math.floor(year - (dynasty?.rulerSince || year)))} 年` : person.isRegent ? "摄政" : person.isHeir ? `${heirTitleFor(kingdom)} · 宣称 ${Math.round(person.claimStrength)}` : person.nobleRank || "普通居民";
  const familyLinks = [...parents.map(parent => `<button class="person-link compact" data-person-id="${parent.id}">亲代 ${parent.name}</button>`), ...(spouse ? [`<button class="person-link compact" data-person-id="${spouse.id}">配偶 ${spouse.name}</button>`] : []), ...children.slice(0, 4).map(child => `<button class="person-link compact" data-person-id="${child.id}">子女 ${child.name}</button>`)].join("") || `<span class="muted">亲属关系尚未记录</span>`;
  return `<div class="detail-row"><span>姓名 / 性别</span><b>${person.name} · ${person.sex === "female" ? "女" : "男"}</b></div><div class="detail-row"><span>政治身份</span><b>${role}</b></div><div class="family-links">${familyLinks}</div><h3>人物关系</h3><div class="personal-relations">${personRelationshipSummary(person)}</div>`;
}

function dynastyLawControlsHtml(kingdom) {
  return Object.entries(successionLawDefs).map(([id, definition]) => `<button class="succession-law ${kingdom.dynasty.law === id ? "active" : ""}" data-succession-law="${id}" title="${definition.description}">${definition.icon} ${definition.name}</button>`).join("");
}

function dynastyDetailHtml(kingdom) {
  normalizeDynastyState(kingdom);
  const dynasty = kingdom.dynasty, ruler = getPerson(dynasty.rulerId), heir = getPerson(dynasty.heirId), regent = getPerson(dynasty.regentId), law = successionLawDefs[dynasty.law];
  const claimants = dynasty.claimants.slice(0, 3).map(claim => { const person = getPerson(claim.personId); return person ? `<button class="person-link compact ${claim.personId === dynasty.rulerId ? "ruler" : ""}" data-person-id="${person.id}">${person.name} · 宣称 ${Math.round(claim.claim)}</button>` : ""; }).join("");
  const history = dynasty.history.slice(0, 4).map(entry => `<div class="dynasty-history"><time>纪元 ${entry.year}</time><span>${entry.text}</span></div>`).join("") || `<span class="muted">统治史尚未落笔</span>`;
  return `<h3>王朝与继承</h3><div class="dynasty-banner ${dynasty.disputed ? "disputed" : ""}"><b>♛ ${dynasty.name}</b><span>${law.icon} ${law.name} · 第 ${Math.max(1, dynasty.sequence)} 任${dynasty.disputed ? " · 继承危机" : ""}</span></div><div class="dynasty-office"><button class="person-link ruler" data-person-id="${ruler?.id || ""}" ${ruler ? "" : "disabled"}><b>${rulerTitleFor(kingdom)} · ${ruler?.name || "王位空悬"}</b><span>${ruler ? `${Math.floor(ruler.age)} 岁 · 宣称 ${Math.round(ruler.claimStrength)}` : "国家缺少合法统治者"}</span></button><button class="person-link" data-person-id="${heir?.id || ""}" ${heir ? "" : "disabled"}><b>${heirTitleFor(kingdom)} · ${heir?.name || "尚未确定"}</b><span>${heir ? `${Math.floor(heir.age)} 岁 · 宣称 ${Math.round(heir.claimStrength)}` : "继承序列仍在形成"}</span></button></div>${regent ? `<p class="regency-note">摄政：<button class="person-link inline" data-person-id="${regent.id}">${regent.name}</button></p>` : ""}<div class="need-list">${needMeter("家族威望", dynasty.prestige)}${needMeter("宫廷凝聚", dynasty.cohesion)}</div><div class="claimant-list">${claimants}</div><div class="succession-laws">${dynastyLawControlsHtml(kingdom)}</div><small class="dynasty-hint">继承法改革后锁定 15 纪元；不同制度会重新计算继承顺序。</small><div class="dynasty-history-list">${history}</div>`;
}

function renderDynastyPanels() {
  const list = document.getElementById("dynastyList"); if (!list) return;
  const active = kingdoms.filter(kingdom => !kingdom.defeated);
  list.innerHTML = active.length ? active.map(kingdom => {
    normalizeDynastyState(kingdom); const ruler = getPerson(kingdom.dynasty.rulerId), heir = getPerson(kingdom.dynasty.heirId), law = successionLawDefs[kingdom.dynasty.law];
    return `<button class="dynasty-item ${kingdom.dynasty.disputed ? "disputed" : ""}" data-dynasty="${kingdom.id}" style="--kingdom-color:${kingdom.color}"><b>♛ ${kingdom.dynasty.name}</b><span>${rulerTitleFor(kingdom)} ${ruler?.name || "空悬"} · ${law.name}</span><small>${heir ? `${heirTitleFor(kingdom)} ${heir.name}` : "继承人尚未确定"} · 威望 ${Math.round(kingdom.dynasty.prestige)}${kingdom.dynasty.disputed ? " · 危机" : ""}</small></button>`;
  }).join("") : `<p class="muted">尚未形成统治家族</p>`;
}

function renderDynastyMarker(context, metrics, person, sx, sy, radius) {
  if (!person?.isRuler && !person?.isHeir && !person?.isRegent) return;
  context.save(); context.fillStyle = person.isRuler ? "#ffe083" : person.isRegent ? "#bf9ae0" : "#e4c66d"; context.font = `${Math.max(8, metrics.size * 1.15)}px sans-serif`; context.textAlign = "center";
  context.fillText(person.isRuler ? "♛" : person.isRegent ? "◆" : "♢", sx + radius * .85, sy - radius * 1.25); context.restore();
}

globalThis.RealmDynasty = Object.freeze({ successionLawDefs, governmentRulerDefs, personNameFor, createPersonIdentity, normalizePersonIdentity, createDynastyState, normalizeDynastyState, performSuccession, dynastyGovernanceModifiers });
