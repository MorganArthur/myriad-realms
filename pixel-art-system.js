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

  globalThis.RealmPixelArt = Object.freeze({ terrainPalettes, accents, visualHash, prefersReducedMotion, animationFrameDue, terrainColor, drawTerrainTile, drawWeatherOverlay });
})();
