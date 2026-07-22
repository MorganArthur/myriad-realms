"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function createElement(id = "") {
  const classes = new Set();
  return {
    id, value: "", textContent: "", innerHTML: "", hidden: true, checked: false, files: [], dataset: {}, style: {}, width: 960, height: 640, clientWidth: 960, clientHeight: 640,
    classList: { add: (...names) => names.forEach(name => classes.add(name)), remove: (...names) => names.forEach(name => classes.delete(name)), toggle: (name, force) => force === undefined ? (classes.has(name) ? (classes.delete(name), false) : (classes.add(name), true)) : (force ? classes.add(name) : classes.delete(name), force), contains: name => classes.has(name) },
    addEventListener() {}, appendChild() {}, remove() {}, click() {}, closest() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 960, height: 640 }; },
    getContext() {
      const context = {};
      for (const method of ["arc", "beginPath", "clearRect", "closePath", "ellipse", "fill", "fillRect", "fillText", "lineTo", "moveTo", "restore", "rotate", "save", "setLineDash", "setTransform", "stroke", "strokeRect", "translate"]) context[method] = () => {};
      return context;
    }
  };
}

function createWorldRuntime() {
  const elements = new Map();
  const storage = new Map();
  const document = {
    body: createElement("body"),
    documentElement: { clientWidth: 1280, clientHeight: 720 },
    getElementById(id) { if (!elements.has(id)) elements.set(id, createElement(id)); return elements.get(id); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement: tag => createElement(tag)
  };
  document.getElementById("archiveModal").hidden = true;
  document.getElementById("worldCanvas").hidden = false;
  const context = vm.createContext({
    console, document, devicePixelRatio: 1, performance: { now: () => 0 }, structuredClone, Blob: class Blob {}, URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    crypto: { getRandomValues: values => { values[0] = 0x12345678; values[1] = 0x9abcdef0; return values; } },
    localStorage: { getItem: key => storage.has(key) ? storage.get(key) : null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
    confirm: () => true, requestAnimationFrame: () => 1, setTimeout: callback => (callback(), 1), clearTimeout() {}
  });
  context.globalThis = context;
  context.window = context;
  context.addEventListener = () => {};
  context.requestIdleCallback = callback => (callback(), 1);
  for (const file of ["engine-core.js", "world-config.js", "world-event-content.js", "regional-event-content.js", "experience-system.js", "long-term-system.js", "dynasty-system.js", "politics-system.js", "legacy-system.js", "game-ui.js", "game-persistence.js", "game.js"]) {
    new vm.Script(fs.readFileSync(path.join(root, file), "utf8"), { filename: file }).runInContext(context);
  }
  return { debug: context.RealmDebug, config: context.RealmConfig, engine: context.WorldEngine, context };
}

module.exports = { createWorldRuntime };
