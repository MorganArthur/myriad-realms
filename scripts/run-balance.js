"use strict";

const { createWorldRuntime } = require("../tests/headless-world.js");

const quick = process.argv.includes("--quick");
const sampleCount = Math.max(2, Number(process.env.BALANCE_SAMPLES) || (quick ? 4 : 12));
const seeds = Array.from({ length: sampleCount }, (_, index) => `balance-${String(index + 1).padStart(2, "0")}`);
const targetYear = Math.max(10, Number(process.env.BALANCE_YEAR) || 50);
const rows = [];

for (const seed of seeds) {
  const { debug, config } = createWorldRuntime();
  debug.generate(seed);
  debug.setRandomDisasters(true);
  const steps = Math.ceil((targetYear - 1) / config.balance.simulation.yearsPerStep);
  const snapshot = debug.step(steps);
  const largestRace = Math.max(...Object.values(snapshot.populationByRace));
  const completeFoodWeb = Object.values(snapshot.animals).every(count => count > 0);
  rows.push({
    seed, population: snapshot.population, villages: snapshot.villages, kingdoms: snapshot.kingdoms,
    famineRealms: snapshot.famineRealms, wars: snapshot.wars, warsStarted: snapshot.history.warsStarted,
    animals: Object.values(snapshot.animals).reduce((sum, value) => sum + value, 0), completeFoodWeb,
    dominantRaceShare: snapshot.population ? largestRace / snapshot.population : 1
  });
  console.log(`完成 ${rows.length}/${seeds.length}: ${seed} · 人口 ${snapshot.population} · 累计战争 ${snapshot.history.warsStarted}`);
}

const average = key => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
const targets = createWorldRuntime().config.balance.targets;
const extinct = rows.filter(row => row.population === 0).length / rows.length;
const famineRealmRate = rows.reduce((sum, row) => sum + row.famineRealms / Math.max(1, row.kingdoms), 0) / rows.length;
const populationOutlierRate = rows.filter(row => row.population < targets.year50PopulationMin || row.population > targets.year50PopulationMax).length / rows.length;
const fourKingdomSurvivalRate = rows.filter(row => row.kingdoms >= 4).length / rows.length;
const completeFoodWebRate = rows.filter(row => row.completeFoodWeb).length / rows.length;
const warWorldRate = rows.filter(row => row.warsStarted > 0).length / rows.length;
const summary = {
  samples: rows.length,
  population: { min: Math.min(...rows.map(row => row.population)), average: average("population"), max: Math.max(...rows.map(row => row.population)) },
  villagesAverage: average("villages"), kingdomsAverage: average("kingdoms"), animalsAverage: average("animals"), warsAverage: average("wars"),
  extinctionRate: extinct, populationOutlierRate, fourKingdomSurvivalRate, completeFoodWebRate, warWorldRate,
  dominantRaceShareAverage: average("dominantRaceShare"), famineRealmRate
};

console.table(rows.map(row => ({ ...row, dominantRaceShare: row.dominantRaceShare.toFixed(2) })));
console.log(JSON.stringify(summary, null, 2));

const failures = [];
if (summary.extinctionRate > targets.extinctionRateMax) failures.push(`灭绝率 ${summary.extinctionRate.toFixed(2)} > ${targets.extinctionRateMax}`);
if (summary.populationOutlierRate > targets.populationOutlierRateMax) failures.push(`人口异常样本率 ${summary.populationOutlierRate.toFixed(2)} > ${targets.populationOutlierRateMax}`);
if (summary.fourKingdomSurvivalRate < targets.fourKingdomSurvivalRateMin) failures.push(`四文明存续率 ${summary.fourKingdomSurvivalRate.toFixed(2)} < ${targets.fourKingdomSurvivalRateMin}`);
if (summary.completeFoodWebRate < targets.completeFoodWebRateMin) failures.push(`完整食物网率 ${summary.completeFoodWebRate.toFixed(2)} < ${targets.completeFoodWebRateMin}`);
if (summary.dominantRaceShareAverage > targets.dominantRaceShareMax) failures.push(`单一种族占比 ${summary.dominantRaceShareAverage.toFixed(2)} > ${targets.dominantRaceShareMax}`);
if (summary.famineRealmRate > targets.famineRealmRateMax) failures.push(`饥荒国家占比 ${summary.famineRealmRate.toFixed(2)} > ${targets.famineRealmRateMax}`);
if (summary.warWorldRate < targets.warWorldRateMin) failures.push(`发生战争的世界占比 ${summary.warWorldRate.toFixed(2)} < ${targets.warWorldRateMin}`);
if (summary.warWorldRate > targets.warWorldRateMax) failures.push(`发生战争的世界占比 ${summary.warWorldRate.toFixed(2)} > ${targets.warWorldRateMax}`);
if (failures.length) { console.error(`平衡门禁失败：\n- ${failures.join("\n- ")}`); process.exitCode = 1; }
else console.log("平衡门禁通过");
