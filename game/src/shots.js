export function handleStagedShot(urlParams, game) {
  const shot = urlParams.get('shot');
  if (!shot) return;

  // Staged shot setup
  game.isShotMode = true;
  game.freezeSimulation = true;

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

    // Spawn 6 traffic cars around
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 30 + (i % 3) * 15;
      const c = game.spawnCar(200 + Math.cos(angle) * dist, 200 + Math.sin(angle) * dist, false);
      if (c) game.trafficCars.push(c);
    }
  } else if (shot === 'chase') {
    const title = document.getElementById('title-screen');
    if (title) title.style.display = 'none';

    game.player.inVehicle = true;
    game.player.car.position.set(0, 0.5, 0);
    game.player.car.rotation.y = 0;
    game.camera.position.set(0, 6, 22);
    game.camera.lookAt(0, 1, 0);
    game.wantedLevel = 3;

    // Spawn 3 police cars close beside and behind
    const offsets = [
      { x: -6, z: 8 },
      { x: 6, z: 8 },
      { x: 0, z: 14 }
    ];
    offsets.forEach(off => {
      const pc = game.spawnPoliceCar(off.x, off.z);
      if (pc) game.policeCars.push(pc);
    });
  } else if (shot === 'night') {
    const title = document.getElementById('title-screen');
    if (title) title.style.display = 'none';

    game.timeOfDay = 22; // Night
    game.player.inVehicle = false;
    game.player.mesh.position.set(400, 0, 400);
    game.camera.position.set(400, 3, 408);
    game.camera.lookAt(400, 1.5, 400);
  }

  // Render a few frames before setting __shotReady
  let renderedFrames = 0;
  const checkReady = () => {
    renderedFrames++;
    if (renderedFrames > 10) {
      window.__shotReady = true;
    } else {
      requestAnimationFrame(checkReady);
    }
  };
  requestAnimationFrame(checkReady);
}
