class Ripples {
  constructor(scene, count = 24) {
    const geometry = new THREE.RingGeometry(0.34, 0.42, 28).rotateX(-Math.PI / 2);
    this.items = [];
    this.next = 0;
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      mesh.renderOrder = 2;
      scene.add(mesh);
      this.items.push({ mesh, age: 0, life: 1, size: 1 });
    }
  }

  spawn(x, z, size = 1, life = 1.6) {
    const item = this.items[this.next];
    this.next = (this.next + 1) % this.items.length;
    item.age = 0;
    item.life = life;
    item.size = size;
    item.mesh.position.set(x, CONFIG.waterLevel + 0.1, z);
    item.mesh.visible = true;
  }

  update(dt) {
    for (const item of this.items) {
      if (!item.mesh.visible) continue;
      item.age += dt;
      const t = item.age / item.life;
      if (t >= 1) {
        item.mesh.visible = false;
        continue;
      }
      const s = item.size * (0.6 + Math.sqrt(t) * 3.2);
      item.mesh.scale.set(s, 1, s);
      item.mesh.material.opacity = (1 - t) * (1 - t) * 0.75;
    }
  }
}
