"use strict";

(() => {
  const rand = (minimum, maximum) => Math.random() * (maximum - minimum) + minimum;
  const randi = (minimum, maximum) => Math.floor(rand(minimum, maximum + 1));
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const cleanText = value => String(value ?? "").replace(/[<>&"']/g, "").slice(0, 120);

  function smoothNoise(width, height, passes = 5) {
    let data = Array.from({ length: width * height }, () => Math.random());
    for (let pass = 0; pass < passes; pass++) {
      const next = data.slice();
      for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        for (let offsetY = -1; offsetY <= 1; offsetY++) for (let offsetX = -1; offsetX <= 1; offsetX++) sum += data[(y + offsetY) * width + x + offsetX];
        next[y * width + x] = sum / 9;
      }
      data = next;
    }
    return data;
  }

  function removeDeadEntities(entities) {
    let writeIndex = 0;
    for (const entity of entities) if (!entity.dead) entities[writeIndex++] = entity;
    entities.length = writeIndex;
  }

  globalThis.WorldEngine = Object.freeze({ rand, randi, clamp, cleanText, smoothNoise, removeDeadEntities });
})();
