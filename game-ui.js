"use strict";

// 视图层：检查面板、画布绘制与侧栏数据投影。
// 运行时状态由 game.js 持有；此文件不改变模拟状态。

const { drawTerrainTile: drawPixelTerrainTile, drawWeatherOverlay: drawPixelWeatherOverlay, drawStructure: drawPixelStructure, drawVillageCore: drawPixelVillageCore, animationFrameDue: pixelArtAnimationFrameDue } = globalThis.RealmPixelArt;

function workforceHtml(counts) {
  return Object.entries(professionDefs).filter(([key]) => key !== "child" && (counts[key] || 0) > 0).map(([key, def]) => `<span class="profession-item" style="border-color:${def.color}">${def.icon} ${def.name}<b>${counts[key]}</b></span>`).join("") || `<span class="muted">暂无成年劳动力</span>`;
}

function socialClassHtml(counts) {
  return Object.entries(socialClassDefs).filter(([key]) => (counts[key] || 0) > 0).map(([key, def]) => `<span class="class-item">${def.icon} ${def.name}<b>${counts[key]}</b></span>`).join("") || `<span class="muted">暂无人口阶层</span>`;
}

function policyControlHtml(kingdom, domain, label) {
  return `<div class="policy-row"><span>${label}</span><div>${Object.entries(policyDefs[domain]).map(([value, def]) => `<button class="policy-choice ${kingdom.policies?.[domain] === value ? "active" : ""}" data-policy-domain="${domain}" data-policy-value="${value}">${def.name}</button>`).join("")}</div></div>`;
}

function dominantCultureValue(kingdom) {
  return Object.entries(kingdom.culture.values).sort((a, b) => b[1] - a[1])[0]?.[0] || "community";
}

function cultureValuesHtml(kingdom) {
  return Object.entries(cultureValueDefs).map(([id, def]) => `<div class="culture-value"><span>${def.icon} ${def.name}</span><i><em style="width:${Math.round(kingdom.culture.values[id])}%"></em></i><b>${Math.round(kingdom.culture.values[id])}</b></div>`).join("");
}

function technologyControlsHtml(kingdom) {
  return Object.entries(technologyDefs).map(([id, def]) => {
    const level = technologyLevel(kingdom, id), focused = kingdom.technology.focus === id, cost = currentTechnologyCost(kingdom, id);
    return `<button class="technology-choice ${focused ? "active" : ""} ${level >= 3 ? "maxed" : ""}" data-tech-focus="${id}" title="${def.effect}"><b>${def.icon} ${def.name}</b><span>${"★".repeat(level)}${"☆".repeat(3 - level)}</span><small>${level >= 3 ? "已精通" : focused ? `${Math.floor(kingdom.technology.research)} / ${cost}` : `需 ${cost} 研究`}</small></button>`;
  }).join("");
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

function personInspectionHtml(person) {
  const kingdom = getKingdom(person.kingdom), village = getVillage(person.village), race = raceDefs[person.race] || raceDefs.human;
  const profession = professionDefs[person.role === "soldier" ? "soldier" : person.profession] || professionDefs.laborer, hero = heroForPerson(person.id);
  const unit = person.role === "soldier" ? unitDefs[person.unitType] || unitDefs.militia : null, army = unit ? armyOfSoldier(person.id) : null;
  const militaryRows = unit ? `<div class="detail-row"><span>军职 / 兵种</span><b>${person.isGeneral ? "★ 将领" : "士兵"} · ${unit.icon} ${unit.name}</b></div><div class="detail-row"><span>所属军团</span><b>${army?.name || "地方守军"}</b></div>${army ? `<div class="detail-row"><span>军团士气 / 补给</span><b>${Math.round(army.morale)} / ${Math.round(army.supply)}</b></div>` : ""}` : "";
  const socialClass = socialClassDefs[person.socialClass] || socialClassDefs.peasant, vocation = unit ? `${unit.icon} ${unit.name}` : `${profession.icon} ${profession.name}`;
  return `<h4>${person.blessed ? "✨ " : ""}${person.plague > 0 ? "☣ " : ""}${race.icon} ${person.name}<small class="person-vocation">${vocation} · #${person.id}</small></h4>${hero ? `<div class="detail-row"><span>英雄称号 / 等级</span><b>${heroArchetypes[hero.archetype].icon} ${hero.title} · ${hero.level} 级 / 声望 ${Math.floor(hero.renown)}</b></div>` : ""}${personIdentityDetailHtml(person)}<div class="detail-row"><span>年龄 / 种族</span><b>${Math.floor(person.age)} 岁 · ${race.name}</b></div><div class="detail-row"><span>社会阶层</span><b>${socialClass.icon} ${socialClass.name}</b></div><div class="detail-row"><span>生命 / 幸福</span><b>${Math.floor(person.health)} · ${Math.round(person.happiness)}</b></div><div class="detail-row"><span>健康</span><b>${person.plague > 0 ? "感染瘟疫" : "正常"}</b></div><div class="detail-row"><span>归属 / 家园</span><b>${kingdom?.name || "流浪者"} · ${village?.name || "尚无家园"}</b></div>${militaryRows}<div class="need-list">${needMeter("营养", person.needs?.nutrition)}${needMeter("住所", person.needs?.shelter)}${needMeter("安全", person.needs?.safety)}${needMeter("健康", person.needs?.health)}</div>`;
}

function inspectPersonById(personId) {
  const person = getPerson(personId); if (!person) return;
  selectedGrid = { x: Math.floor(person.x), y: Math.floor(person.y) }; selectedKingdomId = null; selectedTradeRouteId = null; selectedArmyId = null; selectedHeroId = null; selectedLegacyId = null;
  const box = document.getElementById("selectionCard"); box.classList.remove("empty"); box.innerHTML = personInspectionHtml(person);
}

function inspectAt(x, y) {
  selectedGrid = { x: Math.floor(x), y: Math.floor(y) };
  selectedKingdomId = null; selectedTradeRouteId = null; selectedArmyId = null; selectedHeroId = null; selectedLegacyId = null;
  const person = people.find(p => Math.hypot(p.x - x, p.y - y) < 1.5);
  const caravan = caravans.find(candidate => Math.hypot(candidate.x - x, candidate.y - y) < 1.35);
  const legacyWonder = wonders.find(candidate => Math.hypot(candidate.x - x, candidate.y - y) < 1.4);
  const legacySite = legacySites.find(candidate => Math.hypot(candidate.x - x, candidate.y - y) < 1.15);
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
    box.innerHTML = personInspectionHtml(person);
  } else if (caravan) {
    const route = getTradeRoute(caravan.routeId), source = getVillage(caravan.fromVillage), destination = getVillage(caravan.toVillage), cargo = tradeResourceDefs[caravan.resource], progress = route?.path?.length > 1 ? caravan.pathIndex / (route.path.length - 1) * 100 : 0;
    box.innerHTML = `<h4>${route?.mode === "sea" ? "⛵" : "🐴"} 商队 #${caravan.id}</h4><div class="detail-row"><span>路线</span><b>${source?.name} → ${destination?.name}</b></div><div class="detail-row"><span>货物</span><b>${cargo?.icon} ${cargo?.name} ${Math.floor(caravan.amount)}</b></div><div class="detail-row"><span>交换货物</span><b>${caravan.returnResource ? `${tradeResourceDefs[caravan.returnResource].icon} ${tradeResourceDefs[caravan.returnResource].name} ${Math.floor(caravan.returnAmount)}` : "国内调拨"}</b></div><div class="detail-row"><span>状态</span><b>${route?.status === "blockaded" ? "突破封锁" : "运输中"}</b></div><div class="need-list">${needMeter("行程", progress)}${needMeter("商队安全", caravan.hp)}</div>`;
  } else if (legacyWonder || legacySite) {
    inspectLegacyEntity(legacyWonder ? `wonder:${legacyWonder.id}` : `ruin:${legacySite.id}`); return;
  } else if (animal) {
    const def = animalDefs[animal.species];
    box.innerHTML = `<h4>${def.icon} ${def.name} #${animal.id}</h4><div class="detail-row"><span>年龄</span><b>${animal.age.toFixed(1)} 岁</b></div><div class="detail-row"><span>生命</span><b>${Math.max(0, Math.floor(animal.health))}</b></div><div class="detail-row"><span>饱食度</span><b>${Math.floor(animal.hunger)}%</b></div><div class="detail-row"><span>食性</span><b>${def.diet === "herbivore" ? "草食" : "捕食"}</b></div>`;
  } else if (inspectedStructure) {
    const def = buildingDefs[inspectedStructure.type], kingdom = getKingdom(inspectedStructureVillage.kingdom), integrity = inspectedStructure.hp / inspectedStructure.maxHp * 100;
    box.innerHTML = `<h4>${def.icon} ${def.name} #${inspectedStructure.id}</h4><div class="detail-row"><span>所属聚落</span><b>${inspectedStructureVillage.name}</b></div><div class="detail-row"><span>所属王国</span><b>${kingdom?.name || "无主"}</b></div><div class="detail-row"><span>建造纪元</span><b>${inspectedStructure.builtYear}</b></div><div class="detail-row"><span>坐标</span><b>${inspectedStructure.x}, ${inspectedStructure.y}</b></div><div class="need-list">${needMeter("建筑耐久", integrity)}</div><p class="muted">${def.effect}</p>`;
  } else if (village) {
    const k = getKingdom(village.kingdom), pop = peopleOfVillage(village.id).length, b = village.buildings, routes = tradeRoutes.filter(route => route.fromVillage === village.id || route.toVillage === village.id);
    box.innerHTML = `<h4>🏠 ${village.name}</h4><div class="detail-row"><span>王国</span><b>${k?.name}</b></div><div class="detail-row"><span>人口容量</span><b>${pop} / ${villageCapacity(village)}</b></div><div class="detail-row"><span>平均幸福 / 动乱</span><b>${Math.round(village.averageHappiness || 0)} / ${Math.round(village.unrest || 0)}</b></div><div class="detail-row"><span>防御 / 规模</span><b>${Math.round(village.hp)} / ${villageMaxHp(village)} · ${["营地", "村落", "城镇"][village.level - 1]}</b></div><div class="detail-row"><span>贸易路线</span><b>${routes.length} 条</b></div><div class="inventory-list">${inventoryHtml(village)}</div><div class="building-grid">${Object.entries(buildingDefs).filter(([key]) => (b[key] || 0) > 0).map(([key, def]) => `<span class="building-chip">${def.icon} ${def.name} ×${b[key] || 0}</span>`).join("")}</div><h3>劳动力</h3><div class="profession-list">${workforceHtml(village.workforce || {})}</div>`;
  } else {
    const t = tileAt(x, y), labels = { deep:"深海",water:"浅海",sand:"沙滩",grass:"草原",forest:"森林",mountain:"山地",ash:"焦土" };
    box.innerHTML = `<h4>▦ ${labels[t?.type] || "世界之外"}</h4><div class="detail-row"><span>坐标</span><b>${x}, ${y}</b></div><div class="detail-row"><span>温度 / 湿度</span><b>${Number(t?.temperature || 0).toFixed(1)}℃ · ${Math.round((t?.moisture || 0) * 100)}%</b></div><div class="detail-row"><span>肥沃度</span><b>${Math.round((t?.fertility || 0) * 100)}%</b></div><div class="detail-row"><span>植被量</span><b>${Math.round((t?.biomass || 0) * 100)}%</b></div>`;
  }
}

function inspectKingdom(kingdomId) {
  const kingdom = getKingdom(kingdomId); if (!kingdom) return;
  selectedKingdomId = kingdomId; selectedTradeRouteId = null; selectedArmyId = null; selectedHeroId = null; selectedLegacyId = null;
  const box = document.getElementById("selectionCard"), citizens = peopleOfKingdom(kingdomId), realmVillages = villagesOfKingdom(kingdomId), race = raceDefs[kingdom.race] || raceDefs.human;
  const raceCounts = Object.fromEntries(Object.keys(raceDefs).map(key => [key, 0]));
  let soldiers = 0;
  for (const citizen of citizens) {
    if (citizen.role === "soldier") soldiers++;
    if (raceCounts[citizen.race] !== undefined) raceCounts[citizen.race]++;
  }
  const demographics = Object.entries(raceDefs).map(([key, def]) => `${def.icon}${raceCounts[key]}`).join(" ");
  const jobs = professionCounts(citizens), classes = socialClassCounts(citizens), happiness = averageHappiness(citizens), realmArmies = armies.filter(army => army.kingdomId === kingdomId), government = governmentOf(kingdom), ethos = cultureEthosDefs[kingdom.culture.ethos];
  const structures = realmVillages.flatMap(village => village.structures || []), roads = structures.filter(structure => structure.type === "road").length, walls = structures.filter(structure => structure.type === "wall").length;
  const relations = Object.entries(kingdom.relations || {}).map(([id, r]) => `${getKingdom(Number(id))?.name || "未知"}：${statusLabels[r.status]}`).join(" · ") || "尚无外交关系";
  const traditions = kingdom.culture.traditions.map(id => `<span class="tradition-chip" title="${traditionDefs[id].effect}">${traditionDefs[id].icon} ${traditionDefs[id].name}</span>`).join("") || `<span class="muted">传统正在形成</span>`;
  box.classList.remove("empty");
  box.innerHTML = `<h4><span style="color:${kingdom.color}">◆</span> ${race.icon} ${kingdom.name}${kingdomAtWar(kingdomId) ? '<i class="war-badge">战争中</i>' : ""}${kingdom.famine ? '<i class="famine-badge">饥荒</i>' : ""}</h4><div class="detail-row"><span>政体 / 主体种族</span><b>${government.icon} ${government.name} · ${race.name}</b></div><div class="detail-row"><span>人口 / 士兵 / 军团</span><b>${citizens.length} / ${soldiers} / ${realmArmies.length}</b></div><div class="detail-row"><span>幸福 / 合法性 / 动乱</span><b>${Math.round(happiness)} / ${Math.round(kingdom.legitimacy)} / ${Math.round(kingdom.unrest)}</b></div><div class="detail-row"><span>国库 / 本期税收</span><b>¤ ${Math.floor(kingdom.treasury || 0)} / +${(kingdom.lastTaxRevenue || 0).toFixed(1)}</b></div><div class="detail-row"><span>人口构成</span><b>${demographics}</b></div><div class="detail-row"><span>聚落 / 建筑</span><b>${realmVillages.length} / ${structures.length}</b></div><div class="detail-row"><span>道路 / 城墙</span><b>${roads} / ${walls}</b></div><div class="detail-row"><span>粮食</span><b>🌾 ${Math.floor(kingdom.resources.food)}${kingdom.famine ? ` · 饥荒 ${Math.round(kingdom.famineLevel)}%` : ""}</b></div><div class="detail-row"><span>木材 / 石料</span><b>🪵 ${Math.floor(kingdom.resources.wood)} · 🪨 ${Math.floor(kingdom.resources.stone)}</b></div><div class="need-list">${needMeter("政权合法性", kingdom.legitimacy)}${needMeter("社会动乱", kingdom.unrest)}</div>${dynastyDetailHtml(kingdom)}${politicsDetailHtml(kingdom)}${legacyDetailHtml(kingdom)}${developmentDetailHtml(kingdom)}<h3>${ethos.icon} ${kingdom.culture.name}</h3><div class="detail-row"><span>文化精神 / 影响力</span><b>${ethos.name} · 影响 ${Math.floor(kingdom.culture.influence)}</b></div><div class="culture-values">${cultureValuesHtml(kingdom)}</div><div class="tradition-list">${traditions}</div><h3>科技研究 · 累计 ${totalTechnologyLevel(kingdom)} 级</h3><div class="technology-grid">${technologyControlsHtml(kingdom)}</div><p class="muted">当前研究效率 +${kingdom.technology.researchRate.toFixed(1)} / 周期；点击科技可锁定研究方向 10 纪元。</p><h3>国家政策</h3><div class="policy-controls">${policyControlHtml(kingdom, "tax", "税制")}${policyControlHtml(kingdom, "welfare", "民生")}${policyControlHtml(kingdom, "military", "军事")}</div><div class="intervention-row"><button data-unrest-action="calm">安抚民心</button><button class="danger" data-unrest-action="incite">煽动叛乱</button></div><h3>社会阶层</h3><div class="class-list">${socialClassHtml(classes)}</div><h3>职业构成</h3><div class="profession-list">${workforceHtml(jobs)}</div><p class="muted">${relations}</p>`;
}

function inspectTradeRoute(routeId) {
  const route = getTradeRoute(routeId); if (!route) { selectedTradeRouteId = null; return; }
  selectedKingdomId = null; selectedTradeRouteId = routeId; selectedArmyId = null; selectedHeroId = null; selectedLegacyId = null;
  const from = getVillage(route.fromVillage), to = getVillage(route.toVillage), inTransit = caravans.find(caravan => caravan.routeId === route.id), box = document.getElementById("selectionCard");
  const status = route.status === "active" ? "畅通" : route.status === "blockaded" ? "战争封锁" : "设施中断";
  box.classList.remove("empty");
  box.innerHTML = `<h4>${route.mode === "sea" ? "⚓" : "═"} 贸易路线 #${route.id}</h4><div class="detail-row"><span>起讫</span><b>${from?.name} ↔ ${to?.name}</b></div><div class="detail-row"><span>运输方式</span><b>${route.mode === "sea" ? "海运" : "陆运"}</b></div><div class="detail-row"><span>路线状态</span><b>${status}</b></div><div class="detail-row"><span>交付次数</span><b>${route.deliveries || 0}</b></div><div class="detail-row"><span>累计货运</span><b>${Math.floor(route.delivered || 0)}</b></div><div class="detail-row"><span>损失商队</span><b>${route.losses || 0}</b></div><div class="detail-row"><span>在途货物</span><b>${inTransit ? `${tradeResourceDefs[inTransit.resource].icon} ${Math.floor(inTransit.amount)}` : "暂无"}</b></div>`;
}

function inspectArmy(armyId) {
  const army = getArmy(armyId); if (!army) { selectedArmyId = null; return; }
  selectedKingdomId = null; selectedTradeRouteId = null; selectedArmyId = armyId; selectedHeroId = null; selectedLegacyId = null;
  const members = armySoldiers(army), general = members.find(person => person.id === army.generalId), kingdom = getKingdom(army.kingdomId), target = getVillage(army.targetVillageId), rally = getVillage(army.rallyVillageId), units = unitCountsFor(members), box = document.getElementById("selectionCard");
  const unitLine = Object.entries(unitDefs).filter(([type]) => units[type] > 0).map(([type, def]) => `${def.icon}${def.name} ${units[type]}`).join(" · ") || "暂无士兵";
  const statusLabels = { assembling: "集结", garrison: "驻防", advance: "推进", battle: "交战", siege: "围城", retreat: "撤退" };
  box.classList.remove("empty");
  box.innerHTML = `<h4><span style="color:${kingdom?.color}">⚑</span> ${army.name}</h4><div class="detail-row"><span>将领</span><b>${general ? `★ #${general.id} · 统率 ${general.leadership.toFixed(2)}` : "等待任命"}</b></div><div class="detail-row"><span>状态 / 兵力</span><b>${statusLabels[army.status] || army.status} · ${members.length}</b></div><div class="detail-row"><span>集结地</span><b>${rally?.name || "野外"}</b></div><div class="detail-row"><span>战役目标</span><b>${target?.name || "暂无"}</b></div><div class="detail-row"><span>伤亡 / 攻城进度</span><b>${army.casualties || 0} / ${Math.floor(army.siegeProgress || 0)}</b></div><p class="muted unit-line">${unitLine}</p><div class="need-list">${needMeter("军团士气", army.morale)}${needMeter("军团补给", army.supply / Math.max(1, army.maxSupply) * 100)}</div>`;
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
    const route = getTradeRoute(caravan.routeId), sx = m.ox + (caravan.x + .5) * m.size, sy = m.oy + (caravan.y + .5) * m.size;
    if (!route || sx < -10 || sy < -10 || sx > m.width + 10 || sy > m.height + 10) continue;
    const size = clamp(m.size * .46, 2.2, 5.5), def = tradeResourceDefs[caravan.resource];
    ctx.save(); ctx.fillStyle = caravan.hp < 35 ? "#d85d49" : route.mode === "sea" ? "#d7e3d8" : "#4c3325"; ctx.strokeStyle = def?.color || "#e6cc86"; ctx.lineWidth = Math.max(1, m.size * .16);
    if (route.mode === "sea") { ctx.translate(sx, sy); ctx.rotate(Math.PI / 4); ctx.fillRect(-size, -size, size * 2, size * 2); ctx.strokeRect(-size, -size, size * 2, size * 2); }
    else { ctx.fillRect(sx - size, sy - size * .72, size * 2, size * 1.44); ctx.strokeRect(sx - size, sy - size * .72, size * 2, size * 1.44); }
    ctx.restore();
  }
}

function renderArmies(m) {
  for (const army of armies) {
    const members = armySoldiers(army); if (!members.length) continue;
    const kingdom = getKingdom(army.kingdomId), sx = m.ox + (army.x + .5) * m.size, sy = m.oy + (army.y + .5) * m.size, target = getVillage(army.targetVillageId);
    if (sx < -30 || sy < -30 || sx > m.width + 30 || sy > m.height + 30) continue;
    ctx.save();
    if (target && ["advance", "siege"].includes(army.status)) {
      ctx.globalAlpha = .38; ctx.strokeStyle = kingdom?.color || "#eee"; ctx.lineWidth = Math.max(1, m.size * .16); ctx.setLineDash([m.size, m.size * .7]);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(m.ox + (target.x + .5) * m.size, m.oy + (target.y + .5) * m.size); ctx.stroke(); ctx.setLineDash([]);
    }
    const radius = Math.max(5, m.size * (1.05 + Math.min(1.2, members.length * .07)));
    ctx.globalAlpha = army.status === "retreat" ? .55 : .82; ctx.strokeStyle = army.status === "siege" ? "#e6a14c" : army.status === "battle" ? "#e26752" : kingdom?.color || "#ddd"; ctx.lineWidth = Math.max(1.5, m.size * .25);
    ctx.beginPath(); ctx.arc(sx, sy, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = .95; ctx.fillStyle = kingdom?.color || "#ddd"; ctx.fillRect(sx - 1, sy - radius - m.size * 1.25, Math.max(2, m.size * .22), m.size * 1.3);
    ctx.beginPath(); ctx.moveTo(sx + m.size * .15, sy - radius - m.size * 1.2); ctx.lineTo(sx + m.size * 1.15, sy - radius - m.size * .85); ctx.lineTo(sx + m.size * .15, sy - radius - m.size * .5); ctx.closePath(); ctx.fill();
    const supplyRatio = clamp(army.supply / Math.max(1, army.maxSupply), 0, 1); ctx.fillStyle = "#251816"; ctx.fillRect(sx - radius, sy + radius + 2, radius * 2, Math.max(2, m.size * .22)); ctx.fillStyle = supplyRatio < .25 ? "#df5f49" : "#d3af59"; ctx.fillRect(sx - radius, sy + radius + 2, radius * 2 * supplyRatio, Math.max(2, m.size * .22));
    if (m.size > 5) { ctx.fillStyle = "#fff1c6"; ctx.font = `${Math.max(8, m.size * 1.05)}px Microsoft YaHei`; ctx.textAlign = "center"; ctx.fillText(army.name.split("·").pop(), sx, sy - radius - m.size * 1.45); }
    ctx.restore();
  }
}

function renderStructures(m, artTime) {
  for (const village of villages) for (const structure of village.structures || []) {
    if (structure.type === "hall" || structure.hp <= 0) continue;
    const def = buildingDefs[structure.type], sx = m.ox + (structure.x + .5) * m.size, sy = m.oy + (structure.y + .5) * m.size;
    if (!def || sx < -16 || sy < -16 || sx > m.width + 16 || sy > m.height + 16) continue;
    const size = Math.max(2, m.size * .72), integrity = clamp(structure.hp / structure.maxHp, 0, 1), kingdomColor = getKingdom(village.kingdom)?.color || "#d5c18a";
    drawPixelStructure(ctx, { structure, definition: def, kingdomColor, villageLevel: village.level, currentYear: year, sx, sy, size, time: artTime });
    if (m.size > 8 && integrity < .72) { ctx.fillStyle = "#2a1715"; ctx.fillRect(sx - size * .55, sy + size * .82, size * 1.1, 2); ctx.fillStyle = "#dc654f"; ctx.fillRect(sx - size * .55, sy + size * .82, size * 1.1 * integrity, 2); }
  }
}

function renderMapCursor(m) {
  const drawCell = (cell, color, alpha, dashed = false) => {
    if (!cell || cell.x < 0 || cell.y < 0 || cell.x >= MAP_W || cell.y >= MAP_H) return;
    const sx = Math.floor(m.ox + cell.x * m.size), sy = Math.floor(m.oy + cell.y * m.size);
    ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.fillRect(sx, sy, Math.ceil(m.size), Math.ceil(m.size));
    ctx.globalAlpha = .95; ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, Math.min(2, m.size * .18));
    if (dashed) ctx.setLineDash([Math.max(2, m.size * .35), Math.max(2, m.size * .25)]);
    ctx.strokeRect(sx + .5, sy + .5, Math.max(1, m.size - 1), Math.max(1, m.size - 1)); ctx.restore();
  };
  drawCell(selectedGrid, "#f5ce69", .18);
  const hoverColor = disasterDefs[selectedTool] || ["fire", "meteor"].includes(selectedTool) ? "#ee8067" : selectedTool === "water" ? "#72c9e7" : "#f8e5a2";
  drawCell(hoveredGrid, hoverColor, .12, true);
}

function render() {
  const renderStarted = performance.now(), artTime = renderStarted / 1000, m = viewMetrics(); ctx.clearRect(0, 0, m.width, m.height); ctx.fillStyle = "#0f2534"; ctx.fillRect(0, 0, m.width, m.height);
  const seasonalTint = seasonDefs[climate.season]?.tint || null, mapModeContext = mapMode === "natural" ? null : buildMapModeContext();
  const minX = clamp(Math.floor(-m.ox / m.size), 0, MAP_W), maxX = clamp(Math.ceil((m.width - m.ox) / m.size), 0, MAP_W);
  const minY = clamp(Math.floor(-m.oy / m.size), 0, MAP_H), maxY = clamp(Math.ceil((m.height - m.oy) / m.size), 0, MAP_H);
  for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) {
    const t = tileAt(x, y), sx = Math.floor(m.ox + x * m.size), sy = Math.floor(m.oy + y * m.size);
    drawPixelTerrainTile(ctx, { tile: t, x, y, sx, sy, size: m.size, time: artTime, coastTop: isLand(t) && !isLand(tileAt(x, y - 1)), coastLeft: isLand(t) && !isLand(tileAt(x - 1, y)) });
    if (seasonalTint && isLand(t) && !t.fire) { ctx.fillStyle = seasonalTint; ctx.fillRect(sx, sy, Math.ceil(m.size + .5), Math.ceil(m.size + .5)); }
    if (mapMode === "natural" && t.owner >= 0 && isLand(t)) { ctx.fillStyle = `${getKingdom(t.owner)?.color || "#fff"}35`; ctx.fillRect(sx, sy, Math.ceil(m.size), Math.ceil(m.size)); }
    if (mapModeContext) { const modeColor = mapModeTileColor(t, mapModeContext); if (modeColor) { ctx.fillStyle = modeColor; ctx.fillRect(sx, sy, Math.ceil(m.size), Math.ceil(m.size)); } }
    if (t.owner >= 0 && m.size > 4) {
      ctx.strokeStyle = `${getKingdom(t.owner)?.color || "#fff"}a8`; ctx.lineWidth = 1;
      if (tileAt(x + 1, y)?.owner !== t.owner) { ctx.beginPath(); ctx.moveTo(sx + m.size, sy); ctx.lineTo(sx + m.size, sy + m.size); ctx.stroke(); }
      if (tileAt(x, y + 1)?.owner !== t.owner) { ctx.beginPath(); ctx.moveTo(sx, sy + m.size); ctx.lineTo(sx + m.size, sy + m.size); ctx.stroke(); }
    }
    if (isLand(t) && (t.biomass || 0) < .18) { ctx.fillStyle = "#6d593724"; ctx.fillRect(sx, sy, Math.ceil(m.size), Math.ceil(m.size)); }
  }
  renderTradeRoutes(m);
  renderStructures(m, artTime);
  renderLegacyMarkers(ctx, m);
  renderDisasters(m);
  for (const animal of animals) {
    const sx = m.ox + (animal.x + .5) * m.size, sy = m.oy + (animal.y + .5) * m.size;
    if (sx < -10 || sy < -10 || sx > m.width + 10 || sy > m.height + 10) continue;
    const def = animalDefs[animal.species], r = clamp(m.size * def.size, 1.2, 4.3); ctx.fillStyle = def.color;
    if (animal.species === "rabbit") { ctx.fillRect(sx - r, sy - r * .6, r * 2, r * 1.2); if (m.size > 6) { ctx.fillRect(sx - r * .55, sy - r * 1.5, r * .35, r); ctx.fillRect(sx + r * .2, sy - r * 1.5, r * .35, r); } }
    else if (animal.species === "deer") { ctx.fillRect(sx - r, sy - r * .65, r * 2, r * 1.3); ctx.fillStyle = "#e8cf9e"; ctx.fillRect(sx + r * .55, sy - r, r * .35, r * .45); }
    else if (animal.species === "boar") { ctx.fillRect(sx - r, sy - r * .65, r * 1.8, r * 1.3); ctx.fillRect(sx + r * .55, sy - r * .38, r * .75, r * .7); }
    else if (animal.species === "fox") { ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r, sy + r * .7); ctx.lineTo(sx - r, sy + r * .7); ctx.fill(); ctx.fillRect(sx - r * 1.45, sy + r * .2, r * .7, r * .45); }
    else if (animal.species === "wolf") { ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r, sy + r); ctx.lineTo(sx - r, sy + r); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill(); }
  }
  for (const v of villages) {
    const sx = m.ox + (v.x + .5) * m.size, sy = m.oy + (v.y + .5) * m.size, k = getKingdom(v.kingdom);
    if (sx < -30 || sy < -30 || sx > m.width + 30 || sy > m.height + 30) continue;
    const maxHp = villageMaxHp(v);
    drawPixelVillageCore(ctx, { village: v, kingdomColor: k?.color || "#ddd", sx, sy, size: m.size, time: artTime, maxHp });
    if (v.hp < maxHp * .9) { ctx.fillStyle = "#351a17"; ctx.fillRect(sx - m.size, sy + m.size, m.size * 2, Math.max(2, m.size * .2)); ctx.fillStyle = "#d65a43"; ctx.fillRect(sx - m.size, sy + m.size, m.size * 2 * clamp(v.hp / maxHp, 0, 1), Math.max(2, m.size * .2)); }
    if (m.size > 5) { ctx.fillStyle = "#fff0c9"; ctx.font = `${Math.max(9, m.size * 1.25)}px Microsoft YaHei`; ctx.textAlign = "center"; ctx.fillText(v.name, sx, sy - m.size * 1.3); }
  }
  renderCaravans(m);
  renderArmies(m);
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
    if (m.size > 6) { const marker = p.role === "soldier" ? unitDefs[p.unitType] || unitDefs.militia : professionDefs[p.profession] || professionDefs.laborer; ctx.fillStyle = marker.color; ctx.fillRect(sx - r, sy + r + 1, r * 2, Math.max(1, m.size * .16)); }
    if (p.isGeneral && m.size > 5) { ctx.fillStyle = "#ffe37d"; ctx.beginPath(); ctx.moveTo(sx, sy - r - 3); ctx.lineTo(sx + 2.5, sy - r + 1); ctx.lineTo(sx - 2.5, sy - r + 1); ctx.closePath(); ctx.fill(); }
    if (p.plague > 0 && m.size > 5) { ctx.strokeStyle = "#c2ed74"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx, sy, r + 1.5, 0, Math.PI * 2); ctx.stroke(); }
    renderHeroMarker(ctx, m, p, sx, sy, r);
    renderDynastyMarker(ctx, m, p, sx, sy, r);
  }
  renderExperienceEffects(ctx, m);
  drawPixelWeatherOverlay(ctx, m, climate, artTime);
  renderMapCursor(m);
  const elapsed = performance.now() - renderStarted;
  performanceMetrics.renderMs = performanceMetrics.renderMs ? performanceMetrics.renderMs * .9 + elapsed * .1 : elapsed;
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
  const season = seasonDefs[climate.season] || seasonDefs.spring, weather = weatherDefs[climate.weather] || weatherDefs.clear;
  document.getElementById("climateStat").textContent = `${season.icon} ${season.name} · ${weather.icon}`;
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
  document.getElementById("eventLog").innerHTML = events.map(e => `<div class="event ${e.kind || "event"}"><time>纪元 ${e.year}</time>${e.text}</div>`).join("");
  document.getElementById("renownStat").textContent = `✦ ${Math.floor(worldProgress.renown)}`;
  document.getElementById("goalList").innerHTML = Object.entries(worldGoalDefs).map(([id, goal]) => {
    const completed = Boolean(worldProgress.completedGoals[id]), value = Math.min(goal.target, Math.floor(goal.value())), percent = completed ? 100 : clamp(value / goal.target * 100, 0, 100);
    return `<div class="goal-item ${completed ? "completed" : ""}"><div><b>${goal.icon} ${goal.name}${completed ? " ✓" : ""}</b><span>${goal.description} · +${goal.points} 声望</span></div><small>${value} / ${goal.target}</small><i><em style="width:${percent}%"></em></i></div>`;
  }).join("");
  const unlockedAchievements = Object.keys(worldProgress.achievements).length;
  document.getElementById("achievementList").innerHTML = `<p class="achievement-summary">已解锁 ${unlockedAchievements} / ${Object.keys(achievementDefs).length}</p>` + Object.entries(achievementDefs).map(([id, achievement]) => {
    const record = worldProgress.achievements[id];
    return `<div class="achievement-item ${record ? "unlocked" : "locked"}" title="${achievement.description}"><span>${record ? achievement.icon : "◇"}</span><div><b>${achievement.name}</b><small>${record ? `纪元 ${record.year} · +${achievement.points}` : achievement.description}</small></div></div>`;
  }).join("");
  document.getElementById("worldStatsList").innerHTML = [
    ["出生", worldStats.births], ["逝者", worldStats.deaths], ["建立聚落", worldStats.villagesFounded], ["攻占聚落", worldStats.villagesCaptured],
    ["建成建筑", worldStats.buildingsConstructed], ["损毁建筑", worldStats.buildingsDestroyed], ["商队交付", worldStats.tradeDeliveries], ["累计货运", Math.floor(worldStats.tradeVolume)],
    ["爆发战争", worldStats.warsStarted], ["结束战争", worldStats.warsEnded], ["天灾降临", worldStats.disastersTriggered], ["安然度过", worldStats.disastersSurvived],
    ["英雄涌现", worldStats.heroesEmerged || 0], ["时代抉择", worldStats.worldEventsResolved || 0], ["时代跃迁", worldStats.erasReached || 0], ["完成野心", worldStats.ambitionsCompleted || 0],
    ["缔结婚姻", worldStats.marriages || 0], ["权力交接", worldStats.successions || 0], ["继承危机", worldStats.successionCrises || 0],
    ["议案决议", worldStats.politicalResolutions || 0], ["派系危机", worldStats.politicalCrises || 0], ["动态抉择", worldStats.dynamicEventsResolved || 0],
    ["探索遗迹", worldStats.ruinsExplored || 0], ["历史伤痕", worldStats.historicalScars || 0], ["重建遗址", worldStats.scarsRestored || 0],
    ["寻得神器", worldStats.artifactsFound || 0], ["神器易主", worldStats.artifactTransfers || 0], ["神器失落", worldStats.artifactsLost || 0],
    ["完成奇观", worldStats.wondersCompleted || 0], ["奇观受损", worldStats.wondersDamaged || 0], ["奇观复原", worldStats.wondersRestored || 0], ["化解危机", worldStats.crisesResolved || 0], ["永久遗产", worldStats.crisisLegacies || 0], ["完成挑战", worldStats.challengesCompleted || 0]
  ].map(([label, value]) => `<span>${label}<b>${value}</b></span>`).join("");
  document.getElementById("chronicleList").innerHTML = chronicle.length ? `<p class="chronicle-summary">共 ${chronicle.length} 条记录 · 保留最近 240 条</p>` + chronicle.slice(0, 30).map(entry => `<div class="event ${entry.kind || "event"}"><time>纪元 ${entry.year}</time>${entry.text}</div>`).join("") : `<p class="muted">历史尚未落笔</p>`;
  let sampledMoisture = 0, sampledFertility = 0, climateSamples = 0;
  for (let i = 0; i < tiles.length; i += 24) if (isLand(tiles[i])) { sampledMoisture += tiles[i].moisture || 0; sampledFertility += tiles[i].fertility || 0; climateSamples++; }
  const averageMoisture = climateSamples ? sampledMoisture / climateSamples * 100 : 0, averageFertility = climateSamples ? sampledFertility / climateSamples * 100 : 0, cropYield = season.crops * weather.crops * 100;
  document.getElementById("climateList").innerHTML = `<div class="climate-title"><b>${season.icon} ${season.name}季 · ${weather.icon} ${weather.name}</b><span>${climate.temperature.toFixed(1)}℃ · 降水 ${Math.round(climate.rainfall * 100)}%</span></div><div class="climate-metrics"><span>平均湿度<b>${Math.round(averageMoisture)}%</b></span><span>平均肥力<b>${Math.round(averageFertility)}%</b></span><span>作物产能<b>${Math.round(cropYield)}%</b></span></div><div class="season-track"><i style="width:${Math.round(climate.seasonProgress * 100)}%"></i></div>`;
  const speciesCounts = animalCounts();
  document.getElementById("ecologyList").innerHTML = Object.entries(animalDefs).map(([species, def]) => `<div class="species-item"><span>${def.icon} ${def.name}</span><b>${speciesCounts[species]}</b></div>`).join("");
  const jobs = professionCounts(people), worldClasses = socialClassCounts(people), worldHappiness = averageHappiness(people), famineCount = activeKingdoms.filter(kingdom => kingdom.famine).length;
  const worldBuildings = emptyBuildingCounts();
  for (const village of villages) for (const structure of village.structures || []) if (worldBuildings[structure.type] !== undefined) worldBuildings[structure.type]++;
  const structureCount = Object.values(worldBuildings).reduce((sum, count) => sum + count, 0);
  const infrastructure = Object.entries(buildingDefs).filter(([type]) => type !== "hall" && worldBuildings[type] > 0).map(([type, def]) => `<span class="building-chip">${def.icon} ${def.name} ×${worldBuildings[type]}</span>`).join("");
  document.getElementById("societyList").innerHTML = people.length ? `<div class="society-summary"><span>平均幸福<b>${Math.round(worldHappiness)}</b></span><span>饥荒王国<b>${famineCount}</b></span><span>实体建筑<b>${structureCount}</b></span></div><div class="class-list">${socialClassHtml(worldClasses)}</div><div class="profession-list">${workforceHtml(jobs)}</div><div class="building-grid infrastructure-grid">${infrastructure}</div>` : `<p class="muted">尚无社会分工</p>`;
  const activeRoutes = tradeRoutes.filter(route => route.status === "active").length, blockedRoutes = tradeRoutes.filter(route => route.status === "blockaded").length, delivered = tradeRoutes.reduce((sum, route) => sum + (route.delivered || 0), 0);
  const routeOrder = { blockaded: 0, active: 1, dormant: 2 };
  const routeItems = [...tradeRoutes].sort((a, b) => (routeOrder[a.status] ?? 3) - (routeOrder[b.status] ?? 3)).slice(0, 7).map(route => {
    const from = getVillage(route.fromVillage), to = getVillage(route.toVillage), inTransit = caravans.some(caravan => caravan.routeId === route.id);
    const status = route.status === "blockaded" ? "封锁" : route.status === "active" ? (inTransit ? "运输中" : "畅通") : "中断";
    return `<button class="trade-route-item ${route.status}" data-trade-route="${route.id}"><b>${route.mode === "sea" ? "⚓" : "═"} ${from?.name || "失落聚落"} ↔ ${to?.name || "失落聚落"}</b><span>${status} · ${route.deliveries || 0} 次交付 · 货运 ${Math.floor(route.delivered || 0)}</span></button>`;
  }).join("");
  document.getElementById("tradeList").innerHTML = tradeRoutes.length ? `<div class="trade-summary"><span>畅通<b>${activeRoutes}</b></span><span>商队<b>${caravans.length}</b></span><span>封锁<b>${blockedRoutes}</b></span><span>累计货运<b>${Math.floor(delivered)}</b></span></div><div class="trade-routes">${routeItems}</div>` : `<p class="muted">市场和仓库发展后将建立贸易路线</p>`;
  const armyTroops = armies.reduce((sum, army) => sum + armySoldiers(army).length, 0), lowSupplyArmies = armies.filter(army => army.supply < army.maxSupply * .25).length, sieges = armies.filter(army => army.status === "siege").length;
  const armyStatusLabels = { assembling: "集结", garrison: "驻防", advance: "推进", battle: "交战", siege: "围城", retreat: "撤退" };
  const armyItems = [...armies].sort((a, b) => ["battle", "siege", "advance", "retreat", "assembling", "garrison"].indexOf(a.status) - ["battle", "siege", "advance", "retreat", "assembling", "garrison"].indexOf(b.status)).slice(0, 8).map(army => {
    const kingdom = getKingdom(army.kingdomId), members = armySoldiers(army), target = getVillage(army.targetVillageId), supply = Math.round(army.supply / Math.max(1, army.maxSupply) * 100);
    return `<button class="army-item ${army.status}" data-army="${army.id}" style="border-color:${kingdom?.color || "#777"}"><b>⚑ ${army.name}</b><span>${armyStatusLabels[army.status] || army.status} · ${members.length} 人${target ? ` → ${target.name}` : ""}</span><i><em style="width:${supply}%"></em></i><small>士气 ${Math.round(army.morale)} · 补给 ${supply}%</small></button>`;
  }).join("");
  document.getElementById("armyList").innerHTML = armies.length ? `<div class="army-summary"><span>军团<b>${armies.length}</b></span><span>兵力<b>${armyTroops}</b></span><span>围城<b>${sieges}</b></span><span>缺粮<b>${lowSupplyArmies}</b></span></div><div class="army-items">${armyItems}</div>` : `<p class="muted">兵营扩张或战争爆发后将组建军团</p>`;
  document.getElementById("governanceList").innerHTML = activeKingdoms.length ? activeKingdoms.map(kingdom => {
    const government = governmentOf(kingdom), unrest = Math.round(kingdom.unrest || 0), legitimacy = Math.round(kingdom.legitimacy || 0);
    return `<button class="governance-item ${unrest >= 65 ? "unstable" : ""}" data-governance="${kingdom.id}" style="border-color:${kingdom.color}"><b>${government.icon} ${kingdom.name}</b><span>${government.name} · ¤ ${Math.floor(kingdom.treasury || 0)}</span><small>${policyOf(kingdom, "tax").name} · ${policyOf(kingdom, "welfare").name} · ${policyOf(kingdom, "military").name}</small><i><em class="legitimacy" style="width:${legitimacy}%"></em><em class="unrest" style="width:${unrest}%"></em></i><small>合法性 ${legitimacy} · 动乱 ${unrest}</small></button>`;
  }).join("") : `<p class="muted">尚未形成政治秩序</p>`;
  document.getElementById("cultureList").innerHTML = activeKingdoms.length ? activeKingdoms.map(kingdom => {
    const ethos = cultureEthosDefs[kingdom.culture.ethos], dominant = cultureValueDefs[dominantCultureValue(kingdom)], focus = technologyDefs[kingdom.technology.focus], cost = currentTechnologyCost(kingdom), progress = cost ? clamp(kingdom.technology.research / cost * 100, 0, 100) : 100;
    return `<button class="culture-item" data-culture="${kingdom.id}" style="border-color:${kingdom.color}"><b>${ethos.icon} ${kingdom.culture.name}</b><span>${ethos.name} · 崇尚${dominant.name} · 影响 ${Math.floor(kingdom.culture.influence)}</span><small>${focus.icon} ${focus.name} ${technologyLevel(kingdom, kingdom.technology.focus)}级 · 总科技 ${totalTechnologyLevel(kingdom)}</small><i><em style="width:${progress}%"></em></i><small>研究 +${kingdom.technology.researchRate.toFixed(1)} / 周期 · 传统 ${kingdom.culture.traditions.length}</small></button>`;
  }).join("") : `<p class="muted">文明知识尚未萌芽</p>`;
  document.getElementById("disasterList").innerHTML = activeDisasters.length ? activeDisasters.map(disaster => {
    const def = disasterDefs[disaster.type], progress = clamp(disaster.duration / Math.max(1, disaster.maxDuration) * 100, 0, 100);
    return `<div class="disaster-item ${disaster.type}"><div><b>${def.icon} ${def.name}</b><span>${disasterLocation(disaster)} · 约 ${(disaster.duration * .02).toFixed(1)} 纪元</span></div><i style="width:${progress}%"></i></div>`;
  }).join("") : `<p class="muted disaster-calm">${randomDisastersEnabled ? `世界暂时平静 · 风险预计在纪元 ${Math.ceil(nextDisasterYear)}` : "随机天灾已关闭"}</p>`;
  document.getElementById("kingdomList").innerHTML = activeKingdoms.length ? activeKingdoms.map(k => {
    const citizens = peopleOfKingdom(k.id), pop = citizens.length, towns = villagesOfKingdom(k.id).length, race = raceDefs[k.race] || raceDefs.human;
    const structures = villagesOfKingdom(k.id).reduce((sum, village) => sum + (village.structures?.length || 0), 0);
    let soldiers = 0; for (const citizen of citizens) if (citizen.role === "soldier") soldiers++;
    return `<button class="kingdom-item" data-kingdom="${k.id}" style="border-color:${k.color}"><b>${race.icon} ${k.name}${kingdomAtWar(k.id) ? '<i class="war-badge">交战</i>' : ""}${k.famine ? '<i class="famine-badge">饥荒</i>' : ""}${(k.unrest || 0) >= 65 ? '<i class="unrest-badge">动乱</i>' : ""}</b><span>${governmentOf(k).name} · ${pop} 人 · ⚔ ${soldiers} · ${towns} 聚落 · 🏗 ${structures} · 🙂 ${Math.round(averageHappiness(citizens))}</span><span class="resource-line"><i>🌾 ${Math.floor(k.resources.food)}</i><i>🪵 ${Math.floor(k.resources.wood)}</i><i>🪨 ${Math.floor(k.resources.stone)}</i></span></button>`;
  }).join("") : `<p class="muted">世界尚无文明</p>`;
  const relationOrder = { war: 0, alliance: 1, peace: 2 };
  const sortedRelations = relationPairs.sort((a, b) => relationOrder[a.status] - relationOrder[b.status]);
  document.getElementById("diplomacyList").innerHTML = sortedRelations.length ? sortedRelations.map(r => `<div class="relation-item ${r.status}" title="${cleanText(r.lastReason || "关系仍在形成")}"><b>${r.a.name} ↔ ${r.b.name}</b><span>${statusLabels[r.status]} <i class="relation-score">${Math.round(r.score)}</i></span><small>${diplomaticMemorySummary(r)}</small><em>${cleanText(r.lastReason || "关系仍在形成")}</em><button class="relation-action" data-diplomacy-action="${r.status === "war" ? "peace" : "war"}" data-kingdom-a="${r.a.id}" data-kingdom-b="${r.b.id}" title="神力干预外交">${r.status === "war" ? "促成议和" : "挑起战争"}</button></div>`).join("") : `<p class="muted">尚未建立国家关系</p>`;
  if (selectedKingdomId !== null) inspectKingdom(selectedKingdomId);
  if (selectedTradeRouteId !== null) inspectTradeRoute(selectedTradeRouteId);
  if (selectedArmyId !== null) inspectArmy(selectedArmyId);
  renderPoliticsPanels(); renderDynastyPanels(); renderLongTermPanels(); renderLegacyPanels(); renderExperiencePanels();
}
