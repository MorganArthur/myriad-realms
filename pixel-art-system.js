"use strict";

// 原创的低分辨率绘制器。只画地形、居民、动物、建筑与自然现象。
(() => {
  const config = globalThis.RealmConfig;
  const racePalettes = {
    human: ["#e8c39e", "#385f7b", "#68432e"], elf: ["#e4d5ad", "#478259", "#d4c168"],
    dwarf: ["#d9a978", "#7b5541", "#b66b39"], orc: ["#83a65c", "#654338", "#303c28"]
  };
  const animalColors = { rabbit: "#ddd5c4", deer: "#b4814d", boar: "#77513a", fox: "#d87535", wolf: "#7d8585", bear: "#665044" };
  const buildingColors = { hall: "#d2bd7b", house: "#bc8557", farm: "#c6a64b", lumber: "#735034", quarry: "#85837c", road: "#8d7a60", wall: "#a4a09a", market: "#d58b51", dock: "#88654b", warehouse: "#976843", temple: "#d8d0b1" };
  const px = (ctx, color, x, y, width, height) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(width)), Math.max(1, Math.round(height))); };

  function terrainColor(tile, season = "spring", mapMode = "natural") {
    if (mapMode === "fertility") { const value = Math.max(0, Math.min(1, Number(tile.fertility) || 0)); return `hsl(${25 + value * 95} 46% ${25 + value * 25}%)`; }
    if (tile.fire > 0 || tile.terrain === "scorched") return config.terrainColors.scorched;
    let color = config.terrainColors[tile.terrain] || config.terrainColors.grass;
    if (season === "winter" && !["water", "deepWater", "sand"].includes(tile.terrain)) color = tile.terrain === "forest" ? "#416957" : "#9eb8ac";
    if (tile.dryness > .6 && !["water", "deepWater"].includes(tile.terrain)) color = "#9a8450";
    return color;
  }
  function drawTile(ctx, tile, screenX, screenY, size, options = {}) {
    const mode = options.mapMode || "natural"; px(ctx, terrainColor(tile, options.season, mode), screenX, screenY, size + .5, size + .5);
    if (mode === "political" && options.kingdomColor && !["water", "deepWater"].includes(tile.terrain)) { ctx.globalAlpha = .33; px(ctx, options.kingdomColor, screenX, screenY, size + .5, size + .5); ctx.globalAlpha = 1; }
    if (mode === "population" && options.population > 0) { ctx.globalAlpha = Math.min(.72, .12 + options.population * .1); px(ctx, "#ffe071", screenX, screenY, size + .5, size + .5); ctx.globalAlpha = 1; }
    if ((size >= 10 || options.details) && mode === "natural") {
      if (tile.terrain === "forest") { px(ctx, "#173f2b", screenX + size * .45, screenY + size * .18, Math.max(1, size * .16), size * .58); px(ctx, "#4a8c51", screenX + size * .2, screenY + size * .13, size * .58, size * .42); }
      if (tile.terrain === "mountain") { ctx.fillStyle = "#b9b8b3"; ctx.beginPath(); ctx.moveTo(screenX + size * .12, screenY + size * .85); ctx.lineTo(screenX + size * .52, screenY + size * .1); ctx.lineTo(screenX + size * .9, screenY + size * .85); ctx.fill(); }
      if ((tile.terrain === "water" || tile.terrain === "deepWater") && (tile.x + tile.y) % 4 === 0) px(ctx, "#70b4c5", screenX + size * .2, screenY + size * .5, size * .48, 1);
    }
    if (tile.fire > 0 && size >= 5) { px(ctx, "#f7c94c", screenX + size * .35, screenY + size * .26, size * .3, size * .56); px(ctx, "#df573b", screenX + size * .2, screenY + size * .45, size * .58, size * .4); }
  }
  function drawPerson(ctx, person, x, y, size = 8) {
    const palette = racePalettes[person.race] || racePalettes.human, scale = Math.max(.75, size / 8);
    px(ctx, "#08121699", x - 2 * scale, y + 3 * scale, 5 * scale, 1.5 * scale); px(ctx, palette[1], x - 2 * scale, y - 1 * scale, 4 * scale, 5 * scale); px(ctx, palette[0], x - 1.5 * scale, y - 4 * scale, 3 * scale, 3 * scale); px(ctx, palette[2], x - 1.7 * scale, y - 4.2 * scale, 3.4 * scale, 1 * scale);
    if (person.health < 35) px(ctx, "#d9594d", x - 2 * scale, y - 6 * scale, 4 * scale * Math.max(0, person.health / 100), .7 * scale);
  }
  function drawAnimal(ctx, animal, x, y, size = 7) {
    const color = animalColors[animal.species] || "#b4a98f", scale = Math.max(.65, size / 8); px(ctx, "#07121788", x - 2.5 * scale, y + 2 * scale, 5 * scale, 1.2 * scale); px(ctx, color, x - 2.5 * scale, y - 1 * scale, 5 * scale, 3 * scale); px(ctx, color, x + 1.5 * scale, y - 2.2 * scale, 2.2 * scale, 2.5 * scale); px(ctx, "#151a19", x + 2.6 * scale, y - 1.5 * scale, .6 * scale, .6 * scale);
  }
  function drawStructure(ctx, structure, x, y, size = 8, color = null) {
    const type = structure.type, base = buildingColors[type] || "#b58b5a", scale = Math.max(.75, size / 8);
    if (type === "road") { px(ctx, base, x - 4 * scale, y - 1 * scale, 8 * scale, 2 * scale); return; }
    if (type === "farm") { px(ctx, "#8f7335", x - 4 * scale, y - 3 * scale, 8 * scale, 6 * scale); for (let i = -3; i < 4; i += 2) px(ctx, base, x + i * scale, y - 2.5 * scale, .7 * scale, 5 * scale); return; }
    if (type === "wall") { px(ctx, base, x - 4 * scale, y - 2 * scale, 8 * scale, 4 * scale); px(ctx, "#c6c1b6", x - 3 * scale, y - 3 * scale, 2 * scale, 2 * scale); px(ctx, "#c6c1b6", x + 1 * scale, y - 3 * scale, 2 * scale, 2 * scale); return; }
    if (type === "dock") { px(ctx, base, x - 4 * scale, y, 8 * scale, 2 * scale); px(ctx, "#50402f", x - 3 * scale, y, 1 * scale, 4 * scale); px(ctx, "#50402f", x + 2 * scale, y, 1 * scale, 4 * scale); return; }
    px(ctx, "#15202799", x - 4 * scale, y + 3 * scale, 8 * scale, 1.5 * scale); px(ctx, base, x - 3 * scale, y - 2.5 * scale, 6 * scale, 6 * scale); ctx.fillStyle = color || "#704836"; ctx.beginPath(); ctx.moveTo(x - 4 * scale, y - 2 * scale); ctx.lineTo(x, y - 6 * scale); ctx.lineTo(x + 4 * scale, y - 2 * scale); ctx.fill(); px(ctx, "#293b42", x - .8 * scale, y + .3 * scale, 1.6 * scale, 3.2 * scale);
  }
  function drawDisaster(ctx, disaster, worldToScreen, tick = 0) {
    const point = worldToScreen(disaster.x, disaster.y), radius = Math.max(10, disaster.radius * point.scale), pulse = .82 + Math.sin(tick * .12 + disaster.id) * .16; ctx.save(); ctx.globalAlpha = .5;
    const colors = { earthquake: "#d6b070", flood: "#56b6d7", tornado: "#d5d8d1", volcano: "#ef633f", plague: "#8ccf72", drought: "#e6c05d" }; ctx.strokeStyle = colors[disaster.type] || "#fff"; ctx.lineWidth = Math.max(2, point.scale * .4); ctx.beginPath(); ctx.arc(point.x, point.y, radius * pulse, 0, Math.PI * 2); ctx.stroke();
    if (disaster.type === "tornado") { for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(point.x, point.y - i * 4, radius * (.45 - i * .08), radius * .12, tick * .02, 0, Math.PI * 2); ctx.stroke(); } }
    if (disaster.type === "volcano") { ctx.fillStyle = "#642c27"; ctx.beginPath(); ctx.moveTo(point.x - radius * .4, point.y + radius * .3); ctx.lineTo(point.x, point.y - radius * .45); ctx.lineTo(point.x + radius * .4, point.y + radius * .3); ctx.fill(); }
    ctx.restore();
  }
  function drawWeather(ctx, weather, width, height, tick) {
    if (weather !== "rain" && weather !== "storm") return; ctx.save(); ctx.strokeStyle = weather === "storm" ? "#abc7d6aa" : "#9cc5d080"; ctx.lineWidth = 1;
    for (let i = 0; i < (weather === "storm" ? 90 : 45); i++) { const x = (i * 83 + tick * 2) % width, y = (i * 47 + tick * 5) % height; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 8); ctx.stroke(); } ctx.restore();
  }

  globalThis.PixelArt = Object.freeze({ terrainColor, drawTile, drawPerson, drawAnimal, drawStructure, drawDisaster, drawWeather, racePalettes, animalColors, buildingColors });
})();
