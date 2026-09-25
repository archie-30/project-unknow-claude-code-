class Input {
  constructor() {
    this.keys = new Set();
    this.jumpQueued = false;
    this.onToggleJournal = null;
    this.onView = null;
    this.onEscape = null;
    this.onPage = null;
    this.onMenuKey = null;
    this.onJournalKey = null;
    this.runToggle = false;
    this.wasMoving = false;
    this.onRunChange = null;
    const movement = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space']);
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'SELECT') return;
      if (this.onMenuKey && this.onMenuKey(e)) {
        e.preventDefault();
        return;
      }
      if (this.onJournalKey && this.onJournalKey(e)) {
        e.preventDefault();
        return;
      }
      if (e.code === 'KeyE' && !e.repeat) {
        e.preventDefault();
        this.setRun(!this.runToggle);
        return;
      }
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
    this.setRun(false);
    this.jumpQueued = false;
  }

  setRun(value) {
    if (this.runToggle === value) return;
    this.runToggle = value;
    if (this.onRunChange) this.onRunChange(value);
  }

  axis() {
    const x = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const z = (this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0);
    const moving = ['KeyW', 'KeyA', 'KeyS', 'KeyD'].some((k) => this.keys.has(k));
    if (this.wasMoving && !moving) this.setRun(false);
    this.wasMoving = moving;
    return { x, z };
  }

  get running() {
    return this.runToggle;
  }

  consumeJump() {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }
}
