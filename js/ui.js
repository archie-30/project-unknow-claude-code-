class DiscoveryStore {
  constructor(key) {
    this.key = key;
    this.found = new Set();
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(saved)) saved.forEach((id) => this.found.add(id));
    } catch (error) {}
  }

  has(id) {
    return this.found.has(id);
  }

  add(id) {
    if (this.found.has(id)) return false;
    this.found.add(id);
    try {
      localStorage.setItem(this.key, JSON.stringify([...this.found]));
    } catch (error) {}
    return true;
  }
}

class Hud {
  constructor() {
    document.getElementById('version').textContent = 'version: ' + GAME_VERSION;
    this.banner = document.getElementById('biome-banner');
  }

  showBiome(info, isNew) {
    this.banner.innerHTML = `
      <span class="banner-sub">${isNew ? '發現新的生態域' : '進入生態域'}</span>
      <span class="banner-name">${info.name}${isNew ? '<em class="new-tag">NEW</em>' : ''}</span>`;
    this.banner.classList.remove('show');
    void this.banner.offsetWidth;
    this.banner.classList.add('show');
  }
}

class Journal {
  constructor(store) {
    this.store = store;
    this.fresh = new Set();
    this.isOpen = false;
    document.body.insertAdjacentHTML('beforeend', SKETCH_DEFS);

    this.button = document.getElementById('journal-button');
    this.button.innerHTML = `${SCROLL_ICON}<span class="journal-key">Tab</span><span class="journal-badge" hidden></span>`;
    this.badge = this.button.querySelector('.journal-badge');
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    this.panel = document.getElementById('journal');
    this.panel.innerHTML = `
      <div class="scroll-rod top"><span></span></div>
      <div class="scroll-paper">
        <header>
          <h2>探險筆記</h2>
          <p class="journal-progress"></p>
        </header>
        <h3>生態域</h3>
        <div class="biome-grid">
          ${BIOME_INFO.map((info) => `
            <article class="biome-card" data-biome="${info.id}">
              <div class="sketch-frame">${BIOME_SKETCHES[info.id]}<em class="card-new">NEW</em></div>
              <h4>${info.name}</h4>
              <p class="card-text">${info.text}</p>
              <p class="card-locked">尚未踏足</p>
            </article>`).join('')}
        </div>
        <footer>按 Tab 或點擊捲軸圖示收起</footer>
      </div>
      <div class="scroll-rod bottom"><span></span></div>`;
    this.cards = new Map([...this.panel.querySelectorAll('.biome-card')].map((el) => [Number(el.dataset.biome), el]));
    this.panel.addEventListener('click', (e) => e.stopPropagation());
    this.refresh();
  }

  refresh() {
    for (const [id, card] of this.cards) {
      card.classList.toggle('found', this.store.has(id));
      card.classList.toggle('fresh', this.fresh.has(id));
    }
    this.panel.querySelector('.journal-progress').textContent = `已探索 ${this.store.found.size} / ${BIOME_INFO.length}`;
    this.badge.hidden = this.fresh.size === 0;
  }

  markDiscovered(id) {
    this.fresh.add(id);
    this.refresh();
    this.button.classList.remove('nudge');
    void this.button.offsetWidth;
    this.button.classList.add('nudge');
  }

  toggle(force) {
    this.isOpen = force === undefined ? !this.isOpen : force;
    this.panel.classList.toggle('open', this.isOpen);
    this.button.classList.toggle('active', this.isOpen);
    if (this.isOpen) {
      this.refresh();
      for (const id of this.fresh) {
        const card = this.cards.get(id);
        card.classList.remove('reveal');
        void card.offsetWidth;
        card.classList.add('reveal');
      }
    } else {
      this.fresh.clear();
      this.refresh();
    }
  }
}
