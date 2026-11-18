export class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = { left: false, x: 0, y: 0, dx: 0, dy: 0 };
    this.listeners = [];

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.keys[e.key.toLowerCase()] = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouse.left = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.left = false;
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.dx = e.movementX || 0;
      this.mouse.dy = e.movementY || 0;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  isDown(name) {
    return !!this.keys[name];
  }
}
