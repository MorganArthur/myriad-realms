"use strict";

// 世界遗产层：区域事件、遗迹探索、神器、奇观工程、全球危机与轮换挑战。

const legacyEngine = globalThis.WorldEngine;

const ruinDefs = Object.freeze({
  star_observatory: { name: "群星观测台", icon: "✧", color: "#8fb9d8", lore: "断裂的星盘仍在记录陌生天体的轨迹。", artifact: "star_compass" },
  ember_vault: { name: "余烬锻库", icon: "◆", color: "#d7895d", lore: "熄灭千年的炉膛下埋藏着失落的锻造技艺。", artifact: "titan_hammer" },
  verdant_shrine: { name: "苍翠圣所", icon: "❧", color: "#75b779", lore: "巨树根系包裹着一座比现存文明更古老的神殿。", artifact: "verdant_crown" },
  drowned_archive: { name: "沉潮档案馆", icon: "▤", color: "#67afbd", lore: "潮水退去时，刻满盟誓的石室短暂显露。", artifact: "oath_tablet" }
});

const scarDefs = Object.freeze({
  war_ruins: { name: "战争废墟", icon: "⚔", color: "#a86d60", lore: "破碎的屋梁与焦黑石墙记录着一次聚落陷落。" },
  flooded_town: { name: "淹没旧镇", icon: "🌊", color: "#5b98aa", lore: "退水后，旧街道的轮廓仍沉在泥沙和浅滩之下。" },
  impact_crater: { name: "灾变裂坑", icon: "◉", color: "#8b7364", lore: "大地在灾变中塌陷，裸露岩层保存着那一刻的力量。" },
  ancient_battlefield: { name: "古战场", icon: "†", color: "#9b7167", lore: "遗落兵刃与无名旗帜标记着一次改变疆界的战役。" },
  plague_memorial: { name: "疫潮纪念地", icon: "☣", color: "#819864", lore: "石碑记下逝者与救治者的名字，提醒后世警惕疫病。" },
  volcano_shrine: { name: "火山祭坛", icon: "🌋", color: "#bd684b", lore: "凝固熔岩包围着幸存者留下的祭坛与重建誓言。" },
  broken_road: { name: "断裂古道", icon: "═", color: "#8c806a", lore: "道路在灾难或战火中断裂，旧商旅路线由此改道。" },
  hero_tomb: { name: "英雄之墓", icon: "♜", color: "#d2b86b", lore: "一位英雄的事迹、盟友和遗憾被刻在墓碑之上。" },
  abandoned_port: { name: "废弃港湾", icon: "⚓", color: "#62889a", lore: "倾倒的桅杆和空仓库见证了海路的衰落。" },
  collapsed_mine: { name: "坍塌矿井", icon: "⛏", color: "#8d795f", lore: "封死的坑道仍埋藏矿脉，也保存着矿工的共同记忆。" },
  dried_well: { name: "枯井遗址", icon: "☀", color: "#b4975c", lore: "干裂井壁记录着漫长旱季与艰难的水源争夺。" },
  storm_path: { name: "风暴残径", icon: "🌪", color: "#7f8993", lore: "成排折木与散落屋瓦勾勒出风暴曾经走过的路线。" }
});

function legacySiteDefinition(site) { return site ? ruinDefs[site.type] || scarDefs[site.type] || null : null; }
function isHistoricalScar(site) { return Boolean(site && (site.origin === "historical" || scarDefs[site.type])); }

const artifactDefs = Object.freeze({
  star_compass: { name: "星界罗盘", icon: "✧", color: "#9cc9e4", effect: "推动航运与研究，并加快遗迹探索。" },
  titan_hammer: { name: "泰坦铸锤", icon: "⚒", color: "#dfa06b", effect: "提高木石积累与奇观营造效率。" },
  verdant_crown: { name: "苍生之冠", icon: "♧", color: "#8acb7f", effect: "改善粮食、健康与自然恢复。" },
  oath_tablet: { name: "万邦誓碑", icon: "▤", color: "#d4bd75", effect: "提高合法性、凝聚力与非战争外交。" }
});

const wonderDefs = Object.freeze({
  grand_library: { name: "万卷穹庭", icon: "📚", color: "#82bad1", race: "human", effect: "行政与研究获得持续推动。" },
  worldroot_garden: { name: "世界根花园", icon: "🌳", color: "#79bd76", race: "elf", effect: "粮食、医药与居民健康持续改善。" },
  eternal_forge: { name: "永恒熔炉", icon: "⚒", color: "#d58a5c", race: "dwarf", effect: "资源积累与建筑修复效率提高。" },
  sky_citadel: { name: "苍穹战垒", icon: "🏰", color: "#cf7667", race: "orc", effect: "军团士气、合法性与国土防御提高。" }
});

const dynamicEventDefs = globalThis.RealmRegionalEventContent?.events || Object.freeze({});

const crisisDefs = Object.freeze({
  ashen_winter: { name: "灰烬长冬", icon: "❄", color: "#9fb8c8", duration: 16, text: "高空灰尘遮蔽日光，作物歉收与严寒正在同时席卷大陆。", response: "储粮、医药与协作" },
  red_miasma: { name: "赤雾疫潮", icon: "☣", color: "#9bc46b", duration: 14, text: "一种跨越国境传播的疫病迫使各文明共享医药、隔离与救济经验。", response: "医药、救济与公共秩序" },
  broken_oaths: { name: "盟誓崩解", icon: "⚔", color: "#d66f63", duration: 15, text: "旧怨、军备与边境冲突形成连锁反应，世界秩序濒临全面战争。", response: "外交、权威与共同约束" }
});

const challengeDefs = Object.freeze({
  relic_seekers: { name: "寻古者之约", icon: "🗿", metric: () => artifacts.length, target: 1, duration: 22, reward: 18, text: "在期限内从遗迹中寻得一件神器。" },
  builders_call: { name: "巨匠之约", icon: "🏗", metric: () => wonders.filter(wonder => wonder.status === "complete").length, target: 1, duration: 34, reward: 24, text: "在期限内完成一座世界奇观。" },
  caravan_compact: { name: "百队通商", icon: "🐫", metric: () => worldStats.tradeDeliveries || 0, target: 8, duration: 24, reward: 18, text: "在期限内完成八次新的商队交付。" },
  disaster_vigil: { name: "守望者誓约", icon: "🛡", metric: () => worldStats.disastersSurvived || 0, target: 2, duration: 26, reward: 20, text: "在期限内让世界安然度过两场天灾。" }
});

let legacySites = [], artifacts = [], wonders = [];
let nextLegacySiteId = 1, nextArtifactId = 1, nextWonderId = 1;
let legacyState = createLegacyState();
let selectedLegacyId = null;
let legacyUiReady = false;

function createLegacyState() {
  return { nextEventYear: 7, activeEvent: null, eventHistory: [], nextCrisisYear: 28, activeCrisis: null, crisisHistory: [], challenge: null, challengeHistory: [], nextChallengeYear: 1 };
}

function resetLegacyState() {
  legacySites = []; artifacts = []; wonders = []; nextLegacySiteId = 1; nextArtifactId = 1; nextWonderId = 1; selectedLegacyId = null;
  legacyState = createLegacyState();
}

function legacyTileCandidate(existing = []) {
  for (let attempt = 0; attempt < 600; attempt++) {
    const x = legacyEngine.randi(3, MAP_W - 4), y = legacyEngine.randi(3, MAP_H - 4), tile = tileAt(x, y);
    if (!isLand(tile) || tile.type === "mountain" || tile.fire > 0) continue;
    if (villages.some(village => Math.hypot(village.x - x, village.y - y) < 6)) continue;
    if (existing.some(site => Math.hypot(site.x - x, site.y - y) < 12)) continue;
    return { x, y };
  }
  const fallback = tiles.findIndex((tile, index) => isLand(tile) && tile.type !== "mountain" && index % 17 === 0);
  return fallback >= 0 ? { x: fallback % MAP_W, y: Math.floor(fallback / MAP_W) } : { x: Math.floor(MAP_W / 2), y: Math.floor(MAP_H / 2) };
}

function seedLegacySites(count = 6) {
  const types = Object.keys(ruinDefs);
  for (let index = legacySites.length; index < count; index++) {
    const position = legacyTileCandidate(legacySites), type = types[(index + legacyEngine.randi(0, types.length - 1)) % types.length];
    legacySites.push({ id: nextLegacySiteId++, type, x: position.x, y: position.y, status: "hidden", progress: 0, kingdomId: null, discoveredYear: null, exploredYear: null, artifactId: null });
  }
}

function legacyKingdom(value) { if (value === null || value === undefined || value === "") return null; const id = Number(value); return Number.isFinite(id) ? getKingdom(id) || null : null; }

function nearestKingdomToPoint(x, y, excludedKingdomIds = []) {
  const excluded = new Set(excludedKingdomIds);
  let best = null, bestDistance = Infinity;
  for (const kingdom of kingdoms.filter(candidate => !candidate.defeated && !excluded.has(candidate.id))) for (const village of villagesOfKingdom(kingdom.id)) {
    const distance = Math.hypot(village.x - x, village.y - y); if (distance < bestDistance) { best = kingdom; bestDistance = distance; }
  }
  return best;
}

function recordHistoricalScar(type, x, y, kingdomId = null, details = {}) {
  const definition = scarDefs[type]; if (!definition) return null;
  const sx = legacyEngine.clamp(Math.round(Number(x) || 0), 0, MAP_W - 1), sy = legacyEngine.clamp(Math.round(Number(y) || 0), 0, MAP_H - 1);
  const duplicate = legacySites.find(site => isHistoricalScar(site) && site.type === type && Math.hypot(site.x - sx, site.y - sy) < 4 && year - (site.createdYear || 0) < 12); if (duplicate) return duplicate;
  if (legacySites.filter(isHistoricalScar).length >= 60) return null;
  const owner = legacyKingdom(kingdomId) || nearestKingdomToPoint(sx, sy), cause = legacyEngine.cleanText(details.cause) || definition.name;
  const site = { id: nextLegacySiteId++, type, origin: "historical", x: sx, y: sy, status: "scar", resolution: null, progress: 100, kingdomId: owner?.id ?? null, createdYear: Math.floor(year), discoveredYear: Math.floor(year), exploredYear: null, artifactId: null, cause, subject: legacyEngine.cleanText(details.subject), claimants: [], history: [{ year: Math.floor(year), action: "created", kingdomId: owner?.id ?? null, text: cause }] };
  legacySites.push(site); worldStats.historicalScars = (worldStats.historicalScars || 0) + 1; addEvent(`${definition.icon} ${definition.name}成为新的历史伤痕：${cause}。`, "legacy"); return site;
}

function artifactHolderHero(artifact) { return artifact?.holderType === "hero" ? heroes.find(hero => hero.id === artifact.holderId && hero.status === "active") || null : null; }
function artifactKingdomId(artifact) { return artifactHolderHero(artifact)?.kingdomId ?? legacyKingdom(artifact?.kingdomId)?.id ?? null; }
function artifactHolderLabel(artifact) {
  const hero = artifactHolderHero(artifact), kingdom = getKingdom(artifactKingdomId(artifact));
  if (artifact?.status === "lost" || artifact?.holderType === "lost") return "下落不明";
  return hero ? `${hero.title}${hero.name}` : kingdom?.name || "无主";
}

function artifactLocation(artifact) {
  const hero = artifactHolderHero(artifact), person = hero ? getPerson(hero.personId) : null; if (person) return { x: person.x, y: person.y };
  const capital = villagesOfKingdom(artifactKingdomId(artifact)).sort((a, b) => b.level - a.level)[0]; return capital ? { x: capital.x, y: capital.y } : null;
}

function transferArtifact(artifact, kingdomId, heroId = null, reason = "神器易主") {
  const kingdom = getKingdom(Number(kingdomId)), hero = heroes.find(candidate => candidate.id === Number(heroId) && candidate.status === "active" && candidate.kingdomId === kingdom?.id); if (!artifact || !kingdom || kingdom.defeated) return false;
  const previous = artifactKingdomId(artifact); artifact.kingdomId = kingdom.id; artifact.holderType = hero ? "hero" : "kingdom"; artifact.holderId = hero?.id || kingdom.id; artifact.status = artifact.durability >= 100 ? "held" : "damaged"; artifact.history ||= []; artifact.history.unshift({ year: Math.floor(year), action: "transfer", fromKingdomId: previous, kingdomId: kingdom.id, heroId: hero?.id || null, text: legacyEngine.cleanText(reason) }); artifact.history = artifact.history.slice(0, 30);
  worldStats.artifactTransfers = (worldStats.artifactTransfers || 0) + Number(previous !== null && previous !== kingdom.id); if (previous !== null && previous !== kingdom.id) recordDiplomaticMemory(previous, kingdom.id, "artifact", `${artifactDefs[artifact.type].name}因${reason}易主`, -5, 8);
  addEvent(`${artifactDefs[artifact.type].icon} ${artifactDefs[artifact.type].name}${hero ? `交由${hero.title}${hero.name}携带` : `归入${kingdom.name}国库`}。`, "legacy"); return true;
}

function loseArtifact(artifact, x, y, reason = "战乱中失落") {
  if (!artifact || artifact.status === "lost") return false;
  const oldKingdomId = artifactKingdomId(artifact), scar = recordHistoricalScar("war_ruins", x, y, oldKingdomId, { cause: `${artifactDefs[artifact.type].name}${reason}` }); artifact.holderType = "lost"; artifact.holderId = scar?.id || null; artifact.kingdomId = oldKingdomId; artifact.status = "lost"; artifact.history ||= []; artifact.history.unshift({ year: Math.floor(year), action: "lost", kingdomId: oldKingdomId, siteId: scar?.id || null, text: reason }); artifact.history = artifact.history.slice(0, 30); if (scar) scar.artifactId = artifact.id; worldStats.artifactsLost = (worldStats.artifactsLost || 0) + 1; addEvent(`${artifactDefs[artifact.type].icon} 神器“${artifactDefs[artifact.type].name}”${reason}。`, "legacy"); return true;
}

function damageArtifact(artifact, amount, cause) {
  if (!artifact || artifact.status === "lost") return false; const previous = artifact.durability ?? 100;
  artifact.durability = legacyEngine.clamp(previous - Math.max(0, amount), 0, 100); if (artifact.durability < 100) artifact.status = "damaged";
  if (artifact.durability < previous) { artifact.history ||= []; artifact.history.unshift({ year: Math.floor(year), action: "damaged", kingdomId: artifactKingdomId(artifact), text: legacyEngine.cleanText(cause), durability: Math.round(artifact.durability) }); artifact.history = artifact.history.slice(0, 30); }
  return artifact.durability < previous;
}

function repairArtifact(artifactId) {
  const artifact = artifacts.find(candidate => candidate.id === Number(artifactId)), kingdom = getKingdom(artifactKingdomId(artifact)); if (!artifact || !kingdom || artifact.status === "lost" || artifact.durability >= 100 || kingdom.treasury < 8 || kingdom.resources.stone < 4) return false;
  kingdom.treasury -= 8; kingdom.resources.stone -= 4; artifact.durability = Math.min(100, artifact.durability + 45); artifact.status = artifact.durability >= 100 ? "held" : "damaged"; artifact.history ||= []; artifact.history.unshift({ year: Math.floor(year), action: "repaired", kingdomId: kingdom.id, text: `${kingdom.name}修复了神器` }); addEvent(`${artifactDefs[artifact.type].icon} ${kingdom.name}修复了${artifactDefs[artifact.type].name}。`, "legacy"); updateUI(); return true;
}

function bestArtifactHero(kingdomId) { return heroes.filter(hero => hero.status === "active" && hero.kingdomId === kingdomId).sort((a, b) => b.level - a.level || b.renown - a.renown || a.id - b.id)[0] || null; }
function manageArtifact(artifactId, action) {
  const artifact = artifacts.find(candidate => candidate.id === Number(artifactId)), kingdomId = artifactKingdomId(artifact); if (!artifact || kingdomId === null) return false;
  if (action === "repair") return repairArtifact(artifact.id);
  if (action === "hero") { const hero = bestArtifactHero(kingdomId); return hero ? transferArtifact(artifact, kingdomId, hero.id, "创世者授予") : false; }
  if (action === "treasury") return transferArtifact(artifact, kingdomId, null, "创世者收归国库");
  return false;
}

function damageWonder(wonder, amount, cause) {
  if (!wonder || wonder.status === "ruined") return false; wonder.maxHp ||= 300; const previous = wonder.hp ?? wonder.maxHp; wonder.hp = legacyEngine.clamp(previous - Math.max(0, amount), 0, wonder.maxHp); wonder.damageHistory ||= [];
  if (wonder.hp < previous) { wonder.damageHistory.unshift({ year: Math.floor(year), cause: legacyEngine.cleanText(cause), damage: Math.round(previous - wonder.hp) }); wonder.damageHistory = wonder.damageHistory.slice(0, 30); worldStats.wondersDamaged = (worldStats.wondersDamaged || 0) + 1; }
  if (wonder.hp <= 0) { wonder.status = "ruined"; recordHistoricalScar("war_ruins", wonder.x, wonder.y, wonder.kingdomId, { cause: `${wonderDefs[wonder.type].name}毁于${cause}` }); addEvent(`${wonderDefs[wonder.type].icon} ${wonderDefs[wonder.type].name}在${cause}中沦为废墟。`, "wonder"); }
  else if (wonder.status === "complete") { wonder.status = "damaged"; addEvent(`${wonderDefs[wonder.type].icon} ${wonderDefs[wonder.type].name}在${cause}中受损。`, "wonder"); }
  return wonder.hp < previous;
}

function restoreWonder(wonderId, forced = true) {
  const wonder = wonders.find(candidate => candidate.id === Number(wonderId)), kingdom = getKingdom(wonder?.kingdomId); if (!wonder || !kingdom || kingdom.defeated || !["damaged", "ruined"].includes(wonder.status)) return false;
  const ruined = wonder.status === "ruined", wood = ruined ? 18 : 6, stone = ruined ? 20 : 8, treasury = ruined ? 16 : 6; if (kingdom.resources.wood < wood || kingdom.resources.stone < stone || kingdom.treasury < treasury) return false;
  kingdom.resources.wood -= wood; kingdom.resources.stone -= stone; kingdom.treasury -= treasury; wonder.maxHp ||= 300; wonder.hp = Math.min(wonder.maxHp, (wonder.hp || 0) + (ruined ? 90 : forced ? 80 : 24)); wonder.status = wonder.hp >= wonder.maxHp ? "complete" : "damaged"; wonder.damageHistory ||= []; wonder.damageHistory.unshift({ year: Math.floor(year), cause: `${kingdom.name}组织修复`, damage: 0 }); worldStats.wondersRestored = (worldStats.wondersRestored || 0) + Number(wonder.status === "complete"); addEvent(`${wonderDefs[wonder.type].icon} ${kingdom.name}修复了${wonderDefs[wonder.type].name}，耐久恢复至 ${Math.round(wonder.hp)}。`, "wonder"); if (forced) updateUI(); return true;
}

function legacySiteActor(site, kingdomId = null, rival = false) {
  if (!site) return null; const explicit = legacyKingdom(kingdomId); if (explicit) return explicit;
  return rival ? nearestKingdomToPoint(site.x, site.y, [site.kingdomId]) || legacyKingdom(site.kingdomId) : legacyKingdom(site.kingdomId) || nearestKingdomToPoint(site.x, site.y);
}
function actOnLegacySite(siteId, action, kingdomId = null, automatic = false) {
  const site = legacySites.find(candidate => candidate.id === Number(siteId)); if (!site) return false; const kingdom = legacySiteActor(site, kingdomId, action === "contest" && kingdomId === null); if (!kingdom || kingdom.defeated) return false;
  if (!isHistoricalScar(site)) {
    if (action !== "explore" || site.status === "explored") return false; site.status = "exploring"; site.kingdomId = kingdom.id; site.discoveredYear ||= Math.floor(year); site.progress = Math.min(100, site.progress + 28); addEvent(`${kingdom.name}加派学者考察${ruinDefs[site.type].name}。`, "legacy"); if (!automatic) updateUI(); return true;
  }
  if (site.resolution && action !== "contest") return false; const definition = scarDefs[site.type], previousOwner = getKingdom(site.kingdomId);
  if (action === "explore") { kingdom.technology.research += 6; kingdom.culture.influence += 4; site.resolution = "explored"; site.exploredYear = Math.floor(year); const lost = artifacts.find(artifact => artifact.id === site.artifactId && artifact.status === "lost"); if (lost) transferArtifact(lost, kingdom.id, bestArtifactHero(kingdom.id)?.id || null, `在${definition.name}重新出土`); }
  else if (action === "rebuild") { if (kingdom.resources.wood < 10 || kingdom.resources.stone < 8 || kingdom.treasury < 5) return false; kingdom.resources.wood -= 10; kingdom.resources.stone -= 8; kingdom.treasury -= 5; kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy + 5, 0, 100); site.resolution = "rebuilt"; worldStats.scarsRestored = (worldStats.scarsRestored || 0) + 1; }
  else if (action === "sanctify") { if (kingdom.resources.stone < 5 || kingdom.resources.food < 5) return false; kingdom.resources.stone -= 5; kingdom.resources.food -= 5; kingdom.culture.values.faith = legacyEngine.clamp(kingdom.culture.values.faith + 5, 0, 100); kingdom.unrest = legacyEngine.clamp(kingdom.unrest - 4, 0, 100); site.resolution = "sanctified"; }
  else if (action === "contest") { site.resolution = "contested"; site.claimants = [...new Set([...(site.claimants || []), previousOwner?.id, kingdom.id].filter(Number.isFinite))]; if (previousOwner && previousOwner.id !== kingdom.id) recordDiplomaticMemory(previousOwner.id, kingdom.id, "heritage", `争夺${definition.name}的解释权`, -5, 8); kingdom.culture.values.valor = legacyEngine.clamp(kingdom.culture.values.valor + 3, 0, 100); }
  else return false;
  site.kingdomId = kingdom.id; site.history ||= []; site.history.unshift({ year: Math.floor(year), action, kingdomId: kingdom.id, text: `${kingdom.name}${{ explore: "考证", rebuild: "重建", sanctify: "圣化", contest: "争夺" }[action]}${definition.name}` }); site.history = site.history.slice(0, 30); addEvent(`${definition.icon} ${kingdom.name}${{ explore: "考证了", rebuild: "重建了", sanctify: "圣化了", contest: "宣称了" }[action]}${definition.name}。`, "legacy"); if (!automatic) updateUI(); return true;
}

function recordStructureLegacy(village, structure) {
  const types = { dock: "abandoned_port", road: "broken_road", quarry: "collapsed_mine" }, atWar = village && typeof kingdomAtWar === "function" && kingdomAtWar(village.kingdom), type = types[structure?.type] || (atWar ? "war_ruins" : null); if (!type || !village) return null;
  return recordHistoricalScar(type, structure.x, structure.y, village.kingdom, { cause: `${village.name}的${buildingDefs[structure.type]?.name || "建筑"}被摧毁` });
}

function recordDisasterLegacy(disaster) {
  const types = { earthquake: "impact_crater", flood: "flooded_town", tornado: "storm_path", volcano: "volcano_shrine", plague: "plague_memorial", drought: "dried_well" }, type = types[disaster?.type]; if (!type) return null;
  const nearestVillage = [...villages].sort((a, b) => Math.hypot(a.x - disaster.x, a.y - disaster.y) - Math.hypot(b.x - disaster.x, b.y - disaster.y))[0], site = recordHistoricalScar(type, disaster.x, disaster.y, nearestVillage?.kingdom, { cause: `${disasterDefs[disaster.type].name}在纪元 ${Math.floor(year)} 平息`, subject: nearestVillage?.name });
  for (const wonder of wonders) { const force = typeof disasterFalloff === "function" ? disasterFalloff(disaster, wonder.x, wonder.y, disaster.radius + 3) : 0; if (force > 0) damageWonder(wonder, (18 + disaster.intensity * 10) * force, disasterDefs[disaster.type].name); }
  for (const artifact of artifacts) { const location = artifactLocation(artifact); if (!location) continue; const force = typeof disasterFalloff === "function" ? disasterFalloff(disaster, location.x, location.y, disaster.radius + 2) : 0; if (force > 0) damageArtifact(artifact, (8 + disaster.intensity * 7) * force, disasterDefs[disaster.type].name); }
  return site;
}

function recordHeroLegacy(hero, person) {
  if (!hero || hero.legacyRecorded) return null; hero.legacyRecorded = true;
  const location = person || getPerson(hero.personId), capital = villagesOfKingdom(hero.kingdomId)[0], x = location?.x ?? capital?.x ?? MAP_W / 2, y = location?.y ?? capital?.y ?? MAP_H / 2;
  const tomb = recordHistoricalScar("hero_tomb", x, y, hero.kingdomId, { cause: `${hero.title}${hero.name}退出历史舞台`, subject: hero.name });
  for (const artifact of artifacts.filter(candidate => candidate.holderType === "hero" && candidate.holderId === hero.id)) loseArtifact(artifact, x, y, `随${hero.name}之逝而失落`);
  return tomb;
}

function recordConquestLegacy(oldKingdomId, newKingdomId, village, realmFallen = false) {
  const oldKingdom = getKingdom(oldKingdomId), newKingdom = getKingdom(newKingdomId); if (!village || !newKingdom) return;
  recordHistoricalScar("ancient_battlefield", village.x, village.y, newKingdomId, { cause: `${newKingdom.name}攻占${oldKingdom?.name || "旧国"}的${village.name}`, subject: village.name });
  for (const wonder of wonders.filter(candidate => candidate.villageId === village.id && candidate.status !== "ruined")) { damageWonder(wonder, 55, `${village.name}攻防战`); wonder.kingdomId = newKingdomId; wonder.damageHistory.unshift({ year: Math.floor(year), cause: `${newKingdom.name}接管奇观`, damage: 0 }); }
  if (!realmFallen) return;
  const spoils = artifacts.filter(artifact => artifactKingdomId(artifact) === oldKingdomId && artifact.status !== "lost");
  for (const artifact of spoils) {
    const location = artifactLocation(artifact) || village, captured = (artifact.id + newKingdomId) % 2 === 0;
    if (captured) transferArtifact(artifact, newKingdomId, bestArtifactHero(newKingdomId)?.id || null, `${oldKingdom?.name || "旧国"}覆灭后的战利品`); else loseArtifact(artifact, location.x, location.y, `在${oldKingdom?.name || "旧国"}覆灭时失落`);
  }
}

function historicalScarStep() {
  if (ticks % 300 !== 0) return;
  const candidates = legacySites.filter(site => isHistoricalScar(site) && !site.resolution && year - (site.createdYear || year) >= 5); if (!candidates.length) return;
  const site = candidates.sort((a, b) => a.createdYear - b.createdYear || a.id - b.id)[0], kingdom = legacySiteActor(site); if (!kingdom) return;
  const action = kingdom.culture.values.faith > 58 ? "sanctify" : kingdom.resources.wood > 18 && kingdom.resources.stone > 14 && kingdom.treasury > 10 ? "rebuild" : "explore"; actOnLegacySite(site.id, action, kingdom.id, true);
}

function heroArtifactDetailHtml(hero) {
  const carried = artifacts.filter(artifact => artifact.holderType === "hero" && artifact.holderId === hero?.id && artifact.status !== "lost"); if (!carried.length) return "";
  return `<h3>携带神器</h3><div class="artifact-list">${carried.map(artifact => { const definition = artifactDefs[artifact.type]; return `<button class="artifact-chip" data-legacy-entity="artifact:${artifact.id}" style="--artifact-color:${definition.color}">${definition.icon} ${definition.name} · ${Math.round(artifact.durability)}%</button>`; }).join("")}</div>`;
}

function startWorldChallenge(id = null) {
  const candidates = Object.keys(challengeDefs).filter(candidate => candidate !== legacyState.challenge?.id);
  const selected = challengeDefs[id] ? id : candidates[legacyEngine.randi(0, candidates.length - 1)], definition = challengeDefs[selected];
  legacyState.challenge = { id: selected, startedYear: Math.floor(year), deadline: year + definition.duration, baseline: definition.metric(), progress: 0 };
  legacyState.nextChallengeYear = Infinity;
  addEvent(`${definition.icon} 世界挑战“${definition.name}”开启：${definition.text}`, "legacy");
  return legacyState.challenge;
}

function initializeLegacyWorld() {
  if (!legacySites.length) seedLegacySites(6);
  legacyState.nextEventYear = year + 6 + legacyEngine.randi(0, 5);
  legacyState.nextCrisisYear = year + 26 + legacyEngine.randi(0, 8);
  if (!legacyState.challenge) startWorldChallenge("relic_seekers");
}

function nearestKingdomToSite(site) {
  let selected = null, best = Infinity;
  for (const kingdom of kingdoms) {
    if (kingdom.defeated) continue;
    const distance = Math.min(...villagesOfKingdom(kingdom.id).map(village => Math.hypot(village.x - site.x, village.y - site.y)), Infinity);
    if (distance < best) { best = distance; selected = kingdom; }
  }
  return selected;
}

function artifactIdsForKingdom(kingdomId) { return artifacts.filter(artifact => artifactKingdomId(artifact) === kingdomId && artifact.status !== "lost").map(artifact => artifact.id); }

function discoverArtifact(site, kingdom) {
  if (!site || site.artifactId || !kingdom) return null;
  const definition = ruinDefs[site.type], carrier = bestArtifactHero(kingdom.id), artifact = { id: nextArtifactId++, type: definition.artifact, kingdomId: kingdom.id, holderType: carrier ? "hero" : "kingdom", holderId: carrier?.id || kingdom.id, status: "held", durability: 100, siteId: site.id, foundYear: Math.floor(year), history: [{ year: Math.floor(year), action: "found", kingdomId: kingdom.id, heroId: carrier?.id || null, text: `${kingdom.name}在${definition.name}发现神器` }] };
  artifacts.push(artifact); site.artifactId = artifact.id; site.status = "explored"; site.progress = 100; site.exploredYear = Math.floor(year);
  kingdom.legacy ||= {}; kingdom.legacy.artifactIds = artifactIdsForKingdom(kingdom.id);
  worldStats.ruinsExplored = (worldStats.ruinsExplored || 0) + 1; worldStats.artifactsFound = (worldStats.artifactsFound || 0) + 1; worldProgress.renown += 6;
  const artifactDefinition = artifactDefs[artifact.type]; kingdom.technology.research += 6; kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy + 3, 0, 100);
  addEvent(`${artifactDefinition.icon} ${kingdom.name}探索${definition.name}，寻得神器“${artifactDefinition.name}”${carrier ? `，由${carrier.title}${carrier.name}携带` : ""}。`, "legacy");
  spawnExperienceEffect("event", site.x, site.y, artifactDefinition.color); playExperienceSound("event");
  return artifact;
}

function exploreLegacySites() {
  for (const site of legacySites) {
    if (isHistoricalScar(site)) continue;
    if (site.status === "explored") continue;
    const kingdom = getKingdom(site.kingdomId) && !getKingdom(site.kingdomId).defeated ? getKingdom(site.kingdomId) : nearestKingdomToSite(site);
    if (!kingdom) continue;
    if (site.status === "hidden") {
      site.status = "exploring"; site.kingdomId = kingdom.id; site.discoveredYear = Math.floor(year);
      addEvent(`${ruinDefs[site.type].icon} ${kingdom.name}的斥候发现了${ruinDefs[site.type].name}。`, "legacy");
    }
    const explorers = heroes.filter(hero => hero.status === "active" && hero.kingdomId === kingdom.id && hero.archetype === "explorer").length;
    const compass = artifacts.some(artifact => artifactKingdomId(artifact) === kingdom.id && artifact.type === "star_compass" && artifact.status !== "lost" && artifact.durability > 0) ? 1 : 0;
    const discoveryPace = 4.2 + (site.id * 7 % 4) * .55;
    site.progress = legacyEngine.clamp(site.progress + discoveryPace + technologyLevel(kingdom, "navigation") * .8 + explorers * 1.4 + compass * 1.2, 0, 100);
    if (site.progress >= 100) discoverArtifact(site, kingdom);
  }
}

function chooseWonderFor(kingdom) {
  const preferred = Object.entries(wonderDefs).find(([, definition]) => definition.race === kingdom.race)?.[0];
  const occupied = new Set(wonders.filter(wonder => wonder.status !== "ruined").map(wonder => wonder.type));
  if (preferred && !occupied.has(preferred)) return preferred;
  return Object.keys(wonderDefs).find(id => !occupied.has(id)) || preferred || Object.keys(wonderDefs)[0];
}

function beginWonderProject(kingdom, forced = false) {
  if (!kingdom || kingdom.defeated || wonders.some(wonder => wonder.kingdomId === kingdom.id && wonder.status !== "ruined")) return null;
  const villages = villagesOfKingdom(kingdom.id), structures = villages.flatMap(village => village.structures || []);
  if (!forced && (eraIndexOf(kingdom.development?.era) < 2 || structures.length < 16 || kingdom.resources.wood < 55 || kingdom.resources.stone < 32)) return null;
  const capital = villages[0]; if (!capital) return null;
  const type = chooseWonderFor(kingdom), wonder = { id: nextWonderId++, type, kingdomId: kingdom.id, villageId: capital.id, x: capital.x + 1, y: capital.y, progress: 0, status: "building", hp: 300, maxHp: 300, damageHistory: [], sponsored: Boolean(forced), startedYear: Math.floor(year), completedYear: null };
  wonders.push(wonder); kingdom.legacy ||= {}; kingdom.legacy.wonderId = wonder.id;
  addEvent(`${wonderDefs[type].icon} ${kingdom.name}在${capital.name}奠基世界奇观“${wonderDefs[type].name}”。`, "wonder");
  return wonder;
}

function completeWonder(wonder, kingdom) {
  wonder.status = "complete"; wonder.progress = 100; wonder.maxHp ||= 300; wonder.hp = wonder.maxHp; wonder.completedYear = Math.floor(year);
  worldStats.wondersCompleted = (worldStats.wondersCompleted || 0) + 1; worldProgress.renown += 20; kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy + 9, 0, 100); kingdom.culture.influence += 14;
  addEvent(`${wonderDefs[wonder.type].icon} ${kingdom.name}完成世界奇观“${wonderDefs[wonder.type].name}”。${wonderDefs[wonder.type].effect}`, "wonder");
  spawnExperienceEffect("event", wonder.x, wonder.y, wonderDefs[wonder.type].color); playExperienceSound("event");
}

function applyArtifactAndWonderEffects(kingdom) {
  const owned = new Map(); for (const artifact of artifacts.filter(artifact => artifactKingdomId(artifact) === kingdom.id && artifact.status !== "lost" && artifact.durability > 0)) owned.set(artifact.type, Math.max(owned.get(artifact.type) || 0, artifact.durability / 100));
  if (owned.has("star_compass")) { const strength = owned.get("star_compass"); kingdom.technology.research += .16 * strength; kingdom.treasury = Math.min(99999, kingdom.treasury + .08 * strength); }
  if (owned.has("titan_hammer")) { const strength = owned.get("titan_hammer"); kingdom.resources.wood = Math.min(9999, kingdom.resources.wood + .18 * strength); kingdom.resources.stone = Math.min(9999, kingdom.resources.stone + .22 * strength); }
  if (owned.has("verdant_crown")) { const strength = owned.get("verdant_crown"); kingdom.resources.food = Math.min(9999, kingdom.resources.food + .28 * strength); for (const person of peopleOfKingdom(kingdom.id).slice(0, 10)) person.needs.health = legacyEngine.clamp((person.needs.health || 60) + .18 * strength, 0, 100); }
  if (owned.has("oath_tablet")) { const strength = owned.get("oath_tablet"); kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy + .07 * strength, 0, 100); kingdom.unrest = legacyEngine.clamp(kingdom.unrest - .05 * strength, 0, 100); }
  const completed = wonders.find(wonder => wonder.kingdomId === kingdom.id && ["complete", "damaged"].includes(wonder.status)); if (!completed) return; const strength = legacyEngine.clamp((completed.hp || 0) / (completed.maxHp || 300), .15, 1);
  if (completed.type === "grand_library") kingdom.technology.research += .32 * strength;
  if (completed.type === "worldroot_garden") kingdom.resources.food = Math.min(9999, kingdom.resources.food + .45 * strength);
  if (completed.type === "eternal_forge") { kingdom.resources.wood += .22 * strength; kingdom.resources.stone += .3 * strength; const damaged = villagesOfKingdom(kingdom.id).flatMap(village => village.structures || []).find(structure => structure.hp < structure.maxHp); if (damaged) damaged.hp = Math.min(damaged.maxHp, damaged.hp + .5 * strength); }
  if (completed.type === "sky_citadel") { kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy + .08 * strength, 0, 100); for (const army of armies.filter(candidate => candidate.kingdomId === kingdom.id)) army.morale = legacyEngine.clamp(army.morale + .12 * strength, 0, 100); }
}

function wonderStep() {
  for (const kingdom of kingdoms) {
    if (kingdom.defeated) continue;
    kingdom.legacy ||= { artifactIds: [], wonderId: null }; kingdom.legacy.artifactIds = artifactIdsForKingdom(kingdom.id);
    let wonder = wonders.find(candidate => candidate.kingdomId === kingdom.id && candidate.status !== "ruined");
    if (!wonder) wonder = beginWonderProject(kingdom, false);
    if (wonder?.status === "building") {
      const builders = peopleOfKingdom(kingdom.id).filter(person => person.profession === "builder").length, hammer = artifacts.some(artifact => artifactKingdomId(artifact) === kingdom.id && artifact.type === "titan_hammer" && artifact.status !== "lost" && artifact.durability > 0) ? 1 : 0;
      if (wonder.sponsored || (kingdom.resources.wood >= 1.2 && kingdom.resources.stone >= .8 && kingdom.treasury >= .35)) {
        kingdom.resources.wood = Math.max(0, kingdom.resources.wood - 1.2); kingdom.resources.stone = Math.max(0, kingdom.resources.stone - .8); kingdom.treasury = Math.max(0, kingdom.treasury - .35);
        wonder.progress = legacyEngine.clamp(wonder.progress + 3.2 + technologyLevel(kingdom, "engineering") * .75 + Math.min(4, builders) * .25 + hammer, 0, 100);
      }
      if (wonder.progress >= 100) completeWonder(wonder, kingdom);
    }
    if (wonder?.status === "damaged" && kingdom.resources.wood >= 6 && kingdom.resources.stone >= 8 && kingdom.treasury >= 6) restoreWonder(wonder.id, false);
    applyArtifactAndWonderEffects(kingdom);
  }
  for (const wonder of wonders) if (getKingdom(wonder.kingdomId)?.defeated && wonder.status !== "ruined") damageWonder(wonder, wonder.hp || 300, "建造文明覆灭");
}

function regionalEventContext(kingdom) {
  const active = kingdoms.filter(candidate => !candidate.defeated), realmVillages = villages.filter(village => village.kingdom === kingdom.id);
  const realmRoutes = tradeRoutes.filter(route => realmVillages.some(village => village.id === route.fromVillage || village.id === route.toVillage)).length;
  return { activeKingdoms: active.length, population: peopleOfKingdom(kingdom.id).length, tradeRoutes: realmRoutes, hasPort: realmVillages.some(village => buildingCount(village, "dock") > 0), technology: totalTechnologyLevel(kingdom), guildInfluence: kingdom.politics?.factions?.guilds?.influence || 0, faith: kingdom.culture?.values?.faith || 0, valor: kingdom.culture?.values?.valor || 0, unrest: kingdom.unrest || 0, stone: kingdom.resources?.stone || 0, food: kingdom.resources?.food || 0, dynasty: kingdom.dynasty?.rulerId ? 1 : 0, hasHero: heroes.some(hero => hero.status === "active" && hero.kingdomId === kingdom.id), animals: animals.filter(animal => !animal.dead).length, disasters: worldStats.disastersTriggered || 0, ruins: legacySites.length, marriages: worldStats.marriages || 0 };
}

function regionalEventConditionsMet(definition, kingdom) {
  if (!definition || !kingdom || kingdom.defeated) return false;
  const conditions = definition.conditions || {}, context = regionalEventContext(kingdom);
  return year >= (conditions.minYear || 0) && context.activeKingdoms >= (conditions.minKingdoms || 1) && context.tradeRoutes >= (conditions.minTradeRoutes || 0) && context.technology >= (conditions.minTechnology || 0) && context.guildInfluence >= (conditions.minGuildInfluence || 0) && context.faith >= (conditions.minFaith || 0) && context.valor >= (conditions.minValor || 0) && context.unrest >= (conditions.minUnrest || 0) && context.stone >= (conditions.minStone || 0) && context.food >= (conditions.minFood || 0) && context.dynasty >= (conditions.minDynasty || 0) && context.animals >= (conditions.minAnimals || 0) && context.disasters >= (conditions.minDisasters || 0) && context.ruins >= (conditions.minRuins || 0) && context.marriages >= (conditions.minMarriages || 0) && (!conditions.hasPort || context.hasPort) && (!conditions.hasHero || context.hasHero);
}

function regionalEventTargetScore(kingdom, focus) {
  const context = regionalEventContext(kingdom);
  if (focus === "weakest") return -(context.population * 4 + kingdom.legitimacy + context.food * .15);
  if (focus === "food") return context.food + context.population * 2;
  if (focus === "diplomacy") return Object.values(kingdom.relations || {}).reduce((sum, relation) => sum + (relation.trust || 0), 0);
  if (focus === "guilds") return context.guildInfluence * 3 + context.technology * 5;
  if (focus === "faith") return context.faith * 2 + kingdom.legitimacy;
  if (focus === "mining") return context.stone + technologyLevel(kingdom, "engineering") * 20;
  if (focus === "trade" || focus === "navigation") return context.tradeRoutes * 30 + kingdom.treasury * .15 + Number(context.hasPort) * 18;
  if (focus === "nature") return context.faith + (kingdom.race === "elf" ? 40 : 0);
  if (focus === "military") return context.valor * 2 + armies.filter(army => army.kingdomId === kingdom.id).reduce((sum, army) => sum + army.soldierIds.length, 0) * 3;
  if (focus === "medicine") return technologyLevel(kingdom, "medicine") * 30 + context.population;
  if (focus === "unrest") return context.unrest * 3 - kingdom.legitimacy;
  if (focus === "dynasty") return (kingdom.dynasty?.disputed ? 80 : 0) + (kingdom.dynasty?.prestige || 0);
  if (focus === "heroes") return heroes.filter(hero => hero.status === "active" && hero.kingdomId === kingdom.id).reduce((sum, hero) => sum + hero.level * 15 + hero.renown, 0);
  if (focus === "legacy") return artifacts.filter(artifact => artifact.kingdomId === kingdom.id).length * 35 + context.technology;
  return context.technology * 10 + kingdom.technology.research + context.population;
}

function eventTargetKingdom(definition, force = false) {
  return kingdoms.filter(kingdom => !kingdom.defeated && (force || regionalEventConditionsMet(definition, kingdom))).sort((a, b) => regionalEventTargetScore(b, definition.focus) - regionalEventTargetScore(a, definition.focus) || a.id - b.id)[0] || null;
}

function chooseRegionalEvent() {
  const recent = new Set(legacyState.eventHistory.slice(0, 8).map(entry => entry.id));
  const candidates = Object.entries(dynamicEventDefs).map(([id, definition]) => ({ id, definition, target: eventTargetKingdom(definition) })).filter(entry => entry.target);
  const fresh = candidates.filter(entry => !recent.has(entry.id)), pool = fresh.length ? fresh : candidates;
  return pool.length ? pool[legacyEngine.randi(0, pool.length - 1)] : null;
}

function activateDynamicEvent(id = null) {
  if (legacyState.activeEvent || worldEventState.active) return false;
  const selected = dynamicEventDefs[id] ? { id, definition: dynamicEventDefs[id], target: eventTargetKingdom(dynamicEventDefs[id], true) } : chooseRegionalEvent();
  if (!selected?.target) { legacyState.nextEventYear = year + 4; return false; }
  const { id: eventId, definition, target } = selected;
  const resumeAfterChoice = typeof running !== "undefined" && running && !debugBatchMode;
  legacyState.activeEvent = { id: eventId, kingdomId: target.id, startedYear: Math.floor(year), resumeAfterChoice };
  if (resumeAfterChoice) setRunning(false, false);
  addEvent(`${definition.icon} 区域事件“${definition.name}”正在等待抉择。`, "legacy"); renderLegacyChoiceModal(); renderLegacyPanels(); playExperienceSound("event"); return true;
}

function applyDynamicEventEffect(choice, target) {
  if (!choice || !target) return;
  applyWorldEventEffects(choice.effects, [target.id]);
}

function resolveDynamicEvent(choiceId, automatic = false) {
  const active = legacyState.activeEvent, definition = dynamicEventDefs[active?.id]; if (!active || !definition) return false;
  const choice = definition.choices.find(candidate => candidate.id === choiceId) || definition.choices[0], resume = Boolean(active.resumeAfterChoice), target = getKingdom(active.kingdomId);
  applyDynamicEventEffect(choice, target); legacyState.eventHistory.unshift({ id: active.id, choice: choice.id, kingdomId: active.kingdomId, year: Math.floor(year) }); legacyState.eventHistory = legacyState.eventHistory.slice(0, 120);
  worldStats.dynamicEventsResolved = (worldStats.dynamicEventsResolved || 0) + 1; legacyState.nextEventYear = year + 7 + legacyEngine.randi(0, 6); legacyState.activeEvent = null;
  addEvent(`${definition.icon} ${automatic ? "各文明最终" : "创世者引导世界"}选择了“${choice.label}”。`, "legacy"); renderLegacyChoiceModal(); updateUI(); if (resume && !automatic) setRunning(true, false); return true;
}

function crisisContribution(kingdom, type) {
  if (type === "ashen_winter") return .8 + technologyLevel(kingdom, "agriculture") * .55 + kingdom.resources.food / Math.max(40, peopleOfKingdom(kingdom.id).length * 9) * .5;
  if (type === "red_miasma") return .8 + technologyLevel(kingdom, "medicine") * .8 + (kingdom.policies?.welfare === "relief" ? .7 : 0);
  return .8 + technologyLevel(kingdom, "administration") * .6 + Math.max(0, kingdom.legitimacy - 45) * .02;
}

function triggerWorldCrisis(type = null) {
  if (legacyState.activeCrisis) return false;
  const ids = Object.keys(crisisDefs), selected = crisisDefs[type] ? type : ids[legacyEngine.randi(0, ids.length - 1)], definition = crisisDefs[selected];
  legacyState.activeCrisis = { id: selected, startedYear: Math.floor(year), deadline: year + definition.duration, progress: 0, interventions: 0 };
  worldStats.crisesStarted = (worldStats.crisesStarted || 0) + 1; addEvent(`${definition.icon} 全球危机“${definition.name}”爆发：${definition.text}`, "crisis"); playExperienceSound("disaster"); return true;
}

function applyCrisisPressure(crisis) {
  for (const kingdom of kingdoms.filter(candidate => !candidate.defeated)) {
    if (crisis.id === "ashen_winter") { kingdom.resources.food = Math.max(0, kingdom.resources.food - 1.2); kingdom.unrest = legacyEngine.clamp(kingdom.unrest + .18, 0, 100); }
    if (crisis.id === "red_miasma") { const citizens = peopleOfKingdom(kingdom.id); if (citizens.length) { const victim = citizens[legacyEngine.randi(0, citizens.length - 1)]; victim.plague = Math.max(8, victim.plague || 0); } kingdom.unrest = legacyEngine.clamp(kingdom.unrest + .12, 0, 100); }
    if (crisis.id === "broken_oaths") { kingdom.warWeariness = legacyEngine.clamp((kingdom.warWeariness || 0) + .3, 0, 100); kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy - .08, 0, 100); }
    crisis.progress += crisisContribution(kingdom, crisis.id);
  }
}

function finishWorldCrisis(success) {
  const crisis = legacyState.activeCrisis, definition = crisisDefs[crisis?.id]; if (!crisis || !definition) return false;
  legacyState.crisisHistory.unshift({ id: crisis.id, success, year: Math.floor(year), progress: Math.round(crisis.progress) }); legacyState.crisisHistory = legacyState.crisisHistory.slice(0, 30);
  if (success) { worldStats.crisesResolved = (worldStats.crisesResolved || 0) + 1; worldProgress.renown += 24; for (const kingdom of kingdoms.filter(candidate => !candidate.defeated)) { kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy + 5, 0, 100); kingdom.unrest = legacyEngine.clamp(kingdom.unrest - 5, 0, 100); } }
  else { worldStats.crisesFailed = (worldStats.crisesFailed || 0) + 1; for (const kingdom of kingdoms.filter(candidate => !candidate.defeated)) { kingdom.resources.food = Math.max(0, kingdom.resources.food - 12); kingdom.legitimacy = legacyEngine.clamp(kingdom.legitimacy - 6, 0, 100); kingdom.unrest = legacyEngine.clamp(kingdom.unrest + 8, 0, 100); } }
  addEvent(`${definition.icon} ${definition.name}${success ? "在共同努力下得到化解" : "超过临界点，给世界留下长期创伤"}。`, "crisis"); legacyState.activeCrisis = null; legacyState.nextCrisisYear = year + 24 + legacyEngine.randi(0, 12); return true;
}

function interveneWorldCrisis(action = "coordinate") {
  const crisis = legacyState.activeCrisis; if (!crisis) return false;
  const active = kingdoms.filter(kingdom => !kingdom.defeated), cost = action === "mobilize" ? 9 : action === "relief" ? 7 : 5;
  let participants = 0; for (const kingdom of active) if (kingdom.treasury >= cost) { kingdom.treasury -= cost; participants++; if (action === "relief") kingdom.resources.food = Math.max(0, kingdom.resources.food - 5); }
  crisis.progress = legacyEngine.clamp(crisis.progress + participants * (action === "coordinate" ? 5 : action === "relief" ? 4 : 3.5), 0, 140); crisis.interventions++;
  addEvent(`创世者推动各文明${action === "coordinate" ? "协调应对" : action === "relief" ? "组织赈济" : "全面动员"}${crisisDefs[crisis.id].name}。`, "crisis"); if (crisis.progress >= 100) finishWorldCrisis(true); updateUI(); return true;
}

function crisisStep() {
  const crisis = legacyState.activeCrisis;
  if (crisis) { applyCrisisPressure(crisis); if (crisis.progress >= 100) finishWorldCrisis(true); else if (year >= crisis.deadline) finishWorldCrisis(false); }
  else if (year >= legacyState.nextCrisisYear && !legacyState.activeEvent && !worldEventState.active) triggerWorldCrisis();
}

function challengeStep() {
  if (!legacyState.challenge) { if (year >= legacyState.nextChallengeYear) startWorldChallenge(); return; }
  const challenge = legacyState.challenge, definition = challengeDefs[challenge.id]; if (!definition) { legacyState.challenge = null; return; }
  challenge.progress = Math.max(0, definition.metric() - challenge.baseline);
  if (challenge.progress >= definition.target) {
    legacyState.challengeHistory.unshift({ id: challenge.id, success: true, year: Math.floor(year) }); worldStats.challengesCompleted = (worldStats.challengesCompleted || 0) + 1; worldProgress.renown += definition.reward;
    addEvent(`${definition.icon} 世界挑战“${definition.name}”完成，获得 ${definition.reward} 世界声望。`, "challenge"); legacyState.challenge = null; legacyState.nextChallengeYear = year + 4;
  } else if (year >= challenge.deadline) {
    legacyState.challengeHistory.unshift({ id: challenge.id, success: false, year: Math.floor(year) }); addEvent(`${definition.icon} 世界挑战“${definition.name}”未能在期限内完成。`, "challenge"); legacyState.challenge = null; legacyState.nextChallengeYear = year + 3;
  }
  legacyState.challengeHistory = legacyState.challengeHistory.slice(0, 30);
}

function dynamicEventStep() {
  if (legacyState.activeEvent) { if (year - legacyState.activeEvent.startedYear > 2.5) { const definition = dynamicEventDefs[legacyState.activeEvent.id]; resolveDynamicEvent(definition.choices[legacyEngine.randi(0, definition.choices.length - 1)].id, true); } return; }
  if (year >= legacyState.nextEventYear && !worldEventState.active && !legacyState.activeCrisis) activateDynamicEvent();
}

function legacySimulationStep() {
  exploreLegacySites(); historicalScarStep(); wonderStep(); crisisStep(); challengeStep(); dynamicEventStep();
}

function normalizeLegacyWorld(sourceVersion = 1) {
  legacySites = (Array.isArray(legacySites) ? legacySites : []).filter(site => site && (ruinDefs[site.type] || scarDefs[site.type])).slice(0, 80).map(site => {
    const historical = Boolean(scarDefs[site.type] || site.origin === "historical"); return { ...site, id: Math.max(1, Number(site.id) || nextLegacySiteId++), origin: historical ? "historical" : "ancient", x: legacyEngine.clamp(Math.round(Number(site.x) || 0), 0, MAP_W - 1), y: legacyEngine.clamp(Math.round(Number(site.y) || 0), 0, MAP_H - 1), status: historical ? "scar" : ["hidden", "exploring", "explored"].includes(site.status) ? site.status : "hidden", resolution: historical && ["explored", "rebuilt", "sanctified", "contested"].includes(site.resolution) ? site.resolution : null, progress: historical ? 100 : legacyEngine.clamp(Number(site.progress) || 0, 0, 100), kingdomId: legacyKingdom(site.kingdomId)?.id ?? null, createdYear: historical ? Math.max(1, Number(site.createdYear) || Math.floor(year)) : null, discoveredYear: site.discoveredYear ? Math.max(1, Number(site.discoveredYear)) : historical ? Math.floor(year) : null, exploredYear: site.exploredYear ? Math.max(1, Number(site.exploredYear)) : null, artifactId: site.artifactId ? Number(site.artifactId) : null, cause: legacyEngine.cleanText(site.cause), subject: legacyEngine.cleanText(site.subject), claimants: (Array.isArray(site.claimants) ? site.claimants : []).map(Number).filter(id => getKingdom(id)).slice(0, 6), history: (Array.isArray(site.history) ? site.history : []).filter(entry => entry?.text).slice(0, 30) };
  });
  artifacts = (Array.isArray(artifacts) ? artifacts : []).filter(artifact => artifact && artifactDefs[artifact.type]).slice(0, 40).map(artifact => {
    const kingdomId = legacyKingdom(artifact.kingdomId)?.id ?? null, savedHero = heroes.find(hero => hero.id === Number(artifact.holderId) && hero.status === "active"), lost = artifact.status === "lost" || artifact.holderType === "lost", holderType = lost ? "lost" : artifact.holderType === "hero" && savedHero ? "hero" : "kingdom";
    return { ...artifact, id: Math.max(1, Number(artifact.id) || nextArtifactId++), kingdomId: savedHero?.kingdomId ?? kingdomId, holderType, holderId: holderType === "hero" ? savedHero.id : holderType === "kingdom" ? kingdomId : Number(artifact.holderId) || null, status: lost ? "lost" : artifact.status === "damaged" || Number(artifact.durability) <= 0 ? "damaged" : "held", durability: legacyEngine.clamp(Number.isFinite(Number(artifact.durability)) ? Number(artifact.durability) : 100, 0, 100), siteId: Number(artifact.siteId) || null, foundYear: Math.max(1, Number(artifact.foundYear) || Math.floor(year)), history: (Array.isArray(artifact.history) ? artifact.history : []).slice(0, 30) };
  });
  wonders = (Array.isArray(wonders) ? wonders : []).filter(wonder => wonder && wonderDefs[wonder.type] && getKingdom(Number(wonder.kingdomId))).slice(0, 20).map(wonder => { const maxHp = Math.max(100, Number(wonder.maxHp) || 300), hp = legacyEngine.clamp(Number.isFinite(Number(wonder.hp)) ? Number(wonder.hp) : maxHp, 0, maxHp); let status = ["building", "complete", "damaged", "ruined"].includes(wonder.status) ? wonder.status : "building"; if (status === "complete" && hp < maxHp) status = "damaged"; if (hp <= 0) status = "ruined"; return { ...wonder, id: Math.max(1, Number(wonder.id) || nextWonderId++), kingdomId: Number(wonder.kingdomId), villageId: Number(wonder.villageId) || null, x: legacyEngine.clamp(Number(wonder.x) || 0, 0, MAP_W - 1), y: legacyEngine.clamp(Number(wonder.y) || 0, 0, MAP_H - 1), progress: legacyEngine.clamp(Number(wonder.progress) || 0, 0, 100), status, hp, maxHp, damageHistory: (Array.isArray(wonder.damageHistory) ? wonder.damageHistory : []).slice(0, 30), sponsored: Boolean(wonder.sponsored), startedYear: Math.max(1, Number(wonder.startedYear) || Math.floor(year)), completedYear: wonder.completedYear ? Math.max(1, Number(wonder.completedYear)) : null }; });
  nextLegacySiteId = Math.max(Number(nextLegacySiteId) || 1, 1, ...legacySites.map(site => site.id + 1)); nextArtifactId = Math.max(Number(nextArtifactId) || 1, 1, ...artifacts.map(artifact => artifact.id + 1)); nextWonderId = Math.max(Number(nextWonderId) || 1, 1, ...wonders.map(wonder => wonder.id + 1));
  const saved = legacyState && typeof legacyState === "object" ? legacyState : createLegacyState();
  legacyState = { nextEventYear: Number.isFinite(Number(saved.nextEventYear)) ? Number(saved.nextEventYear) : year + 7, activeEvent: dynamicEventDefs[saved.activeEvent?.id] ? saved.activeEvent : null, eventHistory: Array.isArray(saved.eventHistory) ? saved.eventHistory.slice(0, 120) : [], nextCrisisYear: Number.isFinite(Number(saved.nextCrisisYear)) ? Number(saved.nextCrisisYear) : year + 24, activeCrisis: crisisDefs[saved.activeCrisis?.id] ? { ...saved.activeCrisis, progress: legacyEngine.clamp(Number(saved.activeCrisis.progress) || 0, 0, 140), deadline: Number(saved.activeCrisis.deadline) || year + crisisDefs[saved.activeCrisis.id].duration } : null, crisisHistory: Array.isArray(saved.crisisHistory) ? saved.crisisHistory.slice(0, 30) : [], challenge: challengeDefs[saved.challenge?.id] ? { ...saved.challenge, baseline: Number(saved.challenge.baseline) || 0, progress: Math.max(0, Number(saved.challenge.progress) || 0), deadline: Number(saved.challenge.deadline) || year + challengeDefs[saved.challenge.id].duration } : null, challengeHistory: Array.isArray(saved.challengeHistory) ? saved.challengeHistory.slice(0, 30) : [], nextChallengeYear: Number.isFinite(Number(saved.nextChallengeYear)) ? Number(saved.nextChallengeYear) : year + 3 };
  for (const kingdom of kingdoms) kingdom.legacy = { artifactIds: artifactIdsForKingdom(kingdom.id), wonderId: wonders.find(wonder => wonder.kingdomId === kingdom.id && wonder.status !== "ruined")?.id || null };
  if (sourceVersion < 18) { if (!legacySites.length) seedLegacySites(6); if (!legacyState.challenge) startWorldChallenge("relic_seekers"); }
}

function renderLegacyChoiceModal() {
  const modal = document.getElementById("legacyEventModal"); if (!modal) return;
  const active = legacyState.activeEvent, definition = dynamicEventDefs[active?.id]; modal.hidden = !active || !definition; if (!active || !definition) return;
  const target = getKingdom(active.kingdomId); document.getElementById("legacyEventContent").innerHTML = `<div class="world-event-icon">${definition.icon}</div><small>区域事件 · ${target?.name || "整个世界"}</small><h2>${definition.name}</h2><p>${definition.text}</p><div class="world-event-choices">${definition.choices.map(choice => `<button data-legacy-event-choice="${choice.id}"><b>${choice.label}</b><span>${choice.hint}</span></button>`).join("")}</div><small class="muted">事件依据当前世界情境选出主导文明；若不选择，文明将在约 2.5 个纪元后自行决定。</small>`;
}

function legacySiteLabel(site) { const definition = legacySiteDefinition(site); return site.status === "hidden" ? `？ 未知遗迹` : `${definition.icon} ${definition.name}`; }

function scarResolutionLabel(site) { return { explored: "已考证", rebuilt: "已重建", sanctified: "已圣化", contested: "争议中" }[site.resolution] || "尚未处置"; }

function inspectLegacyEntity(key) {
  selectedLegacyId = key; selectedKingdomId = null; selectedTradeRouteId = null; selectedArmyId = null; selectedHeroId = null;
  const [kind, rawId] = String(key).split(":"), id = Number(rawId), box = document.getElementById("selectionCard"); box.classList.remove("empty");
  if (kind === "ruin") { const site = legacySites.find(candidate => candidate.id === id); if (!site) return; const definition = legacySiteDefinition(site), kingdom = getKingdom(site.kingdomId), artifact = artifacts.find(candidate => candidate.id === site.artifactId); if (isHistoricalScar(site)) { const actions = !site.resolution ? `<div class="legacy-actions"><button data-legacy-site-action="explore:${site.id}">考证</button><button data-legacy-site-action="rebuild:${site.id}">重建</button><button data-legacy-site-action="sanctify:${site.id}">圣化</button><button data-legacy-site-action="contest:${site.id}">宣称</button></div>` : site.resolution === "contested" ? `<div class="legacy-actions"><button data-legacy-site-action="contest:${site.id}">再次宣称</button></div>` : ""; box.innerHTML = `<h4>${legacySiteLabel(site)}</h4><div class="detail-row"><span>坐标 / 形成</span><b>${site.x}, ${site.y} · 纪元 ${site.createdYear}</b></div><div class="detail-row"><span>归属 / 处置</span><b>${kingdom?.name || "公共记忆"} · ${scarResolutionLabel(site)}</b></div><p class="muted">${definition.lore}<br>${site.cause || "一段真实历史在此留下痕迹。"}</p>${actions}`; } else box.innerHTML = `<h4>${legacySiteLabel(site)}</h4><div class="detail-row"><span>坐标 / 状态</span><b>${site.x}, ${site.y} · ${site.status === "explored" ? "已探索" : site.status === "exploring" ? "考察中" : "尚未发现"}</b></div><div class="detail-row"><span>考察文明</span><b>${kingdom?.name || "暂无"}</b></div>${site.status !== "hidden" ? `<p class="muted">${definition.lore}</p><div class="need-list">${needMeter("探索进度", site.progress)}</div>` : `<p class="muted">地图上只有零散传闻，尚无文明确认其来历。</p>`}${site.status !== "explored" ? `<div class="legacy-actions"><button data-legacy-site-action="explore:${site.id}">加派考察</button></div>` : ""}${artifact ? `<button class="artifact-chip" data-legacy-entity="artifact:${artifact.id}" style="--artifact-color:${artifactDefs[artifact.type].color}">${artifactDefs[artifact.type].icon} 神器：${artifactDefs[artifact.type].name}</button>` : ""}`; }
  if (kind === "artifact") { const artifact = artifacts.find(candidate => candidate.id === id); if (!artifact) return; const definition = artifactDefs[artifact.type], kingdom = getKingdom(artifactKingdomId(artifact)), history = artifact.history?.[0]; box.innerHTML = `<h4 style="color:${definition.color}">${definition.icon} ${definition.name}</h4><div class="detail-row"><span>持有者 / 文明</span><b>${artifactHolderLabel(artifact)} · ${kingdom?.name || "无主"}</b></div><div class="detail-row"><span>状态 / 耐久</span><b>${artifact.status === "lost" ? "失落" : artifact.status === "damaged" ? "损毁" : "完好"} · ${Math.round(artifact.durability)}%</b></div><p class="muted">${definition.effect}${history ? `<br>纪元 ${history.year} · ${history.text}` : ""}</p>${artifact.status !== "lost" ? `<div class="legacy-actions"><button data-artifact-action="hero:${artifact.id}">交给英雄</button><button data-artifact-action="treasury:${artifact.id}">收归国库</button>${artifact.durability < 100 ? `<button data-artifact-action="repair:${artifact.id}">修复神器</button>` : ""}</div>` : ""}`; }
  if (kind === "wonder") { const wonder = wonders.find(candidate => candidate.id === id); if (!wonder) return; const definition = wonderDefs[wonder.type], kingdom = getKingdom(wonder.kingdomId), state = wonder.status === "complete" ? "已完成" : wonder.status === "damaged" ? "受损" : wonder.status === "ruined" ? "奇观遗迹" : "建造中"; box.innerHTML = `<h4>${definition.icon} ${definition.name}</h4><div class="detail-row"><span>所属文明</span><b>${kingdom?.name || "失落文明"}</b></div><div class="detail-row"><span>状态 / 奠基</span><b>${state} · 纪元 ${wonder.startedYear}</b></div><div class="need-list">${needMeter("工程进度", wonder.progress)}${needMeter("奇观耐久", wonder.hp / wonder.maxHp * 100)}</div><p class="muted">${definition.effect}${wonder.damageHistory?.[0] ? `<br>最近记录：纪元 ${wonder.damageHistory[0].year} · ${wonder.damageHistory[0].cause}` : ""}</p>${["damaged", "ruined"].includes(wonder.status) ? `<div class="legacy-actions"><button data-wonder-action="repair:${wonder.id}">${wonder.status === "ruined" ? "重建奇观" : "修复奇观"}</button></div>` : ""}`; }
}

function legacyDetailHtml(kingdom) {
  const owned = artifacts.filter(artifact => artifactKingdomId(artifact) === kingdom.id && artifact.status !== "lost"), wonder = wonders.find(candidate => candidate.kingdomId === kingdom.id && candidate.status !== "ruined");
  if (!owned.length && !wonder) return "";
  const artifactHtml = owned.map(artifact => { const definition = artifactDefs[artifact.type]; return `<button class="artifact-chip" data-legacy-entity="artifact:${artifact.id}" style="--artifact-color:${definition.color}" title="${definition.effect}">${definition.icon} ${definition.name} · ${artifactHolderLabel(artifact)} · ${Math.round(artifact.durability)}%</button>`; }).join("") || `<span class="muted">尚未持有神器</span>`;
  const wonderHtml = wonder ? `<button class="wonder-project ${wonder.status}" data-legacy-entity="wonder:${wonder.id}" style="--wonder-color:${wonderDefs[wonder.type].color}"><b>${wonderDefs[wonder.type].icon} ${wonderDefs[wonder.type].name}</b><span>${wonder.status === "complete" ? "世界奇观已完成" : wonder.status === "damaged" ? `受损 · 耐久 ${Math.round(wonder.hp / wonder.maxHp * 100)}%` : `工程进度 ${Math.round(wonder.progress)}%`}</span><i><em style="width:${wonder.status === "building" ? wonder.progress : wonder.hp / wonder.maxHp * 100}%"></em></i></button>` : "";
  return `<h3>神器与奇观</h3><div class="artifact-list">${artifactHtml}</div>${wonderHtml}`;
}

function renderLegacyPanels() {
  const legacyList = document.getElementById("legacyList"), crisisList = document.getElementById("crisisList");
  if (legacyList) {
    const sites = [...legacySites].sort((a, b) => Number(isHistoricalScar(b)) - Number(isHistoricalScar(a)) || (b.createdYear || 0) - (a.createdYear || 0) || a.id - b.id).slice(0, 12).map(site => { const definition = legacySiteDefinition(site), historical = isHistoricalScar(site), detail = historical ? `${getKingdom(site.kingdomId)?.name || "公共记忆"} · ${scarResolutionLabel(site)}` : site.status === "explored" ? `${artifactDefs[ruinDefs[site.type].artifact].icon} 神器已出土` : site.status === "exploring" ? `${getKingdom(site.kingdomId)?.name || "文明"}考察 · ${Math.round(site.progress)}%` : `坐标 ${site.x}, ${site.y}`; return `<button class="legacy-site ${historical ? `scar ${site.resolution || "unresolved"}` : site.status}" data-legacy-entity="ruin:${site.id}" style="--legacy-color:${definition.color}"><b>${legacySiteLabel(site)}</b><span>${detail}</span><i><em style="width:${historical ? site.resolution ? 100 : 35 : site.progress}%"></em></i></button>`; }).join("");
    const wonderItems = wonders.slice(0, 6).map(wonder => `<button class="legacy-site wonder ${wonder.status}" data-legacy-entity="wonder:${wonder.id}" style="--legacy-color:${wonderDefs[wonder.type].color}"><b>${wonderDefs[wonder.type].icon} ${wonderDefs[wonder.type].name}</b><span>${getKingdom(wonder.kingdomId)?.name || "失落文明"} · ${wonder.status === "complete" ? "已完成" : wonder.status === "damaged" ? `受损 ${Math.round(wonder.hp / wonder.maxHp * 100)}%` : wonder.status === "ruined" ? "已成遗迹" : `${Math.round(wonder.progress)}%`}</span><i><em style="width:${wonder.status === "building" ? wonder.progress : wonder.hp / wonder.maxHp * 100}%"></em></i></button>`).join("");
    legacyList.innerHTML = sites + wonderItems || `<p class="muted">世界遗产尚未留下踪迹</p>`;
  }
  if (crisisList) {
    const crisis = legacyState.activeCrisis, challenge = legacyState.challenge, event = legacyState.activeEvent;
    const eventHtml = event ? `<button class="legacy-event-summary" data-open-legacy-event><b>${dynamicEventDefs[event.id].icon} ${dynamicEventDefs[event.id].name}</b><span>等待区域抉择</span></button>` : `<div class="legacy-next-event"><b>◌ 区域事件平静</b><span>下一事件约在纪元 ${Math.ceil(legacyState.nextEventYear)}</span></div>`;
    const crisisHtml = crisis ? `<div class="world-crisis" style="--crisis-color:${crisisDefs[crisis.id].color}"><b>${crisisDefs[crisis.id].icon} ${crisisDefs[crisis.id].name}</b><p>${crisisDefs[crisis.id].text}</p><small>应对进度 ${Math.round(crisis.progress)} / 100 · 截止纪元 ${Math.ceil(crisis.deadline)}</small><i><em style="width:${legacyEngine.clamp(crisis.progress, 0, 100)}%"></em></i><div><button data-crisis-action="coordinate">协调应对</button><button data-crisis-action="relief">组织赈济</button><button data-crisis-action="mobilize">全面动员</button></div></div>` : `<div class="legacy-next-event"><b>◇ 全球危机预警</b><span>下一风险约在纪元 ${Math.ceil(legacyState.nextCrisisYear)}</span></div>`;
    const challengeHtml = challenge ? `<div class="world-challenge"><b>${challengeDefs[challenge.id].icon} ${challengeDefs[challenge.id].name}</b><span>${challengeDefs[challenge.id].text}</span><small>${Math.min(challengeDefs[challenge.id].target, Math.floor(challenge.progress))} / ${challengeDefs[challenge.id].target} · 截止纪元 ${Math.ceil(challenge.deadline)}</small><i><em style="width:${legacyEngine.clamp(challenge.progress / challengeDefs[challenge.id].target * 100, 0, 100)}%"></em></i></div>` : `<div class="legacy-next-event"><b>◇ 新挑战正在酝酿</b><span>约在纪元 ${Math.ceil(legacyState.nextChallengeYear)}</span></div>`;
    crisisList.innerHTML = eventHtml + crisisHtml + challengeHtml;
  }
  if (selectedLegacyId) inspectLegacyEntity(selectedLegacyId);
}

function renderLegacyMarkers(context, metrics) {
  for (const site of legacySites) {
    const sx = metrics.ox + (site.x + .5) * metrics.size, sy = metrics.oy + (site.y + .5) * metrics.size; if (sx < -20 || sy < -20 || sx > metrics.width + 20 || sy > metrics.height + 20) continue;
    const definition = legacySiteDefinition(site); context.save(); context.globalAlpha = site.status === "hidden" ? .55 : site.resolution ? .72 : .92; context.fillStyle = site.status === "hidden" ? "#8b8579" : definition.color; context.strokeStyle = isHistoricalScar(site) ? "#d6a868aa" : "#fff2c980"; context.lineWidth = Math.max(1, metrics.size * .14); const size = Math.max(3, metrics.size * .55); context.fillRect(sx - size, sy - size, size * 2, size * 2); context.strokeRect(sx - size, sy - size, size * 2, size * 2); if (metrics.size > 4) { context.font = `${Math.max(10, metrics.size * 1.2)}px sans-serif`; context.textAlign = "center"; context.fillText(site.status === "hidden" ? "?" : definition.icon, sx, sy - size - 2); } context.restore();
  }
  for (const wonder of wonders) {
    const sx = metrics.ox + (wonder.x + .5) * metrics.size, sy = metrics.oy + (wonder.y + .5) * metrics.size; if (sx < -24 || sy < -24 || sx > metrics.width + 24 || sy > metrics.height + 24) continue;
    const definition = wonderDefs[wonder.type], size = Math.max(4, metrics.size * .8); context.save(); context.globalAlpha = wonder.status === "ruined" ? .45 : .95; context.fillStyle = definition.color; context.strokeStyle = "#fff1ba"; context.lineWidth = Math.max(1, metrics.size * .18); context.beginPath(); context.moveTo(sx, sy - size); context.lineTo(sx + size, sy + size); context.lineTo(sx - size, sy + size); context.closePath(); context.fill(); context.stroke(); if (metrics.size > 4) { context.font = `${Math.max(12, metrics.size * 1.45)}px sans-serif`; context.textAlign = "center"; context.fillText(definition.icon, sx, sy - size - 3); } context.restore();
  }
}

function initializeLegacyUI() {
  if (legacyUiReady) return; legacyUiReady = true;
  document.getElementById("legacyList")?.addEventListener("click", event => { const item = event.target.closest?.("[data-legacy-entity]"); if (item) inspectLegacyEntity(item.dataset.legacyEntity); });
  document.getElementById("selectionCard")?.addEventListener("click", event => { const siteAction = event.target.closest?.("[data-legacy-site-action]")?.dataset.legacySiteAction, artifactAction = event.target.closest?.("[data-artifact-action]")?.dataset.artifactAction, wonderAction = event.target.closest?.("[data-wonder-action]")?.dataset.wonderAction; if (siteAction) { const [action, id] = siteAction.split(":"); actOnLegacySite(Number(id), action); return; } if (artifactAction) { const [action, id] = artifactAction.split(":"); manageArtifact(Number(id), action); return; } if (wonderAction) { const [action, id] = wonderAction.split(":"); if (action === "repair") restoreWonder(Number(id), true); return; } const item = event.target.closest?.("[data-legacy-entity]"); if (item) inspectLegacyEntity(item.dataset.legacyEntity); });
  document.getElementById("crisisList")?.addEventListener("click", event => { const action = event.target.closest?.("[data-crisis-action]")?.dataset.crisisAction; if (action) interveneWorldCrisis(action); if (event.target.closest?.("[data-open-legacy-event]")) renderLegacyChoiceModal(); });
  document.getElementById("legacyEventModal")?.addEventListener("click", event => { const choice = event.target.closest?.("[data-legacy-event-choice]")?.dataset.legacyEventChoice; if (choice) resolveDynamicEvent(choice); });
}

globalThis.RealmLegacy = Object.freeze({ ruinDefs, scarDefs, artifactDefs, wonderDefs, dynamicEventDefs, crisisDefs, challengeDefs, activateDynamicEvent, resolveDynamicEvent, triggerWorldCrisis, interveneWorldCrisis, beginWonderProject, startWorldChallenge, recordHistoricalScar, actOnLegacySite, transferArtifact, repairArtifact, damageWonder, restoreWonder });
