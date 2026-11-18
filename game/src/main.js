import * as THREE from 'three';
import { CONFIG, MISSIONS, DISTRICTS } from './config.js';
import { SeededRandom } from './random.js';
import { InputManager } from './input.js';
import { AudioManager } from './audio.js';
import { generateWorld } from './world.js';
import { handleStagedShot } from './shots.js';

class PortAzaharGame {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0015);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 5000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    const urlParams = new URLSearchParams(window.location.search);
    const seed = parseInt(urlParams.get('seed') || '1', 10);
    this.rng = new SeededRandom(seed);

    this.input = new InputManager();
    this.audio = new AudioManager();

    // Game state
    this.cash = 500;
    this.health = 100;
    this.armor = 100;
    this.wantedLevel = 0;
    this.currentMissionIndex = 0;
    this.missionActive = false;
    this.missionTimer = 0;
    this.timeOfDay = 10; // 0-24
    this.daySpeed = 0.05;
    this.isShotMode = false;
    this.freezeSimulation = false;
    this.savedData = null;

    // Entities
    this.trafficCars = [];
    this.policeCars = [];
    this.pedestrians = [];
    this.particles = [];

    this.initWorld();
    this.initPlayer();
    this.initLights();
    this.initUI();

    handleStagedShot(urlParams, this);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.lastTime = performance.now();
    this.accumulator = 0;
    this.fixedDt = 1 / 60;
  }

  initWorld() {
    const worldData = generateWorld(this.scene, this.rng);
    this.buildings = worldData.buildings;
    this.buildingBoxes = worldData.buildingBoxes;
    this.water = worldData.water;
    this.dayBuildingTexture = worldData.buildingTexture;
    this.nightBuildingTexture = worldData.nightTexture;
  }

  addWheels(group) {
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const wheelPositions = [
      { x: -1.1, y: 0.35, z: 1.4 },
      { x: 1.1, y: 0.35, z: 1.4 },
      { x: -1.1, y: 0.35, z: -1.4 },
      { x: 1.1, y: 0.35, z: -1.4 },
    ];
    wheelPositions.forEach(pos => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(pos.x, pos.y, pos.z);
      w.castShadow = true;
      group.add(w);
    });
  }

  initPlayer() {
    // Player on-foot mesh
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3182ce });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf6ad55 });
    
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 1.2, 8), bodyMat);
    torso.position.y = 0.6;
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), headMat);
    head.position.y = 1.4;
    head.castShadow = true;
    group.add(head);

    group.position.set(0, 0, 0);
    this.scene.add(group);

    // Player car
    const carGroup = new THREE.Group();
    const carMat = new THREE.MeshStandardMaterial({ color: 0xe53e3e, metalness: 0.5, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 4.4), carMat);
    body.position.y = 0.6;
    body.castShadow = true;
    carGroup.add(body);

    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, metalness: 0.8, roughness: 0.1 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 2.2), cabinMat);
    cabin.position.set(0, 1.15, -0.2);
    cabin.castShadow = true;
    carGroup.add(cabin);

    this.addWheels(carGroup);

    carGroup.position.set(0, 0.5, 10);
    this.scene.add(carGroup);

    this.player = {
      mesh: group,
      car: carGroup,
      inVehicle: false,
      speed: 0,
      steering: 0,
      rotation: 0,
    };
  }

  initLights() {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    this.hemiLight.position.set(0, 500, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight.position.set(300, 600, 300);
    this.dirLight.castShadow = true;
    this.scene.add(this.dirLight);
  }

  initUI() {
    const startBtn = document.getElementById('start-btn');
    const continueBtn = document.getElementById('continue-btn');
    const titleScreen = document.getElementById('title-screen');

    const saved = localStorage.getItem('port_azahar_save');
    if (saved) {
      this.savedData = JSON.parse(saved);
      continueBtn.style.display = 'block';
    }

    startBtn.addEventListener('click', () => {
      this.audio.init();
      titleScreen.style.display = 'none';
      this.startMission(0);
    });

    continueBtn.addEventListener('click', () => {
      if (!this.savedData) return;
      this.audio.init();
      titleScreen.style.display = 'none';
      this.cash = this.savedData.cash;
      this.currentMissionIndex = this.savedData.missionIndex;
      this.startMission(this.currentMissionIndex);
    });

    document.getElementById('respawn-btn').addEventListener('click', () => {
      document.getElementById('gameover-screen').style.display = 'none';
      this.health = 100;
      this.wantedLevel = 0;
      this.player.mesh.position.set(0, 0, 0);
      this.player.inVehicle = false;
    });

    document.getElementById('freeroam-btn').addEventListener('click', () => {
      document.getElementById('ending-screen').style.display = 'none';
      this.missionActive = false;
      document.getElementById('mission-box').style.display = 'none';
    });
  }

  spawnCar(x, z, isPolice = false) {
    const group = new THREE.Group();
    const color = isPolice ? 0x111111 : new THREE.Color().setHSL(this.rng.next(), 0.7, 0.5);
    const carMat = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 4.2), carMat);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    if (isPolice) {
      const whiteCabinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 2.2), whiteCabinMat);
      cabin.position.set(0, 1.15, -0.2);
      cabin.castShadow = true;
      group.add(cabin);

      const doorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 2.0), doorMat);
      leftDoor.position.set(-1.06, 0.5, 0);
      group.add(leftDoor);
      const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 2.0), doorMat);
      rightDoor.position.set(1.06, 0.5, 0);
      group.add(rightDoor);

      const leftBarMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const rightBarMat = new THREE.MeshBasicMaterial({ color: 0x0055ff });
      const leftBar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.4), leftBarMat);
      leftBar.position.set(-0.3, 1.6, 0);
      group.add(leftBar);
      const rightBar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.4), rightBarMat);
      rightBar.position.set(0.3, 1.6, 0);
      group.add(rightBar);
    } else {
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, metalness: 0.8, roughness: 0.1 });
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 2.2), cabinMat);
      cabin.position.set(0, 1.15, -0.2);
      cabin.castShadow = true;
      group.add(cabin);
    }

    this.addWheels(group);

    group.position.set(x, 0.5, z);
    this.scene.add(group);
    return { mesh: group, speed: this.rng.range(5, 12), isPolice };
  }

  spawnPoliceCar(x, z) {
    return this.spawnCar(x, z, true);
  }

  startMission(index) {
    if (index >= MISSIONS.length) {
      document.getElementById('ending-screen').style.display = 'flex';
      return;
    }
    this.currentMissionIndex = index;
    const m = MISSIONS[index];
    this.missionActive = true;
    this.missionTimer = m.timeLimit;

    document.getElementById('mission-title').innerText = `Mission ${m.id}: ${m.title}`;
    document.getElementById('mission-desc').innerText = m.desc;
    document.getElementById('mission-box').style.display = 'block';

    // Show dialogue banner
    const banner = document.getElementById('dialogue-banner');
    document.getElementById('dialogue-speaker').innerText = m.dialogue.speaker;
    document.getElementById('dialogue-text').innerText = m.dialogue.text;
    banner.style.opacity = '1';
    setTimeout(() => { banner.style.opacity = '0'; }, 5000);

    this.audio.playMissionSting();
  }

  applyTimeOfDay() {
    const sunAngle = (this.timeOfDay / 24) * Math.PI * 2;
    if (this.dirLight) {
      this.dirLight.position.set(Math.cos(sunAngle) * 600, Math.sin(sunAngle) * 600, 300);
    }
    const isNight = this.timeOfDay < 6 || this.timeOfDay > 18;
    const skyColor = isNight ? 0x050814 : 0x87ceeb;
    if (this.scene && this.scene.background) {
      this.scene.background.set(skyColor);
      this.scene.fog.color.set(skyColor);
    }
    if (this.hemiLight) this.hemiLight.intensity = isNight ? 0.2 : 0.8;
    if (this.dirLight) this.dirLight.intensity = isNight ? 0.1 : 1.2;

    if (this._lastIsNight !== isNight && this.buildings) {
      this._lastIsNight = isNight;
      const targetTex = isNight ? this.nightBuildingTexture : this.dayBuildingTexture;
      if (targetTex || !isNight) {
        for (const b of this.buildings) {
          if (b.material) {
            b.material.map = targetTex;
            if (isNight) {
              b.material.emissive.set(0xffffff);
              b.material.emissiveMap = targetTex;
              b.material.emissiveIntensity = 0.85;
            } else {
              b.material.emissive.set(0x000000);
              b.material.emissiveMap = null;
              b.material.emissiveIntensity = 0;
            }
            b.material.needsUpdate = true;
          }
        }
      }
    }
  }

  update(dt) {
    if (this.freezeSimulation) return;

    // Time of day cycle
    this.timeOfDay = (this.timeOfDay + dt * this.daySpeed) % 24;
    this.applyTimeOfDay();

    // Input handling
    const forward = this.input.isDown('KeyW') || this.input.isDown('ArrowUp');
    const backward = this.input.isDown('KeyS') || this.input.isDown('ArrowDown');
    const left = this.input.isDown('KeyA') || this.input.isDown('ArrowLeft');
    const right = this.input.isDown('KeyD') || this.input.isDown('ArrowRight');
    const enterExit = this.input.isDown('KeyE') || this.input.isDown('KeyF');

    if (enterExit && !this._enterExitPressed) {
      this.player.inVehicle = !this.player.inVehicle;
      if (this.player.inVehicle) {
        document.getElementById('speedometer').style.display = 'block';
      } else {
        document.getElementById('speedometer').style.display = 'none';
      }
    }
    this._enterExitPressed = enterExit;

    if (this.input.isDown('KeyM') && !this._mutePressed) {
      this.audio.toggleMute();
    }
    this._mutePressed = this.input.isDown('KeyM');

    // Movement & Physics
    if (this.player.inVehicle) {
      const car = this.player.car;
      if (forward) this.player.speed = Math.min(this.player.speed + 30 * dt, 120);
      else if (backward) this.player.speed = Math.max(this.player.speed - 30 * dt, -40);
      else this.player.speed *= 0.95;

      if (left) this.player.rotation += 2.0 * dt * (this.player.speed / 60);
      if (right) this.player.rotation -= 2.0 * dt * (this.player.speed / 60);

      car.rotation.y = this.player.rotation;
      const moveDist = this.player.speed * dt;
      car.position.x += Math.sin(car.rotation.y) * moveDist;
      car.position.z += Math.cos(car.rotation.y) * moveDist;

      // Camera follow car (chase cam)
      const camTargetX = car.position.x - Math.sin(car.rotation.y) * 12;
      const camTargetZ = car.position.z - Math.cos(car.rotation.y) * 12;
      this.camera.position.lerp(new THREE.Vector3(camTargetX, car.position.y + 5, camTargetZ), 0.1);
      this.camera.lookAt(car.position.x, car.position.y + 1, car.position.z);

      this.audio.updateEngine(this.player.speed, true);
      document.getElementById('speedometer').innerText = `${Math.round(Math.abs(this.player.speed))} MPH`;
    } else {
      const moveSpeed = 12;
      const mesh = this.player.mesh;
      let dx = 0, dz = 0;
      if (forward) dz -= 1;
      if (backward) dz += 1;
      if (left) dx -= 1;
      if (right) dx += 1;

      if (dx !== 0 || dz !== 0) {
        mesh.position.x += dx * moveSpeed * dt;
        mesh.position.z += dz * moveSpeed * dt;
        mesh.rotation.y = Math.atan2(dx, dz);
      }

      // Camera follow player on foot
      const camTargetX = mesh.position.x;
      const camTargetZ = mesh.position.z + 8;
      this.camera.position.lerp(new THREE.Vector3(camTargetX, mesh.position.y + 5, camTargetZ), 0.1);
      this.camera.lookAt(mesh.position.x, mesh.position.y + 1, mesh.position.z);

      this.audio.updateEngine(0, false);
    }

    // Mission timer & check
    if (this.missionActive) {
      this.missionTimer -= dt;
      const timerEl = document.getElementById('mission-timer');
      timerEl.innerText = `Time Remaining: ${Math.max(0, Math.ceil(this.missionTimer))}s`;

      if (this.missionTimer <= 0) {
        this.missionActive = false;
        document.getElementById('go-title').innerText = "Mission Failed";
        document.getElementById('gameover-screen').style.display = 'flex';
      }
    }

    // HUD updates
    document.getElementById('cash-display').innerText = `$${this.cash.toLocaleString()}`;
    document.getElementById('health-fill').style.width = `${this.health}%`;
    document.getElementById('armor-fill').style.width = `${this.armor}%`;

    let starsStr = '';
    for (let i = 0; i < CONFIG.MAX_WANTED; i++) {
      starsStr += i < this.wantedLevel ? '★' : '☆';
    }
    document.getElementById('wanted-display').innerText = starsStr;

    this.renderMinimap();
  }

  renderMinimap() {
    const canvas = document.getElementById('minimap');
    if (!canvas) return;
    if (canvas.width !== 160) canvas.width = 160;
    if (canvas.height !== 160) canvas.height = 160;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 160, 160);

    const pos = this.player.inVehicle ? this.player.car.position : this.player.mesh.position;
    const scale = 0.15;

    ctx.save();
    ctx.translate(80, 80);
    ctx.scale(scale, scale);
    ctx.translate(-pos.x, -pos.z);

    // Draw blocks grid on minimap
    ctx.fillStyle = '#2d3748';
    for (let x = -720; x <= 720; x += 160) {
      for (let z = -720; z <= 720; z += 160) {
        ctx.fillRect(x, z, 100, 100);
      }
    }

    // Draw traffic car blips
    if (this.trafficCars) {
      ctx.fillStyle = '#ffffff';
      this.trafficCars.forEach(tc => {
        const cp = tc.mesh.position;
        ctx.beginPath();
        ctx.arc(cp.x, cp.z, 10, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw police car blips
    if (this.policeCars) {
      ctx.fillStyle = '#e53e3e';
      this.policeCars.forEach(pc => {
        const pp = pc.mesh.position;
        ctx.beginPath();
        ctx.arc(pp.x, pp.z, 10, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw player blip
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(pos.x, pos.z, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  loop() {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.update(Math.min(dt, 0.1));
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(() => this.loop());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new PortAzaharGame();
  requestAnimationFrame(() => window.gameInstance.loop());
});
