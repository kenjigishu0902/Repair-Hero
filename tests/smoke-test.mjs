import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from '../vendor/three/three.module.js';

class ClassList {
  constructor() { this.values = new Set(); }
  add(...values) { values.forEach((value) => this.values.add(value)); }
  remove(...values) { values.forEach((value) => this.values.delete(value)); }
  toggle(value, forced) {
    const enabled = forced ?? !this.values.has(value);
    if (enabled) this.values.add(value);
    else this.values.delete(value);
    return enabled;
  }
  contains(value) { return this.values.has(value); }
}

class ElementStub {
  constructor(id = '') {
    this.id = id;
    this.style = {};
    this.classList = new ClassList();
    this.listeners = {};
    this.disabled = false;
    this.textContent = '';
  }
  addEventListener(type, listener) { (this.listeners[type] ??= []).push(listener); }
  dispatch(type, event = {}) {
    const payload = { preventDefault() {}, pointerId: 1, clientX: 0, clientY: 0, ...event };
    for (const listener of this.listeners[type] || []) listener(payload);
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 140, height: 140 }; }
  setPointerCapture() {}
  getContext() {
    return {
      fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, arc() {}, fill() {},
      createLinearGradient() { return { addColorStop() {} }; },
    };
  }
}

const elementIds = [
  'game-canvas', 'loading-screen', 'loading-text', 'loading-bar-inner', 'error-banner',
  'title-screen', 'start-button', 'hud', 'health-bar-fill', 'health-text', 'core-count',
  'enemy-count', 'timer-text', 'objective-text', 'objective-toast', 'boss-hud',
  'boss-bar-fill', 'boss-name', 'damage-flash', 'game-over-screen', 'clear-screen',
  'clear-time', 'clear-defeated', 'retry-button', 'replay-button', 'joystick-zone',
  'joystick-base', 'joystick-knob', 'jump-button', 'attack-button', 'dash-button',
];
const elements = new Map(elementIds.map((id) => [id, new ElementStub(id)]));
const documentListeners = {};
const documentStub = {
  body: new ElementStub('body'),
  hidden: false,
  getElementById: (id) => elements.get(id) || null,
  createElement: () => new ElementStub('canvas'),
  addEventListener(type, listener) { (documentListeners[type] ??= []).push(listener); },
};

let now = 0;
const animationFrames = [];
const windowListeners = {};
const windowStub = {
  devicePixelRatio: 1,
  innerWidth: 1280,
  innerHeight: 720,
  AudioContext: undefined,
  webkitAudioContext: undefined,
  addEventListener(type, listener) { (windowListeners[type] ??= []).push(listener); },
  setTimeout(callback) { callback(); return 1; },
};

Object.defineProperty(global, 'window', { value: windowStub, configurable: true });
Object.defineProperty(global, 'document', { value: documentStub, configurable: true });
Object.defineProperty(global, 'navigator', { value: { maxTouchPoints: 0 }, configurable: true });
Object.defineProperty(global, 'performance', { value: { now: () => now }, configurable: true });
Object.defineProperty(global, 'requestAnimationFrame', {
  value: (callback) => { animationFrames.push(callback); return animationFrames.length; },
  configurable: true,
});

class RendererStub {
  constructor() {
    this.shadowMap = {};
    this.capabilities = { getMaxAnisotropy: () => 4 };
  }
  setPixelRatio() {}
  setSize() {}
  render() {}
}

const animatedBoneNames = [
  'Bone_001', 'Bone_003', 'Bone_002', 'Bone_017', 'Bone_016',
  'Bone_008', 'Bone_007', 'Bone_006', 'Bone_005',
  'Bone_013', 'Bone_012', 'Bone_011', 'Bone_010',
  'Bone_022', 'Bone_021', 'Bone_020',
  'Bone_028', 'Bone_027', 'Bone_026',
  'Bone_031', 'Bone_030', 'Bone_029',
];

class LoaderStub {
  load(_url, onLoad, onProgress) {
    onProgress?.({ loaded: 10, total: 10 });
    const model = new THREE.Group();
    for (const name of animatedBoneNames) {
      const bone = new THREE.Bone();
      bone.name = name;
      model.add(bone);
    }
    onLoad({ scene: model, animations: [] });
  }
}

windowStub.__TestRenderer = RendererStub;
windowStub.__TestLoader = LoaderStub;

const projectRoot = path.resolve(import.meta.dirname, '..');
let source = fs.readFileSync(path.join(projectRoot, 'js/main.js'), 'utf8');
source = source
  .replace("'../vendor/three/three.module.js'", JSON.stringify(pathToFileURL(path.join(projectRoot, 'vendor/three/three.module.js')).href))
  .replace("'../vendor/three/GLTFLoader.js'", JSON.stringify(pathToFileURL(path.join(projectRoot, 'vendor/three/GLTFLoader.js')).href))
  .replace("'./model-factories.js'", JSON.stringify(pathToFileURL(path.join(projectRoot, 'js/model-factories.js')).href))
  .replace('renderer = new THREE.WebGLRenderer({', 'renderer = new window.__TestRenderer({')
  .replace('const loader = new GLTFLoader();', 'const loader = new window.__TestLoader();');

await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function step(frameCount) {
  for (let frame = 0; frame < frameCount; frame += 1) {
    now += 1000 / 60;
    const callback = animationFrames.shift();
    assert(callback, 'Animation loop stopped unexpectedly');
    callback();
  }
}

function pressKey(code) {
  for (const listener of windowListeners.keydown || []) {
    listener({ code, repeat: false, preventDefault() {} });
  }
}

const api = windowStub.__repairHero;
assert(api?.getState().playerReady, 'Player model did not load');
elements.get('start-button').dispatch('click');
assert(api.getState().active, 'Game did not start');

api.player.invulnerability = 999;
const corePositions = [[4.1, -7.5], [-5.6, -18.4], [5.8, -29.2], [-3.6, -43.6], [3.8, -54.2]];
for (const [x, z] of corePositions) {
  api.player.group.position.set(x, 0, z);
  step(2);
}
assert(api.getState().cores === 5, 'Not all repair cores were collected');
assert(api.getState().objective === 'boss', 'Boss objective was not activated');

for (let attack = 0; attack < 10 && api.getState().objective !== 'portal'; attack += 1) {
  const boss = api.scene.getObjectByName('Dark Bug Guardian');
  assert(boss, 'Boss model is missing');
  api.player.group.position.set(boss.position.x, 0, boss.position.z + 1.55);
  api.player.group.rotation.y = Math.PI;
  pressKey('KeyJ');
  step(28);
}
assert(api.getState().objective === 'portal', 'Boss could not be defeated or portal did not unlock');

const portal = api.scene.getObjectByName('Purification Gate');
assert(portal, 'Portal model is missing');
api.player.group.position.set(portal.position.x, 0, portal.position.z);
step(2);
assert(!api.getState().active, 'Entering the portal did not finish the stage');
assert(elements.get('clear-screen').classList.contains('visible'), 'Clear result screen was not shown');

elements.get('replay-button').dispatch('click');
assert(api.getState().active, 'Replay did not restart the stage');
api.player.health = 1;
api.player.invulnerability = 0;
const crawler = api.scene.getObjectByName('Bug Beast');
assert(crawler, 'Crawler model is missing after replay');
api.player.group.position.set(crawler.position.x, 0, crawler.position.z + 0.9);
step(360);
assert(!api.getState().active, 'Lethal enemy damage did not stop the game');
assert(elements.get('game-over-screen').classList.contains('visible'), 'Game-over screen was not shown');

console.log(JSON.stringify({
  status: 'ok',
  clearFlow: true,
  gameOverFlow: true,
  clearScreen: true,
}, null, 2));
