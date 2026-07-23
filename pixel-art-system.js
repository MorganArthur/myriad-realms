"use strict";

// 原创像素美术层：统一色板、确定性地形细节与低频环境动画。

(() => {
  const terrainPalettes = Object.freeze({
    deep: Object.freeze(["#102f49", "#143650", "#173c55", "#0d2a43"]),
    water: Object.freeze(["#1d5871", "#24637a", "#2a6b80", "#195168"]),
    sand: Object.freeze(["#c4a65f", "#d0b36c", "#b99b56", "#d7bd78"]),
    grass: Object.freeze(["#5f8d3d", "#699748", "#568439", "#74a052"]),
    forest: Object.freeze(["#28532d", "#2f5d32", "#234a28", "#37683a"]),
    mountain: Object.freeze(["#676b60", "#74786a", "#5d6259", "#828575"]),
    ash: Object.freeze(["#34332f", "#403d37", "#2d2c29", "#49443d"]),
    fire: Object.freeze(["#ef5b38", "#ff8a3d", "#ffc857", "#d83d2e"])
  });
  const accents = Object.freeze({ foam: "#bce7e2", grassLight: "#9bbb5d", forestDark: "#173b22", forestLight: "#4f7b3e", sandLight: "#ead28a", rockLight: "#aeb09e", rockDark: "#464b45", snow: "#dce8df", ember: "#ff9250" });
  const buildingSilhouettes = Object.freeze({ hall: "civic-core", house: "gable-home", farm: "furrow-field", lumber: "timber-yard", quarry: "cut-stone", barracks: "fortified-roof", road: "crossroad", wall: "battlement", market: "striped-canopy", dock: "pier-sail", warehouse: "double-door", temple: "high-spire" });
  const reducedMotionQuery = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  let lastAnimationFrame = -Infinity;

  function visualHash(x, y, salt = 0) {
    let value = Math.imul((x | 0) + 17, 374761393) ^ Math.imul((y | 0) + 31, 668265263) ^ Math.imul((salt | 0) + 7, 1442695041);
    value = Math.imul(value ^ value >>> 13, 1274126177); return (value ^ value >>> 16) >>> 0;
  }

  function prefersReducedMotion() { return Boolean(reducedMotionQuery?.matches); }

  function animationFrameDue(now, interval = 125) {
    if (prefersReducedMotion() || !Number.isFinite(now) || now - lastAnimationFrame < interval) return false;
    lastAnimationFrame = now; return true;
  }

  function terrainColor(type, hash, frame = 0) {
    const palette = terrainPalettes[type] || terrainPalettes.grass; return palette[(hash + frame) % palette.length];
  }

  function drawTerrainTile(context, options) {
    const { tile, x, y, sx, sy, size, time = 0, coastTop = false, coastLeft = false } = options;
    if (!tile) return;
    const hash = visualHash(x, y), frame = prefersReducedMotion() ? 0 : Math.floor(time * 4), pixel = Math.max(1, Math.floor(size * .11));
    context.save(); context.fillStyle = terrainColor(tile.fire ? "fire" : tile.type, hash, tile.fire ? frame : 0); context.fillRect(sx, sy, Math.ceil(size + .5), Math.ceil(size + .5));
    if (size > 4 && ["deep", "water"].includes(tile.type) && hash % 3 === 0) {
      const wave = ((frame + hash % 9) % 9) / 9, width = size * (tile.type === "deep" ? .48 : .62);
      context.globalAlpha = tile.type === "deep" ? .2 : .34; context.fillStyle = tile.type === "deep" ? "#6da5bb" : "#a8dbd8";
      context.fillRect(sx + size * (.08 + wave * .22), sy + size * (.25 + (hash % 3) * .18), width, pixel);
      if (size > 9 && hash % 4 === 0) context.fillRect(sx + size * (.46 - wave * .16), sy + size * .72, size * .34, pixel);
    } else if (size > 5 && tile.type === "sand" && hash % 2 === 0) {
      context.globalAlpha = .42; context.fillStyle = accents.sandLight; const offset = (hash % 5) * size * .08;
      context.fillRect(sx + size * .16 + offset, sy + size * .38, size * .42, pixel); context.fillRect(sx + size * .52 - offset * .3, sy + size * .7, size * .2, pixel);
    } else if (size > 5 && tile.type === "grass" && hash % 3 === 0) {
      context.globalAlpha = .48; context.fillStyle = accents.grassLight; const growth = Math.max(.15, tile.biomass || 0);
      context.fillRect(sx + size * (.18 + (hash % 4) * .14), sy + size * (.72 - growth * .18), pixel, size * (.12 + growth * .22));
      if (hash % 3 === 0) context.fillRect(sx + size * .7, sy + size * .58, pixel, size * .16);
    } else if (size > 6 && tile.type === "forest" && hash % 2 === 0) {
      const sway = prefersReducedMotion() ? 0 : Math.sin(time * 1.8 + hash % 13) * size * .035, biomass = Math.max(.25, tile.biomass || 0);
      context.globalAlpha = .9; context.fillStyle = "#493622"; context.fillRect(sx + size * .47, sy + size * .54, Math.max(1, size * .12), size * .34);
      context.fillStyle = accents.forestDark; context.fillRect(sx + size * .2 + sway, sy + size * (.17 - biomass * .05), size * .64, size * .48);
      context.fillStyle = accents.forestLight; context.globalAlpha = .62; context.fillRect(sx + size * .28 + sway, sy + size * .18, size * .22, size * .16); context.fillRect(sx + size * .54 + sway, sy + size * .34, size * .2, size * .14);
    } else if (size > 5 && tile.type === "mountain") {
      context.globalAlpha = .72; context.fillStyle = accents.rockDark; context.beginPath(); context.moveTo(sx + size * .08, sy + size * .88); context.lineTo(sx + size * .52, sy + size * .12); context.lineTo(sx + size * .92, sy + size * .88); context.closePath(); context.fill();
      context.fillStyle = tile.temperature < 1 ? accents.snow : accents.rockLight; context.beginPath(); context.moveTo(sx + size * .52, sy + size * .12); context.lineTo(sx + size * .66, sy + size * .48); context.lineTo(sx + size * .5, sy + size * .4); context.lineTo(sx + size * .39, sy + size * .53); context.closePath(); context.fill();
    } else if (size > 5 && tile.type === "ash") {
      context.globalAlpha = .48; context.fillStyle = hash % 5 === 0 ? accents.ember : "#70665c"; context.fillRect(sx + size * (.2 + hash % 5 * .12), sy + size * (.25 + hash % 3 * .2), pixel, pixel);
    }
    if (tile.fire && size > 5) {
      const flicker = (frame + hash % 3) % 3; context.globalAlpha = .92; context.fillStyle = terrainPalettes.fire[(flicker + 1) % 4];
      context.beginPath(); context.moveTo(sx + size * .2, sy + size * .82); context.lineTo(sx + size * (.35 + flicker * .05), sy + size * .2); context.lineTo(sx + size * .54, sy + size * .82); context.closePath(); context.fill();
      context.fillStyle = "#ffd76a"; context.beginPath(); context.moveTo(sx + size * .46, sy + size * .82); context.lineTo(sx + size * .65, sy + size * (.32 + flicker * .08)); context.lineTo(sx + size * .78, sy + size * .82); context.closePath(); context.fill();
    }
    if ((coastTop || coastLeft) && size > 3) {
      const foamPulse = prefersReducedMotion() ? .52 : .42 + (Math.sin(time * 2.4 + hash % 7) + 1) * .1; context.globalAlpha = foamPulse; context.fillStyle = accents.foam; const thickness = Math.max(1, size * .11);
      if (coastTop) context.fillRect(sx, sy, size, thickness); if (coastLeft) context.fillRect(sx, sy, thickness, size);
    }
    context.restore();
  }

  function movingPoint(index, width, height, time, speedX, speedY, salt) {
    const hash = visualHash(index, salt, 11), startX = hash % Math.max(1, Math.floor(width)), startY = (hash >>> 9) % Math.max(1, Math.floor(height));
    return { x: (startX + time * speedX + width * 2) % width, y: (startY + time * speedY + height * 2) % height };
  }

  function drawWeatherOverlay(context, metrics, climate, time = 0) {
    if (!climate || prefersReducedMotion()) return;
    const weather = climate.weather, season = climate.season, width = metrics.width, height = metrics.height;
    context.save();
    if (["rain", "storm"].includes(weather)) {
      const count = weather === "storm" ? 96 : 58; context.strokeStyle = weather === "storm" ? "#b8d9e6" : "#98c9d7"; context.lineWidth = weather === "storm" ? 1.4 : 1; context.globalAlpha = weather === "storm" ? .42 : .3;
      context.beginPath(); for (let index = 0; index < count; index++) { const point = movingPoint(index, width, height, time, weather === "storm" ? 42 : 24, weather === "storm" ? 150 : 105, 23); context.moveTo(point.x, point.y); context.lineTo(point.x - (weather === "storm" ? 8 : 5), point.y + (weather === "storm" ? 15 : 10)); } context.stroke();
      if (weather === "storm") { context.globalAlpha = .1 + (Math.sin(time * 1.7) + 1) * .025; context.fillStyle = "#07121f"; context.fillRect(0, 0, width, height); }
    }
    if (weather === "heatwave") {
      context.fillStyle = "#f4b65a"; context.globalAlpha = .1; for (let row = 0; row < 7; row++) { const offset = Math.sin(time * 2 + row) * 10; context.fillRect(offset, height * (.16 + row * .12), width, 2); }
    }
    if (weather === "frost" || season === "winter") {
      context.fillStyle = "#edf7ee"; context.globalAlpha = weather === "frost" ? .56 : .3; const count = weather === "frost" ? 48 : 24;
      for (let index = 0; index < count; index++) { const point = movingPoint(index, width, height, time, 4, 18, 41); const flake = index % 5 === 0 ? 2 : 1; context.fillRect(point.x, point.y, flake, flake); }
    } else if (season === "autumn") {
      const leafColors = ["#d87a38", "#e3a94c", "#b85d32"]; context.globalAlpha = .48;
      for (let index = 0; index < 22; index++) { const point = movingPoint(index, width, height, time, 11, 17, 57); context.fillStyle = leafColors[index % leafColors.length]; context.fillRect(point.x, point.y, index % 4 === 0 ? 2 : 1, 2); }
    }
    context.restore();
  }

  function structureVisualState(structure, villageLevel = 1, currentYear = 1) {
    const integrity = Math.max(0, Math.min(1, Number(structure?.hp) / Math.max(1, Number(structure?.maxHp) || 1))), level = Math.max(1, Math.min(3, Math.floor(Number(villageLevel) || 1)));
    return { integrity, level, construction: currentYear > 1 && currentYear - (Number(structure?.builtYear) || currentYear) < .8, damage: integrity < .35 ? "broken" : integrity < .72 ? "worn" : "intact" };
  }

  function drawDamageAndConstruction(context, sx, sy, size, state, time, hash) {
    if (state.damage !== "intact") {
      context.strokeStyle = "#21191a"; context.lineWidth = Math.max(1, size * .1); context.globalAlpha = state.damage === "broken" ? .82 : .58; context.beginPath(); context.moveTo(sx - size * .18, sy - size * .42); context.lineTo(sx + size * .04, sy - size * .08); context.lineTo(sx - size * .12, sy + size * .28); context.stroke();
      if (state.damage === "broken") { context.fillStyle = "#1a1718"; context.globalAlpha = .68; context.fillRect(sx + size * .18, sy - size * .52, size * .34, size * .28); const drift = prefersReducedMotion() ? 0 : Math.sin(time * 1.7 + hash % 7) * size * .12; context.fillStyle = "#9a9184"; context.globalAlpha = .28; context.beginPath(); context.arc(sx + drift, sy - size * .82, Math.max(1, size * .12), 0, Math.PI * 2); context.fill(); }
    }
    if (state.construction) {
      const pulse = prefersReducedMotion() ? .72 : .58 + (Math.sin(time * 4 + hash % 5) + 1) * .1; context.globalAlpha = pulse; context.strokeStyle = "#d9b36a"; context.lineWidth = Math.max(1, size * .09);
      context.strokeRect(sx - size * .68, sy - size * .7, size * 1.36, size * 1.35); context.beginPath(); context.moveTo(sx - size * .68, sy + size * .3); context.lineTo(sx + size * .68, sy - size * .35); context.moveTo(sx - size * .68, sy - size * .35); context.lineTo(sx + size * .68, sy + size * .3); context.stroke();
    }
  }

  function drawStructure(context, options) {
    const { structure, definition, kingdomColor = "#d3b56d", villageLevel = 1, currentYear = 1, sx, sy, size: baseSize, time = 0 } = options;
    if (!structure || !definition || structure.hp <= 0) return;
    const state = structureVisualState(structure, villageLevel, currentYear), hash = visualHash(structure.id || structure.x, structure.y || structure.type?.length || 0), size = Math.max(2, baseSize * (.84 + state.level * .08));
    context.save(); context.globalAlpha = .52 + state.integrity * .48; context.fillStyle = definition.color; context.strokeStyle = "#241d19"; context.lineWidth = Math.max(1, size * .1);
    if (structure.type === "road") {
      context.fillStyle = state.damage === "broken" ? "#6f6049" : definition.color; context.fillRect(sx - size * .7, sy - size * .15, size * 1.4, size * .3); context.fillRect(sx - size * .15, sy - size * .7, size * .3, size * 1.4);
      if (state.level >= 2) { context.fillStyle = "#d1bc8b"; context.globalAlpha = .45; context.fillRect(sx - size * .6, sy - size * .03, size * 1.2, Math.max(1, size * .06)); }
    } else if (structure.type === "wall") {
      context.fillRect(sx - size * .7, sy - size * .34, size * 1.4, size * .68); context.strokeRect(sx - size * .7, sy - size * .34, size * 1.4, size * .68); context.fillStyle = "#c4c2b2";
      const merlons = state.level + 2; for (let index = 0; index < merlons; index++) context.fillRect(sx - size * .62 + index * size * 1.24 / Math.max(1, merlons - 1) - size * .1, sy - size * .52, size * .2, size * .22);
    } else if (structure.type === "farm") {
      context.fillRect(sx - size * .72, sy - size * .55, size * 1.44, size * 1.1); context.strokeStyle = "#76612b"; for (let row = -2; row <= 2; row++) { context.beginPath(); context.moveTo(sx - size * .62, sy + row * size * .2); context.lineTo(sx + size * .62, sy + row * size * .2); context.stroke(); }
      if (state.level >= 3) { context.fillStyle = "#3f3020"; context.fillRect(sx - size * .05, sy - size * .65, size * .1, size * .5); context.fillRect(sx - size * .27, sy - size * .48, size * .54, size * .08); }
    } else if (structure.type === "dock") {
      context.fillStyle = "#735239"; context.fillRect(sx - size * .65, sy - size * .18, size * 1.3, size * .36); context.fillRect(sx - size * .12, sy - size * .76, size * .24, size * 1.52); context.fillStyle = state.level >= 2 ? kingdomColor : "#ddd3ad"; context.beginPath(); context.moveTo(sx + size * .08, sy - size * .7); context.lineTo(sx + size * .6, sy - size * .25); context.lineTo(sx + size * .08, sy - size * .25); context.closePath(); context.fill();
    } else if (structure.type === "market") {
      context.fillStyle = "#68452f"; context.fillRect(sx - size * .62, sy - size * .08, size * 1.24, size * .64); context.fillStyle = kingdomColor; context.beginPath(); context.moveTo(sx - size * .76, sy - size * .08); context.lineTo(sx, sy - size * .72); context.lineTo(sx + size * .76, sy - size * .08); context.closePath(); context.fill(); context.fillStyle = "#f0d68b"; context.fillRect(sx - size * .18, sy - size * .42, size * .16, size * .36);
    } else if (structure.type === "warehouse") {
      context.fillRect(sx - size * .68, sy - size * .54, size * 1.36, size * 1.08); context.strokeRect(sx - size * .68, sy - size * .54, size * 1.36, size * 1.08); context.strokeStyle = "#d1b477"; context.beginPath(); context.moveTo(sx - size * .58, sy - size * .08); context.lineTo(sx + size * .58, sy - size * .08); context.moveTo(sx, sy - size * .44); context.lineTo(sx, sy + size * .44); context.stroke();
      if (state.level >= 3) { context.fillStyle = "#4a3524"; context.fillRect(sx - size * .52, sy - size * .48, size * .16, size * .16); context.fillRect(sx + size * .36, sy - size * .48, size * .16, size * .16); }
    } else if (structure.type === "temple") {
      context.fillRect(sx - size * .48, sy - size * .12, size * .96, size * .7); context.beginPath(); context.moveTo(sx - size * .62, sy - size * .12); context.lineTo(sx, sy - size * .82); context.lineTo(sx + size * .62, sy - size * .12); context.closePath(); context.fill(); context.fillStyle = "#f0df98"; context.fillRect(sx - size * .07, sy - size * (.78 + state.level * .08), size * .14, size * (.32 + state.level * .08));
    } else if (structure.type === "quarry") {
      context.fillStyle = "#696e68"; for (let rock = 0; rock < state.level + 2; rock++) { const ox = (rock % 3 - 1) * size * .34, oy = (Math.floor(rock / 3) - .2) * size * .3; context.save(); context.translate(sx + ox, sy + oy); context.rotate(Math.PI / 4); context.fillRect(-size * .22, -size * .22, size * .44, size * .44); context.strokeRect(-size * .22, -size * .22, size * .44, size * .44); context.restore(); }
    } else if (structure.type === "lumber") {
      context.fillStyle = "#765238"; for (let log = -1; log <= state.level; log++) context.fillRect(sx - size * .68, sy + log * size * .2 - size * .2, size * 1.36, size * .14); context.fillStyle = "#d2a862"; context.fillRect(sx + size * .35, sy - size * .62, size * .11, size * .4);
    } else {
      const fortified = structure.type === "barracks", width = fortified ? .72 : .58; context.fillRect(sx - size * width, sy - size * .36, size * width * 2, size * .92); context.strokeRect(sx - size * width, sy - size * .36, size * width * 2, size * .92);
      context.fillStyle = fortified ? "#4e2723" : kingdomColor; context.beginPath(); context.moveTo(sx - size * (width + .12), sy - size * .36); context.lineTo(sx, sy - size * (.78 + state.level * .08)); context.lineTo(sx + size * (width + .12), sy - size * .36); context.closePath(); context.fill();
      context.fillStyle = fortified ? "#d6c5a3" : "#f0ce75"; const windows = state.level; for (let window = 0; window < windows; window++) context.fillRect(sx + (window - (windows - 1) / 2) * size * .3 - size * .06, sy - size * .04, size * .12, size * .18);
      if (fortified) { context.fillStyle = kingdomColor; context.fillRect(sx + size * .5, sy - size * .88, size * .1, size * .55); }
    }
    drawDamageAndConstruction(context, sx, sy, size, state, time, hash); context.restore();
  }

  function drawVillageCore(context, options) {
    const { village, kingdomColor = "#d3b56d", sx, sy, size: tileSize, time = 0 } = options, level = Math.max(1, Math.min(3, Number(village?.level) || 1)), maxHp = Math.max(1, Number(options.maxHp) || 1), integrity = Math.max(0, Math.min(1, Number(village?.hp) / maxHp)), size = tileSize * (.86 + level * .16), hash = visualHash(village?.id || village?.x, village?.y || 0);
    context.save(); context.fillStyle = "#090d0ba8"; context.beginPath(); context.ellipse(sx, sy + size * .55, size * 1.05, size * .38, 0, 0, Math.PI * 2); context.fill();
    context.globalAlpha = .62 + integrity * .38; context.fillStyle = level === 1 ? "#62442d" : level === 2 ? "#735139" : "#805d42"; context.fillRect(sx - size * .68, sy - size * .48, size * 1.36, size * .98); context.strokeStyle = "#f0d79870"; context.lineWidth = Math.max(1, tileSize * .11); context.strokeRect(sx - size * .68, sy - size * .48, size * 1.36, size * .98);
    context.fillStyle = kingdomColor; context.beginPath(); context.moveTo(sx - size * .82, sy - size * .46); context.lineTo(sx, sy - size * (.92 + level * .08)); context.lineTo(sx + size * .82, sy - size * .46); context.closePath(); context.fill();
    context.fillStyle = "#f3d786"; for (let window = 0; window < level; window++) context.fillRect(sx + (window - (level - 1) / 2) * size * .34 - size * .07, sy - size * .15, size * .14, size * .2);
    if (level >= 2) { context.fillStyle = "#5b402d"; context.fillRect(sx - size * .18, sy - size * .9, size * .36, size * .44); context.fillStyle = kingdomColor; context.beginPath(); context.moveTo(sx - size * .28, sy - size * .88); context.lineTo(sx, sy - size * 1.18); context.lineTo(sx + size * .28, sy - size * .88); context.closePath(); context.fill(); }
    if (level >= 3) { context.fillStyle = kingdomColor; context.fillRect(sx + size * .1, sy - size * 1.28, size * .08, size * .5); context.beginPath(); context.moveTo(sx + size * .18, sy - size * 1.26); context.lineTo(sx + size * .58, sy - size * 1.08); context.lineTo(sx + size * .18, sy - size * .92); context.closePath(); context.fill(); }
    drawDamageAndConstruction(context, sx, sy, size, { integrity, level, construction: false, damage: integrity < .35 ? "broken" : integrity < .72 ? "worn" : "intact" }, time, hash); context.restore();
  }

  globalThis.RealmPixelArt = Object.freeze({ terrainPalettes, accents, buildingSilhouettes, visualHash, prefersReducedMotion, animationFrameDue, terrainColor, drawTerrainTile, drawWeatherOverlay, structureVisualState, drawStructure, drawVillageCore });
})();
