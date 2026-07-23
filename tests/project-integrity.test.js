"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const ui = fs.readFileSync(path.join(root, "game-ui.js"), "utf8");
const persistence = fs.readFileSync(path.join(root, "game-persistence.js"), "utf8");
const config = fs.readFileSync(path.join(root, "world-config.js"), "utf8");
const pixelArt = fs.readFileSync(path.join(root, "pixel-art-system.js"), "utf8");
const artAtlas = fs.readFileSync(path.join(root, "art-atlas.js"), "utf8");
const worldEvents = fs.readFileSync(path.join(root, "world-event-content.js"), "utf8");
const regionalEvents = fs.readFileSync(path.join(root, "regional-event-content.js"), "utf8");
const experience = fs.readFileSync(path.join(root, "experience-system.js"), "utf8");
const longTerm = fs.readFileSync(path.join(root, "long-term-system.js"), "utf8");
const dynasty = fs.readFileSync(path.join(root, "dynasty-system.js"), "utf8");
const politics = fs.readFileSync(path.join(root, "politics-system.js"), "utf8");
const legacy = fs.readFileSync(path.join(root, "legacy-system.js"), "utf8");
const challenges = fs.readFileSync(path.join(root, "world-challenge-system.js"), "utf8");
const app = [game, ui, persistence, pixelArt, artAtlas, worldEvents, regionalEvents, experience, longTerm, dynasty, politics, legacy, challenges].join("\n");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const packageData = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const balanceReport = fs.readFileSync(path.join(root, "docs", "balance-report.md"), "utf8");
const roadmapAudit = fs.readFileSync(path.join(root, "docs", "roadmap-audit.md"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "validate.yml"), "utf8");

test("运行脚本按依赖顺序加载", () => {
  assert.ok(html.indexOf('src="engine-core.js"') >= 0);
  assert.ok(html.indexOf('src="world-config.js"') > html.indexOf('src="engine-core.js"'));
  assert.ok(html.indexOf('src="pixel-art-system.js"') > html.indexOf('src="world-config.js"'));
  assert.ok(html.indexOf('src="art-atlas.js"') > html.indexOf('src="pixel-art-system.js"'));
  assert.ok(html.indexOf('src="world-event-content.js"') > html.indexOf('src="art-atlas.js"'));
  assert.ok(html.indexOf('src="regional-event-content.js"') > html.indexOf('src="world-event-content.js"'));
  assert.ok(html.indexOf('src="experience-system.js"') > html.indexOf('src="regional-event-content.js"'));
  assert.ok(html.indexOf('src="long-term-system.js"') > html.indexOf('src="experience-system.js"'));
  assert.ok(html.indexOf('src="dynasty-system.js"') > html.indexOf('src="long-term-system.js"'));
  assert.ok(html.indexOf('src="politics-system.js"') > html.indexOf('src="dynasty-system.js"'));
  assert.ok(html.indexOf('src="legacy-system.js"') > html.indexOf('src="politics-system.js"'));
  assert.ok(html.indexOf('src="world-challenge-system.js"') > html.indexOf('src="legacy-system.js"'));
  assert.ok(html.indexOf('src="game-ui.js"') > html.indexOf('src="world-challenge-system.js"'));
  assert.ok(html.indexOf('src="game-persistence.js"') > html.indexOf('src="game-ui.js"'));
  assert.ok(html.indexOf('src="game.js"') > html.indexOf('src="game-persistence.js"'));
});

test("代码引用的 DOM id 全部存在且页面 id 唯一", () => {
  const referenced = [...app.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map(match => match[1]);
  const declared = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  const declaredSet = new Set(declared);
  assert.deepEqual([...new Set(referenced.filter(id => !declaredSet.has(id)))], []);
  assert.equal(declaredSet.size, declared.length);
});

test("新版档案包含体验历史、世界种子与随机状态", () => {
  const version = Number(persistence.match(/version:\s*(\d+),\s*savedAt/)?.[1]);
  assert.ok(version >= 19);
  for (const field of ["chronicle", "worldStats", "worldProgress", "culture", "technology", "development", "dynasty", "politics", "heroes", "worldEventState", "legacySites", "artifacts", "wonders", "legacyState", "worldRuleState", "worldSeed", "randomState"]) assert.match(app, new RegExp(`\\b${field}\\b`));
});

test("文化科技与六个核心模拟系统相连", () => {
  for (const technology of ["agriculture", "engineering", "metallurgy", "navigation", "medicine", "administration"]) assert.match(game, new RegExp(`\\b${technology}\\b`));
  assert.match(game, /cultureTechnologyStep\(\)/);
  assert.match(game, /exchangeCultures\(/);
  assert.match(app, /data-tech-focus/);
});

test("性能保护保持单次索引重建与自适应生态批处理", () => {
  assert.match(game, /if \(!indexesReady\) rebuildWorldIndexes\(\)/);
  assert.match(game, /const ecologyStride = people\.length \+ animals\.length > BALANCE\.simulation\.adaptiveEcologyThreshold \? 3 : 2/);
  assert.match(game, /countNearbyEntities\(worldIndex\.peopleSpatial/);
});

test("模拟、视图、存档和静态规则保持独立模块边界", () => {
  assert.match(game, /globalThis\.RealmDebug/);
  assert.doesNotMatch(game, /function render\(/);
  assert.doesNotMatch(game, /function buildSaveData\(/);
  assert.match(ui, /function render\(/);
  assert.match(persistence, /function buildSaveData\(/);
  assert.match(config, /globalThis\.RealmConfig/);
  assert.match(experience, /function startTutorial\(/);
  assert.match(experience, /function evaluateDiplomaticPair\(/);
  assert.match(longTerm, /function longTermDevelopmentStep\(/);
  assert.match(dynasty, /function dynastySimulationStep\(/);
  assert.match(politics, /function politicsSimulationStep\(/);
  assert.match(legacy, /function legacySimulationStep\(/);
});

test("正式运行时代码不绕过种子随机数", () => {
  for (const [name, source] of Object.entries({ game, ui, persistence, config, worldEvents, regionalEvents, experience, longTerm, dynasty, politics, legacy, challenges })) assert.doesNotMatch(source, /Math\.random\s*\(/, `${name} 仍在直接调用 Math.random`);
});

test("文明时代与八类长期野心均已接入模拟、界面和存档", () => {
  assert.equal([...longTerm.matchAll(/^\s{2}[a-z_]+:\s*\{/gm)].length, 8);
  assert.match(longTerm, /const eraDefs/);
  assert.match(longTerm, /function eraProgressFor\(/);
  assert.match(longTerm, /function ambitionProgressFor\(/);
  assert.match(game, /longTermDevelopmentStep\(\)/);
  assert.match(game, /developmentResearchMultiplier\(kingdom\)/);
  assert.match(game, /developmentCombatMultiplier\(realm\)/);
  assert.match(html, /id="developmentList"/);
  assert.match(ui, /developmentDetailHtml\(kingdom\)/);
});

test("王朝、继承法与人物关系接入生命周期、治理、界面和存档", () => {
  assert.equal([...dynasty.matchAll(/^\s{2}(primogeniture|seniority|elective|merit):\s*\{/gm)].length, 4);
  for (const fn of ["registerBirthLineage", "performSuccession", "arrangeMarriage", "dynastyGovernanceModifiers", "normalizeDynastyWorld"]) assert.match(dynasty, new RegExp(`function ${fn}\\(`));
  assert.match(game, /dynastySimulationStep\(\)/);
  assert.match(game, /registerBirthLineage\(baby/);
  assert.match(game, /markKingdomDynastyDefeated\(oldKingdom\)/);
  assert.match(html, /id="dynastyList"/);
  assert.match(ui, /dynastyDetailHtml\(kingdom\)/);
  assert.match(persistence, /normalizeDynastyWorld\(sourceVersion\)/);
});

test("五类派系、议会席位与政策议题接入治理、界面和存档", () => {
  assert.equal([...politics.matchAll(/^\s{2}(court|commons|guilds|faith|military):\s*\{/gm)].length, 5);
  for (const fn of ["updateFactionStates", "openPoliticalIssue", "resolvePoliticalIssue", "triggerFactionCrisis", "politicalGovernanceModifiers", "politicalPolicyPreference", "normalizePoliticsWorld"]) assert.match(politics, new RegExp(`function ${fn}\\(`));
  assert.match(game, /politicsSimulationStep\(\)/);
  assert.match(game, /politicalGovernanceModifiers\(kingdom\)/);
  assert.match(game, /politicalPolicyPreference\(kingdom/);
  assert.match(html, /id="politicsList"/);
  assert.match(ui, /politicsDetailHtml\(kingdom\)/);
  assert.match(persistence, /normalizePoliticsWorld\(sourceVersion\)/);
});

test("动态事件、遗迹神器、奇观、危机与挑战接入模拟、地图、界面和存档", () => {
  for (const fn of ["activateDynamicEvent", "exploreLegacySites", "discoverArtifact", "beginWonderProject", "triggerWorldCrisis", "startWorldChallenge", "normalizeLegacyWorld"]) assert.match(legacy, new RegExp(`function ${fn}\\(`));
  assert.match(game, /legacySimulationStep\(\)/);
  assert.match(ui, /renderLegacyMarkers\(ctx, m\)/);
  for (const id of ["legacyList", "crisisList", "legacyEventModal"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(persistence, /normalizeLegacyWorld\(sourceVersion\)/);
});

test("历史伤痕、神器流转和奇观耐久连接真实历史钩子", () => {
  assert.equal([...legacy.matchAll(/^\s{2}(war_ruins|flooded_town|impact_crater|ancient_battlefield|plague_memorial|volcano_shrine|broken_road|hero_tomb|abandoned_port|collapsed_mine|dried_well|storm_path):/gm)].length, 12);
  for (const fn of ["recordHistoricalScar", "actOnLegacySite", "recordDisasterLegacy", "recordConquestLegacy", "recordHeroLegacy", "transferArtifact", "loseArtifact", "damageArtifact", "damageWonder", "restoreWonder"]) assert.match(legacy, new RegExp(`function ${fn}\\(`));
  assert.match(game, /recordStructureLegacy\(village, structure\)/);
  assert.match(game, /recordDisasterLegacy\(disaster\)/);
  assert.match(game, /recordConquestLegacy\(oldKingdomId, newKingdomId, village, realmFallen\)/);
  assert.match(experience, /recordHeroLegacy\(hero, person\)/);
});

test("六类后期危机拥有永久结局、持续修正与地形后果", () => {
  assert.equal([...legacy.matchAll(/^\s{2}(ashen_winter|red_miasma|broken_oaths|rising_tides|worldfire|beast_silence):\s*\{/gm)].length, 6);
  for (const fn of ["crisisLegacyDefinition", "rebuildCrisisLegacyModifiers", "applyCrisisWorldChange", "applyCrisisOutcomeLegacy", "applyCrisisLegacyEffects"]) assert.match(legacy, new RegExp(`function ${fn}\\(`));
  for (const id of ["granary_compact", "endemic_scars", "world_concord", "drowned_coasts", "greenward", "broken_food_web"]) assert.match(legacy, new RegExp(`\\b${id}\\b`));
  assert.match(persistence, /sourceVersion < 21/);
  assert.match(legacy, /crisisLegacies/);
  assert.match(legacy, /permanentModifiers/);
});

test("六项组合挑战、分享码和跨世界档案接入生成、模拟与存档", () => {
  assert.equal([...challenges.matchAll(/^\s{2}(scarce_resources|harsh_climate|relentless_disasters|fractured_realms|fragile_ecology|slow_progress):\s*\{/gm)].length, 6);
  for (const fn of ["buildWorldChallengeCode", "parseWorldChallengeCode", "applyWorldRuleGeneration", "worldRuleSimulationStep", "worldChallengeScore", "archiveCurrentWorld", "normalizeWorldRuleState"]) assert.match(challenges, new RegExp(`function ${fn}\\(`));
  assert.match(game, /worldRuleSimulationStep\(\)/);
  assert.match(game, /applyWorldRuleGeneration\(\)/);
  assert.match(persistence, /worldRuleState/);
  for (const id of ["worldRuleList", "challengeCodeInput", "crossWorldArchiveList", "archiveCurrentWorldBtn"]) assert.match(html, new RegExp(`id="${id}"`));
});

test("教程、外交记忆、英雄、事件链、音效、地图模式与百科均已接入", () => {
  for (const id of ["tutorialPanel", "worldEventModal", "heroList", "audioBtn", "mapModeSelect", "codexModal"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(experience, /const tutorialSteps/);
  assert.match(experience, /function recordDiplomaticMemory\(/);
  assert.match(experience, /function promoteHero\(/);
  assert.match(experience, /const worldEventChains/);
  assert.match(experience, /function playExperienceSound\(/);
  assert.match(experience, /function mapModeTileColor\(/);
  assert.match(experience, /function renderCodex\(/);
});

test("十二条大型事件链接入触发条件、参与者、延迟后果、互斥路线与历史记忆", () => {
  assert.equal([...worldEvents.matchAll(/^\s{4}(starfall|council|blight|empty_throne|guild_revolution|sacred_schism|border_exodus|sea_road|ancient_beast|fire_mountain|lost_city|iron_doctrine):\s*chain\(/gm)].length, 12);
  for (const fn of ["worldEventChainEligible", "selectWorldEventParticipants", "applyWorldEventEffects", "processWorldEventConsequences", "rememberWorldEvent"]) assert.match(experience, new RegExp(`function ${fn}\\(`));
  assert.match(experience, /worldEventState\.locked/);
  assert.match(experience, /worldEventState\.consequences/);
  assert.match(experience, /recordPersonalMemory\(/);
});

test("三十条区域事件按世界条件选择目标并共用数据化效果引擎", () => {
  assert.equal([...regionalEvents.matchAll(/^\s{4}[a-z_]+:\s*event\(/gm)].length, 30);
  for (const fn of ["regionalEventContext", "regionalEventConditionsMet", "regionalEventTargetScore", "chooseRegionalEvent", "applyDynamicEventEffect"]) assert.match(legacy, new RegExp(`function ${fn}\\(`));
  assert.match(legacy, /applyWorldEventEffects\(choice\.effects/);
});

test("视觉层保留工具分组、原创地形动画与低动态适配", () => {
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.equal([...html.matchAll(/class="tool-category/g)].length, 4);
  assert.match(ui, /function renderMapCursor\(/);
  assert.match(pixelArt, /const terrainPalettes/); assert.match(pixelArt, /function drawTerrainTile\(/); assert.match(pixelArt, /function drawWeatherOverlay\(/);
  assert.match(pixelArt, /const buildingSilhouettes/); assert.match(pixelArt, /function drawStructure\(/); assert.match(pixelArt, /function drawVillageCore\(/);
  assert.match(pixelArt, /const raceSpritePalettes/); assert.match(pixelArt, /function prepareCharacterFrame\(/); assert.match(pixelArt, /function drawCharacter\(/);
  assert.match(pixelArt, /function spawnCombatEffect\(/); assert.match(pixelArt, /function renderCombatEffects\(/); assert.match(game, /spawnPixelCombatEffect\(/);
  assert.match(pixelArt, /function drawDisaster\(/); assert.match(ui, /drawPixelDisaster\(/);
  assert.match(artAtlas, /hero-archetypes\.png|const atlases/); assert.match(experience, /world-event-art/); assert.match(legacy, /legacy-detail-art/);
  assert.match(pixelArt, /prefers-reduced-motion:\s*reduce/); assert.match(game, /pixelArtAnimationFrameDue\(now, artFrameInterval\)/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(styles, /\.world-wrap::before/);
});

test("发布文档、自动化门禁与八阶段验收保持同步", () => {
  assert.equal(packageData.version, "0.20.0");
  assert.match(balanceReport, /v0\.20\.0/); assert.match(balanceReport, /完整食物网存续率 91\.67%/);
  for (let stage = 1; stage <= 8; stage++) assert.match(roadmapAudit, new RegExp(`阶段 ${stage}`));
  assert.match(workflow, /npm run check/); assert.match(workflow, /npm run balance:quick/);
});
