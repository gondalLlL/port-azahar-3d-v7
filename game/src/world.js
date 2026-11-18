import * as THREE from 'three';
import { CONFIG, DISTRICTS } from './config.js';
import { SeededRandom } from './random.js';

export function createCityTextures() {
  // Ground asphalt texture with grid and lane lines
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  
  // Base asphalt
  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(0, 0, 2048, 2048);

  // Roads grid
  ctx.strokeStyle = '#2d3748';
  ctx.lineWidth = 48;
  const step = 2048 / 9;
  for (let i = 0; i <= 9; i++) {
    const pos = i * step;
    ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, 2048); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(2048, pos); ctx.stroke();
  }

  // Yellow center dashes
  ctx.strokeStyle = '#ecc94b';
  ctx.lineWidth = 6;
  ctx.setLineDash([20, 20]);
  for (let i = 0; i <= 9; i++) {
    const pos = i * step;
    ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, 2048); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(2048, pos); ctx.stroke();
  }
  ctx.setLineDash([]);

  const groundTexture = new THREE.CanvasTexture(canvas);
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(8, 8);

  // Window texture for buildings (Day)
  const winCanvas = document.createElement('canvas');
  winCanvas.width = 256;
  winCanvas.height = 256;
  const wctx = winCanvas.getContext('2d');
  wctx.fillStyle = '#2d3748';
  wctx.fillRect(0, 0, 256, 256);
  wctx.fillStyle = '#4a5568';
  for (let x = 20; x < 230; x += 40) {
    for (let y = 20; y < 240; y += 40) {
      wctx.fillRect(x, y, 24, 28);
    }
  }
  const buildingTexture = new THREE.CanvasTexture(winCanvas);
  buildingTexture.wrapS = THREE.RepeatWrapping;
  buildingTexture.wrapT = THREE.RepeatWrapping;
  buildingTexture.repeat.set(2, 6);

  // Window texture for buildings (Night - lit)
  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = 256;
  nightCanvas.height = 256;
  const nctx = nightCanvas.getContext('2d');
  nctx.fillStyle = '#0a0d14';
  nctx.fillRect(0, 0, 256, 256);
  nctx.fillStyle = '#f6e05e';
  const rng = new SeededRandom(42);
  for (let x = 20; x < 230; x += 40) {
    for (let y = 20; y < 240; y += 40) {
      if (rng.next() > 0.3) {
        nctx.fillRect(x, y, 24, 28);
      }
    }
  }
  const nightTexture = new THREE.CanvasTexture(nightCanvas);
  nightTexture.wrapS = THREE.RepeatWrapping;
  nightTexture.wrapT = THREE.RepeatWrapping;
  nightTexture.repeat.set(2, 6);

  return { groundTexture, buildingTexture, nightTexture };
}

export function generateWorld(scene, rng) {
  const blockSize = CONFIG.BLOCK_SIZE;
  const grid = CONFIG.WORLD_SIZE;
  const halfGrid = grid / 2;

  // Ground plane
  const { groundTexture, buildingTexture, nightTexture } = createCityTextures();
  const groundGeo = new THREE.PlaneGeometry(grid * blockSize, grid * blockSize);
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Water plane to the south
  const waterGeo = new THREE.PlaneGeometry(grid * blockSize * 2, 2000);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x1a365d, roughness: 0.2, metalness: 0.8 });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.5, grid * blockSize / 2 + 1000);
  scene.add(water);

  // Buildings generation
  const buildings = [];
  const buildingBoxes = [];

  for (let x = -halfGrid; x < halfGrid; x += 2) {
    for (let z = -halfGrid; z < halfGrid; z += 2) {
      // Leave road gaps
      if (Math.abs(x % 4) === 0 || Math.abs(z % 4) === 0) continue;

      const posX = x * blockSize + blockSize / 2;
      const posZ = z * blockSize + blockSize / 2;
      
      // Determine district tint
      let color = 0x4a5568;
      const nx = (x + halfGrid) / grid * 36;
      const nz = (z + halfGrid) / grid * 36;
      if (nx > 18 && nz > 18) color = 0x2b6cb0; // Neon Mile
      else if (nx < 18 && nz < 18) color = 0x7b341e; // Old Town
      else if (nx > 18 && nz < 18) color = 0x2f855a; // Marina

      const height = rng.range(25, 90);
      const width = blockSize * 1.6;
      const depth = blockSize * 1.6;

      const geom = new THREE.BoxGeometry(width, height, depth);
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        map: buildingTexture,
        roughness: 0.4,
        metalness: 0.2,
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(posX, height / 2, posZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      buildings.push(mesh);

      buildingBoxes.push({
        minX: posX - width / 2,
        maxX: posX + width / 2,
        minZ: posZ - depth / 2,
        maxZ: posZ + depth / 2,
      });
    }
  }

  return { buildings, buildingBoxes, water, buildingTexture, nightTexture };
}
