class Input {
  constructor() {
    this.keys = new Set();
    this.jumpQueued = false;
    this.onToggleJournal = null;
    this.onView = null;
    this.onEscape = null;
    this.onPage = null;
    const movement = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'Space']);
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      switch (e.code) {
        case 'Tab':
          e.preventDefault();
          if (!e.repeat && this.onToggleJournal) this.onToggleJournal();
          return;
        case 'Escape':
          if (!e.repeat && this.onEscape) this.onEscape();
          return;
        case 'Digit1':
        case 'Numpad1':
          if (this.onView) this.onView(true);
          return;
        case 'Digit3':
        case 'Numpad3':
          if (this.onView) this.onView(false);
          return;
        case 'ArrowLeft':
        case 'ArrowRight':
          if (this.onPage) this.onPage(e.code === 'ArrowRight' ? 1 : -1);
          return;
        default:
          break;
      }
      if (!movement.has(e.code)) return;
      e.preventDefault();
      if (e.code === 'Space' && !e.repeat) this.jumpQueued = true;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  clear() {
    this.keys.clear();
    this.jumpQueued = false;
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
