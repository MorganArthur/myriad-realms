"use strict";

// 声音、指引、百科和档案弹窗。它不参与世界数值演算。
(() => {
  const config = globalThis.RealmConfig, audio = globalThis.RealmAudio, persistence = globalThis.RealmPersistence;
  let game = null, tutorialIndex = 0, currentCodex = "peoples";
  const byId = id => document.getElementById(id);
  const tutorialSteps = [
    { title: "欢迎来到万象之境", body: "这里没有任务清单。你可以只观察，也可以轻轻改变地形、放下生命或制造天灾。" },
    { title: "世界会自己生长", body: "居民寻找食物、建立聚落并修建建筑；动物会繁殖、觅食并形成简单生态关系。" },
    { title: "王国关系是抽象的", body: "王国可能结盟或发生冲突，但地图不会生成需要操控的单位。结果由人口、资源、环境和时间共同决定。" },
    { title: "随时保存", body: "左侧可以保存世界。相同种子能重现相同的初始地图，之后的一切由你的干预与模拟共同塑造。" }
  ];
  function escape(value) { return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]); }
  function download(name, content, type = "application/json") { const url = URL.createObjectURL(new Blob([content], { type })), link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 0); }

  function renderTutorial() {
    const panel = byId("tutorialPanel"), step = tutorialSteps[tutorialIndex]; if (!panel || !step) return;
    panel.hidden = false; panel.innerHTML = `<small>${tutorialIndex + 1} / ${tutorialSteps.length}</small><h3>${step.title}</h3><p>${step.body}</p><div class="tutorial-actions"><button data-tutorial="close">跳过</button><button data-tutorial="next">${tutorialIndex === tutorialSteps.length - 1 ? "开始观察" : "下一步"}</button></div>`;
  }
  function showTutorial() { tutorialIndex = 0; renderTutorial(); }
  function closeTutorial() { const panel = byId("tutorialPanel"); if (panel) panel.hidden = true; try { localStorage.setItem("realm-simple-tutorial-seen", "1"); } catch { /* 忽略 */ } }
  function handleTutorial(event) { const action = event.target.closest("[data-tutorial]")?.dataset.tutorial; if (action === "close") closeTutorial(); if (action === "next") { tutorialIndex++; if (tutorialIndex >= tutorialSteps.length) closeTutorial(); else renderTutorial(); } }

  function codexCards(entries, renderer) { return `<div class="codex-grid">${entries.map(([id, value]) => `<article class="codex-card">${renderer(id, value)}</article>`).join("")}</div>`; }
  function renderCodex() {
    const content = byId("codexContent"); if (!content) return;
    if (currentCodex === "peoples") content.innerHTML = codexCards(Object.entries(config.races), (_, value) => `<h3>${value.icon} ${value.name}</h3><p>寿命约 ${value.life} 年。食物需求、繁衍速度、资源效率和环境韧性略有差异。</p>`);
    if (currentCodex === "ecology") content.innerHTML = codexCards(Object.entries(config.animals), (_, value) => `<h3>${value.icon} ${value.name}</h3><p>${value.diet === "plant" ? "以植物为食" : value.diet === "meat" ? "捕食其他动物" : "杂食"}，偏爱${value.preferred.map(item => ({ grass: "草地", forest: "森林", hill: "丘陵" })[item] || item).join("、")}。</p>`);
    if (currentCodex === "buildings") content.innerHTML = codexCards(Object.entries(config.buildings), (_, value) => `<h3>${value.icon} ${value.name}</h3><p>${value.output ? `持续补充${config.resources[value.output].name}` : value.capacity ? `增加 ${value.capacity} 点聚落容量` : value.protection ? "减轻灾害与冲突造成的损失" : value.exchange ? "促进王国之间的资源互助" : value.storage ? "提高资源储存空间" : value.happiness ? "改善居民幸福" : "连接并完善聚落"}。</p>`);
    if (currentCodex === "disasters") content.innerHTML = codexCards(Object.entries(config.disasters), (_, value) => `<h3>${value.icon} ${value.name}</h3><p>影响半径约 ${value.radius} 格，持续 ${value.duration} 个模拟步。可从左侧手动降下，也可随机发生。</p>`);
    if (currentCodex === "rules") content.innerHTML = `<div class="codex-grid"><article class="codex-card"><h3>居民与聚落</h3><p>居民消耗食物、自然老去并繁衍。人口增长会推动住房、农田和资源设施自动建设。</p></article><article class="codex-card"><h3>生态关系</h3><p>草食动物依赖肥沃土地，捕食者依赖猎物。数量过多时，饥饿和空间会自然限制增长。</p></article><article class="codex-card"><h3>王国与外交</h3><p>王国之间只有和平、同盟和冲突三种关系。所有结果直接结算，不生成额外可操控实体。</p></article><article class="codex-card"><h3>开放沙盒</h3><p>没有分数、任务或通关条件。世界的变化本身就是内容。</p></article></div>`;
  }
  function openCodex() { const modal = byId("codexModal"); if (!modal) return; modal.hidden = false; renderCodex(); }
  function closeCodex() { const modal = byId("codexModal"); if (modal) modal.hidden = true; }

  function syncAudioControls() {
    const settings = audio.getSettings(); byId("audioEnabledToggle").checked = settings.enabled;
    for (const channel of ["master", "music", "ambient", "effects"]) { const input = byId(`${channel}Volume`), output = byId(`${channel}VolumeValue`); if (input) input.value = Math.round(settings[channel] * 100); if (output) output.value = Math.round(settings[channel] * 100); }
    byId("audioBtn").textContent = settings.enabled ? "🔊" : "🔇";
  }
  function toggleAudioPanel(force) { const panel = byId("audioPanel"), open = force ?? panel.hidden; panel.hidden = !open; byId("audioBtn").setAttribute("aria-expanded", String(open)); syncAudioControls(); }
  function updateAudio(state) {
    const scene = audio.update({ disasters: state.activeDisasters, wars: game.countWars(), population: state.people.length, villages: state.villages.length, weather: state.climate.weather, fire: state.tiles.reduce((sum, tile) => sum + (tile.fire > 0 ? 1 : 0), 0), waterRatio: state.waterRatio, biomeHealth: state.biomeHealth, running: state.running });
    const label = byId("audioSceneLabel"); if (label) label.textContent = `${scene.music} · ${scene.ambient}`;
  }

  function renderSlots() {
    const list = byId("saveSlots"); if (!list) return;
    list.innerHTML = persistence.list().map(item => `<article class="save-slot"><b>存档 ${item.slot + 1}</b>${item.empty ? `<p class="muted">空</p>` : `<p>${escape(item.worldName)}</p><p class="muted">纪元 ${Math.floor(item.year)} · ${new Date(item.savedAt).toLocaleString("zh-CN")}</p>`}<div class="slot-actions"><button data-slot-save="${item.slot}">保存</button>${item.empty ? "" : `<button data-slot-load="${item.slot}">载入</button><button data-slot-delete="${item.slot}">删除</button>`}</div></article>`).join("");
  }
  function openArchive() { renderSlots(); byId("archiveModal").hidden = false; }
  function closeArchive() { byId("archiveModal").hidden = true; }
  function handleSlots(event) {
    const saveButton = event.target.closest("[data-slot-save]"), loadButton = event.target.closest("[data-slot-load]"), deleteButton = event.target.closest("[data-slot-delete]");
    if (saveButton) { game.save(Number(saveButton.dataset.slot)); renderSlots(); }
    if (loadButton) { game.load(Number(loadButton.dataset.slot)); closeArchive(); }
    if (deleteButton) { persistence.remove(Number(deleteButton.dataset.slot)); renderSlots(); }
  }
  async function importFile(event) { const file = event.target.files?.[0]; if (!file) return; try { game.importSave(JSON.parse(await file.text())); closeArchive(); } catch (error) { game.toast(`无法导入：${error.message}`); } event.target.value = ""; }

  function bind() {
    byId("helpBtn")?.addEventListener("click", showTutorial); byId("tutorialPanel")?.addEventListener("click", handleTutorial);
    byId("codexBtn")?.addEventListener("click", openCodex); byId("closeCodexBtn")?.addEventListener("click", closeCodex);
    byId("codexTabs")?.addEventListener("click", event => { const button = event.target.closest("[data-codex-tab]"); if (!button) return; currentCodex = button.dataset.codexTab; document.querySelectorAll("[data-codex-tab]").forEach(item => item.classList.toggle("active", item === button)); renderCodex(); });
    byId("audioBtn")?.addEventListener("click", () => toggleAudioPanel()); byId("closeAudioPanelBtn")?.addEventListener("click", () => toggleAudioPanel(false));
    byId("audioEnabledToggle")?.addEventListener("change", event => { audio.setEnabled(event.target.checked); syncAudioControls(); });
    for (const channel of ["master", "music", "ambient", "effects"]) byId(`${channel}Volume`)?.addEventListener("input", event => { audio.setVolume(channel, Number(event.target.value) / 100); byId(`${channel}VolumeValue`).value = event.target.value; });
    byId("loadBtn")?.addEventListener("click", openArchive); byId("closeArchiveBtn")?.addEventListener("click", closeArchive); byId("saveSlots")?.addEventListener("click", handleSlots);
    byId("autoSaveToggle")?.addEventListener("change", event => persistence.setSettings({ autoSave: event.target.checked }));
    byId("exportSaveBtn")?.addEventListener("click", () => download(`${game.getState().worldName}-纪元${Math.floor(game.getState().year)}.json`, JSON.stringify(persistence.build(game.getState()), null, 2)));
    byId("importSaveInput")?.addEventListener("change", importFile); byId("exportChronicleBtn")?.addEventListener("click", () => download(`${game.getState().worldName}-编年史.txt`, game.getState().chronicle.map(item => `纪元 ${Math.floor(item.year)}：${item.text}`).join("\n"), "text/plain;charset=utf-8"));
    for (const modal of [byId("archiveModal"), byId("codexModal")]) modal?.addEventListener("click", event => { if (event.target === modal) modal.hidden = true; });
  }
  function initialize(api) {
    game = api; if (typeof document === "undefined") return; audio.initialize(); bind(); syncAudioControls(); const options = persistence.settings(); byId("autoSaveToggle").checked = options.autoSave;
    try { if (!localStorage.getItem("realm-simple-tutorial-seen")) showTutorial(); } catch { /* 忽略 */ }
  }

  globalThis.RealmExperience = Object.freeze({ initialize, updateAudio, showTutorial, openArchive, renderSlots });
})();
