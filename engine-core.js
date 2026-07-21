"use strict";

(() => {
  const DEFAULT_SEED = "myriad-realms";
  let seedText = DEFAULT_SEED;
  let state = 0;
  let calls = 0;

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const cleanText = value => String(value ?? "").replace(/[<>&"']/g, "").slice(0, 120);

  function normalizeSeed(value) {
    const normalized = cleanText(value).trim().replace(/\s+/g, " ").slice(0, 64);
    return normalized || DEFAULT_SEED;
  }

  function hashSeed(value) {
    const text = normalizeSeed(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    hash += hash << 13; hash ^= hash >>> 7; hash += hash << 3; hash ^= hash >>> 17; hash += hash << 5;
    return hash >>> 0 || 0x6d2b79f5;
  }

  function setSeed(value) {
    seedText = normalizeSeed(value);
    state = hashSeed(seedText);
    calls = 0;
    return seedText;
  }

  function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    calls++;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  }

  const rand = (minimum, maximum) => random() * (maximum - minimum) + minimum;
  const randi = (minimum, maximum) => Math.floor(rand(minimum, maximum + 1));

  function getRandomState() {
    return { algorithm: "mulberry32-v1", seed: seedText, state: state >>> 0, calls };
  }

  function restoreRandomState(snapshot) {
    if (!snapshot || snapshot.algorithm !== "mulberry32-v1" || !Number.isFinite(Number(snapshot.state))) return false;
    seedText = normalizeSeed(snapshot.seed);
    state = Number(snapshot.state) >>> 0;
    calls = Math.max(0, Math.floor(Number(snapshot.calls) || 0));
    return true;
  }

  function createRandomSeed() {
    const values = new Uint32Array(2);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(values);
    else { values[0] = Date.now() >>> 0; values[1] = Math.floor((globalThis.performance?.now?.() || 0) * 1000) >>> 0; }
    return `MR-${values[0].toString(36).toUpperCase()}-${values[1].toString(36).toUpperCase()}`;
  }

  function smoothNoise(width, height, passes = 5) {
    let data = Array.from({ length: width * height }, random);
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

  setSeed(DEFAULT_SEED);
  globalThis.WorldEngine = Object.freeze({ random, rand, randi, clamp, cleanText, normalizeSeed, hashSeed, setSeed, getRandomState, restoreRandomState, createRandomSeed, smoothNoise, removeDeadEntities });
})();
