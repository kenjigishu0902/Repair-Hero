import * as THREE from '../vendor/three/three.module.js';

const shared = {
  dark: new THREE.MeshStandardMaterial({
    color: 0x151426,
    roughness: 0.58,
    metalness: 0.62,
  }),
  darkSoft: new THREE.MeshStandardMaterial({
    color: 0x29223d,
    roughness: 0.72,
    metalness: 0.28,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: 0x6e7890,
    roughness: 0.35,
    metalness: 0.82,
  }),
  red: new THREE.MeshStandardMaterial({
    color: 0xb81435,
    emissive: 0x5b0015,
    emissiveIntensity: 0.8,
    roughness: 0.36,
    metalness: 0.4,
  }),
  violet: new THREE.MeshStandardMaterial({
    color: 0x6327a8,
    emissive: 0x26004e,
    emissiveIntensity: 0.8,
    roughness: 0.4,
    metalness: 0.35,
  }),
  crimsonGlow: new THREE.MeshStandardMaterial({
    color: 0xff203f,
    emissive: 0xd0002c,
    emissiveIntensity: 2.6,
    roughness: 0.2,
    metalness: 0.45,
  }),
  abyss: new THREE.MeshStandardMaterial({
    color: 0x090b16,
    emissive: 0x160026,
    emissiveIntensity: 0.65,
    roughness: 0.34,
    metalness: 0.78,
  }),
};

const geometry = {
  crawlerBody: new THREE.DodecahedronGeometry(0.52, 0),
  crawlerFace: new THREE.BoxGeometry(0.62, 0.34, 0.08),
  crawlerLeg: new THREE.BoxGeometry(0.12, 0.12, 0.7),
  crawlerFoot: new THREE.ConeGeometry(0.13, 0.34, 5),
  smallEye: new THREE.SphereGeometry(0.075, 10, 8),
  spike: new THREE.ConeGeometry(0.14, 0.42, 5),
  droneBody: new THREE.IcosahedronGeometry(0.55, 1),
  droneRing: new THREE.TorusGeometry(0.72, 0.065, 8, 28),
  droneWing: new THREE.BoxGeometry(0.62, 0.08, 0.32),
  droneEye: new THREE.SphereGeometry(0.17, 14, 10),
  bossBody: new THREE.BoxGeometry(1.25, 1.15, 0.82),
  bossHead: new THREE.BoxGeometry(0.86, 0.58, 0.68),
  bossScreen: new THREE.BoxGeometry(0.62, 0.29, 0.055),
  bossEye: new THREE.BoxGeometry(0.43, 0.085, 0.045),
  bossShoulder: new THREE.DodecahedronGeometry(0.42, 0),
  bossUpperArm: new THREE.BoxGeometry(0.32, 0.86, 0.38),
  bossFist: new THREE.DodecahedronGeometry(0.33, 0),
  bossLeg: new THREE.BoxGeometry(0.39, 0.68, 0.48),
  bossFoot: new THREE.BoxGeometry(0.52, 0.24, 0.74),
  bossCore: new THREE.OctahedronGeometry(0.25, 0),
  antenna: new THREE.ConeGeometry(0.12, 0.45, 5),
  core: new THREE.OctahedronGeometry(0.25, 0),
  coreRing: new THREE.TorusGeometry(0.42, 0.035, 8, 24),
  armorPlate: new THREE.BoxGeometry(0.72, 0.12, 0.48),
  jaw: new THREE.BoxGeometry(0.56, 0.16, 0.32),
  fang: new THREE.ConeGeometry(0.075, 0.28, 5),
  blade: new THREE.ConeGeometry(0.16, 0.86, 4),
  rotor: new THREE.TorusGeometry(0.31, 0.055, 7, 18),
  cannon: new THREE.CylinderGeometry(0.11, 0.16, 0.62, 8),
  horn: new THREE.ConeGeometry(0.16, 0.72, 6),
  swordBlade: new THREE.BoxGeometry(0.15, 1.65, 0.38),
  swordGuard: new THREE.BoxGeometry(0.75, 0.12, 0.18),
  shoulderBlade: new THREE.ConeGeometry(0.2, 0.85, 5),
};

function cloneMaterial(material) {
  return material.clone();
}

function addMesh(parent, meshGeometry, material, options = {}) {
  const mesh = new THREE.Mesh(meshGeometry, material);
  const { position, rotation, scale, shadows = true } = options;
  if (position) mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  parent.add(mesh);
  return mesh;
}

function createEyeMaterial(color = 0xff174b) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 2.2,
    roughness: 0.18,
    metalness: 0.18,
  });
}

export function createCrawlerModel() {
  const group = new THREE.Group();
  group.name = 'Bug Beast';

  const body = addMesh(group, geometry.crawlerBody, cloneMaterial(shared.dark), {
    position: [0, 0.58, 0],
    scale: [1.15, 0.86, 1.18],
  });
  const shell = addMesh(group, geometry.droneRing, cloneMaterial(shared.red), {
    position: [0, 0.61, -0.04],
    rotation: [Math.PI / 2, 0, 0],
    scale: [0.72, 0.72, 0.72],
  });
  const face = addMesh(group, geometry.crawlerFace, shared.darkSoft, {
    position: [0, 0.59, 0.48],
  });
  const eyeMaterial = createEyeMaterial();
  const leftEye = addMesh(group, geometry.smallEye, eyeMaterial, {
    position: [-0.17, 0.64, 0.55],
  });
  const rightEye = addMesh(group, geometry.smallEye, eyeMaterial, {
    position: [0.17, 0.64, 0.55],
  });
  const jaw = addMesh(group, geometry.jaw, cloneMaterial(shared.abyss), {
    position: [0, 0.43, 0.57],
    rotation: [-0.12, 0, 0],
  });
  for (const x of [-0.19, -0.06, 0.06, 0.19]) {
    addMesh(jaw, geometry.fang, shared.crimsonGlow, {
      position: [x, -0.11, 0.13],
      rotation: [Math.PI, 0, 0],
      scale: [0.72, 0.72, 0.72],
    });
  }
  const armor = [];
  for (const z of [-0.28, 0.02, 0.31]) {
    armor.push(addMesh(group, geometry.armorPlate, z === 0.02 ? shared.red : shared.steel, {
      position: [0, 0.9 - Math.abs(z) * 0.35, z - 0.11],
      rotation: [z * 0.24, 0, 0],
      scale: [0.92 - Math.abs(z) * 0.3, 1, 0.9],
    }));
  }
  const tail = new THREE.Group();
  tail.position.set(0, 0.68, -0.54);
  tail.rotation.x = -0.62;
  group.add(tail);
  addMesh(tail, geometry.blade, shared.violet, {
    position: [0, 0.38, -0.12],
    rotation: [Math.PI / 2, 0, 0],
    scale: [0.78, 1.2, 0.78],
  });

  const legs = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let row = -1; row <= 1; row += 1) {
      const legPivot = new THREE.Group();
      legPivot.position.set(side * 0.43, 0.43, row * 0.3);
      legPivot.rotation.y = side * (0.42 + row * 0.11);
      group.add(legPivot);
      addMesh(legPivot, geometry.crawlerLeg, shared.steel, {
        position: [side * 0.2, -0.11, 0],
        rotation: [0, side * 0.42, side * 0.58],
      });
      addMesh(legPivot, geometry.crawlerFoot, shared.red, {
        position: [side * 0.43, -0.28, 0],
        rotation: [0, 0, side * Math.PI / 2],
      });
      legs.push(legPivot);
    }
  }

  for (const x of [-0.3, 0, 0.3]) {
    addMesh(group, geometry.spike, shared.violet, {
      position: [x, 1.02 - Math.abs(x) * 0.35, -0.1],
      rotation: [0, 0, x * 0.7],
    });
  }

  group.userData.enemyParts = {
    body,
    shell,
    eyes: [leftEye, rightEye],
    eyeMaterial,
    legs,
    jaw,
    armor,
    tail,
  };
  group.userData.baseScale = 1;
  return group;
}

export function createDroneModel() {
  const group = new THREE.Group();
  group.name = 'Glitch Drone';

  const bodyMaterial = cloneMaterial(shared.dark);
  const accentMaterial = cloneMaterial(shared.violet);
  const body = addMesh(group, geometry.droneBody, bodyMaterial, {
    position: [0, 1.02, 0],
    scale: [1, 0.86, 1],
  });
  const ring = addMesh(group, geometry.droneRing, accentMaterial, {
    position: [0, 1.02, 0],
    rotation: [Math.PI / 2, 0, 0],
  });
  const eyeMaterial = createEyeMaterial(0xff2a69);
  const eye = addMesh(group, geometry.droneEye, eyeMaterial, {
    position: [0, 1.04, 0.49],
    scale: [1.25, 0.72, 0.48],
  });
  const wings = [];
  const rotors = [];
  const cannons = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    wing.position.set(side * 0.58, 1.05, -0.02);
    group.add(wing);
    addMesh(wing, geometry.droneWing, shared.steel, {
      position: [side * 0.22, 0, 0],
      rotation: [0, side * 0.2, side * 0.08],
    });
    addMesh(wing, geometry.spike, accentMaterial, {
      position: [side * 0.54, 0, -0.04],
      rotation: [0, 0, side * -Math.PI / 2],
    });
    const rotor = addMesh(wing, geometry.rotor, shared.crimsonGlow, {
      position: [side * 0.37, 0.08, -0.03],
      rotation: [Math.PI / 2, 0, 0],
    });
    const cannon = addMesh(wing, geometry.cannon, shared.abyss, {
      position: [side * 0.2, -0.16, 0.24],
      rotation: [Math.PI / 2, 0, 0],
    });
    addMesh(wing, geometry.blade, shared.violet, {
      position: [side * 0.7, 0.02, -0.06],
      rotation: [0, 0, side * -Math.PI / 2],
      scale: [0.7, 0.72, 0.7],
    });
    wings.push(wing);
    rotors.push(rotor);
    cannons.push(cannon);
  }
  addMesh(group, geometry.antenna, shared.red, {
    position: [0, 1.67, -0.05],
  });

  group.userData.enemyParts = {
    body,
    ring,
    eye,
    eyeMaterial,
    wings,
    rotors,
    cannons,
  };
  return group;
}

export function createGuardianModel() {
  const group = new THREE.Group();
  group.name = 'Dark Bug Guardian';

  const darkMaterial = cloneMaterial(shared.dark);
  const redMaterial = cloneMaterial(shared.red);
  const violetMaterial = cloneMaterial(shared.violet);
  const eyeMaterial = createEyeMaterial(0xff163f);

  const body = addMesh(group, geometry.bossBody, darkMaterial, {
    position: [0, 1.17, 0],
  });
  addMesh(group, geometry.bossBody, violetMaterial, {
    position: [0, 1.17, -0.04],
    scale: [0.78, 0.74, 1.02],
  });
  const core = addMesh(group, geometry.bossCore, redMaterial, {
    position: [0, 1.28, 0.48],
  });

  const head = new THREE.Group();
  head.position.set(0, 2.08, 0);
  group.add(head);
  addMesh(head, geometry.bossHead, darkMaterial);
  const screen = addMesh(head, geometry.bossScreen, shared.darkSoft, {
    position: [0, 0.02, 0.36],
  });
  const eye = addMesh(head, geometry.bossEye, eyeMaterial, {
    position: [0, 0.03, 0.402],
  });
  addMesh(head, geometry.antenna, redMaterial, {
    position: [-0.28, 0.55, 0],
    rotation: [0, 0, -0.22],
  });
  addMesh(head, geometry.antenna, redMaterial, {
    position: [0.28, 0.55, 0],
    rotation: [0, 0, 0.22],
  });
  for (const side of [-1, 1]) {
    addMesh(head, geometry.horn, shared.abyss, {
      position: [side * 0.42, 0.35, -0.08],
      rotation: [0.08, 0, side * -0.52],
      scale: [1, 1.18, 1],
    });
  }

  const arms = [];
  const shoulderBlades = [];
  for (const side of [-1, 1]) {
    addMesh(group, geometry.bossShoulder, violetMaterial, {
      position: [side * 0.82, 1.66, -0.01],
      scale: [1.18, 0.88, 1],
    });
    shoulderBlades.push(addMesh(group, geometry.shoulderBlade, redMaterial, {
      position: [side * 1.02, 2.02, -0.05],
      rotation: [0, 0, side * -0.48],
    }));
    const arm = new THREE.Group();
    arm.position.set(side * 0.82, 1.55, 0);
    group.add(arm);
    addMesh(arm, geometry.bossUpperArm, shared.steel, {
      position: [side * 0.12, -0.28, 0],
      rotation: [0, 0, side * -0.12],
    });
    addMesh(arm, geometry.bossFist, redMaterial, {
      position: [side * 0.18, -0.79, 0.08],
      scale: [1.08, 1, 1.08],
    });
    arms.push(arm);
  }

  const sword = new THREE.Group();
  sword.position.set(0.26, -1.04, 0.12);
  sword.rotation.set(-0.14, 0, -0.18);
  arms[1].add(sword);
  addMesh(sword, geometry.swordBlade, shared.crimsonGlow, {
    position: [0, -0.8, 0],
    rotation: [0, 0, 0],
  });
  addMesh(sword, geometry.swordGuard, shared.steel, {
    position: [0, 0.05, 0],
  });
  addMesh(sword, geometry.cannon, shared.abyss, {
    position: [0, 0.35, 0],
  });

  const backBlades = [];
  for (const side of [-1, 1]) {
    const blade = addMesh(group, geometry.blade, violetMaterial, {
      position: [side * 0.48, 1.55, -0.62],
      rotation: [-0.42, 0, side * 0.4],
      scale: [1.2, 1.6, 1.2],
    });
    backBlades.push(blade);
  }

  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.39, 0.62, 0);
    group.add(leg);
    addMesh(leg, geometry.bossLeg, shared.steel, {
      position: [0, -0.2, 0],
    });
    addMesh(leg, geometry.bossFoot, darkMaterial, {
      position: [0, -0.5, 0.16],
    });
    legs.push(leg);
  }

  group.userData.enemyParts = {
    body,
    core,
    head,
    screen,
    eye,
    eyeMaterial,
    arms,
    legs,
    sword,
    shoulderBlades,
    backBlades,
  };
  return group;
}

export function createRepairCoreModel() {
  const group = new THREE.Group();
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x5ff7ff,
    emissive: 0x0bcbd6,
    emissiveIntensity: 2.4,
    roughness: 0.18,
    metalness: 0.25,
  });
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xb6ffff,
    transparent: true,
    opacity: 0.82,
    toneMapped: false,
  });
  const core = addMesh(group, geometry.core, coreMaterial, { shadows: false });
  const ringA = addMesh(group, geometry.coreRing, ringMaterial, {
    rotation: [Math.PI / 2, 0, 0],
    shadows: false,
  });
  const ringB = addMesh(group, geometry.coreRing, ringMaterial, {
    rotation: [0, Math.PI / 2, 0],
    shadows: false,
  });
  group.userData.parts = { core, ringA, ringB };
  return group;
}

export function animateEnemyModel(enemy, elapsed, moveAmount, telegraphAmount = 0) {
  const parts = enemy.model.userData.enemyParts;
  if (!parts) return;
  const speed = enemy.type === 'boss' ? 5 : 8;
  const gait = elapsed * speed + enemy.seed;

  if (enemy.type === 'crawler') {
    parts.body.position.y = 0.58 + Math.abs(Math.sin(gait)) * 0.055 * moveAmount;
    parts.body.rotation.z = Math.sin(gait * 0.5) * 0.035 * moveAmount;
    parts.shell.rotation.z += 0.7 * enemy.lastDelta;
    parts.legs.forEach((leg, index) => {
      leg.rotation.z = Math.sin(gait + index * 1.7) * 0.3 * moveAmount;
    });
    parts.jaw.rotation.x = -0.12 + Math.sin(elapsed * 3.5) * 0.035 + telegraphAmount * 0.28;
    parts.tail.rotation.y = Math.sin(elapsed * 4.2 + enemy.seed) * 0.38;
    parts.armor.forEach((plate, index) => {
      plate.rotation.z = Math.sin(elapsed * 2.4 + index) * 0.018;
    });
    parts.eyeMaterial.emissiveIntensity = 2.1 + telegraphAmount * 4;
  } else if (enemy.type === 'drone') {
    enemy.model.position.y = Math.sin(elapsed * 3.1 + enemy.seed) * 0.12;
    parts.ring.rotation.z += (1.8 + moveAmount) * enemy.lastDelta;
    parts.body.rotation.y += 0.45 * enemy.lastDelta;
    parts.wings.forEach((wing, index) => {
      wing.rotation.z = Math.sin(elapsed * 9 + index * Math.PI) * 0.16;
    });
    parts.rotors.forEach((rotor, index) => {
      rotor.rotation.z += (6 + index * 0.7 + telegraphAmount * 8) * enemy.lastDelta;
    });
    parts.cannons.forEach((cannon) => {
      cannon.scale.setScalar(1 + telegraphAmount * 0.24);
    });
    parts.eyeMaterial.emissiveIntensity = 2.3 + telegraphAmount * 5;
  } else if (enemy.type === 'boss') {
    parts.body.position.y = 1.17 + Math.abs(Math.sin(gait)) * 0.035 * moveAmount;
    parts.core.rotation.y += 1.4 * enemy.lastDelta;
    parts.core.rotation.x += 0.8 * enemy.lastDelta;
    const pulse = 1 + Math.sin(elapsed * 5) * 0.08 + telegraphAmount * 0.25;
    parts.core.scale.setScalar(pulse);
    parts.head.rotation.y = Math.sin(elapsed * 1.5) * 0.06;
    parts.arms.forEach((arm, index) => {
      arm.rotation.x = Math.sin(gait + index * Math.PI) * 0.34 * moveAmount - telegraphAmount * 0.55;
    });
    parts.legs.forEach((leg, index) => {
      leg.rotation.x = Math.sin(gait + index * Math.PI) * 0.35 * moveAmount;
    });
    parts.sword.rotation.z = -0.18 - telegraphAmount * 0.82 + Math.sin(elapsed * 1.7) * 0.04;
    parts.shoulderBlades.forEach((blade, index) => {
      blade.rotation.y = Math.sin(elapsed * 2.1 + index * Math.PI) * 0.13;
    });
    parts.backBlades.forEach((blade, index) => {
      blade.rotation.z = (index === 0 ? -0.4 : 0.4) + Math.sin(elapsed * 1.8 + index) * 0.08;
    });
    parts.eyeMaterial.emissiveIntensity = 2.4 + telegraphAmount * 5;
  }
}
