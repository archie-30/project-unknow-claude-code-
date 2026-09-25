class CameraRig {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.yaw = 0;
    this.pitch = 0.3;
    this.distance = 6.5;
    this.currentDistance = 6.5;
    this.focus = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.probe = new THREE.Vector3();
    this.thirdPosition = new THREE.Vector3();
    this.eye = new THREE.Vector3();
    this.lookTarget = new THREE.Vector3();
    this.pointers = new Map();
    this.pinchDistance = 0;
    this.manualIdle = 10;
    this.dragged = false;
    this.view = 0;
    this.viewTarget = 0;
    this.autoFollowEnabled = true;
    this.sensitivity = CONFIG.mouseSensitivity;
    this.inputEnabled = false;
    this.onUnlock = null;
    this.coarse = window.matchMedia('(pointer: coarse)').matches || !('requestPointerLock' in domElement);

    document.addEventListener('pointerlockchange', () => {
      if (!this.locked && this.onUnlock) this.onUnlock();
    });

    domElement.addEventListener('click', () => {
      if (this.dragged || !this.inputEnabled) return;
      this.requestLock();
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked || !this.inputEnabled) return;
      const dx = clamp(e.movementX, -200, 200);
      const dy = clamp(e.movementY, -200, 200);
      this.rotate(dx * this.sensitivity, dy * this.sensitivity);
    });

    domElement.addEventListener('pointerdown', (e) => {
      if (this.locked) return;
      this.dragged = false;
      domElement.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY });
      if (this.pointers.size === 2) this.pinchDistance = this.pointerSpread();
    });
    domElement.addEventListener('pointermove', (e) => {
      const last = this.pointers.get(e.pointerId);
      if (!last || !this.inputEnabled) return;
      if (Math.hypot(e.clientX - last.startX, e.clientY - last.startY) > 5) this.dragged = true;
      if (this.pointers.size === 1 && this.dragged) this.rotate((e.clientX - last.x) * this.sensitivity * 2.3, (e.clientY - last.y) * this.sensitivity * 1.8);
      last.x = e.clientX;
      last.y = e.clientY;
      if (this.pointers.size === 2) {
        const spread = this.pointerSpread();
        if (this.pinchDistance > 0) this.zoom(this.pinchDistance / spread);
        this.pinchDistance = spread;
      }
    });
    const release = (e) => {
      this.pointers.delete(e.pointerId);
      this.pinchDistance = 0;
    };
    domElement.addEventListener('pointerup', release);
    domElement.addEventListener('pointercancel', release);
    domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.inputEnabled) this.zoom(Math.exp(e.deltaY * 0.001));
    }, { passive: false });
  }

  get locked() {
    return document.pointerLockElement === this.domElement;
  }

  get firstPerson() {
    return this.viewTarget === 1;
  }

  requestLock() {
    if (this.coarse || this.locked) return;
    try {
      const request = this.domElement.requestPointerLock();
      if (request && request.catch) request.catch(() => {});
    } catch (error) {}
  }

  releaseLock() {
    if (this.locked) document.exitPointerLock();
  }

  setView(firstPerson) {
    this.viewTarget = firstPerson ? 1 : 0;
    if (!firstPerson) this.pitch = clamp(this.pitch, CONFIG.camMinPitch, CONFIG.camMaxPitch);
    this.manualIdle = 0;
  }

  rotate(dYaw, dPitch) {
    this.yaw -= dYaw;
    const min = this.viewTarget === 1 ? -1.3 : CONFIG.camMinPitch;
    this.pitch = clamp(this.pitch + dPitch, min, CONFIG.camMaxPitch);
    this.manualIdle = 0;
  }

  pointerSpread() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  zoom(factor) {
    this.distance = clamp(this.distance * factor, CONFIG.camMinDistance, CONFIG.camMaxDistance);
  }

  snapTo(target) {
    this.focus.set(target.x, target.y + CONFIG.camFocusHeight, target.z);
  }

  floorAt(x, z) {
    return Math.max(Terrain.heightAt(x, z), CONFIG.waterLevel) + CONFIG.camClearance;
  }

  autoFollow(dt, velocity) {
    this.manualIdle += dt;
    if (!this.autoFollowEnabled || this.viewTarget === 1) return;
    const speed = Math.hypot(velocity.x, velocity.z);
    if (this.manualIdle < CONFIG.autoCameraDelay || speed < 0.8) return;
    const behind = Math.atan2(velocity.x, velocity.z) + Math.PI;
    const diff = wrapAngle(behind - this.yaw);
    if (Math.abs(diff) < 2.5) {
      const strength = CONFIG.autoCameraStrength * clamp01(speed / CONFIG.runSpeed + 0.3);
      this.yaw += diff * (1 - Math.exp(-strength * dt));
    }
    if (this.manualIdle > CONFIG.autoCameraDelay + 1.5) this.pitch = damp(this.pitch, CONFIG.autoCameraPitch, 0.5, dt);
  }

  update(dt, target, velocity, bob = 0) {
    this.autoFollow(dt, velocity);
    const step = dt / CONFIG.viewTransitionTime;
    this.view = this.viewTarget > this.view ? Math.min(this.viewTarget, this.view + step) : Math.max(this.viewTarget, this.view - step);
    const blend = smoothstep(0, 1, this.view);

    this.focus.x = damp(this.focus.x, target.x, 14, dt);
    this.focus.z = damp(this.focus.z, target.z, 14, dt);
    this.focus.y = damp(this.focus.y, target.y + CONFIG.camFocusHeight, 8, dt);

    const cosPitch = Math.cos(this.pitch);
    this.direction.set(Math.sin(this.yaw) * cosPitch, Math.sin(this.pitch), Math.cos(this.yaw) * cosPitch);

    let allowed = this.distance;
    const steps = 28;
    for (let i = 1; i <= steps; i++) {
      const d = (this.distance * i) / steps;
      this.probe.copy(this.focus).addScaledVector(this.direction, d);
      if (this.probe.y < this.floorAt(this.probe.x, this.probe.z)) {
        allowed = Math.max(0.6, d - this.distance / steps);
        break;
      }
    }
    this.currentDistance = allowed < this.currentDistance ? allowed : damp(this.currentDistance, allowed, 4, dt);
    this.thirdPosition.copy(this.focus).addScaledVector(this.direction, this.currentDistance);
    const floor = this.floorAt(this.thirdPosition.x, this.thirdPosition.z);
    if (this.thirdPosition.y < floor) this.thirdPosition.y = floor;

    this.eye.set(target.x - Math.sin(this.yaw) * 0.12, target.y + CONFIG.eyeHeight + bob, target.z - Math.cos(this.yaw) * 0.12);
    this.camera.position.lerpVectors(this.thirdPosition, this.eye, blend);
    this.lookTarget.copy(this.eye).addScaledVector(this.direction, -10);
    this.lookTarget.lerpVectors(this.focus, this.lookTarget, blend);
    this.camera.lookAt(this.lookTarget);

    const fov = lerp(CONFIG.thirdPersonFov, CONFIG.firstPersonFov, blend);
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    if (blend > 0.8) this.camera.layers.disable(1);
    else this.camera.layers.enable(1);
  }
}
