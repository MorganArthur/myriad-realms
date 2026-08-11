"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const runtimeFiles = ["engine-core.js", "world-config.js", "game-persistence.js", "game.js"];

function createWorldRuntime() {
  const context = vm.createContext({ console, Date, Math, JSON, Object, Array, Map, Set, Uint32Array, Number, String, Boolean, RegExp, Error, Infinity, NaN });
  context.globalThis = context;
  for (const file of runtimeFiles) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  const game = context.RealmGame;
  return {
    game,
    config: context.RealmConfig,
    persistence: context.RealmPersistence,
    debug: {
      generate(seed) { game.newWorld(seed); return snapshot(); },
      step(amount) { game.step(amount); return snapshot(); },
      snapshot,
      setRandomDisasters(value) { game.setRandomDisasters(value); },
      triggerDisaster(type, x, y) { return game.triggerDisaster(type, x, y, true); },
      save() { return context.RealmPersistence.build(game.getState()); },
      restore(raw) { game.restore(context.RealmPersistence.normalize(raw)); return snapshot(); }
    }
  };

  function snapshot() {
    const base = game.snapshot(), state = game.getState(), animals = Object.fromEntries(Object.keys(context.RealmConfig.animals).map(species => [species, state.animals.filter(animal => animal.species === species).length]));
    return { ...base, populationByRace: base.races, animals, famineRealms: state.kingdoms.filter(kingdom => state.villages.filter(village => village.kingdomId === kingdom.id).every(village => village.resources.food <= 0)).length, history: { ...state.worldStats } };
  }
}

module.exports = { createWorldRuntime };
