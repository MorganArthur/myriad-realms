"use strict";

(() => {
  const deepFreeze = value => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
    return value;
  };

  const config = {
    map: { width: 120, height: 80 },
    terrainColors: {
      deep: "#173c58", water: "#23617a", sand: "#c6ad69", grass: "#679344",
      forest: "#315d32", mountain: "#777966", fire: "#d9582e", ash: "#3d3a34"
    },
    kingdomColors: ["#e05252", "#55a8e2", "#e4b642", "#9a68d3", "#52b98b", "#e88345", "#d867a8", "#ca7456", "#8d9dde", "#45a8ad", "#9b8b74", "#d18bba"],
    worldNames: ["阿斯托拉", "云海之环", "苍翠纪元", "星落原野", "伊澜大陆", "群岛之歌"],
    races: {
      human: { name: "人类", icon: "🧑", life: 78, combat: 1, birth: 1, food: 1.08, wood: 1, stone: 1, names: ["晨曦王庭", "金穗之国", "白橡公国"] },
      elf: { name: "精灵", icon: "🧝", life: 125, combat: .92, birth: .72, food: 1, wood: 1.35, stone: .78, names: ["星火联盟", "翡翠领", "银月议会"] },
      dwarf: { name: "矮人", icon: "⛏", life: 105, combat: 1.16, birth: .8, food: .88, wood: .85, stone: 1.55, names: ["远山邦", "黑石王朝", "铜炉议会"] },
      orc: { name: "兽人", icon: "👹", life: 62, combat: 1.28, birth: 1.3, food: .95, wood: 1.08, stone: .9, names: ["赤砂汗国", "铁牙部族", "灰烬战团"] }
    },
    animals: {
      rabbit: { name: "野兔", icon: "🐇", diet: "herbivore", maxAge: 11, health: 32, hungerRate: .08, vision: 5, reproduce: .003, adult: 1, color: "#e8dfc8", size: .21, habitats: ["grass", "forest", "sand"] },
      deer: { name: "野鹿", icon: "🦌", diet: "herbivore", maxAge: 24, health: 72, hungerRate: .1, vision: 7, reproduce: .0012, adult: 3, color: "#bd8150", size: .34, habitats: ["forest", "grass"] },
      boar: { name: "野猪", icon: "🐗", diet: "herbivore", maxAge: 19, health: 96, hungerRate: .13, vision: 6, reproduce: .00085, adult: 2, color: "#72513f", size: .38, habitats: ["forest", "grass"] },
      fox: { name: "赤狐", icon: "🦊", diet: "predator", prey: ["rabbit"], maxAge: 15, health: 54, hungerRate: .075, vision: 10, damage: 24, reproduce: .0007, adult: 2, color: "#d97d3e", size: .27, habitats: ["forest", "grass", "sand"] },
      wolf: { name: "灰狼", icon: "🐺", diet: "predator", prey: ["rabbit", "deer", "boar", "fox"], maxAge: 22, health: 88, hungerRate: .08, vision: 13, damage: 34, reproduce: .00055, adult: 3, color: "#9a9d99", size: .32, habitats: ["forest", "grass", "mountain"] },
      bear: { name: "棕熊", icon: "🐻", diet: "predator", prey: ["deer", "boar", "rabbit", "wolf"], maxAge: 28, health: 145, hungerRate: .12, vision: 8, damage: 31, reproduce: .00012, adult: 5, color: "#76513b", size: .44, habitats: ["forest", "mountain", "grass"] }
    },
    animalCaps: { rabbit: 220, deer: 120, boar: 70, fox: 45, wolf: 50, bear: 24 },
    buildings: {
      hall: { name: "议事厅", icon: "▣", wood: 0, stone: 0, maxHp: 240, color: "#74513a", effect: "聚落的行政与防御核心" },
      house: { name: "住宅", icon: "⌂", wood: 24, stone: 5, maxHp: 100, color: "#8b6544", effect: "提供 7 人居住容量" },
      farm: { name: "农田", icon: "▦", wood: 18, stone: 2, maxHp: 75, color: "#c4a94f", effect: "提高农民产粮与储粮能力" },
      lumber: { name: "伐木场", icon: "♣", wood: 14, stone: 8, maxHp: 90, color: "#55733c", effect: "提高伐木工木材产量" },
      quarry: { name: "采石场", icon: "◆", wood: 20, stone: 6, maxHp: 115, color: "#777a73", effect: "提高矿工石料产量" },
      barracks: { name: "兵营", icon: "⚔", wood: 32, stone: 18, maxHp: 145, color: "#773b32", effect: "训练士兵并扩大军队上限" },
      road: { name: "道路", icon: "═", wood: 7, stone: 3, maxHp: 55, color: "#b49a6c", effect: "提高居民移动与建设效率" },
      wall: { name: "城墙", icon: "▥", wood: 12, stone: 16, maxHp: 180, color: "#8c8d83", effect: "提高聚落防御与居民安全感" },
      market: { name: "市场", icon: "⚖", wood: 30, stone: 9, maxHp: 125, color: "#b67555", effect: "扩大商贸收益并吸纳商人" },
      dock: { name: "港口", icon: "⚓", wood: 36, stone: 9, maxHp: 135, color: "#587f8c", effect: "利用水域获得粮食与贸易加成" },
      warehouse: { name: "仓库", icon: "▤", wood: 32, stone: 14, maxHp: 165, color: "#8b744d", effect: "提高聚落库存容量与商队装载量" },
      temple: { name: "神殿", icon: "✦", wood: 36, stone: 18, maxHp: 155, color: "#9b79a7", effect: "提高幸福、健康与灾后恢复" }
    },
    tradeResources: {
      food: { name: "粮食", icon: "🌾", color: "#d5b64d" }, wood: { name: "木材", icon: "🪵", color: "#739557" }, stone: { name: "石料", icon: "🪨", color: "#9a9d98" }
    },
    professions: {
      child: { name: "儿童", icon: "◌", color: "#d6c9a8" }, laborer: { name: "劳工", icon: "●", color: "#a59c83" }, farmer: { name: "农民", icon: "🌾", color: "#d5b64d" },
      lumberjack: { name: "伐木工", icon: "🪓", color: "#71934a" }, miner: { name: "矿工", icon: "⛏", color: "#9b9f9a" }, builder: { name: "建筑师", icon: "🔨", color: "#c88750" },
      merchant: { name: "商人", icon: "⚖", color: "#c99bd5" }, healer: { name: "治疗师", icon: "✚", color: "#76c9ad" }, soldier: { name: "士兵", icon: "⚔", color: "#dd6b55" }
    },
    units: {
      militia: { name: "民兵", icon: "♟", attack: .78, defense: .82, speed: 1, range: 1.5, supply: .75, color: "#aa8462" }, infantry: { name: "步兵", icon: "🛡", attack: 1.08, defense: 1.22, speed: .92, range: 1.5, supply: 1, color: "#6f91ad" },
      archer: { name: "弓手", icon: "➶", attack: .92, defense: .72, speed: 1, range: 3.6, supply: .9, color: "#76a45c" }, cavalry: { name: "骑兵", icon: "♞", attack: 1.32, defense: 1.02, speed: 1.55, range: 1.7, supply: 1.5, color: "#d39a55" },
      siege: { name: "攻城兵", icon: "☄", attack: .62, defense: .68, speed: .58, range: 2.5, supply: 1.85, siege: 3.4, color: "#b66d55" }
    },
    governments: {
      monarchy: { name: "君主制", icon: "♛", stability: 5, tax: 1.12, welfare: 1, recruitment: 1 }, council: { name: "长老议会", icon: "✦", stability: 3, tax: .96, welfare: 1.18, recruitment: .9 },
      republic: { name: "行会共和国", icon: "⚖", stability: 1, tax: 1.2, welfare: 1, recruitment: .94 }, clan: { name: "氏族联盟", icon: "⚔", stability: 2, tax: .9, welfare: .82, recruitment: 1.22 }
    },
    policies: {
      tax: { low: { name: "轻税", rate: .035, happiness: 6, unrest: -5 }, standard: { name: "常税", rate: .07, happiness: 0, unrest: 0 }, high: { name: "重税", rate: .125, happiness: -9, unrest: 10 } },
      welfare: { austerity: { name: "紧缩", cost: 0, happiness: -4, unrest: 5 }, balanced: { name: "赈济", cost: .09, happiness: 3, unrest: -3 }, generous: { name: "普惠", cost: .22, happiness: 10, unrest: -9 } },
      military: { pacifist: { name: "休兵", mobilization: .65, standing: .02, happiness: 3 }, defense: { name: "守土", mobilization: 1, standing: .06, happiness: 0 }, conquest: { name: "扩张", mobilization: 1.25, standing: .1, happiness: -3 } }
    },
    socialClasses: {
      elite: { name: "权贵", icon: "♛" }, merchant: { name: "商贾", icon: "⚖" }, artisan: { name: "匠师", icon: "◆" }, peasant: { name: "平民", icon: "●" }, warrior: { name: "军户", icon: "⚔" }, dependent: { name: "眷属", icon: "◌" }
    },
    cultureValues: {
      community: { name: "共同体", icon: "◉" }, nature: { name: "自然", icon: "❧" }, craft: { name: "技艺", icon: "◆" }, valor: { name: "尚武", icon: "⚔" }, commerce: { name: "商贸", icon: "⚖" }, faith: { name: "信仰", icon: "✦" }
    },
    cultureEthos: {
      civic: { name: "城邦精神", icon: "🏛", research: 1.08, values: { community: 72, nature: 38, craft: 55, valor: 42, commerce: 58, faith: 45 } },
      harmony: { name: "自然和谐", icon: "🌿", research: 1.04, values: { community: 62, nature: 82, craft: 46, valor: 30, commerce: 38, faith: 64 } },
      forge: { name: "炉火传承", icon: "⚒", research: 1.12, values: { community: 58, nature: 30, craft: 86, valor: 56, commerce: 52, faith: 40 } },
      warrior: { name: "氏族荣誉", icon: "🛡", research: .94, values: { community: 70, nature: 45, craft: 40, valor: 88, commerce: 30, faith: 48 } }
    },
    technologies: {
      agriculture: { name: "农耕学", icon: "🌾", costs: [12, 34, 70], effect: "每级提高 10% 粮食产量与 6% 储粮能力" }, engineering: { name: "工程学", icon: "🏗", costs: [14, 38, 78], effect: "每级提高建筑耐久并降低建造消耗" },
      metallurgy: { name: "冶金术", icon: "⚔", costs: [16, 42, 86], effect: "每级提高军队攻击与攻城能力" }, navigation: { name: "航运术", icon: "⚓", costs: [14, 40, 82], effect: "每级提高商队运量与移动速度" },
      medicine: { name: "医药学", icon: "✚", costs: [15, 40, 80], effect: "每级提高治疗效率并降低染疫概率" }, administration: { name: "行政学", icon: "📜", costs: [13, 36, 74], effect: "每级提高税收、合法性与科研组织力" }
    },
    traditions: {
      harvest_rites: { name: "丰收礼俗", icon: "🌾", effect: "粮食产量 +8%" }, forest_kin: { name: "林地守望", icon: "🌲", effect: "木材产量 +8%" }, stone_lore: { name: "石工秘传", icon: "◆", effect: "石料产量与建筑耐久 +8%" },
      warrior_code: { name: "勇士信条", icon: "⚔", effect: "军队攻击与士气 +6%" }, merchant_guilds: { name: "商旅行会", icon: "⚖", effect: "商队运量 +10%" }, healer_orders: { name: "济世教团", icon: "✚", effect: "治疗效率 +12%" }
    },
    seasons: {
      spring: { name: "春", icon: "🌱", temperature: 16, rainfall: .72, growth: 1.35, crops: 1.18, reproduction: 1.3, tint: "#8fcf6a12" }, summer: { name: "夏", icon: "☀", temperature: 27, rainfall: .48, growth: 1, crops: 1.04, reproduction: 1, tint: "#e5c05a0b" },
      autumn: { name: "秋", icon: "🍂", temperature: 18, rainfall: .55, growth: .72, crops: 1.1, reproduction: .72, tint: "#d8823820" }, winter: { name: "冬", icon: "❄", temperature: 3, rainfall: .34, growth: .22, crops: .62, reproduction: .38, tint: "#b9d7ea24" }
    },
    weather: {
      clear: { name: "晴朗", icon: "◌", temperature: 0, rainfall: 0, growth: 1, crops: 1 }, rain: { name: "降雨", icon: "🌧", temperature: -2, rainfall: .35, growth: 1.22, crops: 1.12 }, storm: { name: "风暴", icon: "⛈", temperature: -4, rainfall: .5, growth: 1.08, crops: .82 },
      heatwave: { name: "热浪", icon: "♨", temperature: 8, rainfall: -.28, growth: .55, crops: .68 }, frost: { name: "霜冻", icon: "🌨", temperature: -8, rainfall: .08, growth: .35, crops: .56 }
    },
    statusLabels: { peace: "和平", alliance: "同盟", war: "战争" },
    disasters: {
      earthquake: { name: "地震", icon: "🌎", color: "#d7c0a1", radius: 4, duration: 70 }, flood: { name: "洪水", icon: "🌊", color: "#53b8df", radius: 5, duration: 240 }, tornado: { name: "龙卷风", icon: "🌪", color: "#c8d0cf", radius: 2, duration: 170 },
      volcano: { name: "火山喷发", icon: "🌋", color: "#ef673a", radius: 4, duration: 280 }, plague: { name: "瘟疫", icon: "☣", color: "#8fc65a", radius: 8, duration: 360 }, drought: { name: "干旱", icon: "☀", color: "#d8a94c", radius: 8, duration: 420 }
    },
    disasterIntervals: { rare: [15, 24], normal: [8, 14], frequent: [4, 8] },
    balance: {
      simulation: { yearsPerStep: .02, populationCap: 800, adaptiveEcologyThreshold: 900, uiHeavyPopulationThreshold: 900 },
      cadence: { resources: 10, culture: 60, professions: 45, diplomacy: 120, colonies: 250, biodiversity: 300 },
      settlement: { baseCapacity: 8, peoplePerHouse: 7, initialFood: 70, initialWood: 45, initialStone: 18 },
      citizens: { baseBirthChance: .0036, pioneerSettlementChance: .0011, foodDrain: .19, kingdomFoodUse: .16, localFoodUse: .16, starvationDamage: .7 },
      production: { farmerBase: .55, farmerPerFarm: .22, lumberBase: .48, lumberPerBuilding: .24, minerBase: .4, minerPerBuilding: .28, laborerFood: .045, merchantFood: .07 },
      diplomacy: { relationRandomMin: -4, relationRandomMax: 5, borderDrift: -3, nearbyDrift: 0, distantDrift: 1, allianceThreshold: 52, warThreshold: -34, allianceBreakThreshold: 28, wearinessPerCycle: 7, forcedPeaceWeariness: 56 },
      targets: {
        year50PopulationMin: 25, year50PopulationMax: 90, populationOutlierRateMax: .2, extinctionRateMax: .1,
        fourKingdomSurvivalRateMin: .8, completeFoodWebRateMin: .75, dominantRaceShareMax: .65, famineRealmRateMax: .25,
        warWorldRateMin: .15, warWorldRateMax: .9
      }
    }
  };

  globalThis.RealmConfig = deepFreeze(config);
})();
