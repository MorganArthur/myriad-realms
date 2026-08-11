"use strict";

const { createWorldRuntime } = require("../tests/headless-world.js");
const quick = process.argv.includes("--quick"), samples = Math.max(2, Number(process.env.BALANCE_SAMPLES) || (quick ? 5 : 10)), targetYear = Math.max(20, Number(process.env.BALANCE_YEAR) || 50), rows = [], failures = [];

for (let index = 0; index < samples; index++) {
  const { debug, config } = createWorldRuntime(), seed = `simple-balance-${String(index + 1).padStart(2, "0")}`; debug.generate(seed); debug.setRandomDisasters(true); const steps = Math.ceil((targetYear - 1) / config.balance.simulation.yearsPerStep), snapshot = debug.step(steps), totalAnimals = Object.values(snapshot.animals).reduce((sum, value) => sum + value, 0);
  const row = { seed, population: snapshot.population, villages: snapshot.villages, kingdoms: snapshot.kingdoms, animals: totalAnimals, famine: snapshot.famineRatio, conflicts: snapshot.wars, disasters: snapshot.history.disastersTriggered }; rows.push(row);
  if (row.population < config.balance.targets.minimumPopulation) failures.push(`${seed} 人口过低：${row.population}`);
  if (row.villages < config.balance.targets.minimumVillages) failures.push(`${seed} 聚落过少：${row.villages}`);
  if (row.kingdoms < config.balance.targets.minimumKingdoms) failures.push(`${seed} 王国过少：${row.kingdoms}`);
  if (row.famine > config.balance.targets.maximumFamineRatio) failures.push(`${seed} 饥饿比例过高：${row.famine.toFixed(2)}`);
  if (row.conflicts > config.balance.targets.maximumActiveWars) failures.push(`${seed} 同时冲突过多：${row.conflicts}`);
  if (totalAnimals < 25) failures.push(`${seed} 动物数量过低：${totalAnimals}`);
  console.log(`完成 ${index + 1}/${samples}: ${seed} · 人口 ${row.population} · 动物 ${row.animals} · 天灾 ${row.disasters}`);
}

console.table(rows); if (failures.length) { console.error(`平衡门禁失败：\n- ${failures.join("\n- ")}`); process.exitCode = 1; } else console.log("精简核心平衡门禁通过");
