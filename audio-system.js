"use strict";

// 程序化音频层：动态音乐、环境声场、空间化事件音效与分轨设置。
(function createRealmAudio(global) {
  const STORAGE_KEY = "realm-audio-settings-v1";
  const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, Number(value) || 0));
  const defaults = Object.freeze({ enabled: false, master: .7, music: .34, ambient: .46, effects: .72 });
  const soundCatalog = Object.freeze({
    click: { group: "interface", cooldown: 35 },
    power: { group: "world", cooldown: 70 },
    disaster: { group: "world", cooldown: 420 },
    event: { group: "interface", cooldown: 180 },
    hero: { group: "interface", cooldown: 180 },
    construction: { group: "world", cooldown: 420 },
    resource: { group: "world", cooldown: 260 },
    melee: { group: "combat", cooldown: 55 },
    shield: { group: "combat", cooldown: 80 },
    arrow: { group: "combat", cooldown: 70 },
    cavalry: { group: "combat", cooldown: 120 },
    siegeLaunch: { group: "combat", cooldown: 260 },
    siegeImpact: { group: "combat", cooldown: 260 },
    casualty: { group: "combat", cooldown: 130 }
  });
  const musicModes = Object.freeze({
    peace: Object.freeze({ label: "宁静原野", notes: [220, 261.63, 293.66, 329.63, 392], pace: .72, wave: "sine" }),
    growth: Object.freeze({ label: "文明晨曦", notes: [196, 246.94, 293.66, 329.63, 369.99], pace: .58, wave: "triangle" }),
    war: Object.freeze({ label: "战云压境", notes: [110, 130.81, 146.83, 164.81, 220], pace: .42, wave: "sawtooth" }),
    crisis: Object.freeze({ label: "大地悲鸣", notes: [82.41, 98, 116.54, 123.47, 146.83], pace: .5, wave: "triangle" }),
    legend: Object.freeze({ label: "史诗回响", notes: [174.61, 220, 261.63, 293.66, 349.23], pace: .62, wave: "triangle" })
  });
  const ambientLabels = Object.freeze({ clear: "风与林海", rain: "细雨原野", storm: "暴风雨", frost: "寒风霜原", heatwave: "干旱热风", fire: "燃烧大地", flood: "洪水奔涌", volcano: "火山轰鸣" });

  let settings = { ...defaults };
  let context = null;
  let nodes = null;
  let ambience = null;
  let burstBuffer = null;
  let initialized = false;
  let backgroundMuted = false;
  let currentMode = "peace";
  let currentWorld = {};
  let nextMusicAt = 0;
  let nextAmbientDetailAt = 0;
  let nextAmbientMixAt = 0;
  let musicStep = 0;
  let ambientStep = 0;
  let activeVoices = 0;
  const lastPlayed = new Map();

  function normalizeSettings(source = {}) {
    return {
      enabled: source.enabled === true,
      master: clamp(source.master ?? defaults.master),
      music: clamp(source.music ?? defaults.music),
      ambient: clamp(source.ambient ?? defaults.ambient),
      effects: clamp(source.effects ?? defaults.effects)
    };
  }

  function readSettings() {
    try {
      const stored = JSON.parse(global.localStorage?.getItem(STORAGE_KEY) || "null");
      if (stored) return normalizeSettings(stored);
      return normalizeSettings({ ...defaults, enabled: global.localStorage?.getItem("realm-audio-enabled") === "true" });
    } catch { return { ...defaults }; }
  }

  function persistSettings() {
    try {
      global.localStorage?.setItem(STORAGE_KEY, JSON.stringify(settings));
      global.localStorage?.setItem("realm-audio-enabled", String(settings.enabled));
    } catch { /* 无可用本地存储时仍允许本次会话播放。 */ }
  }

  function createNoiseBuffer(duration = 2) {
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate), data = buffer.getChannelData(0);
    let seed = 0x6d2b79f5;
    for (let index = 0; index < length; index++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      data[index] = ((seed >>> 0) / 4294967295) * 2 - 1;
    }
    return buffer;
  }

  function createAmbientLayer(buffer, filterType, frequency) {
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = buffer; source.loop = true; filter.type = filterType; filter.frequency.value = frequency; gain.gain.value = .0001;
    source.connect(filter); filter.connect(gain); gain.connect(nodes.ambient); source.start();
    return { source, filter, gain };
  }

  function createAudioGraph() {
    const AudioCtor = global.AudioContext || global.webkitAudioContext;
    if (!AudioCtor || context) return Boolean(context);
    context = new AudioCtor();
    const master = context.createGain(), music = context.createGain(), ambient = context.createGain(), effects = context.createGain();
    music.connect(master); ambient.connect(master); effects.connect(master); master.connect(context.destination);
    nodes = { master, music, ambient, effects };
    const noise = createNoiseBuffer(2.4);
    ambience = {
      wind: createAmbientLayer(noise, "bandpass", 420),
      rain: createAmbientLayer(noise, "highpass", 2400),
      water: createAmbientLayer(noise, "lowpass", 640),
      fire: createAmbientLayer(noise, "bandpass", 1100)
    };
    burstBuffer = createNoiseBuffer(.55);
    syncBusVolumes(true);
    nextMusicAt = context.currentTime + .08;
    nextAmbientDetailAt = context.currentTime + .7;
    return true;
  }

  function syncBusVolumes(immediate = false) {
    if (!nodes || !context) return;
    const now = context.currentTime, multiplier = settings.enabled && !backgroundMuted ? 1 : .0001;
    const update = (parameter, value) => {
      if (immediate || typeof parameter.setTargetAtTime !== "function") parameter.setValueAtTime?.(Math.max(.0001, value), now);
      else parameter.setTargetAtTime(Math.max(.0001, value), now, .08);
    };
    update(nodes.master.gain, settings.master * multiplier);
    update(nodes.music.gain, settings.music);
    update(nodes.ambient.gain, settings.ambient);
    update(nodes.effects.gain, settings.effects);
  }

  function unlock() {
    if (!settings.enabled || !createAudioGraph()) return false;
    if (context.state === "suspended") context.resume?.();
    syncBusVolumes();
    return true;
  }

  function chooseMusicMode(world = {}) {
    const disasters = Array.isArray(world.disasters) ? world.disasters : [];
    if (disasters.length || Number(world.crises) > 0) return "crisis";
    if (Number(world.wars) > 0) return "war";
    if (world.activeEvent) return "legend";
    if (Number(world.population) >= 35 || Number(world.villages) >= 4) return "growth";
    return "peace";
  }

  function disasterTypes(world = {}) {
    return (Array.isArray(world.disasters) ? world.disasters : []).map(item => typeof item === "string" ? item : item?.type).filter(Boolean);
  }

  function ambientProfile(world = {}) {
    const weather = world.weather || "clear", disasters = disasterTypes(world);
    const stormy = weather === "storm" || disasters.includes("tornado"), rainy = weather === "rain" || weather === "storm" || disasters.includes("flood");
    const burning = disasters.includes("volcano") || disasters.includes("meteor") || Number(world.fire) > 0;
    return {
      wind: clamp(.08 + (stormy ? .58 : weather === "frost" ? .22 : 0) + (weather === "heatwave" || disasters.includes("drought") ? .16 : 0), .02, .76),
      rain: rainy ? clamp(.18 + Number(world.rainfall || 0) * .5 + (disasters.includes("flood") ? .18 : 0), .12, .78) : .0001,
      water: clamp(.05 + Number(world.waterRatio || .18) * .28 + (disasters.includes("flood") ? .32 : 0), .03, .5),
      fire: burning ? clamp(.2 + Number(world.fire || 0) * .02 + (disasters.includes("volcano") ? .24 : 0), .15, .62) : .0001,
      nature: clamp((world.running === false ? .04 : .13) + Number(world.biomeHealth || .55) * .18, .03, .34),
      settlement: clamp(Number(world.villages || 0) / 18, 0, .3)
    };
  }

  function targetGain(parameter, value, timeConstant = .8) {
    if (!context || !parameter) return;
    parameter.setTargetAtTime?.(Math.max(.0001, value), context.currentTime, timeConstant);
  }

  function beginVoice(source) {
    if (activeVoices >= 30) return false;
    activeVoices++;
    source.onended = () => { activeVoices = Math.max(0, activeVoices - 1); };
    return true;
  }

  function spatialOutput(details = {}) {
    if (!nodes) return null;
    if (typeof context.createStereoPanner !== "function" || !Number.isFinite(Number(details.x))) return nodes.effects;
    const panner = context.createStereoPanner(), width = Math.max(1, Number(details.worldWidth) || 120);
    panner.pan.value = clamp(Number(details.x) / width * 2 - 1, -1, 1); panner.connect(nodes.effects); return panner;
  }

  function tone(frequency, duration, volume, type = "sine", destination = null, delay = 0, endFrequency = null) {
    if (!context || activeVoices >= 30) return;
    const now = context.currentTime + delay, oscillator = context.createOscillator(), gain = context.createGain();
    if (!beginVoice(oscillator)) return;
    oscillator.type = type; oscillator.frequency.setValueAtTime(Math.max(30, frequency), now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), now + Math.min(.028, duration * .2)); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain); gain.connect(destination || nodes.effects); oscillator.start(now); oscillator.stop(now + duration + .02);
  }

  function noise(duration, volume, filterType = "bandpass", frequency = 900, destination = null, delay = 0) {
    if (!context || activeVoices >= 30) return;
    const now = context.currentTime + delay, source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    if (!beginVoice(source)) return;
    source.buffer = burstBuffer; filter.type = filterType; filter.frequency.value = frequency;
    gain.gain.setValueAtTime(Math.max(.0002, volume), now); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(filter); filter.connect(gain); gain.connect(destination || nodes.effects); source.start(now); source.stop(now + duration);
  }

  function play(name, details = {}) {
    const alias = name === "battle" ? "casualty" : name;
    if (!settings.enabled || backgroundMuted || !soundCatalog[alias] || !unlock()) return false;
    const nowMs = global.performance?.now?.() ?? Date.now(), cooldown = soundCatalog[alias].cooldown;
    if (nowMs - (lastPlayed.get(alias) || -Infinity) < cooldown) return false;
    lastPlayed.set(alias, nowMs);
    const output = spatialOutput(details), intensity = clamp(details.intensity ?? .75, .18, 1.2);
    if (alias === "click") tone(520, .055, .024 * intensity, "sine", output, 0, 430);
    if (alias === "power") { tone(360, .28, .065 * intensity, "triangle", output, 0, 720); tone(540, .34, .035 * intensity, "sine", output, .04, 920); }
    if (alias === "disaster") { noise(.5, .14 * intensity, "lowpass", 520, output); tone(74, .62, .12 * intensity, "sawtooth", output, 0, 42); }
    if (alias === "event") { tone(293.66, .22, .045 * intensity, "triangle", output); tone(440, .32, .035 * intensity, "sine", output, .08); }
    if (alias === "hero") { tone(392, .25, .045 * intensity, "triangle", output); tone(587.33, .38, .04 * intensity, "sine", output, .1); }
    if (alias === "construction") { noise(.12, .055 * intensity, "bandpass", 740, output); tone(145, .14, .045 * intensity, "triangle", output, .02, 110); }
    if (alias === "resource") { tone(650, .08, .026 * intensity, "sine", output); tone(780, .1, .02 * intensity, "sine", output, .07); }
    if (alias === "melee") { noise(.09, .065 * intensity, "highpass", 1500, output); tone(190, .11, .055 * intensity, "square", output, .015, 90); }
    if (alias === "shield") { noise(.12, .075 * intensity, "bandpass", 850, output); tone(105, .16, .065 * intensity, "triangle", output, 0, 72); }
    if (alias === "arrow") { noise(.16, .035 * intensity, "highpass", 2900, output); tone(940, .14, .025 * intensity, "sine", output, 0, 380); }
    if (alias === "cavalry") { tone(92, .13, .065 * intensity, "triangle", output, 0, 68); tone(82, .14, .055 * intensity, "triangle", output, .09, 58); }
    if (alias === "siegeLaunch") { noise(.28, .09 * intensity, "lowpass", 620, output); tone(70, .34, .095 * intensity, "sawtooth", output, 0, 42); }
    if (alias === "siegeImpact") { noise(.42, .15 * intensity, "lowpass", 420, output); tone(52, .48, .13 * intensity, "sawtooth", output, 0, 31); }
    if (alias === "casualty") { noise(.18, .09 * intensity, "bandpass", 680, output); tone(155, .24, .07 * intensity, "sawtooth", output, 0, 70); }
    return true;
  }

  function playCombat(unitType, details = {}) {
    if (unitType === "archer") return play("arrow", details);
    if (unitType === "cavalry") return play("cavalry", details);
    if (unitType === "siege") return play("siegeLaunch", details);
    return play(Number(details.blocked) > 0 ? "shield" : "melee", details);
  }

  function scheduleMusic() {
    if (!context || context.state === "suspended" || context.currentTime < nextMusicAt) return;
    const mode = musicModes[currentMode], index = musicStep % mode.notes.length, octave = currentMode === "war" || currentMode === "crisis" ? .5 : 1;
    const frequency = mode.notes[index] * octave, duration = mode.pace * (currentMode === "war" ? .7 : 1.05);
    tone(frequency, duration, currentMode === "war" ? .035 : .028, mode.wave, nodes.music);
    if (musicStep % 3 === 0) tone(frequency * 1.5, duration * .82, .012, "sine", nodes.music, .03);
    musicStep++; nextMusicAt = context.currentTime + mode.pace * (musicStep % 4 === 3 ? 1.55 : 1);
  }

  function scheduleAmbientDetails(profile) {
    if (!context || context.state === "suspended" || context.currentTime < nextAmbientDetailAt || currentWorld.running === false) return;
    if (profile.nature > .14 && ambientStep % 3 !== 2) {
      const birdNotes = [880, 1046.5, 987.77, 1174.66];
      tone(birdNotes[ambientStep % birdNotes.length], .11, .012 * profile.nature, "sine", nodes.ambient, 0, birdNotes[(ambientStep + 1) % birdNotes.length]);
    } else if (profile.settlement > .08) {
      tone(330, .24, .012 * profile.settlement, "triangle", nodes.ambient); tone(495, .3, .008 * profile.settlement, "sine", nodes.ambient, .09);
    }
    ambientStep++; nextAmbientDetailAt = context.currentTime + 2.2 + (ambientStep % 4) * .75;
  }

  function update(world = {}, nowMs = global.performance?.now?.() ?? Date.now()) {
    currentWorld = world; currentMode = chooseMusicMode(world);
    const profile = ambientProfile(world);
    if (settings.enabled && context) {
      if (context.currentTime >= nextAmbientMixAt) {
        targetGain(ambience.wind.gain.gain, profile.wind * .2);
        targetGain(ambience.rain.gain.gain, profile.rain * .17);
        targetGain(ambience.water.gain.gain, profile.water * .16);
        targetGain(ambience.fire.gain.gain, profile.fire * .2);
        nextAmbientMixAt = context.currentTime + .4;
      }
      scheduleMusic(nowMs); scheduleAmbientDetails(profile);
    }
    return scene(world);
  }

  function scene(world = currentWorld) {
    const types = disasterTypes(world), weather = world.weather || "clear";
    let ambienceKey = weather;
    if (types.includes("volcano")) ambienceKey = "volcano";
    else if (types.includes("flood")) ambienceKey = "flood";
    else if (Number(world.fire) > 0) ambienceKey = "fire";
    return { mode: currentMode, music: musicModes[currentMode].label, ambient: ambientLabels[ambienceKey] || ambientLabels.clear };
  }

  function applySettings(source, options = {}) {
    settings = normalizeSettings({ ...settings, ...(source || {}) }); persistSettings(); syncBusVolumes();
    if (options.unlock && settings.enabled) unlock();
    return getSettings();
  }

  function setEnabled(enabled) {
    settings.enabled = Boolean(enabled); persistSettings();
    if (settings.enabled) unlock();
    syncBusVolumes(); return settings.enabled;
  }

  function setVolume(channel, value) {
    if (!["master", "music", "ambient", "effects"].includes(channel)) return getSettings();
    settings[channel] = clamp(value); persistSettings(); syncBusVolumes(); return getSettings();
  }

  function getSettings() { return { ...settings }; }

  function handleVisibilityChange() {
    backgroundMuted = Boolean(global.document?.hidden); syncBusVolumes();
    if (!backgroundMuted && settings.enabled) unlock();
  }

  function initialize(source = null) {
    if (!initialized) {
      initialized = true; settings = source ? normalizeSettings(source) : readSettings();
      global.document?.addEventListener?.("visibilitychange", handleVisibilityChange);
      global.addEventListener?.("pointerdown", () => { if (settings.enabled) unlock(); }, { once: true });
    } else if (source) applySettings(source);
    return getSettings();
  }

  global.RealmAudio = Object.freeze({ defaults, soundCatalog, musicModes, initialize, unlock, play, playCombat, update, scene, chooseMusicMode, ambientProfile, getSettings, applySettings, setEnabled, setVolume });
})(globalThis);
