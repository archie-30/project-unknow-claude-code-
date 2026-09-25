class Player {
  constructor(materials) {
    this.position = new THREE.Vector3();
    this.previousPosition = new THREE.Vector3();
    this.renderPosition = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.grounded = false;
    this.swimming = false;
    this.feetInWater = false;
    this.timeSinceGrounded = 0;
    this.jumpBufferTimer = 0;
    this.hasJumped = false;
    this.facing = 0;
    this.turnRate = 0;
    this.landImpact = 0;
    this.splash = 0;

    this.rig = createExplorer(materials);
    this.animator = new ExplorerAnimator(this.rig);
    this.mesh = new THREE.Group();
    this.mesh.add(this.rig.root);
  }

  spawn(x, z) {
    const ground = Math.max(Terrain.heightAt(x, z), CONFIG.waterLevel - CONFIG.swimDepth);
    this.position.set(x, ground + 0.05, z);
    this.previousPosition.copy(this.position);
    this.renderPosition.copy(this.position);
    this.velocity.set(0, 0, 0);
  }

  get horizontalSpeed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  fixedUpdate(dt, input, cameraYaw, world) {
    this.previousPosition.copy(this.position);

    const { x: ix, z: iz } = input.axis();
    let wishX = Math.cos(cameraYaw) * ix + Math.sin(cameraYaw) * iz;
    let wishZ = -Math.sin(cameraYaw) * ix + Math.cos(cameraYaw) * iz;
    const wishLength = Math.hypot(wishX, wishZ);
    const terrainHere = Terrain.heightAt(this.position.x, this.position.z);
    let targetSpeed = 0;
    if (wishLength > 0) {
      wishX /= wishLength;
      wishZ /= wishLength;
      targetSpeed = input.running ? CONFIG.runSpeed : CONFIG.walkSpeed;
      if (this.grounded && !this.swimming) {
        const grade = (Terrain.heightAt(this.position.x + wishX * 0.5, this.position.z + wishZ * 0.5) - terrainHere) / 0.5;
        targetSpeed *= Math.min(1, Math.max(0.35, 1 - (grade - 0.6) * 0.8));
      }
      const depth = CONFIG.waterLevel - terrainHere;
      if (depth > 0.3) targetSpeed *= 1 - (1 - CONFIG.swimSpeedFactor) * clamp01((depth - 0.3) / 0.9);
    }

    const accel = (this.grounded ? CONFIG.groundAccel : CONFIG.airAccel) * dt;
    const dvx = wishX * targetSpeed - this.velocity.x;
    const dvz = wishZ * targetSpeed - this.velocity.z;
    const dvLength = Math.hypot(dvx, dvz);
    if (dvLength <= accel) {
      this.velocity.x += dvx;
      this.velocity.z += dvz;
    } else {
      this.velocity.x += (dvx / dvLength) * accel;
      this.velocity.z += (dvz / dvLength) * accel;
    }

    if (input.consumeJump()) this.jumpBufferTimer = CONFIG.jumpBufferTime;
    else this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    const canJump = !this.hasJumped && (this.grounded || this.timeSinceGrounded < CONFIG.coyoteTime);
    if (this.jumpBufferTimer > 0 && canJump) {
      this.velocity.y = CONFIG.jumpSpeed * (this.swimming ? 0.75 : 1);
      this.grounded = false;
      this.swimming = false;
      this.hasJumped = true;
      this.jumpBufferTimer = 0;
    }

    const wasGrounded = this.grounded;
    this.velocity.y -= CONFIG.gravity * dt;
    this.position.addScaledVector(this.velocity, dt);
    world.resolveObstacles(this.position, this.velocity, CONFIG.playerRadius);

    const feetInWater = this.position.y < CONFIG.waterLevel && Terrain.heightAt(this.position.x, this.position.z) < CONFIG.waterLevel;
    if (feetInWater && !this.feetInWater && this.velocity.y < -3) this.splash = Math.min(2, -this.velocity.y / 6);
    this.feetInWater = feetInWater;

    const solidY = world.groundHeight(this.position.x, this.position.z, this.position.y);
    const swimY = CONFIG.waterLevel - CONFIG.swimDepth;
    const supportY = Math.max(solidY, swimY);
    const onWater = swimY > solidY;
    if (this.position.y <= supportY) {
      const impact = -this.velocity.y;
      this.position.y = supportY;
      if (this.velocity.y < 0) this.velocity.y = 0;
      if (!wasGrounded && !onWater) this.landImpact = Math.max(this.landImpact, impact);
      this.grounded = true;
    } else if (wasGrounded && this.velocity.y <= 0 && this.position.y - supportY < CONFIG.groundSnap) {
      this.position.y = supportY;
      this.velocity.y = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }
    this.swimming = this.grounded && onWater;

    if (this.grounded) {
      this.timeSinceGrounded = 0;
      this.hasJumped = false;
    } else {
      this.timeSinceGrounded += dt;
    }
  }

  render(alpha, dt) {
    this.renderPosition.lerpVectors(this.previousPosition, this.position, alpha);
    this.mesh.position.copy(this.renderPosition);

    const speed = this.horizontalSpeed;
    const previousFacing = this.facing;
    if (speed > 0.3) {
      const target = Math.atan2(this.velocity.x, this.velocity.z);
      this.facing += wrapAngle(target - this.facing) * (1 - Math.exp(-10 * dt));
    }
    this.mesh.rotation.y = this.facing;
    this.turnRate = damp(this.turnRate, wrapAngle(this.facing - previousFacing) / Math.max(dt, 1e-4), 10, dt);

    this.animator.update(dt, {
      speed,
      grounded: this.grounded,
      swimming: this.swimming,
      verticalSpeed: this.velocity.y,
      turnRate: this.turnRate,
      landImpact: this.landImpact,
    });
    this.landImpact = 0;
  }
}
