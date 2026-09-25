class World {
  constructor(scene, materials, assets) {
    this.scene = scene;
    this.materials = materials;
    this.assets = assets;
    this.chunks = new Map();
    this.queue = [];
    this.centerX = null;
    this.centerZ = null;
    this.frustum = new THREE.Frustum();
    this.projScreen = new THREE.Matrix4();
  }

  static key(cx, cz) {
    return cx + ',' + cz;
  }

  chunkCoord(value) {
    return Math.floor(value / CONFIG.chunkSize);
  }

  ringDistance(chunk) {
    return Math.max(Math.abs(chunk.cx - this.centerX), Math.abs(chunk.cz - this.centerZ));
  }

  loadChunk(cx, cz) {
    const chunk = new Chunk(cx, cz, this.materials, this.assets);
    this.chunks.set(World.key(cx, cz), chunk);
    this.applyDistanceSettings(chunk);
    this.scene.add(chunk.group);
  }

  unloadChunk(key, chunk) {
    this.scene.remove(chunk.group);
    chunk.dispose();
    this.chunks.delete(key);
  }

  applyDistanceSettings(chunk) {
    const distance = this.ringDistance(chunk);
    chunk.setCastShadow(distance <= CONFIG.shadowChunkRadius);
    chunk.detailGroup.visible = distance <= CONFIG.detailRadius;
  }

  loadAll(position) {
    this.update(position, new THREE.Vector3());
    while (this.queue.length > 0) {
      const { cx, cz } = this.queue.shift();
      this.loadChunk(cx, cz);
    }
  }

  update(position, velocity) {
    const cx = this.chunkCoord(position.x);
    const cz = this.chunkCoord(position.z);
    if (cx !== this.centerX || cz !== this.centerZ) {
      this.centerX = cx;
      this.centerZ = cz;
      this.refresh(position, velocity);
    }

    let built = 0;
    while (built < CONFIG.chunksPerFrame && this.queue.length > 0) {
      const next = this.queue.shift();
      if (this.chunks.has(World.key(next.cx, next.cz))) continue;
      if (Math.max(Math.abs(next.cx - this.centerX), Math.abs(next.cz - this.centerZ)) > CONFIG.loadRadius) continue;
      this.loadChunk(next.cx, next.cz);
      built++;
    }
  }

  refresh(position, velocity) {
    for (const [key, chunk] of this.chunks) {
      if (this.ringDistance(chunk) > CONFIG.unloadRadius) this.unloadChunk(key, chunk);
      else this.applyDistanceSettings(chunk);
    }

    const lookX = position.x + velocity.x * CONFIG.lookAheadSeconds;
    const lookZ = position.z + velocity.z * CONFIG.lookAheadSeconds;
    const half = CONFIG.chunkSize / 2;
    this.queue = [];
    for (let dz = -CONFIG.loadRadius; dz <= CONFIG.loadRadius; dz++) {
      for (let dx = -CONFIG.loadRadius; dx <= CONFIG.loadRadius; dx++) {
        const cx = this.centerX + dx;
        const cz = this.centerZ + dz;
        if (this.chunks.has(World.key(cx, cz))) continue;
        const mx = cx * CONFIG.chunkSize + half - lookX;
        const mz = cz * CONFIG.chunkSize + half - lookZ;
        this.queue.push({ cx, cz, priority: mx * mx + mz * mz });
      }
    }
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  cull(camera) {
    this.projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreen);
    for (const chunk of this.chunks.values()) {
      const near = this.ringDistance(chunk) <= CONFIG.shadowChunkRadius;
      chunk.group.visible = near || this.frustum.intersectsBox(chunk.box);
    }
  }

  forEachColliderNear(x, z, callback) {
    const cx = this.chunkCoord(x);
    const cz = this.chunkCoord(z);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const chunk = this.chunks.get(World.key(cx + dx, cz + dz));
        if (!chunk) continue;
        for (const collider of chunk.colliders) callback(collider);
      }
    }
  }

  groundHeight(x, z, feetY) {
    let ground = Terrain.heightAt(x, z);
    this.forEachColliderNear(x, z, (c) => {
      if (!c.walkable || feetY < c.top - CONFIG.stepUp) return;
      const dx = x - c.x;
      const dz = z - c.z;
      if (dx * dx + dz * dz < c.radius * c.radius * 0.55) ground = Math.max(ground, c.top);
    });
    return ground;
  }

  resolveObstacles(position, velocity, radius) {
    this.forEachColliderNear(position.x, position.z, (c) => {
      if (c.walkable && position.y >= c.top - CONFIG.stepUp) return;
      const dx = position.x - c.x;
      const dz = position.z - c.z;
      const minDistance = c.radius + radius;
      const distSq = dx * dx + dz * dz;
      if (distSq >= minDistance * minDistance) return;
      const dist = Math.sqrt(distSq) || 0.0001;
      const nx = dx / dist;
      const nz = dz / dist;
      position.x = c.x + nx * minDistance;
      position.z = c.z + nz * minDistance;
      const into = velocity.x * nx + velocity.z * nz;
      if (into < 0) {
        velocity.x -= into * nx;
        velocity.z -= into * nz;
      }
    });
  }
}

