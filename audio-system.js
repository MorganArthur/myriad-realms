"use strict";

// 轻量程序化声音：背景音乐、自然环境和通用事件反馈。
(() => {
  const KEY = "realm-audio-settings-v2";
  const defaults = Object.freeze({ enabled: false, master: .7, music: .34, ambient: .46, effects: .72 });
  const soundCatalog = Object.freeze({ click: 35, power: 80, disaster: 420, event: 180, construction: 360 });
  const musicModes = Object.freeze({
    peace: { label: "宁静原野", notes: [220, 261.63, 293.66, 329.63, 392], pace: .72, wave: "sine" },
    growth: { label: "聚落晨曦", notes: [196, 246.94, 293.66, 329.63, 369.99], pace: .58, wave: "triangle" },
    tension: { label: "阴云低垂", notes: [110, 130.81, 146.83, 164.81, 220], pace: .46, wave: "triangle" },
    crisis: { label: "大地悲鸣", notes: [82.41, 98, 116.54, 123.47, 146.83], pace: .5, wave: "triangle" }
  });
  const ambientLabels = { clear: "风与林海", rain: "细雨原野", storm: "暴风雨", frost: "寒风霜原", heatwave: "干旱热风", fire: "燃烧大地", flood: "洪水奔涌", volcano: "火山轰鸣" };
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  let settings = { ...defaults }, context = null, buses = null, layers = null, noiseBuffer = null;
  let initialized = false, backgroundMuted = false, mode = "peace", worldState = {}, nextNote = 0, noteIndex = 0, nextNature = 0, activeVoices = 0;
  const lastPlayed = new Map();

  function normalize(source = {}) { return { enabled: source.enabled === true, master: clamp(source.master ?? defaults.master), music: clamp(source.music ?? defaults.music), ambient: clamp(source.ambient ?? defaults.ambient), effects: clamp(source.effects ?? defaults.effects) }; }
  function load() { try { return normalize(JSON.parse(localStorage.getItem(KEY) || "null") || defaults); } catch { return { ...defaults }; } }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* 浏览器禁止存储时仅保留本次设置。 */ } }
  function makeNoise(seconds = 2) {
    const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * seconds)), context.sampleRate), data = buffer.getChannelData(0);
    let seed = 0x6d2b79f5;
    for (let index = 0; index < data.length; index++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; data[index] = (seed >>> 0) / 2147483647.5 - 1; }
    return buffer;
  }
  function ambientLayer(type, frequency) {
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = noiseBuffer; source.loop = true; filter.type = type; filter.frequency.value = frequency; gain.gain.value = .0001;
    source.connect(filter); filter.connect(gain); gain.connect(buses.ambient); source.start(); return gain;
  }
  function createGraph() {
    if (context) return true;
    const AudioCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioCtor) return false;
    context = new AudioCtor();
    const master = context.createGain(), music = context.createGain(), ambient = context.createGain(), effects = context.createGain();
    music.connect(master); ambient.connect(master); effects.connect(master); master.connect(context.destination); buses = { master, music, ambient, effects };
    noiseBuffer = makeNoise(2.4); layers = { wind: ambientLayer("bandpass", 420), rain: ambientLayer("highpass", 2400), water: ambientLayer("lowpass", 640), fire: ambientLayer("bandpass", 1100) };
    sync(true); nextNote = context.currentTime + .08; return true;
  }
  function sync(immediate = false) {
    if (!context) return;
    const now = context.currentTime, audible = settings.enabled && !backgroundMuted ? 1 : .0001;
    for (const [name, value] of Object.entries({ master: settings.master * audible, music: settings.music, ambient: settings.ambient, effects: settings.effects })) {
      const parameter = buses[name].gain, target = Math.max(.0001, value);
      if (immediate) parameter.setValueAtTime(target, now); else parameter.setTargetAtTime(target, now, .08);
    }
  }
  function unlock() { if (!settings.enabled || !createGraph()) return false; context.resume?.(); sync(); return true; }
  function output(details) {
    if (!Number.isFinite(Number(details?.x)) || !context.createStereoPanner) return buses.effects;
    const panner = context.createStereoPanner(), width = Math.max(1, Number(details.worldWidth) || 120); panner.pan.value = Math.max(-1, Math.min(1, Number(details.x) / width * 2 - 1)); panner.connect(buses.effects); return panner;
  }
  function tone(frequency, duration, volume, type = "sine", destination = buses?.effects, delay = 0, ending = null) {
    if (!context || activeVoices >= 24) return;
    const now = context.currentTime + delay, oscillator = context.createOscillator(), gain = context.createGain(); activeVoices++;
    oscillator.onended = () => { activeVoices = Math.max(0, activeVoices - 1); }; oscillator.type = type; oscillator.frequency.setValueAtTime(Math.max(30, frequency), now);
    if (ending) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, ending), now + duration);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), now + .025); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain); gain.connect(destination); oscillator.start(now); oscillator.stop(now + duration + .02);
  }
  function burst(duration, volume, frequency, destination) {
    if (!context || activeVoices >= 24) return;
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain(), now = context.currentTime; activeVoices++;
    source.onended = () => { activeVoices = Math.max(0, activeVoices - 1); }; source.buffer = noiseBuffer; filter.type = "lowpass"; filter.frequency.value = frequency; gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(filter); filter.connect(gain); gain.connect(destination || buses.effects); source.start(); source.stop(now + duration);
  }
  function play(name, details = {}) {
    if (!settings.enabled || backgroundMuted || !Object.hasOwn(soundCatalog, name) || !unlock()) return false;
    const now = performance?.now?.() ?? Date.now(); if (now - (lastPlayed.get(name) || -Infinity) < soundCatalog[name]) return false; lastPlayed.set(name, now);
    const destination = output(details), intensity = Math.max(.18, Math.min(1.2, Number(details.intensity) || .75));
    if (name === "click") tone(520, .055, .024 * intensity, "sine", destination, 0, 430);
    if (name === "power") { tone(360, .28, .065 * intensity, "triangle", destination, 0, 720); tone(540, .34, .035 * intensity, "sine", destination, .04, 920); }
    if (name === "disaster") { burst(.5, .14 * intensity, 520, destination); tone(74, .62, .12 * intensity, "sawtooth", destination, 0, 42); }
    if (name === "event") { tone(293.66, .22, .045 * intensity, "triangle", destination); tone(440, .32, .035 * intensity, "sine", destination, .08); }
    if (name === "construction") { burst(.12, .055 * intensity, 740, destination); tone(145, .14, .045 * intensity, "triangle", destination, .02, 110); }
    return true;
  }
  function disasterTypes(world = {}) { return (world.disasters || []).map(item => typeof item === "string" ? item : item?.type).filter(Boolean); }
  function chooseMusicMode(world = {}) { if (disasterTypes(world).length) return "crisis"; if (Number(world.wars) > 0) return "tension"; if (Number(world.population) >= 35 || Number(world.villages) >= 4) return "growth"; return "peace"; }
  function profile(world = {}) {
    const types = disasterTypes(world), weather = world.weather || "clear", wet = weather === "rain" || weather === "storm" || types.includes("flood"), burning = types.includes("volcano") || Number(world.fire) > 0;
    return { wind: weather === "storm" || types.includes("tornado") ? .7 : weather === "frost" || weather === "heatwave" ? .28 : .1, rain: wet ? .55 : .0001, water: Math.min(.5, .05 + Number(world.waterRatio || .18) * .3 + (types.includes("flood") ? .28 : 0)), fire: burning ? .52 : .0001, nature: Math.min(.35, .08 + Number(world.biomeHealth || .5) * .25) };
  }
  function scene(world = worldState) { const types = disasterTypes(world); let key = world.weather || "clear"; if (types.includes("volcano")) key = "volcano"; else if (types.includes("flood")) key = "flood"; else if (Number(world.fire) > 0) key = "fire"; return { mode, music: musicModes[mode].label, ambient: ambientLabels[key] || ambientLabels.clear }; }
  function update(world = {}) {
    worldState = world; mode = chooseMusicMode(world); if (!settings.enabled || !context) return scene(world);
    const values = profile(world), now = context.currentTime; for (const key of Object.keys(layers)) layers[key].gain.setTargetAtTime(Math.max(.0001, values[key] * .19), now, .7);
    if (now >= nextNote && context.state !== "suspended") { const music = musicModes[mode], frequency = music.notes[noteIndex % music.notes.length] * (mode === "crisis" || mode === "tension" ? .5 : 1); tone(frequency, music.pace, mode === "tension" ? .034 : .027, music.wave, buses.music); noteIndex++; nextNote = now + music.pace * (noteIndex % 4 === 3 ? 1.5 : 1); }
    if (now >= nextNature && world.running !== false && values.nature > .14) { tone([880, 1046.5, 987.77][noteIndex % 3], .11, .0035, "sine", buses.ambient, 0, 1174); nextNature = now + 2.8; }
    return scene(world);
  }
  function getSettings() { return { ...settings }; }
  function applySettings(source, options = {}) { settings = normalize({ ...settings, ...source }); persist(); sync(); if (options.unlock) unlock(); return getSettings(); }
  function setEnabled(enabled) { settings.enabled = Boolean(enabled); persist(); if (settings.enabled) unlock(); sync(); return settings.enabled; }
  function setVolume(channel, value) { if (["master", "music", "ambient", "effects"].includes(channel)) { settings[channel] = clamp(value); persist(); sync(); } return getSettings(); }
  function initialize(source = null) { if (!initialized) { initialized = true; settings = source ? normalize(source) : load(); document?.addEventListener?.("visibilitychange", () => { backgroundMuted = Boolean(document.hidden); sync(); }); } else if (source) applySettings(source); return getSettings(); }

  globalThis.RealmAudio = Object.freeze({ defaults, soundCatalog, musicModes, initialize, unlock, play, update, scene, chooseMusicMode, getSettings, applySettings, setEnabled, setVolume });
})();
