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
  const raceSpritePalettes = Object.freeze({
    human: Object.freeze({ skin: "#e2b184", shadow: "#a86f54", hair: ["#4b3024", "#725039", "#c08a4e"] }),
    elf: Object.freeze({ skin: "#d9c99a", shadow: "#9b916b", hair: ["#d7dfb4", "#8fb889", "#b9a9d5"] }),
    dwarf: Object.freeze({ skin: "#d29a72", shadow: "#8f5c47", hair: ["#5c3828", "#a85e38", "#d0a064"] }),
    orc: Object.freeze({ skin: "#78984f", shadow: "#465f35", hair: ["#292a25", "#4a4031", "#613c32"] })
  });
  const reducedMotionQuery = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  let lastAnimationFrame = -Infinity;
  const characterMotion = new Map();
  let combatEffects = [];
  let characterFrameCounter = 0;

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
    context.globalAlpha = 1; context.fillStyle = terrainColor(tile.fire ? "fire" : tile.type, hash, tile.fire ? frame : 0); context.fillRect(sx, sy, Math.ceil(size + .5), Math.ceil(size + .5));
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
    context.globalAlpha = 1;
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

  function prepareCharacterFrame(people, time = 0) {
    const frames = new Map(), active = new Set(); characterFrameCounter++;
    for (const person of people || []) {
      if (!person || person.dead) continue; active.add(person.id); const previous = characterMotion.get(person.id), dx = previous ? person.x - previous.x : 0, dy = previous ? person.y - previous.y : 0, moved = Math.abs(dx) + Math.abs(dy) > .01;
      const direction = moved ? Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "east" : "west") : (dy >= 0 ? "south" : "north") : previous?.direction || "south", movingUntil = moved ? time + .48 : previous?.movingUntil || 0;
      const moving = time < movingUntil, profession = person.profession || "laborer", working = !moving && person.role !== "soldier" && !["child", "laborer"].includes(profession);
      const frame = { direction, moving, working, walkPhase: Math.floor((time * 8 + (person.id || 0) * .73) % 4), workPhase: Math.floor((time * 5 + (person.id || 0) * .41) % 4) };
      frames.set(person.id, frame); characterMotion.set(person.id, { x: person.x, y: person.y, direction, movingUntil });
    }
    if (characterFrameCounter % 90 === 0) for (const id of characterMotion.keys()) if (!active.has(id)) characterMotion.delete(id);
    return frames;
  }

  function drawProfessionTool(context, profession, sx, sy, unit, direction, phase, color) {
    const side = direction === "west" ? -1 : 1, swing = (phase - 1.5) * unit * .13; context.strokeStyle = color || "#dfc37d"; context.fillStyle = color || "#dfc37d"; context.lineWidth = Math.max(1, unit * .28);
    if (["farmer", "lumberjack", "miner", "builder"].includes(profession)) {
      context.beginPath(); context.moveTo(sx + side * unit * .62, sy - unit * .05); context.lineTo(sx + side * (unit * 1.25 + swing), sy + unit * .9); context.stroke();
      if (profession === "farmer") context.fillRect(sx + side * (unit * 1.18 + swing) - unit * .28, sy + unit * .78, unit * .56, Math.max(1, unit * .18));
      if (profession === "lumberjack") { context.fillStyle = "#c6d0c3"; context.fillRect(sx + side * (unit * 1.18 + swing) - unit * .28, sy + unit * .7, unit * .55, unit * .34); }
      if (profession === "miner") { context.beginPath(); context.moveTo(sx + side * (unit * .85 + swing), sy + unit * .62); context.lineTo(sx + side * (unit * 1.48 + swing), sy + unit * .62); context.stroke(); }
      if (profession === "builder") { context.fillStyle = "#b5b3ab"; context.fillRect(sx + side * (unit * 1.06 + swing) - unit * .25, sy + unit * .65, unit * .5, unit * .36); }
    } else if (profession === "merchant") {
      context.fillStyle = color || "#c69bd4"; context.fillRect(sx + side * unit * .66, sy + unit * .18, unit * .65, unit * .72); context.strokeRect(sx + side * unit * .66, sy + unit * .18, unit * .65, unit * .72);
    } else if (profession === "healer") {
      const pulse = .72 + phase * .08; context.fillStyle = color || "#79d5b4"; context.globalAlpha = pulse; context.fillRect(sx + side * unit * .86, sy + unit * .12, unit * .25, unit); context.fillRect(sx + side * unit * .48, sy + unit * .5, unit, unit * .25);
    }
  }

  function drawSoldierEquipment(context, person, sx, sy, unit, direction, time, motion, color) {
    const type = person?.unitType || "militia", side = direction === "west" ? -1 : 1, attack = Number(person?.attackCooldown) > 2 && !prefersReducedMotion() ? Math.sin(time * 13) * unit * .24 : 0;
    context.strokeStyle = color || "#d9c7a3"; context.fillStyle = color || "#d9c7a3"; context.lineWidth = Math.max(1, unit * .24);
    context.fillRect(sx - unit * .56, sy - unit * 1.27, unit * 1.12, unit * .22);
    if (type === "infantry") {
      context.fillStyle = color || "#6f91ad"; context.beginPath(); context.arc(sx - side * unit * .72, sy + unit * .08, unit * .52, 0, Math.PI * 2); context.fill(); context.strokeStyle = "#e7dcc4"; context.stroke();
      context.beginPath(); context.moveTo(sx + side * unit * .52, sy - unit * .45); context.lineTo(sx + side * (unit * 1.18 + attack), sy + unit * .62); context.stroke();
    } else if (type === "archer") {
      context.beginPath(); context.arc(sx + side * unit * .72, sy + unit * .02, unit * .64, -Math.PI * .48, Math.PI * .48); context.stroke(); context.beginPath(); context.moveTo(sx + side * unit * .7, sy - unit * .62); context.lineTo(sx + side * (unit * .7 + attack), sy + unit * .66); context.stroke();
    } else if (type === "siege") {
      context.fillStyle = "#6b472d"; context.fillRect(sx + side * unit * .64, sy + unit * .3, side * unit * 1.15, unit * .42); context.beginPath(); context.arc(sx + side * unit * 1.02, sy + unit * .82, unit * .28, 0, Math.PI * 2); context.arc(sx + side * unit * 1.58, sy + unit * .82, unit * .28, 0, Math.PI * 2); context.fill(); context.strokeStyle = color || "#b66d55"; context.beginPath(); context.moveTo(sx + side * unit * .86, sy + unit * .26); context.lineTo(sx + side * (unit * 1.64 + attack), sy - unit * .56); context.stroke();
    } else {
      context.beginPath(); context.moveTo(sx + side * unit * .52, sy - unit * .7); context.lineTo(sx + side * (unit * 1.35 + attack), sy + unit * .82); context.stroke(); context.fillStyle = "#d8d4c8"; context.beginPath(); context.moveTo(sx + side * unit * .38, sy - unit * .9); context.lineTo(sx + side * unit * .7, sy - unit * .63); context.lineTo(sx + side * unit * .48, sy - unit * .45); context.closePath(); context.fill();
    }
    if (type === "cavalry") { context.fillStyle = color || "#d39a55"; context.fillRect(sx - side * unit * .9, sy + unit * .24, unit * 1.25, unit * .25); }
  }

  function drawCharacter(context, options) {
    const { person, kingdomColor = "#c99a61", professionColor = "#d9c07c", sx, sy, size: tileSize, time = 0, motion = {} } = options, race = raceSpritePalettes[person?.race] || raceSpritePalettes.human, hash = visualHash(person?.id || 0, person?.race?.length || 0), childScale = person?.profession === "child" || Number(person?.age) < 14 ? .72 : 1;
    const unit = Math.max(1.15, Math.min(3.7, tileSize * .23)) * childScale, direction = motion.direction || "south", walk = motion.moving && !prefersReducedMotion() ? (motion.walkPhase % 2 ? 1 : -1) : 0, bob = prefersReducedMotion() ? 0 : motion.moving ? Math.abs(Math.sin(time * 9 + hash % 5)) * unit * .22 : Math.sin(time * 2 + hash % 7) * unit * .06, mounted = person?.role === "soldier" && person?.unitType === "cavalry", centerY = sy - bob - (mounted ? unit * .42 : 0), hair = race.hair[hash % race.hair.length], side = direction === "west" ? -1 : 1;
    context.save(); context.fillStyle = "#07100ca0"; context.globalAlpha = .5; context.beginPath(); context.ellipse(sx, sy + unit * 1.16, unit * .9, unit * .34, 0, 0, Math.PI * 2); context.fill(); context.globalAlpha = person?.blessed ? 1 : .96;
    if (mounted) { context.fillStyle = "#765038"; context.beginPath(); context.ellipse(sx, centerY + unit * .95, unit * 1.18, unit * .62, 0, 0, Math.PI * 2); context.fill(); context.fillRect(sx - unit * .82 + walk * unit * .12, centerY + unit * 1.12, unit * .28, unit * .85); context.fillRect(sx + unit * .55 - walk * unit * .12, centerY + unit * 1.12, unit * .28, unit * .85); context.fillRect(sx + side * unit * .78, centerY + unit * .38, unit * .58, unit * .58); }
    else { context.fillStyle = race.shadow; context.fillRect(sx - unit * .56 + walk * unit * .18, centerY + unit * .55, unit * .42, unit * .8); context.fillRect(sx + unit * .14 - walk * unit * .18, centerY + unit * .55, unit * .42, unit * .8); }
    if (person?.race === "dwarf") {
      context.fillStyle = kingdomColor; context.fillRect(sx - unit * .88, centerY - unit * .25, unit * 1.76, unit * 1.25); context.fillStyle = race.skin; context.fillRect(sx - unit * .55, centerY - unit * 1.02, unit * 1.1, unit * .9); context.fillStyle = hair; context.beginPath(); context.moveTo(sx - unit * .5, centerY - unit * .25); context.lineTo(sx, centerY + unit * .72); context.lineTo(sx + unit * .5, centerY - unit * .25); context.closePath(); context.fill();
    } else if (person?.race === "orc") {
      context.fillStyle = kingdomColor; context.fillRect(sx - unit * .78, centerY - unit * .32, unit * 1.56, unit * 1.38); context.fillStyle = race.skin; context.fillRect(sx - unit * .64, centerY - unit * 1.22, unit * 1.28, unit); context.fillStyle = hair; context.fillRect(sx - unit * .62, centerY - unit * 1.3, unit * 1.24, unit * .28); context.fillStyle = "#eee0b3"; context.fillRect(sx - unit * .48, centerY - unit * .28, unit * .18, unit * .28); context.fillRect(sx + unit * .3, centerY - unit * .28, unit * .18, unit * .28);
    } else {
      const slender = person?.race === "elf" ? .58 : .68; context.fillStyle = kingdomColor; context.fillRect(sx - unit * slender, centerY - unit * .28, unit * slender * 2, unit * 1.35); context.fillStyle = race.skin; context.fillRect(sx - unit * .54, centerY - unit * 1.2, unit * 1.08, unit * .96); context.fillStyle = hair; context.fillRect(sx - unit * .56, centerY - unit * 1.3, unit * 1.12, unit * .32);
      if (person?.race === "elf") { context.fillStyle = race.skin; context.beginPath(); context.moveTo(sx - unit * .52, centerY - unit * .98); context.lineTo(sx - unit * 1.04, centerY - unit * .72); context.lineTo(sx - unit * .5, centerY - unit * .55); context.closePath(); context.fill(); context.beginPath(); context.moveTo(sx + unit * .52, centerY - unit * .98); context.lineTo(sx + unit * 1.04, centerY - unit * .72); context.lineTo(sx + unit * .5, centerY - unit * .55); context.closePath(); context.fill(); }
    }
    if (tileSize > 6) { context.fillStyle = "#171b18"; const eyeY = centerY - unit * .78; context.fillRect(sx + side * unit * .22, eyeY, Math.max(1, unit * .16), Math.max(1, unit * .16)); }
    if (tileSize > 5.5 && person?.role === "soldier") drawSoldierEquipment(context, person, sx, centerY, unit, direction, time, motion, professionColor);
    else if (tileSize > 5.5 && person?.profession !== "child") drawProfessionTool(context, person?.profession, sx, centerY, unit, direction, motion.working ? motion.workPhase || 0 : 1, professionColor);
    context.restore(); return { radius: unit * 1.05, unit, centerY };
  }

  function spawnCombatEffect(type, fromX, fromY, toX, toY, color = "#e56f57", time = 0) {
    const effect = { type: ["archer", "siege", "cavalry", "infantry", "militia"].includes(type) ? type : "militia", fromX: Number(fromX) || 0, fromY: Number(fromY) || 0, toX: Number(toX) || 0, toY: Number(toY) || 0, color, born: Number(time) || 0, duration: type === "siege" ? .72 : type === "archer" ? .42 : .28, seed: visualHash(Math.floor(fromX * 17), Math.floor(toY * 19), combatEffects.length) };
    combatEffects.push(effect); if (combatEffects.length > 120) combatEffects = combatEffects.slice(-120); return effect;
  }

  function renderCombatEffects(context, metrics, time = 0) {
    combatEffects = combatEffects.filter(effect => time - effect.born <= effect.duration);
    for (const effect of combatEffects) {
      const progress = Math.max(0, Math.min(1, (time - effect.born) / effect.duration)), fromX = metrics.ox + (effect.fromX + .5) * metrics.size, fromY = metrics.oy + (effect.fromY + .5) * metrics.size, toX = metrics.ox + (effect.toX + .5) * metrics.size, toY = metrics.oy + (effect.toY + .5) * metrics.size, x = fromX + (toX - fromX) * progress, arc = effect.type === "siege" ? Math.sin(progress * Math.PI) * metrics.size * 1.8 : 0, y = fromY + (toY - fromY) * progress - arc, unit = Math.max(1, metrics.size * .18);
      context.save(); context.globalAlpha = Math.max(0, 1 - progress * .72); context.strokeStyle = effect.color; context.fillStyle = effect.color; context.lineWidth = Math.max(1, metrics.size * .13);
      if (["archer", "siege"].includes(effect.type)) {
        if (effect.type === "siege") { context.fillStyle = "#51453c"; context.beginPath(); context.arc(x, y, unit * 1.35, 0, Math.PI * 2); context.fill(); }
        else { const angle = Math.atan2(toY - fromY, toX - fromX), dx = Math.cos(angle) * unit * 2.4, dy = Math.sin(angle) * unit * 2.4; context.beginPath(); context.moveTo(x - dx, y - dy); context.lineTo(x + dx, y + dy); context.stroke(); context.beginPath(); context.moveTo(x + dx, y + dy); context.lineTo(x + dx - Math.cos(angle - .65) * unit, y + dy - Math.sin(angle - .65) * unit); context.lineTo(x + dx - Math.cos(angle + .65) * unit, y + dy - Math.sin(angle + .65) * unit); context.closePath(); context.fill(); }
      } else {
        const angle = Math.atan2(toY - fromY, toX - fromX), sweep = progress * Math.PI * 1.1; context.beginPath(); context.arc(toX, toY, metrics.size * (.36 + progress * .46), angle - .8 + sweep, angle + .35 + sweep); context.stroke();
      }
      if (progress > .62) for (let spark = 0; spark < 4; spark++) { const angle = spark * Math.PI / 2 + effect.seed % 7; context.fillRect(toX + Math.cos(angle) * unit * progress * 3, toY + Math.sin(angle) * unit * progress * 3, unit, unit); }
      context.restore();
    }
    return combatEffects.length;
  }

  function drawDisaster(context, options) {
    const { disaster, definition, metrics, time = 0 } = options;
    if (!disaster || !definition || !metrics) return false;
    const sx = metrics.ox + (disaster.x + .5) * metrics.size, sy = metrics.oy + (disaster.y + .5) * metrics.size, radius = Math.max(metrics.size, disaster.radius * metrics.size), phase = prefersReducedMotion() ? 0 : time, hash = visualHash(disaster.id || disaster.x, disaster.type?.length || disaster.y), pulse = .88 + Math.sin(phase * 3 + hash % 7) * .06, pixel = Math.max(1, metrics.size * .18);
    if (sx + radius < 0 || sy + radius < 0 || sx - radius > metrics.width || sy - radius > metrics.height) return false;
    context.save(); context.strokeStyle = definition.color; context.fillStyle = definition.color; context.lineWidth = Math.max(1.5, metrics.size * .26);
    if (disaster.type === "earthquake") {
      context.globalAlpha = .22; for (let ring = 0; ring < 3; ring++) { context.beginPath(); context.arc(sx, sy, radius * (.42 + ring * .24) * pulse, 0, Math.PI * 2); context.stroke(); }
      context.globalAlpha = .82; context.strokeStyle = "#312821"; for (let branch = 0; branch < 7; branch++) { const angle = branch * .9 + hash % 11, length = radius * (.46 + branch % 3 * .17), midX = sx + Math.cos(angle) * length * .48, midY = sy + Math.sin(angle) * length * .48; context.beginPath(); context.moveTo(sx, sy); context.lineTo(midX + Math.sin(angle) * metrics.size * .4, midY); context.lineTo(sx + Math.cos(angle) * length, sy + Math.sin(angle) * length); context.stroke(); }
      context.fillStyle = "#d8c4a7"; context.globalAlpha = .5; for (let dust = 0; dust < 8; dust++) { const angle = dust * 2.2 + hash, distance = radius * (.28 + dust % 4 * .16); context.fillRect(sx + Math.cos(angle) * distance, sy + Math.sin(angle) * distance - pixel, pixel * (1 + dust % 2), pixel); }
    } else if (disaster.type === "flood") {
      context.globalAlpha = .2; context.beginPath(); context.arc(sx, sy, radius, 0, Math.PI * 2); context.fill(); context.globalAlpha = .76; context.strokeStyle = "#a7e2e6";
      for (let wave = -3; wave <= 3; wave++) { const offset = ((phase * metrics.size * 1.8 + wave * metrics.size * 2.4) % (radius * 1.5)) - radius * .75; context.beginPath(); context.arc(sx + offset * .12, sy + offset, radius * (.58 + (wave + 3) * .035), .12, Math.PI - .12); context.stroke(); }
      context.fillStyle = "#725039"; context.globalAlpha = .78; for (let debris = 0; debris < 5; debris++) { const angle = hash % 9 + debris * 2.1, drift = (phase * (6 + debris) + debris * 17) % Math.max(1, radius * 1.3); context.save(); context.translate(sx + Math.cos(angle) * drift, sy + Math.sin(angle) * drift * .55); context.rotate(angle); context.fillRect(-pixel * 1.6, -pixel * .35, pixel * 3.2, pixel * .7); context.restore(); }
    } else if (disaster.type === "tornado") {
      context.globalAlpha = .3; context.fillStyle = "#788487"; context.beginPath(); context.ellipse(sx, sy + radius * .52, radius * .55, radius * .18, 0, 0, Math.PI * 2); context.fill();
      for (let band = 0; band < 3; band++) { context.globalAlpha = .72 - band * .16; context.lineWidth = Math.max(1.5, metrics.size * (.48 - band * .08)); context.beginPath(); for (let point = 0; point < 28; point++) { const ratio = point / 27, angle = point * .67 + phase * (5 - band) + band * 2.2, width = radius * (.12 + ratio * .58), x = sx + Math.cos(angle) * width, y = sy + radius * .52 - ratio * radius * 1.28; if (!point) context.moveTo(x, y); else context.lineTo(x, y); } context.stroke(); }
      context.fillStyle = "#564b40"; context.globalAlpha = .9; for (let debris = 0; debris < 7; debris++) { const angle = phase * (3 + debris * .2) + debris, distance = radius * (.3 + debris % 3 * .19); context.fillRect(sx + Math.cos(angle) * distance, sy - radius * .2 + Math.sin(angle) * distance, pixel, pixel); }
    } else if (disaster.type === "volcano") {
      context.globalAlpha = .88; context.fillStyle = "#3d2b29"; context.beginPath(); context.moveTo(sx, sy - radius * .62); context.lineTo(sx + radius * .74, sy + radius * .58); context.lineTo(sx - radius * .74, sy + radius * .58); context.closePath(); context.fill(); context.fillStyle = "#ef673a";
      for (let stream = -1; stream <= 1; stream++) { const topX = sx + stream * radius * .12, bend = Math.sin(phase * 2 + stream) * radius * .08; context.beginPath(); context.moveTo(topX, sy - radius * .53); context.lineTo(topX + bend + stream * radius * .16, sy + radius * .12); context.lineTo(topX + stream * radius * .25, sy + radius * .54); context.lineTo(topX + stream * radius * .14, sy + radius * .52); context.lineTo(topX + bend - pixel, sy + radius * .08); context.closePath(); context.fill(); }
      context.fillStyle = "#17191a"; context.globalAlpha = .58; for (let smoke = 0; smoke < 5; smoke++) { const rise = (phase * metrics.size * 5 + smoke * radius * .22) % (radius * 1.12); context.beginPath(); context.arc(sx + Math.sin(phase + smoke) * radius * .16, sy - radius * .52 - rise, pixel * (1.6 + smoke * .35), 0, Math.PI * 2); context.fill(); }
      context.fillStyle = "#ffc857"; context.globalAlpha = .94; for (let ember = 0; ember < 7; ember++) { const angle = ember * .86 + hash, height = radius * (.45 + ember % 3 * .22), sway = Math.sin(phase * 4 + ember) * radius * .18; context.fillRect(sx + sway + Math.cos(angle) * radius * .2, sy - height, pixel, pixel); }
    } else if (disaster.type === "plague") {
      context.globalAlpha = .14; context.beginPath(); context.arc(sx, sy, radius * pulse, 0, Math.PI * 2); context.fill(); context.strokeStyle = "#b7df72"; context.globalAlpha = .58; context.setLineDash([metrics.size * .75, metrics.size * .58]); context.beginPath(); context.arc(sx, sy, radius, 0, Math.PI * 2); context.stroke(); context.setLineDash([]);
      for (let spore = 0; spore < 16; spore++) { const angle = spore * 2.37 + phase * (.4 + spore % 3 * .12), distance = radius * (.18 + spore % 5 * .16), size = pixel * (spore % 4 === 0 ? 1.8 : 1); context.globalAlpha = .48 + spore % 3 * .16; context.beginPath(); context.arc(sx + Math.cos(angle) * distance, sy + Math.sin(angle) * distance, size, 0, Math.PI * 2); context.fill(); }
      context.strokeStyle = "#d6f2a3"; context.globalAlpha = .82; context.beginPath(); context.arc(sx, sy, metrics.size * .75 * pulse, 0, Math.PI * 2); context.stroke(); context.beginPath(); context.moveTo(sx - metrics.size * .48, sy); context.lineTo(sx + metrics.size * .48, sy); context.moveTo(sx, sy - metrics.size * .48); context.lineTo(sx, sy + metrics.size * .48); context.stroke();
    } else if (disaster.type === "drought") {
      context.globalAlpha = .13; context.beginPath(); context.arc(sx, sy, radius, 0, Math.PI * 2); context.fill(); context.strokeStyle = "#edc66c"; context.globalAlpha = .46; for (let haze = 0; haze < 4; haze++) { const offset = Math.sin(phase * 2.4 + haze) * metrics.size; context.beginPath(); context.arc(sx + offset, sy, radius * (.38 + haze * .18), 0, Math.PI * 2); context.stroke(); }
      context.strokeStyle = "#6f4d2e"; context.globalAlpha = .78; for (let crack = 0; crack < 8; crack++) { const angle = crack * .8 + hash % 5, length = radius * (.3 + crack % 4 * .13); context.beginPath(); context.moveTo(sx, sy); context.lineTo(sx + Math.cos(angle) * length * .55, sy + Math.sin(angle) * length * .55); context.lineTo(sx + Math.cos(angle + .12) * length, sy + Math.sin(angle + .12) * length); context.stroke(); }
      context.fillStyle = "#d8a94c"; context.globalAlpha = .54; for (let dust = 0; dust < 10; dust++) { const angle = phase * .7 + dust * 1.7, distance = radius * (.22 + dust % 5 * .15); context.fillRect(sx + Math.cos(angle) * distance, sy + Math.sin(angle) * distance, pixel, pixel); }
    }
    context.restore(); return true;
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

  globalThis.RealmPixelArt = Object.freeze({ terrainPalettes, accents, buildingSilhouettes, raceSpritePalettes, visualHash, prefersReducedMotion, animationFrameDue, terrainColor, drawTerrainTile, drawWeatherOverlay, prepareCharacterFrame, drawCharacter, spawnCombatEffect, renderCombatEffects, drawDisaster, structureVisualState, drawStructure, drawVillageCore });
})();
