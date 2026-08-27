import * as THREE from '../vendor/three/three.module.js';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import {
  animateEnemyModel,
  createCrawlerModel,
  createDroneModel,
  createGuardianModel,
  createRepairCoreModel,
} from './model-factories.js';

/* --------------------------------------------------------------------------
 * Repair Hero - Playable Stage 1
 * A lightweight third-person action game built for desktop and mobile.
 * ----------------------------------------------------------------------- */

const CONFIG = Object.freeze({
  groundY: 0,
  gravity: -21,
  jumpSpeed: 7.2,
  walkSpeed: 2.75,
  runSpeed: 5.2,
  dashSpeed: 11.5,
  dashDuration: 0.2,
  dashCooldown: 1.05,
  turnSpeed: 15,
  playerRadius: 0.48,
  playerMaxHealth: 100,
  requiredCores: 5,
  stageMinX: -14.6,
  stageMaxX: 14.6,
  stageMinZ: -72,
  stageMaxZ: 7,
  cameraHeight: 3.6,
  cameraDistance: 7.4,
  cameraLookHeight: 1.05,
  maxDelta: 0.05,
});

const dom = {
  canvas: document.getElementById('game-canvas'),
  loadingScreen: document.getElementById('loading-screen'),
  loadingText: document.getElementById('loading-text'),
  loadingBar: document.getElementById('loading-bar-inner'),
  errorBanner: document.getElementById('error-banner'),
  titleScreen: document.getElementById('title-screen'),
  startButton: document.getElementById('start-button'),
  hud: document.getElementById('hud'),
  healthBar: document.getElementById('health-bar-fill'),
  healthText: document.getElementById('health-text'),
  coreText: document.getElementById('core-count'),
  enemyText: document.getElementById('enemy-count'),
  timerText: document.getElementById('timer-text'),
  objectiveText: document.getElementById('objective-text'),
  objectiveToast: document.getElementById('objective-toast'),
  bossHud: document.getElementById('boss-hud'),
  bossBar: document.getElementById('boss-bar-fill'),
  bossName: document.getElementById('boss-name'),
  damageFlash: document.getElementById('damage-flash'),
  gameOver: document.getElementById('game-over-screen'),
  clearScreen: document.getElementById('clear-screen'),
  clearTime: document.getElementById('clear-time'),
  clearDefeated: document.getElementById('clear-defeated'),
  retryButton: document.getElementById('retry-button'),
  replayButton: document.getElementById('replay-button'),
  joystickZone: document.getElementById('joystick-zone'),
  joystickBase: document.getElementById('joystick-base'),
  joystickKnob: document.getElementById('joystick-knob'),
  jumpButton: document.getElementById('jump-button'),
  attackButton: document.getElementById('attack-button'),
  dashButton: document.getElementById('dash-button'),
};

function showFatalError(message) {
  console.error('[Repair Hero]', message);
  if (dom.errorBanner) {
    dom.errorBanner.textContent = message;
    dom.errorBanner.classList.add('visible');
  }
  if (dom.loadingText) dom.loadingText.textContent = 'ゲームを起動できませんでした';
}

window.addEventListener('error', (event) => {
  showFatalError(`エラーが発生しました: ${event.message || 'unknown error'}`);
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || String(event.reason || 'unknown error');
  showFatalError(`エラーが発生しました: ${reason}`);
});

const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouchDevice) document.body.classList.add('touch-enabled');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: dom.canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
} catch (error) {
  showFatalError('このブラウザでは3D表示を開始できません。ブラウザを更新して再度お試しください。');
  throw error;
}

const pixelRatioLimit = isTouchDevice ? 1.5 : 1.8;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioLimit));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x5aa7d9);
scene.fog = new THREE.Fog(0x78b5d7, 32, 112);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  220,
);
camera.position.set(0, CONFIG.cameraHeight, CONFIG.cameraDistance + 2);

const hemiLight = new THREE.HemisphereLight(0xd9f4ff, 0x34462b, 1.45);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff2d6, 3.2);
sunLight.position.set(12, 20, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(isTouchDevice ? 1024 : 1536, isTouchDevice ? 1024 : 1536);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 70;
sunLight.shadow.camera.left = -22;
sunLight.shadow.camera.right = 22;
sunLight.shadow.camera.top = 26;
sunLight.shadow.camera.bottom = -26;
sunLight.shadow.bias = -0.00045;
scene.add(sunLight);

const rimLight = new THREE.DirectionalLight(0x78dcff, 1.25);
rimLight.position.set(-10, 7, -18);
scene.add(rimLight);

function createSkyDome() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x1b5f9b) },
      horizonColor: { value: new THREE.Color(0xaee7f3) },
      bottomColor: { value: new THREE.Color(0xf5c474) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 low = mix(bottomColor, horizonColor, smoothstep(-0.22, 0.08, h));
        vec3 color = mix(low, topColor, smoothstep(0.08, 0.72, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(150, 20, 12), material);
  scene.add(dome);
}
createSkyDome();

function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 256, 256);
  gradient.addColorStop(0, '#2e6d54');
  gradient.addColorStop(1, '#245844');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  context.strokeStyle = 'rgba(155, 236, 196, 0.15)';
  context.lineWidth = 3;
  for (let value = 0; value <= 256; value += 64) {
    context.beginPath();
    context.moveTo(value, 0);
    context.lineTo(value, 256);
    context.stroke();
    context.beginPath();
    context.moveTo(0, value);
    context.lineTo(256, value);
    context.stroke();
  }
  for (let y = 32; y < 256; y += 64) {
    for (let x = 32; x < 256; x += 64) {
      context.fillStyle = 'rgba(235, 255, 188, 0.08)';
      context.beginPath();
      context.arc(x, y, 6, 0, Math.PI * 2);
      context.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 24);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

const stageGroup = new THREE.Group();
stageGroup.name = 'Repair Grid Stage';
scene.add(stageGroup);

const ground = new THREE.Mesh(
  new THREE.BoxGeometry(31, 0.38, 84),
  new THREE.MeshStandardMaterial({
    map: createFloorTexture(),
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.02,
  }),
);
ground.position.set(0, -0.2, -32.5);
ground.receiveShadow = true;
stageGroup.add(ground);

const obstacleMaterial = new THREE.MeshStandardMaterial({
  color: 0x3f5362,
  roughness: 0.45,
  metalness: 0.62,
});
const obstacleAccent = new THREE.MeshStandardMaterial({
  color: 0x43e6f1,
  emissive: 0x087a88,
  emissiveIntensity: 1.35,
  roughness: 0.3,
  metalness: 0.45,
});
const obstacles = [];

function addObstacle(x, z, width, height, depth) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), obstacleMaterial);
  block.position.y = height / 2;
  block.castShadow = true;
  block.receiveShadow = true;
  group.add(block);
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.74, 0.055, depth + 0.018),
    obstacleAccent,
  );
  strip.position.set(0, height + 0.03, 0);
  strip.castShadow = false;
  group.add(strip);
  stageGroup.add(group);
  obstacles.push({ x, z, halfX: width / 2, halfZ: depth / 2, height });
}

addObstacle(-4.4, -11.5, 3.2, 0.72, 1.55);
addObstacle(4.1, -20.5, 3.5, 0.95, 1.45);
addObstacle(0, -31.5, 4.8, 0.82, 1.35);
addObstacle(-5.4, -41.2, 2.7, 1.05, 1.7);
addObstacle(5.3, -48.2, 2.9, 0.75, 1.55);

function addBoundaryRails() {
  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x163b4a,
    emissive: 0x0a7184,
    emissiveIntensity: 0.72,
    roughness: 0.38,
    metalness: 0.7,
  });
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 84), railMaterial);
    rail.position.set(side * 15.32, 0.18, -32.5);
    rail.castShadow = true;
    stageGroup.add(rail);
    for (let z = 6; z >= -72; z -= 5.5) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.8, 0.46), obstacleMaterial);
      post.position.set(side * 15.32, 0.75, z);
      post.castShadow = true;
      stageGroup.add(post);
    }
  }
}
addBoundaryRails();

const animatedScenery = [];

function addScenery() {
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xeefcff,
    roughness: 1,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
  });
  const cloudGeometry = new THREE.IcosahedronGeometry(1, 1);
  for (let index = 0; index < 12; index += 1) {
    const cloud = new THREE.Group();
    const side = index % 2 === 0 ? -1 : 1;
    cloud.position.set(side * (19 + (index % 3) * 4), 9 + (index % 4) * 1.8, 8 - index * 7.5);
    for (let puff = 0; puff < 4; puff += 1) {
      const mesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
      mesh.position.set((puff - 1.5) * 1.15, Math.sin(puff) * 0.4, 0);
      mesh.scale.set(1.5, 0.7 + puff * 0.08, 0.75);
      cloud.add(mesh);
    }
    scene.add(cloud);
    animatedScenery.push({ object: cloud, speed: 0.25 + index * 0.018, originX: cloud.position.x });
  }

  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x526b66,
    roughness: 0.94,
  });
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  for (let index = 0; index < 42; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.set(side * (17 + (index % 5) * 1.4), 0.2, 6 - index * 2.15);
    rock.scale.set(1 + (index % 3) * 0.5, 0.55 + (index % 4) * 0.2, 1.1);
    rock.rotation.set(index * 0.21, index * 0.47, index * 0.13);
    rock.castShadow = true;
    rock.receiveShadow = true;
    stageGroup.add(rock);
  }
}
addScenery();

class InputController {
  constructor() {
    this.keys = new Set();
    this.jumpQueued = false;
    this.attackQueued = false;
    this.dashQueued = false;
    this.joystick = { x: 0, y: 0, strength: 0, active: false, pointerId: null };
    this.bindKeyboard();
    this.bindTouch();
  }

  bindKeyboard() {
    const blockedCodes = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Space', 'KeyJ', 'KeyK', 'ShiftLeft', 'ShiftRight',
    ]);
    window.addEventListener('keydown', (event) => {
      if (blockedCodes.has(event.code)) event.preventDefault();
      if (event.code === 'Space' && !event.repeat) this.jumpQueued = true;
      if ((event.code === 'KeyJ' || event.code === 'KeyX') && !event.repeat) this.attackQueued = true;
      if ((event.code === 'KeyK' || event.code.startsWith('Shift')) && !event.repeat) this.dashQueued = true;
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.reset();
    });
  }

  bindTouch() {
    if (!dom.joystickZone || !dom.joystickBase) return;
    const updateJoystick = (clientX, clientY) => {
      const rect = dom.joystickBase.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radius = rect.width * 0.42;
      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const distance = Math.hypot(dx, dy);
      if (distance > radius) {
        dx = (dx / distance) * radius;
        dy = (dy / distance) * radius;
      }
      this.joystick.x = dx / radius;
      this.joystick.y = -dy / radius;
      this.joystick.strength = Math.min(1, distance / radius);
      dom.joystickKnob.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
    };
    const releaseJoystick = (event) => {
      if (event.pointerId !== this.joystick.pointerId) return;
      this.joystick.x = 0;
      this.joystick.y = 0;
      this.joystick.strength = 0;
      this.joystick.active = false;
      this.joystick.pointerId = null;
      dom.joystickKnob.style.transform = 'translate(-50%, -50%)';
    };

    dom.joystickZone.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.joystick.active = true;
      this.joystick.pointerId = event.pointerId;
      dom.joystickZone.setPointerCapture(event.pointerId);
      updateJoystick(event.clientX, event.clientY);
    });
    dom.joystickZone.addEventListener('pointermove', (event) => {
      if (!this.joystick.active || event.pointerId !== this.joystick.pointerId) return;
      updateJoystick(event.clientX, event.clientY);
    });
    dom.joystickZone.addEventListener('pointerup', releaseJoystick);
    dom.joystickZone.addEventListener('pointercancel', releaseJoystick);

    this.bindActionButton(dom.jumpButton, () => { this.jumpQueued = true; });
    this.bindActionButton(dom.attackButton, () => { this.attackQueued = true; });
    this.bindActionButton(dom.dashButton, () => { this.dashQueued = true; });
  }

  bindActionButton(button, callback) {
    if (!button) return;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.classList.add('pressed');
      callback();
    });
    for (const eventName of ['pointerup', 'pointercancel', 'pointerleave']) {
      button.addEventListener(eventName, () => button.classList.remove('pressed'));
    }
  }

  getMovement() {
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.joystick.active) {
      x += this.joystick.x;
      z -= this.joystick.y;
    }
    const length = Math.hypot(x, z);
    if (length > 1) {
      x /= length;
      z /= length;
    }
    const strength = this.joystick.active ? this.joystick.strength : Math.min(1, length);
    return { x, z, strength, active: length > 0.06 };
  }

  consumeJump() {
    const value = this.jumpQueued;
    this.jumpQueued = false;
    return value;
  }

  consumeAttack() {
    const value = this.attackQueued;
    this.attackQueued = false;
    return value;
  }

  consumeDash() {
    const value = this.dashQueued;
    this.dashQueued = false;
    return value;
  }

  reset() {
    this.keys.clear();
    this.jumpQueued = false;
    this.attackQueued = false;
    this.dashQueued = false;
    this.joystick.x = 0;
    this.joystick.y = 0;
    this.joystick.strength = 0;
    this.joystick.active = false;
    if (dom.joystickKnob) dom.joystickKnob.style.transform = 'translate(-50%, -50%)';
  }
}

const input = new InputController();

class GameAudio {
  constructor() {
    this.context = null;
    this.master = null;
  }

  unlock() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') this.context.resume();
  }

  tone(frequency, duration, options = {}) {
    if (!this.context || !this.master) return;
    const { type = 'sine', volume = 0.32, slide = 0, delay = 0 } = options;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(40, frequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + slide), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  play(name) {
    if (name === 'jump') this.tone(250, 0.16, { slide: 330, type: 'triangle' });
    if (name === 'dash') this.tone(190, 0.12, { slide: 680, type: 'sawtooth', volume: 0.22 });
    if (name === 'attack') this.tone(460, 0.11, { slide: -280, type: 'sawtooth', volume: 0.22 });
    if (name === 'hit') this.tone(125, 0.12, { slide: -55, type: 'square', volume: 0.25 });
    if (name === 'hurt') this.tone(92, 0.26, { slide: -40, type: 'sawtooth', volume: 0.3 });
    if (name === 'core') {
      this.tone(520, 0.14, { slide: 120, type: 'sine' });
      this.tone(760, 0.18, { slide: 130, type: 'sine', delay: 0.09 });
    }
    if (name === 'enemyDown') this.tone(170, 0.25, { slide: -105, type: 'square', volume: 0.24 });
    if (name === 'clear') {
      [440, 554, 659, 880].forEach((frequency, index) => {
        this.tone(frequency, 0.34, { type: 'triangle', delay: index * 0.12, volume: 0.22 });
      });
    }
  }
}

const audio = new GameAudio();

class ParticleSystem {
  constructor(maxParticles = 220) {
    this.maxParticles = maxParticles;
    this.items = [];
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.PointsMaterial({
      size: isTouchDevice ? 0.13 : 0.16,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  burst(position, color, count = 12, speed = 2.6, options = {}) {
    const tint = new THREE.Color(color);
    const { upward = 1.3, gravity = 5.5, life = 0.55 } = options;
    const available = Math.max(0, this.maxParticles - this.items.length);
    const amount = Math.min(count, available);
    for (let index = 0; index < amount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const horizontal = speed * (0.3 + Math.random() * 0.7);
      this.items.push({
        position: position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.24,
          (Math.random() - 0.5) * 0.18,
          (Math.random() - 0.5) * 0.24,
        )),
        velocity: new THREE.Vector3(
          Math.cos(angle) * horizontal,
          upward * (0.35 + Math.random() * 0.9),
          Math.sin(angle) * horizontal,
        ),
        color: tint.clone().offsetHSL((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.15),
        gravity,
        life: life * (0.65 + Math.random() * 0.65),
        maxLife: life,
      });
    }
  }

  update(delta) {
    let writeIndex = 0;
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const item = this.items[index];
      item.life -= delta;
      if (item.life <= 0) {
        this.items.splice(index, 1);
        continue;
      }
      item.velocity.y -= item.gravity * delta;
      item.position.addScaledVector(item.velocity, delta);
    }
    for (const item of this.items) {
      const offset = writeIndex * 3;
      this.positions[offset] = item.position.x;
      this.positions[offset + 1] = item.position.y;
      this.positions[offset + 2] = item.position.z;
      const lifeRatio = Math.min(1, item.life / item.maxLife);
      this.colors[offset] = item.color.r * lifeRatio;
      this.colors[offset + 1] = item.color.g * lifeRatio;
      this.colors[offset + 2] = item.color.b * lifeRatio;
      writeIndex += 1;
    }
    this.geometry.setDrawRange(0, writeIndex);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  clear() {
    this.items.length = 0;
    this.geometry.setDrawRange(0, 0);
  }
}

const particles = new ParticleSystem(isTouchDevice ? 160 : 240);
const temporaryEffects = [];

function spawnSlash(position, yaw, comboStep) {
  const geometry = new THREE.TorusGeometry(1.12 + comboStep * 0.08, 0.055, 7, 30, Math.PI * 1.35);
  const material = new THREE.MeshBasicMaterial({
    color: comboStep === 2 ? 0xfff06b : 0x8cffff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.position.y += 0.86;
  mesh.rotation.set(0, yaw, comboStep === 1 ? 0.55 : -0.72);
  mesh.scale.setScalar(0.7);
  scene.add(mesh);
  temporaryEffects.push({ mesh, life: 0.2, maxLife: 0.2, type: 'slash' });
}

function spawnShockwave(position, color = 0xff214f, scale = 1) {
  const geometry = new THREE.RingGeometry(0.35, 0.48, 26);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.position.y += 0.04;
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.setScalar(scale);
  scene.add(mesh);
  temporaryEffects.push({ mesh, life: 0.42, maxLife: 0.42, type: 'wave' });
}

function updateTemporaryEffects(delta) {
  for (let index = temporaryEffects.length - 1; index >= 0; index -= 1) {
    const effect = temporaryEffects[index];
    effect.life -= delta;
    const progress = 1 - effect.life / effect.maxLife;
    if (effect.type === 'slash') {
      effect.mesh.scale.setScalar(0.7 + progress * 0.62);
      effect.mesh.rotation.z += delta * 2.1;
    } else {
      effect.mesh.scale.multiplyScalar(1 + delta * 5.4);
    }
    effect.mesh.material.opacity = Math.max(0, (1 - progress) * 0.9);
    if (effect.life <= 0) {
      scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
      temporaryEffects.splice(index, 1);
    }
  }
}

function clearTemporaryEffects() {
  for (const effect of temporaryEffects) {
    scene.remove(effect.mesh);
    effect.mesh.geometry.dispose();
    effect.mesh.material.dispose();
  }
  temporaryEffects.length = 0;
}

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function dampAngle(current, target, lambda, delta) {
  const difference = normalizeAngle(target - current);
  return current + difference * (1 - Math.exp(-lambda * delta));
}

function damp(current, target, lambda, delta) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta));
}

function resolveObstacleCollision(position, elevation, radius = CONFIG.playerRadius) {
  position.x = THREE.MathUtils.clamp(position.x, CONFIG.stageMinX, CONFIG.stageMaxX);
  position.z = THREE.MathUtils.clamp(position.z, CONFIG.stageMinZ, CONFIG.stageMaxZ);
  for (const obstacle of obstacles) {
    if (elevation > obstacle.height + 0.1) continue;
    const minX = obstacle.x - obstacle.halfX;
    const maxX = obstacle.x + obstacle.halfX;
    const minZ = obstacle.z - obstacle.halfZ;
    const maxZ = obstacle.z + obstacle.halfZ;
    const closestX = THREE.MathUtils.clamp(position.x, minX, maxX);
    const closestZ = THREE.MathUtils.clamp(position.z, minZ, maxZ);
    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq >= radius * radius) continue;
    if (distanceSq > 0.00001) {
      const distance = Math.sqrt(distanceSq);
      const push = radius - distance;
      position.x += (dx / distance) * push;
      position.z += (dz / distance) * push;
    } else {
      const pushLeft = Math.abs(position.x - minX);
      const pushRight = Math.abs(maxX - position.x);
      const pushBack = Math.abs(position.z - minZ);
      const pushFront = Math.abs(maxZ - position.z);
      const smallest = Math.min(pushLeft, pushRight, pushBack, pushFront);
      if (smallest === pushLeft) position.x = minX - radius;
      else if (smallest === pushRight) position.x = maxX + radius;
      else if (smallest === pushBack) position.z = minZ - radius;
      else position.z = maxZ + radius;
    }
  }
}

class FeniAnimator {
  constructor(model) {
    this.model = model;
    this.elapsed = 0;
    this.gaitPhase = 0;
    this.bones = new Map();
    this.rest = new Map();
    this.tempEuler = new THREE.Euler();
    this.tempQuaternion = new THREE.Quaternion();
    this.targetQuaternion = new THREE.Quaternion();
    this.targetPosition = new THREE.Vector3();
    this.targetScale = new THREE.Vector3();
    const names = [
      'Bone_001', 'Bone_003', 'Bone_002', 'Bone_017', 'Bone_016',
      'Bone_008', 'Bone_007', 'Bone_006', 'Bone_005',
      'Bone_013', 'Bone_012', 'Bone_011', 'Bone_010',
      'Bone_022', 'Bone_021', 'Bone_020',
      'Bone_028', 'Bone_027', 'Bone_026',
      'Bone_031', 'Bone_030', 'Bone_029',
    ];
    for (const name of names) {
      const bone = model.getObjectByName(name);
      if (!bone) continue;
      this.bones.set(name, bone);
      this.rest.set(name, {
        position: bone.position.clone(),
        quaternion: bone.quaternion.clone(),
        scale: bone.scale.clone(),
      });
    }
  }

  poseBone(name, rotation, options, blend) {
    const bone = this.bones.get(name);
    const rest = this.rest.get(name);
    if (!bone || !rest) return;
    const [x = 0, y = 0, z = 0] = rotation || [];
    this.tempEuler.set(x, y, z, 'XYZ');
    this.tempQuaternion.setFromEuler(this.tempEuler);
    this.targetQuaternion.copy(rest.quaternion).multiply(this.tempQuaternion);
    bone.quaternion.slerp(this.targetQuaternion, blend);
    this.targetPosition.copy(rest.position);
    if (options?.position) this.targetPosition.add(options.position);
    bone.position.lerp(this.targetPosition, blend);
    this.targetScale.copy(rest.scale);
    if (options?.scale) this.targetScale.multiply(options.scale);
    bone.scale.lerp(this.targetScale, blend);
  }

  update(delta, state, moveAmount, verticalVelocity, attackProgress, comboStep, landedPulse) {
    this.elapsed += delta;
    const moving = state === 'walk' || state === 'run';
    const gaitSpeed = state === 'run' ? 11.5 : 7.4;
    if (moving) this.gaitPhase += delta * gaitSpeed * Math.max(0.45, moveAmount);
    const gait = this.gaitPhase;
    const swing = Math.sin(gait);
    const opposite = Math.sin(gait + Math.PI);
    const step = Math.abs(Math.cos(gait));
    const blend = 1 - Math.exp(-17 * delta);

    let bodyBob = 0;
    let bodyLean = 0;
    let chestTwist = 0;
    let legSwing = 0;
    let kneeLeft = 0;
    let kneeRight = 0;
    let armSwing = 0;
    let tailSway = Math.sin(this.elapsed * 2.1) * 0.055;
    let headYaw = Math.sin(this.elapsed * 0.72) * 0.035;
    let headPitch = Math.sin(this.elapsed * 1.35) * 0.018;

    if (state === 'idle') {
      const breath = Math.sin(this.elapsed * 2.25);
      bodyBob = breath * 0.008;
      tailSway = Math.sin(this.elapsed * 1.45) * 0.1;
      headYaw = Math.sin(this.elapsed * 0.58) * 0.075;
      headPitch = Math.sin(this.elapsed * 0.91) * 0.025;
    } else if (moving) {
      const runFactor = state === 'run' ? 1 : 0.62;
      bodyBob = step * 0.042 * runFactor;
      bodyLean = -0.08 * runFactor;
      chestTwist = swing * 0.085 * runFactor;
      legSwing = 0.68 * runFactor;
      kneeLeft = Math.max(0, -swing) * 0.72 * runFactor;
      kneeRight = Math.max(0, -opposite) * 0.72 * runFactor;
      armSwing = 0.36 * runFactor;
      tailSway = swing * 0.16 * runFactor;
      headPitch = -bodyLean * 0.45 + step * 0.015;
    } else if (state === 'jump' || state === 'fall') {
      const rising = verticalVelocity > 0;
      bodyLean = rising ? -0.12 : 0.08;
      bodyBob = rising ? 0.025 : -0.01;
      legSwing = rising ? 0.22 : -0.08;
      kneeLeft = rising ? 0.7 : 0.32;
      kneeRight = rising ? 0.62 : 0.4;
      armSwing = rising ? -0.32 : 0.18;
      tailSway = Math.sin(this.elapsed * 5.5) * 0.13;
      headPitch = rising ? -0.08 : 0.07;
    } else if (state === 'dash') {
      bodyLean = -0.3;
      legSwing = 0.36;
      kneeLeft = 0.52;
      kneeRight = 0.28;
      armSwing = -0.48;
      tailSway = -0.22;
      headPitch = -0.1;
    }

    if (state === 'attack') {
      const arc = Math.sin(Math.min(1, attackProgress) * Math.PI);
      bodyLean = -0.13 * arc;
      chestTwist = (comboStep === 1 ? -1 : 1) * 0.42 * arc;
      armSwing = (comboStep === 1 ? 1 : -1) * 0.95 * arc;
      headYaw = -chestTwist * 0.35;
      tailSway = -chestTwist * 0.5;
    }

    const landingSquash = Math.max(0, landedPulse);
    bodyBob -= landingSquash * 0.055;

    this.poseBone('Bone_001', [bodyLean, 0, chestTwist * 0.18], {
      position: new THREE.Vector3(0, bodyBob, 0),
      scale: new THREE.Vector3(1 + landingSquash * 0.055, 1 - landingSquash * 0.09, 1 + landingSquash * 0.055),
    }, blend);
    this.poseBone('Bone_003', [bodyLean * 0.35, chestTwist, -chestTwist * 0.2], null, blend);
    this.poseBone('Bone_002', [-bodyLean * 0.15, -chestTwist * 0.42, chestTwist * 0.14], {
      scale: new THREE.Vector3(1, 1 + Math.sin(this.elapsed * 2.25) * 0.008, 1),
    }, blend);
    this.poseBone('Bone_017', [headPitch, headYaw, -chestTwist * 0.13], null, blend);
    this.poseBone('Bone_016', [headPitch * 0.4, headYaw * 0.55, 0], null, blend);

    this.poseBone('Bone_008', [swing * legSwing, 0, 0.025], null, blend);
    this.poseBone('Bone_007', [-kneeLeft, 0, 0], null, blend);
    this.poseBone('Bone_006', [kneeLeft * 0.55 - swing * 0.12, 0, 0], null, blend);
    this.poseBone('Bone_013', [opposite * legSwing, 0, -0.025], null, blend);
    this.poseBone('Bone_012', [-kneeRight, 0, 0], null, blend);
    this.poseBone('Bone_011', [kneeRight * 0.55 - opposite * 0.12, 0, 0], null, blend);

    this.poseBone('Bone_022', [-opposite * armSwing, -chestTwist * 0.18, tailSway * 0.08], null, blend);
    this.poseBone('Bone_021', [Math.max(0, opposite) * armSwing * 0.28, 0, 0], null, blend);
    this.poseBone('Bone_028', [-swing * armSwing, chestTwist * 0.16, -tailSway * 0.08], null, blend);
    this.poseBone('Bone_027', [Math.max(0, swing) * armSwing * 0.25, 0, 0], null, blend);

    this.poseBone('Bone_031', [0, tailSway, Math.sin(this.elapsed * 2.6) * 0.045], null, blend);
    this.poseBone('Bone_030', [0, tailSway * 0.7, 0], null, blend);
    this.poseBone('Bone_029', [0, tailSway * 0.42, 0], null, blend);
  }
}

const player = {
  group: new THREE.Group(),
  model: null,
  animator: null,
  ready: false,
  velocity: new THREE.Vector3(),
  dashDirection: new THREE.Vector3(0, 0, -1),
  verticalVelocity: 0,
  grounded: true,
  coyoteTimer: 0,
  jumpBuffer: 0,
  health: CONFIG.playerMaxHealth,
  invulnerability: 0,
  attackTimer: 0,
  attackCooldown: 0,
  attackConnected: false,
  comboStep: 0,
  comboWindow: 0,
  dashTimer: 0,
  dashCooldown: 0,
  landedPulse: 0,
  footstepTimer: 0,
  state: 'idle',
};
player.group.name = 'Feni Player';
player.group.position.set(0, CONFIG.groundY, 4.2);
scene.add(player.group);

const tempMove = new THREE.Vector3();
const tempForward = new THREE.Vector3();
const tempPosition = new THREE.Vector3();

function getPlayerForward(target = new THREE.Vector3()) {
  return target.set(
    Math.sin(player.group.rotation.y),
    0,
    Math.cos(player.group.rotation.y),
  ).normalize();
}

function createFootDust() {
  const position = player.group.position.clone();
  position.y += 0.08;
  particles.burst(position, 0xa6d8b3, isTouchDevice ? 2 : 4, 0.7, {
    upward: 0.35,
    gravity: 1.8,
    life: 0.3,
  });
}

function beginPlayerAttack() {
  if (player.attackCooldown > 0 || player.dashTimer > 0) return;
  player.comboStep = player.comboWindow > 0 ? (player.comboStep + 1) % 3 : 0;
  player.attackTimer = 0.42;
  player.attackCooldown = 0.31;
  player.comboWindow = 0.62;
  player.attackConnected = false;
  audio.play('attack');
}

function beginPlayerDash(movement) {
  if (player.dashCooldown > 0 || player.attackTimer > 0) return;
  if (movement.active) player.dashDirection.set(movement.x, 0, movement.z).normalize();
  else getPlayerForward(player.dashDirection);
  player.dashTimer = CONFIG.dashDuration;
  player.dashCooldown = CONFIG.dashCooldown;
  player.invulnerability = Math.max(player.invulnerability, CONFIG.dashDuration + 0.08);
  audio.play('dash');
  particles.burst(player.group.position.clone().add(new THREE.Vector3(0, 0.45, 0)), 0x65f7ff, 12, 2.2, {
    upward: 0.6,
    gravity: 1.5,
    life: 0.34,
  });
}

function updatePlayer(delta, elapsed) {
  if (!player.ready) return;
  if (!game.active) {
    player.animator.update(delta, 'idle', 0, 0, 0, player.comboStep, 0);
    return;
  }

  player.invulnerability = Math.max(0, player.invulnerability - delta);
  player.attackCooldown = Math.max(0, player.attackCooldown - delta);
  player.comboWindow = Math.max(0, player.comboWindow - delta);
  player.dashCooldown = Math.max(0, player.dashCooldown - delta);
  player.landedPulse = Math.max(0, player.landedPulse - delta * 4.8);

  const movement = input.getMovement();
  if (input.consumeAttack()) beginPlayerAttack();
  if (input.consumeDash()) beginPlayerDash(movement);
  if (input.consumeJump()) player.jumpBuffer = 0.13;
  else player.jumpBuffer = Math.max(0, player.jumpBuffer - delta);

  if (player.grounded) player.coyoteTimer = 0.13;
  else player.coyoteTimer = Math.max(0, player.coyoteTimer - delta);

  if (player.jumpBuffer > 0 && player.coyoteTimer > 0 && player.dashTimer <= 0) {
    player.verticalVelocity = CONFIG.jumpSpeed;
    player.grounded = false;
    player.coyoteTimer = 0;
    player.jumpBuffer = 0;
    audio.play('jump');
    createFootDust();
  }

  let moveAmount = movement.strength;
  if (player.dashTimer > 0) {
    player.dashTimer = Math.max(0, player.dashTimer - delta);
    tempMove.copy(player.dashDirection).multiplyScalar(CONFIG.dashSpeed);
    player.velocity.x = tempMove.x;
    player.velocity.z = tempMove.z;
    moveAmount = 1;
  } else {
    const requestedSpeed = movement.strength < 0.68
      ? CONFIG.walkSpeed * THREE.MathUtils.mapLinear(movement.strength, 0, 0.68, 0, 1)
      : THREE.MathUtils.lerp(CONFIG.walkSpeed, CONFIG.runSpeed, (movement.strength - 0.68) / 0.32);
    const speedPenalty = player.attackTimer > 0 ? 0.58 : 1;
    const targetVelocityX = movement.active ? movement.x * requestedSpeed * speedPenalty : 0;
    const targetVelocityZ = movement.active ? movement.z * requestedSpeed * speedPenalty : 0;
    player.velocity.x = damp(player.velocity.x, targetVelocityX, player.grounded ? 13 : 4.8, delta);
    player.velocity.z = damp(player.velocity.z, targetVelocityZ, player.grounded ? 13 : 4.8, delta);
  }

  const horizontalSpeed = Math.hypot(player.velocity.x, player.velocity.z);
  if (horizontalSpeed > 0.15) {
    const targetYaw = Math.atan2(player.velocity.x, player.velocity.z);
    player.group.rotation.y = dampAngle(player.group.rotation.y, targetYaw, CONFIG.turnSpeed, delta);
  }

  player.group.position.x += player.velocity.x * delta;
  player.group.position.z += player.velocity.z * delta;
  resolveObstacleCollision(player.group.position, player.group.position.y);

  const wasGrounded = player.grounded;
  player.verticalVelocity += CONFIG.gravity * delta;
  player.group.position.y += player.verticalVelocity * delta;
  if (player.group.position.y <= CONFIG.groundY) {
    player.group.position.y = CONFIG.groundY;
    if (!wasGrounded && player.verticalVelocity < -3.2) {
      player.landedPulse = Math.min(1, Math.abs(player.verticalVelocity) / 10);
      particles.burst(player.group.position.clone().add(new THREE.Vector3(0, 0.08, 0)), 0xb6d4ad, 10, 1.35, {
        upward: 0.42,
        gravity: 2.2,
        life: 0.38,
      });
      cameraRig.shake = Math.max(cameraRig.shake, 0.11);
    }
    player.verticalVelocity = 0;
    player.grounded = true;
  } else {
    player.grounded = false;
  }

  if (player.attackTimer > 0) {
    player.attackTimer = Math.max(0, player.attackTimer - delta);
    const attackProgress = 1 - player.attackTimer / 0.42;
    if (!player.attackConnected && attackProgress > 0.25) {
      player.attackConnected = true;
      const forward = getPlayerForward(tempForward);
      const slashPosition = player.group.position.clone().addScaledVector(forward, 0.72);
      spawnSlash(slashPosition, player.group.rotation.y, player.comboStep);
      damageEnemiesInArc(player.comboStep === 2 ? 34 : 24, 1.78, 0.24);
    }
  }

  if (player.grounded && horizontalSpeed > 1.2) {
    player.footstepTimer -= delta;
    if (player.footstepTimer <= 0) {
      createFootDust();
      player.footstepTimer = horizontalSpeed > 4 ? 0.16 : 0.25;
    }
  } else {
    player.footstepTimer = 0;
  }

  let state = 'idle';
  if (player.attackTimer > 0) state = 'attack';
  else if (player.dashTimer > 0) state = 'dash';
  else if (!player.grounded) state = player.verticalVelocity >= 0 ? 'jump' : 'fall';
  else if (horizontalSpeed > 3.35) state = 'run';
  else if (horizontalSpeed > 0.25) state = 'walk';
  player.state = state;

  const attackProgress = player.attackTimer > 0 ? 1 - player.attackTimer / 0.42 : 0;
  player.animator.update(
    delta,
    state,
    THREE.MathUtils.clamp(horizontalSpeed / CONFIG.runSpeed, 0, 1),
    player.verticalVelocity,
    attackProgress,
    player.comboStep,
    player.landedPulse,
  );

  if (player.model) {
    player.model.visible = player.invulnerability <= 0 || Math.floor(elapsed * 18) % 2 === 0;
  }
}

function takePlayerDamage(amount, sourcePosition, knockback = 4.5) {
  if (!game.active || player.invulnerability > 0 || player.dashTimer > 0) return false;
  player.health = Math.max(0, player.health - amount);
  player.invulnerability = 0.85;
  const away = tempMove.copy(player.group.position).sub(sourcePosition);
  away.y = 0;
  if (away.lengthSq() < 0.001) away.set(0, 0, 1);
  away.normalize();
  player.velocity.addScaledVector(away, knockback);
  player.verticalVelocity = Math.max(player.verticalVelocity, 2.4);
  audio.play('hurt');
  particles.burst(player.group.position.clone().add(new THREE.Vector3(0, 0.85, 0)), 0xff4a5f, 18, 3.4, {
    upward: 1.8,
    gravity: 6,
    life: 0.54,
  });
  cameraRig.shake = Math.max(cameraRig.shake, 0.34);
  if (dom.damageFlash) {
    dom.damageFlash.classList.remove('active');
    requestAnimationFrame(() => dom.damageFlash.classList.add('active'));
  }
  updateHud();
  if (player.health <= 0) endGame(false);
  return true;
}

const game = {
  active: false,
  loaded: false,
  startTime: 0,
  elapsed: 0,
  cores: 0,
  defeated: 0,
  checkpointActivated: false,
  portalUnlocked: false,
  objectiveKey: '',
  toastTimer: 0,
};

const enemies = [];
const projectiles = [];
const repairCores = [];
let portal = null;
let checkpoint = null;
let bossEnemy = null;

const projectileGeometry = new THREE.IcosahedronGeometry(0.14, 1);
const projectileMaterials = {
  red: new THREE.MeshBasicMaterial({
    color: 0xff214f,
    toneMapped: false,
  }),
  violet: new THREE.MeshBasicMaterial({
    color: 0xb451ff,
    toneMapped: false,
  }),
};

function spawnEnemyProjectile(origin, direction, options = {}) {
  const {
    speed = 7,
    range = 13,
    damage = 14,
    radius = 0.28,
    color = 'red',
    scale = 1,
  } = options;
  const mesh = new THREE.Mesh(projectileGeometry, projectileMaterials[color] || projectileMaterials.red);
  mesh.position.copy(origin);
  mesh.scale.setScalar(scale);
  scene.add(mesh);
  projectiles.push({
    mesh,
    origin: origin.clone(),
    velocity: direction.clone().normalize().multiplyScalar(speed),
    range,
    damage,
    radius,
    life: range / speed + 0.4,
    color: color === 'violet' ? 0xb451ff : 0xff214f,
    baseScale: scale,
  });
}

function removeProjectile(index) {
  const projectile = projectiles[index];
  scene.remove(projectile.mesh);
  projectiles.splice(index, 1);
}

function projectileHitsObstacle(position) {
  for (const obstacle of obstacles) {
    if (position.y > obstacle.height + 0.2) continue;
    if (
      position.x > obstacle.x - obstacle.halfX
      && position.x < obstacle.x + obstacle.halfX
      && position.z > obstacle.z - obstacle.halfZ
      && position.z < obstacle.z + obstacle.halfZ
    ) return true;
  }
  return false;
}

function updateProjectiles(delta, elapsed) {
  for (let index = projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = projectiles[index];
    projectile.life -= delta;
    projectile.mesh.position.addScaledVector(projectile.velocity, delta);
    projectile.mesh.rotation.x += delta * 7;
    projectile.mesh.rotation.y += delta * 9;
    const pulse = 0.88 + Math.sin(elapsed * 18 + index) * 0.16;
    projectile.mesh.scale.setScalar(projectile.baseScale * pulse);

    const traveled = projectile.mesh.position.distanceTo(projectile.origin);
    if (projectile.life <= 0 || traveled >= projectile.range || projectileHitsObstacle(projectile.mesh.position)) {
      particles.burst(projectile.mesh.position, projectile.color, 5, 1.2, {
        upward: 0.4,
        gravity: 1.5,
        life: 0.24,
      });
      removeProjectile(index);
      continue;
    }

    tempPosition.copy(player.group.position);
    tempPosition.y += 0.72;
    if (projectile.mesh.position.distanceToSquared(tempPosition) < (projectile.radius + 0.48) ** 2) {
      takePlayerDamage(projectile.damage, projectile.mesh.position, 3.6);
      particles.burst(projectile.mesh.position, projectile.color, 10, 2.2, {
        upward: 1.1,
        gravity: 4,
        life: 0.4,
      });
      removeProjectile(index);
    }
  }
}

function clearProjectiles() {
  for (const projectile of projectiles) scene.remove(projectile.mesh);
  projectiles.length = 0;
}

class Enemy {
  constructor(type, x, z, options = {}) {
    this.type = type;
    this.seed = Math.random() * Math.PI * 2;
    this.spawn = new THREE.Vector3(x, 0, z);
    this.velocity = new THREE.Vector3();
    this.normalScale = new THREE.Vector3(1, 1, 1);
    this.lastDelta = 0;
    this.state = 'idle';
    this.dead = false;
    this.removed = false;
    this.deathTimer = 0;
    this.windup = 0;
    this.windupTotal = 1;
    this.attackKind = '';
    this.attackCooldown = 0.5 + Math.random() * 0.6;
    this.aggro = false;
    this.patrolAngle = Math.random() * Math.PI * 2;
    this.hitFlash = 0;
    this.pattern = 0;

    if (type === 'crawler') {
      this.model = createCrawlerModel();
      this.maxHealth = options.health || 52;
      this.speed = options.speed || 2.7;
      this.radius = 0.65;
      this.aggroRange = 9.5;
      this.attackRange = 1.4;
      this.damage = 13;
      this.windupDuration = 0.52;
    } else if (type === 'drone') {
      this.model = createDroneModel();
      this.maxHealth = options.health || 44;
      this.speed = options.speed || 2.45;
      this.radius = 0.68;
      this.aggroRange = 12;
      this.attackRange = 7.5;
      this.damage = 12;
      this.windupDuration = 0.72;
    } else {
      this.model = createGuardianModel();
      this.maxHealth = options.health || 220;
      this.speed = options.speed || 2.25;
      this.radius = 1.05;
      this.aggroRange = 16;
      this.attackRange = 2.25;
      this.damage = 22;
      this.windupDuration = 0.8;
    }
    this.health = this.maxHealth;
    this.model.position.copy(this.spawn);
    this.model.userData.enemy = this;
    scene.add(this.model);
  }

  startAttack(kind, duration = this.windupDuration) {
    this.state = 'windup';
    this.attackKind = kind;
    this.windup = duration;
    this.windupTotal = duration;
    this.velocity.multiplyScalar(0.2);
  }

  executeAttack() {
    const toPlayer = tempMove.copy(player.group.position).sub(this.model.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();
    if (distance > 0.001) toPlayer.normalize();
    else toPlayer.set(0, 0, 1);

    if (this.attackKind === 'melee') {
      spawnShockwave(this.model.position, this.type === 'boss' ? 0xb451ff : 0xff214f, this.type === 'boss' ? 1.25 : 0.72);
      if (distance < this.attackRange + 0.65) {
        takePlayerDamage(this.damage, this.model.position, this.type === 'boss' ? 7 : 4.5);
      }
      cameraRig.shake = Math.max(cameraRig.shake, this.type === 'boss' ? 0.24 : 0.09);
    } else if (this.attackKind === 'shot') {
      const origin = this.model.position.clone().add(new THREE.Vector3(0, 1.04, 0));
      tempPosition.copy(player.group.position).add(new THREE.Vector3(0, 0.72, 0));
      const direction = tempPosition.sub(origin).normalize();
      spawnEnemyProjectile(origin, direction, {
        speed: 7.2,
        range: 13,
        damage: this.damage,
        radius: 0.25,
        color: 'red',
      });
    } else if (this.attackKind === 'burst') {
      const origin = this.model.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      const baseAngle = Math.atan2(toPlayer.x, toPlayer.z);
      for (let index = -2; index <= 2; index += 1) {
        const angle = baseAngle + index * 0.22;
        const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
        spawnEnemyProjectile(origin, direction, {
          speed: 6.4,
          range: 12,
          damage: 13,
          radius: 0.3,
          color: 'violet',
          scale: 1.18,
        });
      }
      spawnShockwave(this.model.position, 0xb451ff, 1.4);
      cameraRig.shake = Math.max(cameraRig.shake, 0.2);
    }

    this.state = 'recover';
    this.attackCooldown = this.type === 'boss'
      ? (this.health < this.maxHealth * 0.5 ? 1.1 : 1.45)
      : (this.type === 'drone' ? 1.65 : 1.05);
  }

  update(delta, elapsed) {
    this.lastDelta = delta;
    if (this.removed) return;
    if (this.dead) {
      this.deathTimer -= delta;
      this.model.rotation.y += delta * 5.5;
      this.model.rotation.z += delta * 2.2;
      this.model.scale.multiplyScalar(Math.max(0.01, 1 - delta * 3.4));
      this.model.position.y += delta * 1.1;
      if (this.deathTimer <= 0) {
        scene.remove(this.model);
        this.removed = true;
      }
      return;
    }

    this.hitFlash = Math.max(0, this.hitFlash - delta);
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    const toPlayerX = player.group.position.x - this.model.position.x;
    const toPlayerZ = player.group.position.z - this.model.position.z;
    const distance = Math.hypot(toPlayerX, toPlayerZ);
    if (distance < this.aggroRange || (this.type === 'boss' && player.group.position.z < -47)) this.aggro = true;

    let moveAmount = 0;
    let telegraph = 0;
    if (this.windup > 0) {
      this.windup -= delta;
      telegraph = THREE.MathUtils.clamp(1 - this.windup / this.windupTotal, 0, 1);
      this.model.scale.setScalar(1 + Math.sin(telegraph * Math.PI * 6) * 0.025 + telegraph * 0.035);
      if (this.windup <= 0) this.executeAttack();
    } else {
      this.model.scale.lerp(this.normalScale, 1 - Math.exp(-12 * delta));
      if (this.aggro && game.active) {
        if (this.type === 'drone') {
          if (distance < 4.4) {
            this.velocity.x = damp(this.velocity.x, (-toPlayerX / Math.max(distance, 0.01)) * this.speed, 5, delta);
            this.velocity.z = damp(this.velocity.z, (-toPlayerZ / Math.max(distance, 0.01)) * this.speed, 5, delta);
            moveAmount = 0.8;
          } else if (distance > 7.2) {
            this.velocity.x = damp(this.velocity.x, (toPlayerX / distance) * this.speed, 5, delta);
            this.velocity.z = damp(this.velocity.z, (toPlayerZ / distance) * this.speed, 5, delta);
            moveAmount = 0.8;
          } else {
            const strafe = Math.sin(elapsed * 1.25 + this.seed);
            this.velocity.x = damp(this.velocity.x, (toPlayerZ / distance) * this.speed * strafe, 4, delta);
            this.velocity.z = damp(this.velocity.z, (-toPlayerX / distance) * this.speed * strafe, 4, delta);
            moveAmount = 0.45;
          }
          if (this.attackCooldown <= 0 && distance < this.attackRange) this.startAttack('shot');
        } else {
          const stopDistance = this.type === 'boss' ? 1.65 : 1.05;
          if (distance > stopDistance) {
            const phaseSpeed = this.type === 'boss' && this.health < this.maxHealth * 0.5
              ? this.speed * 1.3
              : this.speed;
            this.velocity.x = damp(this.velocity.x, (toPlayerX / distance) * phaseSpeed, 6, delta);
            this.velocity.z = damp(this.velocity.z, (toPlayerZ / distance) * phaseSpeed, 6, delta);
            moveAmount = 1;
          } else {
            this.velocity.x = damp(this.velocity.x, 0, 10, delta);
            this.velocity.z = damp(this.velocity.z, 0, 10, delta);
          }
          if (this.attackCooldown <= 0) {
            if (this.type === 'boss' && this.pattern % 3 === 2 && distance < 9.5) {
              this.pattern += 1;
              this.startAttack('burst', 1.05);
            } else if (distance < this.attackRange + 0.35) {
              this.pattern += 1;
              this.startAttack('melee', this.type === 'boss' ? 0.82 : 0.5);
            }
          }
        }
      } else {
        this.patrolAngle += delta * (0.35 + (this.seed % 0.35));
        const targetX = this.spawn.x + Math.cos(this.patrolAngle) * 1.1;
        const targetZ = this.spawn.z + Math.sin(this.patrolAngle) * 1.1;
        this.velocity.x = damp(this.velocity.x, (targetX - this.model.position.x) * 0.8, 3, delta);
        this.velocity.z = damp(this.velocity.z, (targetZ - this.model.position.z) * 0.8, 3, delta);
        moveAmount = 0.28;
      }

      this.model.position.x += this.velocity.x * delta;
      this.model.position.z += this.velocity.z * delta;
      if (this.type !== 'drone') resolveObstacleCollision(this.model.position, 0, this.radius);
      else {
        this.model.position.x = THREE.MathUtils.clamp(this.model.position.x, CONFIG.stageMinX, CONFIG.stageMaxX);
        this.model.position.z = THREE.MathUtils.clamp(this.model.position.z, CONFIG.stageMinZ, CONFIG.stageMaxZ);
      }
    }

    const faceYaw = Math.atan2(toPlayerX, toPlayerZ);
    this.model.rotation.y = dampAngle(this.model.rotation.y, faceYaw, this.type === 'boss' ? 5 : 8, delta);
    animateEnemyModel(this, elapsed, moveAmount, telegraph);

    if (distance < this.radius + CONFIG.playerRadius && this.windup <= 0 && this.type !== 'drone') {
      const pushX = toPlayerX / Math.max(distance, 0.001);
      const pushZ = toPlayerZ / Math.max(distance, 0.001);
      player.group.position.x += pushX * delta * 1.25;
      player.group.position.z += pushZ * delta * 1.25;
    }

    if (this === bossEnemy) updateBossHud();
  }

  takeDamage(amount, attackOrigin) {
    if (this.dead) return false;
    this.health = Math.max(0, this.health - amount);
    this.aggro = true;
    this.windup = 0;
    this.state = 'hit';
    this.attackCooldown = Math.max(this.attackCooldown, 0.34);
    const away = tempMove.copy(this.model.position).sub(attackOrigin);
    away.y = 0;
    if (away.lengthSq() > 0.001) {
      away.normalize();
      const resistance = this.type === 'boss' ? 0.35 : 1;
      this.model.position.addScaledVector(away, 0.42 * resistance);
    }
    const hitPosition = this.model.position.clone().add(new THREE.Vector3(0, this.type === 'boss' ? 1.2 : 0.72, 0));
    particles.burst(hitPosition, this.type === 'boss' ? 0xc163ff : 0xff385c, this.type === 'boss' ? 20 : 12, 3.3, {
      upward: 1.5,
      gravity: 5.5,
      life: 0.5,
    });
    audio.play('hit');
    cameraRig.shake = Math.max(cameraRig.shake, this.type === 'boss' ? 0.16 : 0.08);
    if (this.health <= 0) this.die();
    return true;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.deathTimer = this.type === 'boss' ? 1.25 : 0.72;
    game.defeated += 1;
    audio.play('enemyDown');
    spawnShockwave(this.model.position, this.type === 'boss' ? 0x8c5fff : 0xff214f, this.type === 'boss' ? 2.2 : 0.9);
    const burstPosition = this.model.position.clone().add(new THREE.Vector3(0, this.type === 'boss' ? 1.1 : 0.6, 0));
    particles.burst(burstPosition, this.type === 'boss' ? 0xc16cff : 0xff304f, this.type === 'boss' ? 46 : 22, this.type === 'boss' ? 5 : 3.5, {
      upward: this.type === 'boss' ? 3.4 : 2,
      gravity: 6,
      life: this.type === 'boss' ? 0.95 : 0.65,
    });
    if (this.type !== 'boss') player.health = Math.min(CONFIG.playerMaxHealth, player.health + 4);
    evaluateObjective(true);
    updateHud();
  }
}

function damageEnemiesInArc(damage, range, minimumDot) {
  const forward = getPlayerForward(new THREE.Vector3());
  let connected = false;
  for (const enemy of enemies) {
    if (enemy.dead || enemy.removed) continue;
    const toEnemy = enemy.model.position.clone().sub(player.group.position);
    toEnemy.y = 0;
    const distance = toEnemy.length();
    if (distance > range + enemy.radius || distance < 0.001) continue;
    toEnemy.divideScalar(distance);
    if (forward.dot(toEnemy) < minimumDot) continue;
    enemy.takeDamage(damage, player.group.position);
    connected = true;
  }
  if (connected) player.comboWindow = Math.max(player.comboWindow, 0.74);
}

function createPortalModel() {
  const group = new THREE.Group();
  group.name = 'Purification Gate';
  const lockedMaterial = new THREE.MeshStandardMaterial({
    color: 0x5b2137,
    emissive: 0x6c0822,
    emissiveIntensity: 1,
    roughness: 0.34,
    metalness: 0.65,
  });
  const activeMaterial = new THREE.MeshStandardMaterial({
    color: 0x75f8ff,
    emissive: 0x15cddd,
    emissiveIntensity: 2.8,
    roughness: 0.2,
    metalness: 0.38,
  });
  const ringGeometry = new THREE.TorusGeometry(1.45, 0.16, 10, 42);
  const ringA = new THREE.Mesh(ringGeometry, lockedMaterial);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.065, 8, 34), lockedMaterial);
  ringA.castShadow = true;
  ringB.rotation.z = Math.PI / 4;
  group.add(ringA, ringB);
  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(1.22, 40),
    new THREE.MeshBasicMaterial({
      color: 0x471226,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  inner.position.z = -0.02;
  group.add(inner);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.25, 0.42, 16), obstacleMaterial);
  base.position.y = -1.54;
  base.castShadow = true;
  group.add(base);
  const light = new THREE.PointLight(0xff2455, 0.7, 8, 2);
  group.add(light);
  group.position.set(0, 1.65, -68.2);
  group.userData.parts = { ringA, ringB, inner, light, lockedMaterial, activeMaterial };
  scene.add(group);
  return group;
}

function createCheckpointModel() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0x84ffb3,
    emissive: 0x1cb763,
    emissiveIntensity: 1.7,
    roughness: 0.25,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 8, 32), material);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.07;
  group.add(ring);
  for (const x of [-1.05, 1.05]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 0.16), material);
    post.position.set(x, 0.6, 0);
    group.add(post);
  }
  group.position.set(0, 0, -34.5);
  group.userData.ring = ring;
  scene.add(group);
  return group;
}

function spawnCore(x, z) {
  const model = createRepairCoreModel();
  model.position.set(x, 0.88, z);
  model.userData.baseY = 0.88;
  model.userData.collected = false;
  scene.add(model);
  repairCores.push(model);
}

function clearStageActors() {
  for (const enemy of enemies) scene.remove(enemy.model);
  enemies.length = 0;
  for (const core of repairCores) scene.remove(core);
  repairCores.length = 0;
  if (portal) scene.remove(portal);
  if (checkpoint) scene.remove(checkpoint);
  portal = null;
  checkpoint = null;
  bossEnemy = null;
  clearProjectiles();
}

function buildStageActors() {
  clearStageActors();
  spawnCore(4.1, -7.5);
  spawnCore(-5.6, -18.4);
  spawnCore(5.8, -29.2);
  spawnCore(-3.6, -43.6);
  spawnCore(3.8, -54.2);

  enemies.push(new Enemy('crawler', -2.8, -8.8));
  enemies.push(new Enemy('crawler', 4.8, -16.2));
  enemies.push(new Enemy('drone', -3.6, -25.8));
  enemies.push(new Enemy('crawler', 4.1, -38.5, { health: 62, speed: 3 }));
  enemies.push(new Enemy('drone', -4.6, -47));
  bossEnemy = new Enemy('boss', 0, -59.5);
  enemies.push(bossEnemy);

  portal = createPortalModel();
  checkpoint = createCheckpointModel();
}

function updateStageActors(delta, elapsed) {
  for (let index = 0; index < repairCores.length; index += 1) {
    const core = repairCores[index];
    if (core.userData.collected) continue;
    core.position.y = core.userData.baseY + Math.sin(elapsed * 2.8 + index) * 0.13;
    core.rotation.y += delta * 1.5;
    core.userData.parts.ringA.rotation.z += delta * 1.8;
    core.userData.parts.ringB.rotation.x += delta * 1.3;
    const coreDistance = Math.hypot(
      core.position.x - player.group.position.x,
      core.position.z - player.group.position.z,
    );
    if (coreDistance < 1.25 && player.group.position.y < 1.8) {
      core.userData.collected = true;
      core.visible = false;
      game.cores += 1;
      audio.play('core');
      particles.burst(core.position, 0x72fbff, 28, 3.8, {
        upward: 2.5,
        gravity: 5,
        life: 0.72,
      });
      showObjectiveToast(`リペアコア獲得！ ${game.cores}/${CONFIG.requiredCores}`);
      evaluateObjective(true);
      updateHud();
    }
  }

  if (checkpoint) {
    checkpoint.userData.ring.rotation.z += delta * 0.75;
    if (!game.checkpointActivated && player.group.position.z < checkpoint.position.z + 0.7) {
      game.checkpointActivated = true;
      player.health = CONFIG.playerMaxHealth;
      showObjectiveToast('リペアステーション起動！ HP全回復');
      particles.burst(checkpoint.position.clone().add(new THREE.Vector3(0, 0.35, 0)), 0x7bffaf, 34, 3.2, {
        upward: 2.6,
        gravity: 4.2,
        life: 0.85,
      });
      updateHud();
    }
  }

  if (portal) {
    const parts = portal.userData.parts;
    parts.ringA.rotation.z += delta * (game.portalUnlocked ? 1.2 : 0.22);
    parts.ringB.rotation.z -= delta * (game.portalUnlocked ? 1.9 : 0.34);
    parts.inner.material.opacity = game.portalUnlocked
      ? 0.42 + Math.sin(elapsed * 4) * 0.12
      : 0.22;
    const portalDistance = Math.hypot(
      player.group.position.x - portal.position.x,
      player.group.position.z - portal.position.z,
    );
    if (game.portalUnlocked && portalDistance < 1.65) {
      endGame(true);
    }
  }

  for (const enemy of enemies) enemy.update(delta, elapsed);
  updateProjectiles(delta, elapsed);
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function showObjectiveToast(message) {
  if (!dom.objectiveToast) return;
  dom.objectiveToast.textContent = message;
  dom.objectiveToast.classList.add('visible');
  game.toastTimer = 2.4;
}

function setPortalVisualState(active) {
  if (!portal) return;
  const parts = portal.userData.parts;
  const material = active ? parts.activeMaterial : parts.lockedMaterial;
  parts.ringA.material = material;
  parts.ringB.material = material;
  parts.inner.material.color.set(active ? 0x55f7ff : 0x471226);
  parts.inner.material.opacity = active ? 0.42 : 0.22;
  parts.light.color.set(active ? 0x4df5ff : 0xff2455);
  parts.light.intensity = active ? 2.4 : 0.7;
}

function evaluateObjective(withToast = false) {
  const bossAlive = bossEnemy && !bossEnemy.dead;
  const shouldUnlock = game.cores >= CONFIG.requiredCores && !bossAlive;
  if (shouldUnlock && !game.portalUnlocked) {
    game.portalUnlocked = true;
    setPortalVisualState(true);
    showObjectiveToast('浄化ゲートが起動した！ ゲートへ進め！');
    audio.play('core');
  }

  let key;
  let text;
  if (game.cores < CONFIG.requiredCores) {
    key = `cores-${game.cores}`;
    text = `リペアコアを集めろ　${game.cores}/${CONFIG.requiredCores}`;
  } else if (bossAlive) {
    key = 'boss';
    text = 'ダークバグ・ガーディアンを倒せ';
  } else {
    key = 'portal';
    text = '浄化ゲートへ進め';
  }
  if (dom.objectiveText) dom.objectiveText.textContent = text;
  if (withToast && game.objectiveKey && game.objectiveKey !== key && key === 'boss') {
    showObjectiveToast('全コア回収！ ガーディアンを倒せ！');
  }
  game.objectiveKey = key;
}

function updateBossHud() {
  if (!dom.bossHud || !bossEnemy) return;
  const visible = game.active && bossEnemy.aggro && !bossEnemy.dead;
  dom.bossHud.classList.toggle('visible', visible);
  if (dom.bossBar) {
    dom.bossBar.style.width = `${THREE.MathUtils.clamp(bossEnemy.health / bossEnemy.maxHealth, 0, 1) * 100}%`;
  }
}

function updateHud() {
  if (dom.healthBar) dom.healthBar.style.width = `${player.health}%`;
  if (dom.healthText) dom.healthText.textContent = `${Math.ceil(player.health)} / ${CONFIG.playerMaxHealth}`;
  if (dom.coreText) dom.coreText.textContent = `${game.cores} / ${CONFIG.requiredCores}`;
  if (dom.enemyText) {
    const alive = enemies.filter((enemy) => !enemy.dead).length;
    dom.enemyText.textContent = String(alive);
  }
  if (dom.timerText) dom.timerText.textContent = formatTime(game.elapsed);
  updateBossHud();
}

function resetPlayer() {
  player.group.position.set(0, CONFIG.groundY, 4.2);
  player.group.rotation.set(0, Math.PI, 0);
  player.velocity.set(0, 0, 0);
  player.dashDirection.set(0, 0, -1);
  player.verticalVelocity = 0;
  player.grounded = true;
  player.coyoteTimer = 0;
  player.jumpBuffer = 0;
  player.health = CONFIG.playerMaxHealth;
  player.invulnerability = 0;
  player.attackTimer = 0;
  player.attackCooldown = 0;
  player.attackConnected = false;
  player.comboStep = 0;
  player.comboWindow = 0;
  player.dashTimer = 0;
  player.dashCooldown = 0;
  player.landedPulse = 0;
  player.footstepTimer = 0;
  player.state = 'idle';
  if (player.model) player.model.visible = true;
}

function startGame() {
  if (!game.loaded || !player.ready) return;
  audio.unlock();
  input.reset();
  clearProjectiles();
  clearTemporaryEffects();
  particles.clear();
  resetPlayer();
  game.active = true;
  game.elapsed = 0;
  game.cores = 0;
  game.defeated = 0;
  game.checkpointActivated = false;
  game.portalUnlocked = false;
  game.objectiveKey = '';
  game.toastTimer = 0;
  buildStageActors();
  setPortalVisualState(false);
  evaluateObjective(false);
  updateHud();
  if (dom.titleScreen) dom.titleScreen.classList.add('hidden');
  if (dom.gameOver) dom.gameOver.classList.remove('visible');
  if (dom.clearScreen) dom.clearScreen.classList.remove('visible');
  if (dom.hud) dom.hud.classList.add('visible');
  document.body.classList.add('game-running');
  cameraRig.snapToPlayer();
  showObjectiveToast('リペアコアを5個集めて、侵食を止めろ！');
}

function endGame(cleared) {
  if (!game.active) return;
  game.active = false;
  input.reset();
  clearProjectiles();
  if (player.model) player.model.visible = true;
  if (dom.hud) dom.hud.classList.remove('visible');
  document.body.classList.remove('game-running');
  if (cleared) {
    audio.play('clear');
    if (dom.clearTime) dom.clearTime.textContent = formatTime(game.elapsed);
    if (dom.clearDefeated) dom.clearDefeated.textContent = String(game.defeated);
    if (dom.clearScreen) dom.clearScreen.classList.add('visible');
    particles.burst(portal?.position || player.group.position, 0x6dffff, 60, 5.2, {
      upward: 3.5,
      gravity: 4,
      life: 1.25,
    });
  } else if (dom.gameOver) {
    dom.gameOver.classList.add('visible');
  }
}

const cameraRig = {
  ideal: new THREE.Vector3(),
  look: new THREE.Vector3(),
  shake: 0,
  titleAngle: 0,

  snapToPlayer() {
    this.ideal.set(
      player.group.position.x,
      player.group.position.y + CONFIG.cameraHeight,
      player.group.position.z + CONFIG.cameraDistance,
    );
    camera.position.copy(this.ideal);
    this.look.copy(player.group.position).add(new THREE.Vector3(0, CONFIG.cameraLookHeight, -0.8));
    camera.lookAt(this.look);
  },

  update(delta, elapsed) {
    if (!player.ready) return;
    if (game.active) {
      const speed = Math.hypot(player.velocity.x, player.velocity.z);
      const lookAheadX = player.velocity.x * 0.22;
      const lookAheadZ = THREE.MathUtils.clamp(player.velocity.z * 0.2, -1.05, 0.7);
      this.ideal.set(
        player.group.position.x + lookAheadX * 0.35,
        player.group.position.y + CONFIG.cameraHeight + (player.dashTimer > 0 ? 0.12 : 0),
        player.group.position.z + CONFIG.cameraDistance + (player.dashTimer > 0 ? 0.75 : 0),
      );
      const cameraBlend = 1 - Math.exp(-6.8 * delta);
      camera.position.lerp(this.ideal, cameraBlend);
      this.look.set(
        player.group.position.x + lookAheadX,
        player.group.position.y + CONFIG.cameraLookHeight,
        player.group.position.z - 0.75 + lookAheadZ,
      );
      const desiredFov = 55 + THREE.MathUtils.clamp((speed - 3.5) * 1.35, 0, 5) + (player.dashTimer > 0 ? 4 : 0);
      camera.fov = damp(camera.fov, desiredFov, 7, delta);
    } else {
      this.titleAngle += delta * 0.12;
      const angle = 2.55 + Math.sin(this.titleAngle) * 0.16;
      this.ideal.set(
        player.group.position.x + Math.sin(angle) * 5.2,
        player.group.position.y + 2.65,
        player.group.position.z + Math.cos(angle) * 5.2,
      );
      camera.position.lerp(this.ideal, 1 - Math.exp(-3.2 * delta));
      this.look.copy(player.group.position).add(new THREE.Vector3(0, 0.92, 0));
      camera.fov = damp(camera.fov, 48, 4, delta);
    }

    this.shake = Math.max(0, this.shake - delta * 1.7);
    if (this.shake > 0) {
      const strength = this.shake * this.shake;
      camera.position.x += (Math.random() - 0.5) * strength;
      camera.position.y += (Math.random() - 0.5) * strength;
      camera.position.z += (Math.random() - 0.5) * strength;
    }
    camera.updateProjectionMatrix();
    camera.lookAt(this.look);
  },
};

function finishLoading(model, sourceLabel) {
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = false;
    if (object.material) {
      object.material.side = THREE.FrontSide;
      object.material.needsUpdate = true;
    }
  });
  model.position.set(0, 0, 0);
  player.group.add(model);
  player.model = model;
  player.animator = new FeniAnimator(model);
  player.ready = true;
  game.loaded = true;
  resetPlayer();
  if (dom.loadingBar) dom.loadingBar.style.width = '100%';
  if (dom.loadingText) dom.loadingText.textContent = '準備完了！';
  if (dom.startButton) {
    dom.startButton.disabled = false;
    dom.startButton.textContent = 'MISSION START';
  }
  window.setTimeout(() => dom.loadingScreen?.classList.add('hidden'), 380);
  console.info(`[Repair Hero] Feni loaded from ${sourceLabel}. Procedural animation active.`);
}

function loadPlayerModel() {
  const loader = new GLTFLoader();
  const optimizedUrl = './assets/feni-game.glb';
  const originalUrl = './Meshy_AI_Character_output.glb';
  const load = (url, canFallback) => {
    loader.load(
      url,
      (gltf) => finishLoading(gltf.scene, canFallback ? 'optimized GLB' : 'original GLB'),
      (progress) => {
        if (!progress.total) return;
        const percent = Math.min(98, Math.round((progress.loaded / progress.total) * 100));
        if (dom.loadingBar) dom.loadingBar.style.width = `${percent}%`;
        if (dom.loadingText) dom.loadingText.textContent = `フェニちゃんを読み込み中… ${percent}%`;
      },
      (error) => {
        if (canFallback) {
          console.warn('[Repair Hero] Optimized model unavailable, using original.', error);
          load(originalUrl, false);
          return;
        }
        showFatalError(`フェニちゃんの読み込みに失敗しました: ${error?.message || error}`);
        dom.loadingScreen?.classList.remove('hidden');
      },
    );
  };
  load(optimizedUrl, true);
}

loadPlayerModel();

dom.startButton?.addEventListener('click', startGame);
dom.retryButton?.addEventListener('click', startGame);
dom.replayButton?.addEventListener('click', startGame);

function onResize() {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioLimit));
  renderer.setSize(width, height);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => window.setTimeout(onResize, 120));

const clock = new THREE.Clock();
let totalElapsed = 0;
let hudAccumulator = 0;

function updateScenery(delta, elapsed) {
  for (let index = 0; index < animatedScenery.length; index += 1) {
    const item = animatedScenery[index];
    item.object.position.x = item.originX + Math.sin(elapsed * item.speed + index) * 2.4;
  }
  sunLight.position.x = 12 + Math.sin(elapsed * 0.035) * 2;
}

function animate() {
  const delta = Math.min(clock.getDelta(), CONFIG.maxDelta);
  totalElapsed += delta;
  updateScenery(delta, totalElapsed);
  updatePlayer(delta, totalElapsed);
  if (game.active) {
    game.elapsed += delta;
    updateStageActors(delta, totalElapsed);
    evaluateObjective(false);
    hudAccumulator += delta;
    if (hudAccumulator >= 0.1) {
      hudAccumulator = 0;
      updateHud();
    }
  }
  if (game.toastTimer > 0) {
    game.toastTimer -= delta;
    if (game.toastTimer <= 0) dom.objectiveToast?.classList.remove('visible');
  }
  updateTemporaryEffects(delta);
  particles.update(delta);
  cameraRig.update(delta, totalElapsed);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.__repairHero = {
  scene,
  camera,
  player,
  getState: () => ({
    active: game.active,
    playerReady: player.ready,
    health: player.health,
    cores: game.cores,
    enemiesAlive: enemies.filter((enemy) => !enemy.dead).length,
    objective: game.objectiveKey,
  }),
};

animate();
