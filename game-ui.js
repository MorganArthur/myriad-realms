"use strict";

// 画布与信息面板。模拟规则全部位于 game.js。
(() => {
  const config = globalThis.RealmConfig, art = globalThis.PixelArt;
  const byId = id => document.getElementById(id), escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]);
  let game = null, canvas = null, ctx = null, terrainCanvas = null, terrainContext = null, terrainCacheKey = "", selection = null, activeTab = "overview", mapMode = "natural", lastPanelUpdate = 0, lastFrame = 0, measuredFps = 60, toastTimer = null;
  const camera = { x: config.map.width / 2, y: config.map.height / 2, zoom: 1 };

  function canvasSize() { return { width: canvas?.clientWidth || 960, height: canvas?.clientHeight || 640 }; }
  function resize() { if (!canvas) return; const { width, height } = canvasSize(), ratio = Math.min(2, globalThis.devicePixelRatio || 1); if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); ctx.setTransform(ratio, 0, 0, ratio, 0, 0); } }
  function scale() { return config.map.tileSize * camera.zoom; }
  function worldToScreen(x, y) { const size = scale(), area = canvasSize(); return { x: (x - camera.x) * size + area.width / 2, y: (y - camera.y) * size + area.height / 2, scale: size }; }
  function screenToWorld(x, y) { const size = scale(), area = canvasSize(); return { x: (x - area.width / 2) / size + camera.x, y: (y - area.height / 2) / size + camera.y }; }
  function eventPoint(event) { const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
  function tileAt(state, x, y) { const tx = Math.floor(x), ty = Math.floor(y); return tx < 0 || ty < 0 || tx >= config.map.width || ty >= config.map.height ? null : state.tiles[ty * config.map.width + tx]; }

  function kingdomMaps(state) { return { kingdom: new Map(state.kingdoms.map(item => [item.id, item])), village: new Map(state.villages.map(item => [item.id, item])) }; }
  function updateTerrainCache(state, maps) {
    const cacheKey = `${mapMode}:${state.climate.seasonIndex}:${Math.floor(state.ticks / 20)}`; if (terrainCacheKey === cacheKey) return; terrainCacheKey = cacheKey;
    const populations = new Map(); if (mapMode === "population") for (const person of state.people) { const key = `${Math.floor(person.x)},${Math.floor(person.y)}`; populations.set(key, (populations.get(key) || 0) + 1); }
    terrainContext.clearRect(0, 0, terrainCanvas.width, terrainCanvas.height); for (const tile of state.tiles) { const kingdom = maps.kingdom.get(tile.kingdomId); art.drawTile(terrainContext, tile, tile.x * config.map.tileSize, tile.y * config.map.tileSize, config.map.tileSize, { season: config.seasons[state.climate.seasonIndex].id, mapMode, kingdomColor: kingdom?.color, population: populations.get(`${tile.x},${tile.y}`) || 0, details: true }); }
  }
  function draw(state, tick) {
    resize(); const area = canvasSize(), size = scale(), maps = kingdomMaps(state); ctx.clearRect(0, 0, area.width, area.height); ctx.fillStyle = "#071018"; ctx.fillRect(0, 0, area.width, area.height); updateTerrainCache(state, maps);
    const origin = worldToScreen(0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(terrainCanvas, origin.x, origin.y, terrainCanvas.width * camera.zoom, terrainCanvas.height * camera.zoom);
    if (mapMode === "diplomacy") { ctx.save(); ctx.globalAlpha = .22; for (const village of state.villages) { const kingdom = maps.kingdom.get(village.kingdomId), point = worldToScreen(village.x, village.y); ctx.fillStyle = kingdom?.color || "#fff"; ctx.beginPath(); ctx.arc(point.x, point.y, Math.max(8, size * 3.5), 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
    if (camera.zoom >= .65) for (const village of state.villages) for (const structure of village.structures) { const point = worldToScreen(structure.x + .5, structure.y + .5), kingdom = maps.kingdom.get(village.kingdomId); if (point.x > -20 && point.y > -20 && point.x < area.width + 20 && point.y < area.height + 20) art.drawStructure(ctx, structure, point.x, point.y, Math.min(12, size), kingdom?.color); }
    if (camera.zoom >= .72) for (const animal of state.animals) { const point = worldToScreen(animal.x, animal.y); if (point.x > -10 && point.y > -10 && point.x < area.width + 10 && point.y < area.height + 10) art.drawAnimal(ctx, animal, point.x, point.y, Math.min(9, size)); }
    for (const person of state.people) { const point = worldToScreen(person.x, person.y); if (point.x > -10 && point.y > -10 && point.x < area.width + 10 && point.y < area.height + 10) art.drawPerson(ctx, person, point.x, point.y, Math.min(10, size)); }
    for (const disaster of state.activeDisasters) art.drawDisaster(ctx, disaster, worldToScreen, tick);
    art.drawWeather(ctx, state.climate.weather, area.width, area.height, tick);
    if (selection?.x != null) { const point = worldToScreen(selection.x + .5, selection.y + .5); ctx.strokeStyle = "#ffe38a"; ctx.lineWidth = 2; ctx.strokeRect(point.x - size * .55, point.y - size * .55, size * 1.1, size * 1.1); }
  }

  function infoRows(rows) { return rows.map(([name, value]) => `<div class="info-card info-row"><span>${escape(name)}</span><span>${escape(value)}</span></div>`).join(""); }
  function renderOverview(state) {
    const season = config.seasons[state.climate.seasonIndex], weather = config.weather[state.climate.weather];
    byId("climateList").innerHTML = infoRows([["天候", `${season.icon} ${season.name} · ${weather.icon} ${weather.name}`], ["土地", `健康 ${Math.round(state.biomeHealth * 100)}% · 水域 ${Math.round(state.waterRatio * 100)}%`], ["生命", `${state.people.length} 名居民 · ${state.animals.length} 只动物`]]);
    const averageHealth = state.people.length ? state.people.reduce((sum, item) => sum + item.health, 0) / state.people.length : 0;
    byId("societyList").innerHTML = infoRows([["文明", `${state.villages.length} 个聚落 · ${state.kingdoms.length} 个王国`], ["状态", `健康 ${Math.round(averageHealth)}% · ${state.activeDisasters.length ? `${state.activeDisasters.length} 场天灾` : game.countWars() ? `${game.countWars()} 组冲突` : "世界平静"}`]]);
  }
  function aggregateKingdom(state, kingdom) {
    const villages = state.villages.filter(item => item.kingdomId === kingdom.id), people = state.people.filter(item => item.kingdomId === kingdom.id), resources = { food: 0, wood: 0, stone: 0 }, buildings = {};
    for (const village of villages) { for (const key of Object.keys(resources)) resources[key] += village.resources[key] || 0; for (const structure of village.structures) buildings[structure.type] = (buildings[structure.type] || 0) + 1; }
    return { villages, people, resources, buildings };
  }
  function renderKingdoms(state) {
    byId("kingdomList").innerHTML = state.kingdoms.map(kingdom => { const totals = aggregateKingdom(state, kingdom), buildingTotal = Object.values(totals.buildings).reduce((sum, count) => sum + count, 0); return `<article class="kingdom-card" style="--kingdom:${kingdom.color}"><header><b>${escape(kingdom.name)}</b><span>${config.races[kingdom.race].icon} ${totals.people.length} 人</span></header><div class="resources"><span>🌾 ${Math.floor(totals.resources.food)}</span><span>🪵 ${Math.floor(totals.resources.wood)}</span><span>🪨 ${Math.floor(totals.resources.stone)}</span></div><div class="kingdom-note"><span>${totals.villages.length} 个聚落</span><span>${buildingTotal} 座建筑</span></div></article>`; }).join("") || `<p class="muted">尚无王国</p>`;
    const relations = [];
    for (let index = 0; index < state.kingdoms.length; index++) for (let second = index + 1; second < state.kingdoms.length; second++) { const first = state.kingdoms[index], other = state.kingdoms[second], relation = first.relations[other.id] || { status: "peace", value: 0 }; if (relation.status === "peace" && Math.abs(relation.value) < 45) continue; relations.push(`<article class="relation-card ${relation.status}"><div class="info-row"><b>${escape(first.name)} · ${escape(other.name)}</b><span>${config.relationLabels[relation.status]}</span></div></article>`); }
    byId("diplomacyList").innerHTML = relations.join("") || `<p class="muted">各国维持和平</p>`;
  }
  function renderHistory(state) {
    byId("disasterList").innerHTML = state.activeDisasters.map(item => { const definition = config.disasters[item.type]; return `<article class="info-card"><b>${definition.icon} ${definition.name}</b><div class="info-row"><span>影响范围 ${item.radius} 格</span><span>剩余 ${Math.ceil(item.remaining)}</span></div></article>`; }).join("") || `<p class="muted">世界平静</p>`;
    const events = list => list.map(item => `<article class="event-item"><strong>纪元 ${Math.floor(item.year)}</strong>　${escape(item.text)}</article>`).join(""); byId("eventLog").innerHTML = events(state.events.slice(0, 10));
  }
  function renderSelection() {
    const card = byId("selectionCard"); if (!selection) { card.className = "selection-card empty"; card.innerHTML = `<div class="selection-icon">◌</div><p>点击地图查看土地、居民或聚落</p>`; return; }
    card.className = "selection-card"; card.innerHTML = `<div class="selection-icon">${selection.icon}</div><p><b>${escape(selection.title)}</b><br>${selection.lines.map(escape).join(" · ")}</p>`;
  }
  function renderStats(state, now) {
    byId("yearStat").textContent = Math.floor(state.year); byId("populationStat").textContent = state.people.length; byId("villageStat").textContent = state.villages.length; byId("kingdomStat").textContent = state.kingdoms.length; byId("disasterStat").textContent = state.activeDisasters.length;
    byId("worldName").textContent = state.worldName; byId("worldSeedStat").textContent = `种子 ${state.worldSeed}`; byId("pauseBtn").textContent = state.running ? "Ⅱ" : "▶";
    document.querySelectorAll(".speed-btn").forEach(button => button.classList.toggle("active", Number(button.dataset.speed) === state.speed));
    const danger = state.activeDisasters.length > 0, alert = byId("inspectorAlert"); alert.textContent = danger ? `${state.activeDisasters.length} 场天灾` : game.countWars() ? `${game.countWars()} 组冲突` : "世界平静"; alert.classList.toggle("danger", danger);
    renderSelection(); if (activeTab === "overview") renderOverview(state); if (activeTab === "kingdoms") renderKingdoms(state); if (activeTab === "history") renderHistory(state);
    byId("performanceStat").textContent = `${Math.round(measuredFps)} FPS · ${state.people.length + state.animals.length} 个生命`;
  }
  function showToast(message) { const toast = byId("toast"); if (!toast) return; toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 1800); }
  function switchTab(tab) { activeTab = tab; document.querySelectorAll("[data-inspector-tab]").forEach(item => item.classList.toggle("active", item.dataset.inspectorTab === tab)); document.querySelectorAll("[data-inspector-panel]").forEach(item => { const active = item.dataset.inspectorPanel === tab; item.hidden = !active; item.classList.toggle("active", active); }); lastPanelUpdate = 0; }
  function updateLegend(state) {
    const legend = byId("mapLegend"); if (mapMode === "natural") { legend.hidden = true; return; } legend.hidden = false;
    if (mapMode === "political" || mapMode === "diplomacy") legend.innerHTML = state.kingdoms.map(item => `<div><span style="color:${item.color}">■</span> ${escape(item.name)}</div>`).join("") || "尚无疆域";
    if (mapMode === "fertility") legend.innerHTML = "棕色：贫瘠<br>绿色：肥沃"; if (mapMode === "population") legend.innerHTML = "亮黄色：人口较密集";
  }
  function bindCanvas() {
    let dragging = false, painting = false, last = null;
    canvas.addEventListener("contextmenu", event => event.preventDefault());
    canvas.addEventListener("pointerdown", event => { const point = eventPoint(event); canvas.setPointerCapture(event.pointerId); last = point; if (event.button === 2) dragging = true; else if (event.button === 0) { painting = true; const world = screenToWorld(point.x, point.y); if (game.getState().selectedTool === "inspect") { selection = game.describeAt(world.x, world.y); renderSelection(); } else game.applyToolAt(world.x, world.y); } });
    canvas.addEventListener("pointermove", event => { const point = eventPoint(event); if (dragging && last) { camera.x -= (point.x - last.x) / scale(); camera.y -= (point.y - last.y) / scale(); camera.x = Math.max(0, Math.min(config.map.width, camera.x)); camera.y = Math.max(0, Math.min(config.map.height, camera.y)); } else if (painting && game.getState().selectedTool !== "inspect") { const world = screenToWorld(point.x, point.y); game.applyToolAt(world.x, world.y, true); } last = point; });
    const end = () => { dragging = false; painting = false; last = null; }; canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("wheel", event => { event.preventDefault(); const before = screenToWorld(eventPoint(event).x, eventPoint(event).y); camera.zoom = Math.max(.45, Math.min(3.2, camera.zoom * (event.deltaY < 0 ? 1.12 : .89))); const after = screenToWorld(eventPoint(event).x, eventPoint(event).y); camera.x += before.x - after.x; camera.y += before.y - after.y; }, { passive: false });
  }
  function updateToolControls(tool, label, source = null) { document.querySelectorAll(".tool").forEach(button => button.classList.toggle("active", tool === "inspect")); document.querySelectorAll("[data-tool-select]").forEach(select => { if (select !== source) select.value = ""; }); byId("activeToolLabel").textContent = `当前：${label}`; }
  function chooseTool(tool, label, source = null) { game.setTool(tool); updateToolControls(tool, label, source); }
  function bindControls() {
    byId("pauseBtn")?.addEventListener("click", () => game.toggleRunning()); document.querySelectorAll(".speed-btn").forEach(button => button.addEventListener("click", () => game.setSpeed(Number(button.dataset.speed))));
    document.querySelectorAll(".tool").forEach(button => button.addEventListener("click", () => chooseTool(button.dataset.tool, "观察世界")));
    document.querySelectorAll("[data-tool-select]").forEach(select => select.addEventListener("change", () => { if (select.value) chooseTool(select.value, select.selectedOptions[0].textContent.trim(), select); }));
    byId("brushSize")?.addEventListener("input", event => { game.setBrush(Number(event.target.value)); byId("brushValue").textContent = event.target.value; });
    byId("randomDisasterToggle")?.addEventListener("change", event => game.setRandomDisasters(event.target.checked)); byId("disasterFrequency")?.addEventListener("change", event => game.setDisasterFrequency(event.target.value));
    byId("newWorldBtn")?.addEventListener("click", () => { game.newWorld(byId("worldSeedInput").value); chooseTool("inspect", "观察世界"); }); byId("randomSeedBtn")?.addEventListener("click", () => { byId("worldSeedInput").value = globalThis.WorldEngine.createRandomSeed(); }); byId("saveBtn")?.addEventListener("click", () => game.save(0));
    byId("mapModeSelect")?.addEventListener("change", event => { mapMode = event.target.value; terrainCacheKey = ""; updateLegend(game.getState()); });
    byId("inspectorTabs")?.addEventListener("click", event => { const button = event.target.closest("[data-inspector-tab]"); if (button) switchTab(button.dataset.inspectorTab); });
  }
  function initialize(api) { game = api; if (typeof document === "undefined") return; canvas = byId("worldCanvas"); ctx = canvas.getContext("2d", { alpha: false }); terrainCanvas = document.createElement("canvas"); terrainCanvas.width = config.map.width * config.map.tileSize; terrainCanvas.height = config.map.height * config.map.tileSize; terrainContext = terrainCanvas.getContext("2d", { alpha: false }); bindCanvas(); bindControls(); if (globalThis.ResizeObserver) new ResizeObserver(resize).observe(canvas); byId("worldSeedInput").value = game.getState().worldSeed; }
  function frame(state, now) { if (!ctx) return; if (lastFrame) measuredFps = measuredFps * .88 + Math.min(120, 1000 / Math.max(1, now - lastFrame)) * .12; lastFrame = now; draw(state, state.ticks); if (now - lastPanelUpdate > 260) { renderStats(state, now); updateLegend(state); lastPanelUpdate = now; } }

  globalThis.RealmUI = Object.freeze({ initialize, frame, showToast, switchTab, invalidateTerrain() { terrainCacheKey = ""; }, resetTools() { updateToolControls("inspect", "观察世界"); }, resetCamera() { camera.x = config.map.width / 2; camera.y = config.map.height / 2; camera.zoom = 1; selection = null; terrainCacheKey = ""; }, refreshSelection() { selection = null; renderSelection(); } });
})();
