class Chunk {
  constructor(cx, cz, materials, assets) {
    this.cx = cx;
    this.cz = cz;
    this.originX = cx * CONFIG.chunkSize;
    this.originZ = cz * CONFIG.chunkSize;
    this.group = new THREE.Group();
    this.group.position.set(this.originX, 0, this.originZ);
    this.detailGroup = new THREE.Group();
    this.group.add(this.detailGroup);
    this.colliders = [];
    this.decorMeshes = [];
    this.shadowMeshes = [];
    this.box = new THREE.Box3();

    this.sampleHeights();
    this.buildBiomeGrid();
    this.terrain = this.buildTerrain(materials.terrain);
    this.group.add(this.terrain);
    this.water = this.buildWater(materials.water);
    if (this.water) this.group.add(this.water);
    this.nearbyLandmarks = Landmarks.near(this.originX + CONFIG.chunkSize / 2, this.originZ + CONFIG.chunkSize / 2, CONFIG.chunkSize * 0.72 + 24);
    this.landmarks = [];
    this.buildLandmarks(materials);
    this.buildDecorations(materials, assets);
    this.box.min.set(this.originX, Math.min(this.minY, CONFIG.waterLevel) - 1, this.originZ);
    this.box.max.set(this.originX + CONFIG.chunkSize, this.maxY + 12, this.originZ + CONFIG.chunkSize);
  }

  sampleHeights() {
    const seg = CONFIG.chunkSegments;
    const cell = Terrain.cell;
    this.stride = seg + 3;
    this.heights = new Float32Array(this.stride * this.stride);
    this.minY = Infinity;
    this.maxY = -Infinity;
    for (let j = -1; j <= seg + 1; j++) {
      for (let i = -1; i <= seg + 1; i++) {
        const h = Terrain.sampleHeight(this.originX + i * cell, this.originZ + j * cell);
        this.heights[(j + 1) * this.stride + (i + 1)] = h;
        if (i >= 0 && j >= 0 && i <= seg && j <= seg) {
          this.minY = Math.min(this.minY, h);
          this.maxY = Math.max(this.maxY, h);
        }
      }
    }
  }

  gridHeight(i, j) {
    return this.heights[(j + 1) * this.stride + (i + 1)];
  }

  curvature(i, j) {
    const h = this.gridHeight(i, j);
    return h - (this.gridHeight(i - 1, j) + this.gridHeight(i + 1, j) + this.gridHeight(i, j - 1) + this.gridHeight(i, j + 1)) / 4;
  }

  localSurface(lx, lz, out) {
    const seg = CONFIG.chunkSegments;
    const cell = Terrain.cell;
    const ix = Math.min(seg - 1, Math.max(0, Math.floor(lx / cell)));
    const iz = Math.min(seg - 1, Math.max(0, Math.floor(lz / cell)));
    const fx = lx / cell - ix;
    const fz = lz / cell - iz;
    return Terrain.interpolate(this.gridHeight(ix, iz), this.gridHeight(ix + 1, iz), this.gridHeight(ix, iz + 1), this.gridHeight(ix + 1, iz + 1), fx, fz, out);
  }

  buildBiomeGrid() {
    const n = CONFIG.chunkSize / CONFIG.decorSpacing;
    this.biomeGridSize = n;
    this.biomeGrid = new Uint8Array(n * n);
    const surface = { height: 0, normalY: 1 };
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const lx = (i + 0.5) * CONFIG.decorSpacing;
        const lz = (j + 0.5) * CONFIG.decorSpacing;
        this.localSurface(lx, lz, surface);
        this.biomeGrid[j * n + i] = Terrain.biomeAt(this.originX + lx, this.originZ + lz, surface.height);
      }
    }
  }

  biomeNear(lx, lz) {
    const n = this.biomeGridSize;
    const i = Math.min(n - 1, Math.max(0, Math.floor(lx / CONFIG.decorSpacing)));
    const j = Math.min(n - 1, Math.max(0, Math.floor(lz / CONFIG.decorSpacing)));
    return this.biomeGrid[j * n + i];
  }

  buildTerrain(material) {
    const seg = CONFIG.chunkSegments;
    const cell = Terrain.cell;
    const stride = seg + 1;
    const count = stride * stride;
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    for (let j = 0; j <= seg; j++) {
      for (let i = 0; i <= seg; i++) {
        const k = j * stride + i;
        const h = this.gridHeight(i, j);
        const nx = this.gridHeight(i - 1, j) - this.gridHeight(i + 1, j);
        const nz = this.gridHeight(i, j - 1) - this.gridHeight(i, j + 1);
        const ny = 2 * cell;
        const len = Math.hypot(nx, ny, nz);
        positions[k * 3] = i * cell;
        positions[k * 3 + 1] = h;
        positions[k * 3 + 2] = j * cell;
        normals[k * 3] = nx / len;
        normals[k * 3 + 1] = ny / len;
        normals[k * 3 + 2] = nz / len;
        Terrain.colorAt(this.originX + i * cell, this.originZ + j * cell, h, ny / len, color);
        const shade = 1 + clamp(this.curvature(i, j) * 0.1, -0.12, 0.08);
        colors[k * 3] = color.r * shade;
        colors[k * 3 + 1] = color.g * shade;
        colors[k * 3 + 2] = color.b * shade;
      }
    }
    const indices = new Uint32Array(seg * seg * 6);
    let o = 0;
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * stride + i;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        indices[o++] = a; indices[o++] = d; indices[o++] = b;
        indices[o++] = a; indices[o++] = c; indices[o++] = d;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  buildWater(material) {
    if (this.minY > CONFIG.waterLevel + 0.05) return null;
    const seg = CONFIG.chunkSegments;
    const cell = Terrain.cell;
    const level = CONFIG.waterLevel;
    const positions = [];
    const colors = [];
    const foam = [0.96, 0.97, 0.95, 0.85];
    const shallow = [0.58, 0.83, 0.8, 0.6];
    const deep = [0.3, 0.58, 0.7, 0.9];

    const pushVertex = (i, j) => {
      positions.push(i * cell, level, j * cell);
      const depth = level - this.gridHeight(i, j);
      let from = foam;
      let to = shallow;
      let t = clamp01(depth / 0.35);
      if (depth > 0.35) {
        from = shallow;
        to = deep;
        t = smoothstep(0.35, 4.5, depth);
      }
      for (let k = 0; k < 4; k++) colors.push(lerp(from[k], to[k], t));
    };

    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const lowest = Math.min(this.gridHeight(i, j), this.gridHeight(i + 1, j), this.gridHeight(i, j + 1), this.gridHeight(i + 1, j + 1));
        if (lowest > level + 0.05) continue;
        pushVertex(i, j); pushVertex(i + 1, j + 1); pushVertex(i + 1, j);
        pushVertex(i, j); pushVertex(i, j + 1); pushVertex(i + 1, j + 1);
      }
    }
    if (positions.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    return mesh;
  }

  buildLandmarks(materials) {
    for (const lm of this.nearbyLandmarks) {
      if (Math.floor(lm.x / CONFIG.chunkSize) !== this.cx || Math.floor(lm.z / CONFIG.chunkSize) !== this.cz) continue;
      const built = LandmarkBuilder.build(lm);
      const mesh = new THREE.Mesh(built.geometry, materials.solid);
      mesh.position.set(lm.x - this.originX, built.floor, lm.z - this.originZ);
      mesh.rotation.y = lm.rotation;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      const meshes = [mesh];
      for (const extra of built.extras) {
        const child = new THREE.Mesh(extra.geometry, materials.solid);
        child.position.set(...extra.position);
        child.rotation.y = extra.rotationY;
        child.castShadow = true;
        child.receiveShadow = true;
        mesh.add(child);
        meshes.push(child);
      }
      this.colliders.push(...built.colliders);
      this.maxY = Math.max(this.maxY, built.floor + 6);
      let smoke = null;
      if (built.smoke) {
        const c = Math.cos(lm.rotation);
        const s = Math.sin(lm.rotation);
        smoke = new THREE.Vector3(lm.x + built.smoke.x * c + built.smoke.z * s, built.floor + built.smoke.y, lm.z - built.smoke.x * s + built.smoke.z * c);
        smoke.size = built.smoke.size || 1;
      }
      this.landmarks.push({ lm, meshes, smoke });
    }
  }

  clearedByLandmark(x, z, margin = 0) {
    for (const lm of this.nearbyLandmarks) {
      if (Math.hypot(x - lm.x, z - lm.z) < lm.clear + margin) return true;
    }
    return false;
  }

  pickDecor(height, normalY, biome, forest, roll) {
    const water = CONFIG.waterLevel;
    if (height < water - 0.6) return null;
    if (height < water + 0.5) return roll < 0.35 ? 'reeds' : roll < 0.4 ? 'pebbles' : null;
    if (normalY < 0.78) return roll < 0.1 ? 'rock' : roll < 0.13 ? 'boulder' : null;
    let acc = 0;
    for (const [type, chance] of BIOME_DECOR[biome]) {
      acc += DECOR_TYPES[type].tree ? chance * forest : chance;
      if (roll < acc) return type;
    }
    return null;
  }

  pickGroundCover(height, normalY, biome, roll) {
    if (height < CONFIG.waterLevel + 0.5 || normalY < 0.8) return null;
    let acc = 0;
    for (const [type, chance] of GROUND_COVER[biome]) {
      acc += chance;
      if (roll < acc) return type;
    }
    return null;
  }

  buildDecorations(materials, assets) {
    const rng = mulberry32(hash2(this.cx, this.cz, WORLD_SEED ^ 0x9e3779b9));
    const lists = {};
    const surface = { height: 0, normalY: 1 };

    const place = (typeName, lx, lz, r1, r2, r3, r4) => {
      const type = DECOR_TYPES[typeName];
      const x = this.originX + lx;
      const z = this.originZ + lz;
      const s = type.scale[0] + r1 * (type.scale[1] - type.scale[0]);
      const ry = r2 * Math.PI * 2;
      const shade = 0.86 + r3 * 0.24;
      const tint = type.tint || [1, 1, 1];
      const entry = {
        x, y: surface.height - 0.12, z, rx: 0, ry, rz: 0, sx: s, sy: s * (0.9 + r4 * 0.25), sz: s,
        r: tint[0] * shade * (0.96 + r4 * 0.08), g: tint[1] * shade, b: tint[2] * shade * (0.94 + r1 * 0.08),
      };

      if (type.rock) {
        entry.sx = s * (0.8 + r3 * 0.5);
        entry.sy = s * (0.55 + r4 * 0.45);
        entry.sz = s * (0.8 + r1 * 0.5);
        entry.rx = (r3 - 0.5) * 0.4;
        entry.rz = (r4 - 0.5) * 0.4;
        entry.y = surface.height - 0.25 * entry.sy;
        this.colliders.push({ x, z, radius: Math.max(entry.sx, entry.sz) * 0.85, top: entry.y + entry.sy * 0.85, walkable: true });
      } else if (type.log) {
        entry.sy = s;
        const ax = Math.cos(ry);
        const az = -Math.sin(ry);
        for (const t of [-1.1, 0, 1.1]) {
          this.colliders.push({ x: x + ax * t * s, z: z + az * t * s, radius: 0.34 * s, top: entry.y + 0.58 * s, walkable: true });
        }
      } else if (type.trunk) {
        this.colliders.push({ x, z, radius: type.trunk * s, top: Infinity, walkable: false });
      }

      (lists[type.asset] || (lists[type.asset] = { detail: !!type.detail, entries: [] })).entries.push(entry);
    };

    const spacing = CONFIG.decorSpacing;
    const cells = CONFIG.chunkSize / spacing;
    for (let gj = 0; gj < cells; gj++) {
      for (let gi = 0; gi < cells; gi++) {
        const lx = (gi + rng()) * spacing;
        const lz = (gj + rng()) * spacing;
        const roll = rng(), r1 = rng(), r2 = rng(), r3 = rng(), r4 = rng();
        if (this.nearbyLandmarks.length && this.clearedByLandmark(this.originX + lx, this.originZ + lz)) continue;
        this.localSurface(lx, lz, surface);
        const forest = 0.4 + 1.2 * smoothstep(-0.2, 0.6, Terrain.noise((this.originX + lx) * 0.008 + 900, (this.originZ + lz) * 0.008 - 300));
        const typeName = this.pickDecor(surface.height, surface.normalY, this.biomeNear(lx, lz), forest, roll);
        if (typeName && DECOR_TYPES[typeName].tree && this.nearbyLandmarks.length && this.clearedByLandmark(this.originX + lx, this.originZ + lz, 6)) continue;
        if (typeName) place(typeName, lx, lz, r1, r2, r3, r4);
      }
    }

    const coverSpacing = CONFIG.groundCoverSpacing;
    const coverCells = CONFIG.chunkSize / coverSpacing;
    for (let gj = 0; gj < coverCells; gj++) {
      for (let gi = 0; gi < coverCells; gi++) {
        const lx = (gi + rng()) * coverSpacing;
        const lz = (gj + rng()) * coverSpacing;
        const roll = rng(), r1 = rng(), r2 = rng(), r3 = rng(), r4 = rng();
        if (this.nearbyLandmarks.length && this.clearedByLandmark(this.originX + lx, this.originZ + lz)) continue;
        this.localSurface(lx, lz, surface);
        const typeName = this.pickGroundCover(surface.height, surface.normalY, this.biomeNear(lx, lz), roll);
        if (typeName) place(typeName, lx, lz, r1, r2, r3, r4);
      }
    }

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();

    for (const [assetName, { detail, entries }] of Object.entries(lists)) {
      const mesh = new THREE.InstancedMesh(assets[assetName], materials.decor, entries.length);
      entries.forEach((e, i) => {
        position.set(e.x - this.originX, e.y, e.z - this.originZ);
        quaternion.setFromEuler(euler.set(e.rx, e.ry, e.rz));
        scale.set(e.sx, e.sy, e.sz);
        mesh.setMatrixAt(i, matrix.compose(position, quaternion, scale));
        mesh.setColorAt(i, color.setRGB(e.r, e.g, e.b));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      mesh.frustumCulled = false;
      mesh.receiveShadow = true;
      mesh.customDepthMaterial = materials.decorDepth;
      this.decorMeshes.push(mesh);
      if (detail) this.detailGroup.add(mesh);
      else {
        this.shadowMeshes.push(mesh);
        this.group.add(mesh);
      }
    }
  }

  setCastShadow(enabled) {
    for (const mesh of this.shadowMeshes) mesh.castShadow = enabled;
  }

  dispose() {
    for (const { meshes } of this.landmarks) meshes.forEach((m) => m.geometry.dispose());
    this.terrain.geometry.dispose();
    if (this.water) this.water.geometry.dispose();
    for (const mesh of this.decorMeshes) mesh.dispose();
  }
}
