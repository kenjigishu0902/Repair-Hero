import * as THREE from '../vendor/three/three.module.js';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';

/* =========================================================================
 * Repair Hero - Phase 1 (Foundation)
 * フェニちゃんが3D世界に立ち、自由に歩いてジャンプできる基礎システム。
 * ========================================================================= */

/* ---------------------------- Constants ---------------------------- */
const GLB_URL = './Meshy_AI_Character_output.glb';

const GROUND_Y = 0;
const MOVE_SPEED = 4.5;       // m/s
const JUMP_SPEED = 6.4;       // m/s (initial upward velocity)
const GRAVITY = -18;          // m/s^2
const TURN_LERP = 12;         // rotation smoothing speed
const CAMERA_DISTANCE = 5.5;
const CAMERA_HEIGHT = 2.7;
const CAMERA_LOOK_HEIGHT = 1.3;
const CAMERA_LERP = 6;        // camera position smoothing speed
const MAX_DELTA = 0.1;        // clamp delta time (avoid big jumps on tab switch)

/* ---------------------------- DOM refs ---------------------------- */
const canvas = document.getElementById('game-canvas');
const loadingScreen = document.getElementById('loading-screen');
const loadingText = document.getElementById('loading-text');
const loadingBarInner = document.getElementById('loading-bar-inner');
const errorBanner = document.getElementById('error-banner');
const joystickZone = document.getElementById('joystick-zone');
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const jumpButton = document.getElementById('jump-button');

/* ---------------------------- Error reporting ---------------------------- */
function showError(message) {
  console.error('[Repair Hero]', message);
  errorBanner.textContent = message;
  errorBanner.classList.add('visible');
}

window.addEventListener('error', (e) => {
  showError('エラーが発生しました: ' + (e.message || e.error || 'unknown error'));
});
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason && e.reason.message ? e.reason.message : String(e.reason);
  showError('エラーが発生しました: ' + reason);
});

function hideLoadingScreen() {
  loadingScreen.classList.add('hidden');
}

/* ---------------------------- Touch device detection ---------------------------- */
const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouchDevice) {
  document.body.classList.add('touch-enabled');
}

/* ---------------------------- Renderer / Scene / Camera ---------------------------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const SKY_COLOR = 0x8fd0ff;
scene.background = new THREE.Color(SKY_COLOR);
scene.fog = new THREE.Fog(SKY_COLOR, 45, 200);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
camera.lookAt(0, CAMERA_LOOK_HEIGHT, 0);

/* ---------------------------- Lights ---------------------------- */
const hemiLight = new THREE.HemisphereLight(0xbfe6ff, 0x4c7c3a, 1.0);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
sunLight.position.set(12, 18, 9);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 60;
sunLight.shadow.camera.left = -20;
sunLight.shadow.camera.right = 20;
sunLight.shadow.camera.top = 20;
sunLight.shadow.camera.bottom = -20;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);
scene.add(sunLight.target);

/* ---------------------------- Ground ---------------------------- */
function createGroundTexture() {
  const size = 64;
  const cvs = document.createElement('canvas');
  cvs.width = size;
  cvs.height = size;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#6fbf5c';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#66b453';
  const half = size / 2;
  ctx.fillRect(0, 0, half, half);
  ctx.fillRect(half, half, half, half);
  const texture = new THREE.CanvasTexture(cvs);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 40);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshStandardMaterial({
  map: createGroundTexture(),
  roughness: 0.95,
  metalness: 0.0,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = GROUND_Y;
ground.receiveShadow = true;
scene.add(ground);

/* ---------------------------- Player container ---------------------------- */
const playerGroup = new THREE.Group();
playerGroup.position.set(0, GROUND_Y, 0);
scene.add(playerGroup);

let mixer = null;
let playerReady = false;

/* ---------------------------- Input: keyboard ---------------------------- */
const keysDown = new Set();
let jumpRequested = false;

const MOVE_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

window.addEventListener('keydown', (e) => {
  if (MOVE_KEYS.has(e.code) || e.code === 'Space') {
    e.preventDefault();
  }
  if (e.code === 'Space' && !e.repeat) {
    jumpRequested = true;
  }
  keysDown.add(e.code);
});

window.addEventListener('keyup', (e) => {
  keysDown.delete(e.code);
});

window.addEventListener('blur', () => keysDown.clear());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) keysDown.clear();
});

/* ---------------------------- Input: virtual joystick ---------------------------- */
const joystick = { x: 0, y: 0, active: false, pointerId: null };

function updateJoystickFromEvent(clientX, clientY) {
  const rect = joystickBase.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const radius = rect.width / 2;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > radius) {
    dx = (dx / dist) * radius;
    dy = (dy / dist) * radius;
  }
  joystickKnob.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
  joystick.x = dx / radius;
  joystick.y = -dy / radius;
}

function resetJoystick() {
  joystick.x = 0;
  joystick.y = 0;
  joystick.active = false;
  joystick.pointerId = null;
  joystickKnob.style.transform = 'translate(-50%, -50%)';
}

joystickZone.addEventListener('pointerdown', (e) => {
  joystick.active = true;
  joystick.pointerId = e.pointerId;
  updateJoystickFromEvent(e.clientX, e.clientY);
  joystickZone.setPointerCapture(e.pointerId);
});
joystickZone.addEventListener('pointermove', (e) => {
  if (!joystick.active || e.pointerId !== joystick.pointerId) return;
  updateJoystickFromEvent(e.clientX, e.clientY);
});
function endJoystick(e) {
  if (e.pointerId !== joystick.pointerId) return;
  resetJoystick();
}
joystickZone.addEventListener('pointerup', endJoystick);
joystickZone.addEventListener('pointercancel', endJoystick);
joystickZone.addEventListener('pointerleave', (e) => {
  // Only reset if the pointer capture was released (avoid resetting on capture drag)
  if (e.pointerId === joystick.pointerId && !joystickZone.hasPointerCapture(e.pointerId)) {
    resetJoystick();
  }
});

/* ---------------------------- Input: jump button ---------------------------- */
jumpButton.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  jumpRequested = true;
  jumpButton.classList.add('pressed');
});
['pointerup', 'pointercancel', 'pointerleave'].forEach((evt) => {
  jumpButton.addEventListener(evt, () => jumpButton.classList.remove('pressed'));
});

/* ---------------------------- Movement helpers ---------------------------- */
// Movement is resolved in a fixed world-space reference frame (not the
// camera's or player's current orientation). This keeps input direction
// perfectly predictable and avoids any feedback loop between camera and
// player rotation. The chase camera below only translates (follows
// position); it never rotates around the player, so the reference frame
// visually matches what the player sees.
const WORLD_FORWARD = new THREE.Vector3(0, 0, -1);
const WORLD_RIGHT = new THREE.Vector3(1, 0, 0);
const CAMERA_OFFSET = new THREE.Vector3(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
const _moveDir = new THREE.Vector3();
const _cameraTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
function lerpAngle(a, b, t) {
  return a + normalizeAngle(b - a) * t;
}

function getMoveInput() {
  let x = 0;
  let z = 0;
  if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) z += 1;
  if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) z -= 1;
  if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) x += 1;
  if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) x -= 1;

  if (joystick.active) {
    x += joystick.x;
    z += joystick.y;
  }

  const len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  return { x, z, active: len > 0.001 };
}

/* ---------------------------- Physics state ---------------------------- */
let velocityY = 0;
let grounded = true;

/* ---------------------------- Debug hook (read-only, for QA) ---------------------------- */
const debugState = { grounded: true, velocityY: 0 };
window.__repairHero = {
  playerGroup,
  camera,
  scene,
  isPlayerReady: () => playerReady,
  debugState,
  requestJump: () => { jumpRequested = true; },
  getKeysDown: () => Array.from(keysDown),
};

/* ---------------------------- Load character (フェニちゃん) ---------------------------- */
const loader = new GLTFLoader();

loader.load(
  GLB_URL,
  (gltf) => {
    const model = gltf.scene;
    model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = false;
        if (obj.material) {
          obj.material.side = THREE.FrontSide;
        }
      }
    });
    playerGroup.add(model);

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      const preferred = gltf.animations.find((c) => /idle|walk|run/i.test(c.name));
      const clip = preferred || gltf.animations[0];
      const action = mixer.clipAction(clip);
      action.play();
      console.info('[Repair Hero] AnimationClip detected and playing:', clip.name);
    } else {
      console.info('[Repair Hero] No AnimationClip found in GLB. フェニちゃん remains in static pose while moving.');
    }

    playerReady = true;
    hideLoadingScreen();
  },
  (progress) => {
    if (progress.total) {
      const pct = Math.min(100, Math.round((progress.loaded / progress.total) * 100));
      loadingBarInner.style.width = pct + '%';
      loadingText.textContent = `フェニちゃんを読み込み中... ${pct}%`;
    }
  },
  (err) => {
    showError(
      'フェニちゃん(GLB)の読み込みに失敗しました。ファイルの配置とファイル名を確認してください。\n' +
      (err && err.message ? err.message : String(err))
    );
    hideLoadingScreen();
  }
);

/* ---------------------------- Resize ---------------------------- */
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

/* ---------------------------- Main loop ---------------------------- */
const clock = new THREE.Clock();

function update(delta) {
  const input = getMoveInput();

  if (input.active) {
    _moveDir.set(0, 0, 0)
      .addScaledVector(WORLD_FORWARD, input.z)
      .addScaledVector(WORLD_RIGHT, input.x);

    if (_moveDir.lengthSq() > 1e-6) {
      _moveDir.normalize();
      playerGroup.position.addScaledVector(_moveDir, MOVE_SPEED * delta);

      // フェニちゃんの読み込み時デフォルト正面は +Z 方向のため、
      // moveDir をそのまま atan2(x, z) に渡して向きを一致させる。
      const targetYaw = Math.atan2(_moveDir.x, _moveDir.z);
      playerGroup.rotation.y = lerpAngle(
        playerGroup.rotation.y,
        targetYaw,
        Math.min(1, TURN_LERP * delta)
      );
    }
  }

  // Gravity & ground collision
  velocityY += GRAVITY * delta;
  playerGroup.position.y += velocityY * delta;
  if (playerGroup.position.y <= GROUND_Y) {
    playerGroup.position.y = GROUND_Y;
    velocityY = 0;
    grounded = true;
  } else {
    grounded = false;
  }

  // Jump
  if (jumpRequested) {
    if (grounded) {
      velocityY = JUMP_SPEED;
      grounded = false;
    }
    jumpRequested = false;
  }

  // Third-person chase camera: translates to follow the player at a fixed
  // world-space offset (does not rotate around the player).
  _cameraTarget.set(
    playerGroup.position.x + CAMERA_OFFSET.x,
    playerGroup.position.y + CAMERA_OFFSET.y,
    playerGroup.position.z + CAMERA_OFFSET.z
  );
  const camT = 1 - Math.exp(-CAMERA_LERP * delta);
  camera.position.lerp(_cameraTarget, camT);

  _lookTarget.set(
    playerGroup.position.x,
    playerGroup.position.y + CAMERA_LOOK_HEIGHT,
    playerGroup.position.z
  );
  camera.lookAt(_lookTarget);

  if (mixer) mixer.update(delta);

  // Lightweight debug hook (read-only helper for QA / manual inspection).
  debugState.grounded = grounded;
  debugState.velocityY = velocityY;
}

function animate() {
  const delta = Math.min(clock.getDelta(), MAX_DELTA);
  update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
