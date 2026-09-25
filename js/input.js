class Input {
  constructor() {
    this.keys = new Set();
    this.jumpQueued = false;
    this.onToggleJournal = null;
    const handled = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'Space', 'Tab']);
    window.addEventListener('keydown', (e) => {
      if (!handled.has(e.code)) return;
      e.preventDefault();
      if (e.code === 'Tab') {
        if (!e.repeat && this.onToggleJournal) this.onToggleJournal();
        return;
      }
      if (e.code === 'Space' && !e.repeat) this.jumpQueued = true;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  axis() {
    const x = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const z = (this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0);
    return { x, z };
  }

  get running() {
    return this.keys.has('KeyE');
  }

  consumeJump() {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }
}
