import {
  Object3D,
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  PointLight,
  AmbientLight,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Color,
  DoubleSide,
  AdditiveBlending,
  CylinderGeometry,
  Group,
} from '@iwsdk/core';

// Shared materials
const darkWoodMaterial = new MeshStandardMaterial({
  color: new Color(0x1a0f0a),
  roughness: 0.9,
  metalness: 0.1,
});

const floorMaterial = new MeshStandardMaterial({
  color: new Color(0x120a06),
  roughness: 0.85,
  metalness: 0.1,
});

const ceilingMaterial = new MeshStandardMaterial({
  color: new Color(0x0a0608),
  roughness: 0.95,
  metalness: 0.0,
});

const stoneMaterial = new MeshStandardMaterial({
  color: new Color(0x2a2028),
  roughness: 0.8,
  metalness: 0.2,
});

const sconceMaterial = new MeshStandardMaterial({
  color: new Color(0xcc8844),
  emissive: new Color(0xff6600),
  emissiveIntensity: 0.3,
  roughness: 0.4,
  metalness: 0.6,
});

const gridMaterial = new MeshStandardMaterial({
  color: new Color(0x002244),
  emissive: new Color(0x003355),
  emissiveIntensity: 0.15,
  transparent: true,
  opacity: 0.3,
});

const furnitureMaterial = new MeshStandardMaterial({
  color: new Color(0x0d0810),
  roughness: 0.9,
  metalness: 0.05,
});

const portraitFrameMaterial = new MeshStandardMaterial({
  color: new Color(0x553311),
  roughness: 0.5,
  metalness: 0.4,
});

const portraitCanvasMaterial = new MeshStandardMaterial({
  color: new Color(0x1a1520),
  emissive: new Color(0x110822),
  emissiveIntensity: 0.1,
  roughness: 0.95,
});

const cobwebMaterial = new MeshStandardMaterial({
  color: new Color(0x444444),
  transparent: true,
  opacity: 0.15,
  side: DoubleSide,
});

function createWalls(parent: Object3D): void {
  const roomW = 14;
  const roomH = 5;
  const roomD = 14;
  const wallThick = 0.3;

  // Floor
  const floor = new Mesh(
    new PlaneGeometry(roomW, roomD),
    floorMaterial,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  parent.add(floor);

  // Ceiling
  const ceiling = new Mesh(
    new PlaneGeometry(roomW, roomD),
    ceilingMaterial,
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = roomH;
  parent.add(ceiling);

  // Back wall
  const backWall = new Mesh(
    new BoxGeometry(roomW, roomH, wallThick),
    darkWoodMaterial,
  );
  backWall.position.set(0, roomH / 2, -roomD / 2);
  backWall.receiveShadow = true;
  parent.add(backWall);

  // Front wall (behind player)
  const frontWall = new Mesh(
    new BoxGeometry(roomW, roomH, wallThick),
    darkWoodMaterial,
  );
  frontWall.position.set(0, roomH / 2, roomD / 2);
  parent.add(frontWall);

  // Left wall
  const leftWall = new Mesh(
    new BoxGeometry(wallThick, roomH, roomD),
    darkWoodMaterial,
  );
  leftWall.position.set(-roomW / 2, roomH / 2, 0);
  leftWall.receiveShadow = true;
  parent.add(leftWall);

  // Right wall
  const rightWall = new Mesh(
    new BoxGeometry(wallThick, roomH, roomD),
    darkWoodMaterial,
  );
  rightWall.position.set(roomW / 2, roomH / 2, 0);
  rightWall.receiveShadow = true;
  parent.add(rightWall);

  // Floor grid lines
  const gridFloor = new Mesh(
    new PlaneGeometry(roomW - 0.5, roomD - 0.5, roomW * 2, roomD * 2),
    gridMaterial,
  );
  gridFloor.rotation.x = -Math.PI / 2;
  gridFloor.position.y = 0.005;
  parent.add(gridFloor);
}

function createSconce(x: number, y: number, z: number, parent: Object3D): void {
  const bracket = new Mesh(
    new BoxGeometry(0.08, 0.25, 0.1),
    sconceMaterial,
  );
  bracket.position.set(x, y, z);
  parent.add(bracket);

  const holder = new Mesh(
    new CylinderGeometry(0.05, 0.08, 0.12, 8),
    sconceMaterial,
  );
  holder.position.set(x, y + 0.15, z);
  parent.add(holder);

  const flameMat = new MeshStandardMaterial({
    color: new Color(0xff8800),
    emissive: new Color(0xff6600),
    emissiveIntensity: 2.0,
    transparent: true,
    opacity: 0.9,
  });
  const flame = new Mesh(
    new SphereGeometry(0.04, 8, 6),
    flameMat,
  );
  flame.position.set(x, y + 0.25, z);
  parent.add(flame);

  const light = new PointLight(0xff8833, 1.5, 8, 2);
  light.position.set(x, y + 0.3, z);
  light.castShadow = false;
  parent.add(light);
}

function createFurniture(parent: Object3D): void {
  // Bookcase back-left
  const bookcase1 = new Mesh(
    new BoxGeometry(1.2, 2.5, 0.4),
    furnitureMaterial,
  );
  bookcase1.position.set(-5.5, 1.25, -6);
  parent.add(bookcase1);

  // Bookcase back-right
  const bookcase2 = new Mesh(
    new BoxGeometry(1.2, 2.5, 0.4),
    furnitureMaterial,
  );
  bookcase2.position.set(5.5, 1.25, -6);
  parent.add(bookcase2);

  // Table center
  const tableTop = new Mesh(
    new BoxGeometry(1.8, 0.08, 0.9),
    furnitureMaterial,
  );
  tableTop.position.set(0, 0.8, -4);
  parent.add(tableTop);
  const tableLeg1 = new Mesh(
    new BoxGeometry(0.08, 0.8, 0.08),
    furnitureMaterial,
  );
  tableLeg1.position.set(-0.8, 0.4, -3.6);
  parent.add(tableLeg1);
  const tableLeg2 = new Mesh(
    new BoxGeometry(0.08, 0.8, 0.08),
    furnitureMaterial,
  );
  tableLeg2.position.set(0.8, 0.4, -3.6);
  parent.add(tableLeg2);
  const tableLeg3 = new Mesh(
    new BoxGeometry(0.08, 0.8, 0.08),
    furnitureMaterial,
  );
  tableLeg3.position.set(-0.8, 0.4, -4.4);
  parent.add(tableLeg3);
  const tableLeg4 = new Mesh(
    new BoxGeometry(0.08, 0.8, 0.08),
    furnitureMaterial,
  );
  tableLeg4.position.set(0.8, 0.4, -4.4);
  parent.add(tableLeg4);

  // Armchair left
  const chair1 = new Mesh(
    new BoxGeometry(0.8, 1.0, 0.8),
    furnitureMaterial,
  );
  chair1.position.set(-4, 0.5, -2);
  parent.add(chair1);

  // Armchair right
  const chair2 = new Mesh(
    new BoxGeometry(0.8, 1.0, 0.8),
    furnitureMaterial,
  );
  chair2.position.set(4, 0.5, -2);
  parent.add(chair2);

  // Grandfather clock
  const clockBody = new Mesh(
    new BoxGeometry(0.5, 2.2, 0.35),
    furnitureMaterial,
  );
  clockBody.position.set(6.3, 1.1, -3);
  parent.add(clockBody);

  // Cabinet
  const cabinet = new Mesh(
    new BoxGeometry(1.5, 1.5, 0.5),
    furnitureMaterial,
  );
  cabinet.position.set(-6, 0.75, -1);
  parent.add(cabinet);
}

function createPortraits(parent: Object3D): void {
  const positions = [
    { x: -6.8, y: 2.5, z: -3, ry: Math.PI / 2 },
    { x: -6.8, y: 2.5, z: 2, ry: Math.PI / 2 },
    { x: 6.8, y: 2.5, z: -3, ry: -Math.PI / 2 },
    { x: 6.8, y: 2.5, z: 2, ry: -Math.PI / 2 },
    { x: -2, y: 3.0, z: -6.8, ry: 0 },
    { x: 2, y: 3.0, z: -6.8, ry: 0 },
  ];

  for (const p of positions) {
    const group = new Group();
    group.position.set(p.x, p.y, p.z);
    group.rotation.y = p.ry;

    const frame = new Mesh(
      new BoxGeometry(0.8, 1.0, 0.06),
      portraitFrameMaterial,
    );
    group.add(frame);

    const canvas = new Mesh(
      new BoxGeometry(0.65, 0.85, 0.02),
      portraitCanvasMaterial,
    );
    canvas.position.z = 0.02;
    group.add(canvas);

    parent.add(group);
  }
}

function createCobwebs(parent: Object3D): void {
  const corners = [
    [-6.8, 4.5, -6.8],
    [6.8, 4.5, -6.8],
    [-6.8, 4.5, 6.8],
    [6.8, 4.5, 6.8],
  ];

  for (const [cx, cy, cz] of corners) {
    const web = new Mesh(
      new PlaneGeometry(1.2, 1.2),
      cobwebMaterial,
    );
    web.position.set(cx, cy, cz);
    web.rotation.x = -Math.PI / 4;
    web.rotation.y = Math.atan2(-cx, -cz);
    parent.add(web);
  }
}

function createDustParticles(parent: Object3D): void {
  const count = 500;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = Math.random() * 4.5 + 0.3;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));

  const mat = new PointsMaterial({
    color: 0x887766,
    size: 0.02,
    transparent: true,
    opacity: 0.4,
    blending: AdditiveBlending,
    depthWrite: false,
  });

  const dust = new Points(geo, mat);
  parent.add(dust);
}

function createAmbientLighting(parent: Object3D): void {
  const ambient = new AmbientLight(0x0a0818, 0.3);
  parent.add(ambient);

  // Eerie green corner lights
  const greenPositions = [
    [-6, 0.3, -6],
    [6, 0.3, -6],
    [-6, 0.3, 6],
    [6, 0.3, 6],
  ];
  for (const [gx, gy, gz] of greenPositions) {
    const gLight = new PointLight(0x00ff44, 0.3, 6, 2);
    gLight.position.set(gx, gy, gz);
    parent.add(gLight);
  }
}

export const mansionEnvironment = (() => {
  const root = new Object3D();

  createWalls(root);

  // Sconces along walls
  const sconcePositions = [
    [-6.7, 2.5, -1], [-6.7, 2.5, 3],
    [6.7, 2.5, -1], [6.7, 2.5, 3],
    [-3, 2.5, -6.7], [3, 2.5, -6.7],
    [-3, 2.5, 6.7], [3, 2.5, 6.7],
  ];
  for (const [sx, sy, sz] of sconcePositions) {
    createSconce(sx, sy, sz, root);
  }

  createFurniture(root);
  createPortraits(root);
  createCobwebs(root);
  createDustParticles(root);
  createAmbientLighting(root);

  return root;
})();
