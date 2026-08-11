"use strict";

// 精简后的唯一平衡配置：只保留世界、生态、聚落、资源、外交与天灾。
(() => {
  const deepFreeze = value => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };

  const config = {
    version: 23,
    map: { width: 120, height: 80, tileSize: 8 },
    terrainColors: {
      deepWater: "#174c73", water: "#27769b", sand: "#d7bd74", grass: "#6fa94d",
      forest: "#2f7444", hill: "#82734f", mountain: "#817b78", snow: "#d8e7e8",
      scorched: "#5e4539"
    },
    kingdomColors: ["#ef6b65", "#65a7ef", "#e8c65a", "#9a72dc", "#63bd84", "#e48a4c"],
    worldNames: ["万籁原", "青屿环", "星落洲", "风种大地", "长潮界", "云根原野", "四林之境", "曦川"],
    races: {
      human: { name: "人类", icon: "🧑", life: 78, birth: 1.04, food: 1, wood: 1.05, stone: 1, resilience: 1, names: ["安", "林", "诺", "亚", "洛", "伊", "弥", "苏"] },
      elf: { name: "精灵", icon: "🧝", life: 135, birth: .72, food: .92, wood: 1.22, stone: .82, resilience: .92, names: ["艾", "希", "露", "瑟", "菲", "莱", "缇", "维"] },
      dwarf: { name: "矮人", icon: "⛏", life: 105, birth: .82, food: 1.08, wood: .86, stone: 1.42, resilience: 1.17, names: ["杜", "冈", "莫", "布", "托", "格", "鲁", "哈"] },
      orc: { name: "兽人", icon: "👹", life: 66, birth: 1.18, food: 1.18, wood: .98, stone: 1.05, resilience: 1.25, names: ["戈", "乌", "克", "扎", "穆", "卡", "拉", "巴"] }
    },
    animals: {
      rabbit: { name: "野兔", icon: "🐇", diet: "plant", life: 14, birth: .014, speed: .8, preferred: ["grass", "forest"] },
      deer: { name: "鹿", icon: "🦌", diet: "plant", life: 24, birth: .006, speed: .7, preferred: ["grass", "forest"] },
      boar: { name: "野猪", icon: "🐗", diet: "plant", life: 20, birth: .007, speed: .55, preferred: ["forest", "grass"] },
      fox: { name: "赤狐", icon: "🦊", diet: "meat", prey: ["rabbit"], life: 16, birth: .004, speed: .85, preferred: ["forest", "grass"] },
      wolf: { name: "狼", icon: "🐺", diet: "meat", prey: ["rabbit", "deer", "boar"], life: 18, birth: .003, speed: .78, preferred: ["forest", "hill"] },
      bear: { name: "棕熊", icon: "🐻", diet: "mixed", prey: ["rabbit", "deer", "boar"], life: 28, birth: .0015, speed: .45, preferred: ["forest", "hill"] }
    },
    animalCaps: { rabbit: 155, deer: 80, boar: 55, fox: 34, wolf: 32, bear: 16 },
    resources: {
      food: { name: "食物", icon: "🌾" }, wood: { name: "木材", icon: "🪵" }, stone: { name: "石料", icon: "🪨" }
    },
    buildings: {
      hall: { name: "议事厅", icon: "🏛", cost: { wood: 18, stone: 12 }, capacity: 3 },
      house: { name: "民居", icon: "⌂", cost: { wood: 10, stone: 2 }, capacity: 7 },
      farm: { name: "农田", icon: "▦", cost: { wood: 7, stone: 1 }, output: "food" },
      lumber: { name: "伐木场", icon: "♣", cost: { wood: 5, stone: 3 }, output: "wood" },
      quarry: { name: "采石场", icon: "◆", cost: { wood: 7, stone: 4 }, output: "stone" },
      road: { name: "道路", icon: "═", cost: { stone: 4 } },
      wall: { name: "城墙", icon: "▥", cost: { wood: 6, stone: 14 }, protection: .14 },
      market: { name: "集市", icon: "⚖", cost: { wood: 15, stone: 5 }, exchange: 1 },
      dock: { name: "码头", icon: "⚓", cost: { wood: 18, stone: 7 }, exchange: 1 },
      warehouse: { name: "仓库", icon: "▣", cost: { wood: 16, stone: 9 }, storage: 120 },
      temple: { name: "神殿", icon: "◇", cost: { wood: 12, stone: 18 }, happiness: .05 }
    },
    seasons: [
      { id: "spring", name: "春", icon: "🌱", fertility: 1.2, birth: 1.15 },
      { id: "summer", name: "夏", icon: "☀", fertility: 1.05, birth: 1 },
      { id: "autumn", name: "秋", icon: "🍂", fertility: 1.12, birth: .9 },
      { id: "winter", name: "冬", icon: "❄", fertility: .55, birth: .65 }
    ],
    weather: {
      clear: { name: "晴朗", icon: "☀", fertility: 1 }, rain: { name: "降雨", icon: "🌧", fertility: 1.22 },
      storm: { name: "风暴", icon: "⛈", fertility: .82 }, heatwave: { name: "热浪", icon: "♨", fertility: .62 },
      frost: { name: "霜冻", icon: "❄", fertility: .58 }
    },
    disasters: {
      earthquake: { name: "地震", icon: "🌎", duration: 18, radius: 6 },
      flood: { name: "洪水", icon: "🌊", duration: 42, radius: 7 },
      tornado: { name: "龙卷风", icon: "🌪", duration: 32, radius: 4 },
      volcano: { name: "火山", icon: "🌋", duration: 75, radius: 6 },
      plague: { name: "瘟疫", icon: "☣", duration: 95, radius: 8 },
      drought: { name: "干旱", icon: "☀", duration: 120, radius: 10 }
    },
    disasterIntervals: { rare: 2600, normal: 1500, frequent: 720 },
    relationLabels: { peace: "和平", alliance: "同盟", war: "战争" },
    balance: {
      simulation: { yearsPerStep: .02, populationCap: 650, animalCap: 370 },
      cadence: { people: 2, animals: 3, resources: 10, construction: 100, diplomacy: 140, weather: 600, biodiversity: 320 },
      settlement: { initialFood: 78, initialWood: 46, initialStone: 20, baseCapacity: 10, peoplePerHouse: 7 },
      citizens: { foodDrain: .017, baseBirthChance: .0038, starvationDamage: .7, naturalRecovery: .08, moveChance: .16 },
      production: { citizenFood: .072, farm: 2.3, forestWood: .035, lumber: 1.55, mountainStone: .023, quarry: 1.35 },
      diplomacy: { warThreshold: -58, allianceThreshold: 58, peaceChance: .16, warChance: .25, allianceChance: .08, wearinessPerStep: .75 },
      targets: { minimumPopulation: 20, minimumVillages: 3, minimumKingdoms: 2, maximumFamineRatio: .45, maximumActiveWars: 4 }
    }
  };

  globalThis.RealmConfig = deepFreeze(config);
})();
