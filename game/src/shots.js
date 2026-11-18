import * as THREE from 'three';

export function handleStagedShot(urlParams, game) {
  const shot = urlParams.get('shot');
  if (!shot) return;

  // Staged shot setup
  game.isShotMode = true;
  game.freezeSimulation = true;

  const collidesWithBuildings = (x, z, boxes) => {
    const halfW = 1.5;
    const halfD = 2.5;
    for (const b of boxes) {
      if (!(x + halfW < b.minX || x - halfW > b.maxX || z + halfD < b.minZ || z - halfD > b.maxZ)) {
        return true;
      }
    }
    return false;
  };

  if (shot === 'title') {
    game.camera.position.set(400, 250, 400);
    game.camera.lookAt(200, 50, 200);
    // Keep title screen visible with light veil
    const title = document.getElementById('title-screen');
    if (title) {
      title.style.display = 'flex';
      title.style.background = 'rgba(11,15,25,0.4)';
    }
  } else if (shot === 'drive') {
    // Hide title
    const title = document.getElementById('title-screen');
    if (title) title.style.display = 'none';

    // Place player car and multiple traffic cars
    game.player.inVehicle = true;
    game.player.car.position.set(200, 0.5, 200);
    game.player.car.rotation.y = 0;
    game.camera.position.set(200, 6, 222);
    game.camera.lookAt(200, 1, 200);

    game.player.speed = 54;
    const speedEl = document.getElementById('speedometer');
    if (speedEl) {
      speedEl.style.display = 'block';
      speedEl.innerText = '54 MPH';
    }

    // Stage traffic ON the road with player (6 cars within 8-28m)
    const trafficSpecs = [
      { x: 200, z: 210, heading: 0 },
      { x: 203.5, z: 218, heading: 0 },
      { x: 196.5, z: 226, heading: 0 },
      { x: 196.5, z: 190, heading: 0 },
      { x: 203.5, z: 194, heading: 0 },
      { x: 196.5, z: 215, heading: Math.PI } // oncoming
    ];

    trafficSpecs.forEach(spec => {
      let cx = spec.x;
      let cz = spec.z;
      let attempts = 0;
      while (collidesWithBuildings(cx, cz, game.buildingBoxes) && attempts < 10) {
        cz += 4;
        attempts++;
      }
      const c = game.spawnCar(cx, cz, false);
      if (c) {
        c.mesh.rotation.y = spec.heading;
        game.trafficCars.push(c);
      }
    });
  } else if (shot === 'chase') {
    const title = document.getElementById('title-screen');
    if (title) title.style.display = 'none';

    game.player.inVehicle = true;
    game.player.car.position.set(0, 0.5, 0);
    game.player.car.rotation.y = 0;
    game.camera.position.set(0, 6, 22);
    game.camera.lookAt(0, 1, 0);
    game.wantedLevel = 3;

    game.player.speed = 43;
    const speedEl = document.getElementById('speedometer');
    if (speedEl) {
      speedEl.style.display = 'block';
      speedEl.innerText = '43 MPH';
    }

    // Spawn 3 police cars close beside and behind
    const offsets = [
      { x: -6, z: 8 },
      { x: 6, z: 8 },
      { x: 0, z: 14 }
    ];
    offsets.forEach(off => {
      let cx = off.x;
      let cz = off.z;
      let attempts = 0;
      while (collidesWithBuildings(cx, cz, game.buildingBoxes) && attempts < 10) {
        cz += 4;
        attempts++;
      }
      const pc = game.spawnPoliceCar(cx, cz);
      if (pc) game.policeCars.push(pc);
    });
  } else if (shot === 'night') {
    const title = document.getElementById('title-screen');
    if (title) title.style.display = 'none';

    game.timeOfDay = 22; // Night
    game.applyTimeOfDay();

    game.player.inVehicle = false;
    game.player.mesh.position.set(340, 0, 420);
    game.camera.position.set(340, 3, 430);
    game.camera.lookAt(340, 1.5, 420);

    // 2 parked traffic cars on the sides of the road
    const car1 = game.spawnCar(335, 414, false);
    if (car1) {
      car1.mesh.rotation.y = 0;
      game.trafficCars.push(car1);
    }
    const car2 = game.spawnCar(345, 407, false);
    if (car2) {
      car2.mesh.rotation.y = 0;
      game.trafficCars.push(car2);
    }

    // Two point lights for neon glow
    const plight1 = new THREE.PointLight(0xff2d95, 60, 60);
    plight1.position.set(335, 0.5, 410);
    game.scene.add(plight1);

    const plight2 = new THREE.PointLight(0x00e5ff, 60, 60);
    plight2.position.set(345, 0.5, 410);
    game.scene.add(plight2);
  }

  // Render frames and refresh HUD/minimap before setting __shotReady
  let renderedFrames = 0;
  const checkReady = () => {
    renderedFrames++;

    const cashEl = document.getElementById('cash-display');
    if (cashEl) cashEl.innerText = `$${game.cash.toLocaleString()}`;
    const healthEl = document.getElementById('health-fill');
    if (healthEl) healthEl.style.width = `${game.health}%`;
    const armorEl = document.getElementById('armor-fill');
    if (armorEl) armorEl.style.width = `${game.armor}%`;
    const wantedEl = document.getElementById('wanted-display');
    if (wantedEl) {
      let starsStr = '';
      for (let i = 0; i < 5; i++) {
        starsStr += i < game.wantedLevel ? '★' : '☆';
      }
      wantedEl.innerText = starsStr;
    }
    game.renderMinimap();

    if (renderedFrames > 15) {
      window.__shotReady = true;
    } else {
      requestAnimationFrame(checkReady);
    }
  };
  requestAnimationFrame(checkReady);
}
