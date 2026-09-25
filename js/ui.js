const JOURNAL_PAGES = [
  { key: 'biome', title: '生態域', infos: BIOME_INFO, sketches: () => BIOME_SKETCHES, hideName: false, locked: '尚未踏足' },
  { key: 'landmark', title: '地標', infos: LANDMARK_INFO, sketches: () => LANDMARK_SKETCHES, hideName: true, locked: '尚未發現' },
  { key: 'species', title: '物種', infos: SPECIES_INFO, sketches: () => SPECIES_SKETCHES, hideName: true, locked: '尚未遇見' },
];

class DiscoveryStore {
  constructor(key) {
    this.key = key;
    this.found = { biome: new Set(), landmark: new Set(), species: new Set() };
    this.unseen = { biome: new Set(), landmark: new Set(), species: new Set() };
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved) {
        for (const cat of Object.keys(this.found)) {
          (saved.found?.[cat] || []).forEach((id) => this.found[cat].add(id));
          (saved.unseen?.[cat] || []).forEach((id) => this.unseen[cat].add(id));
        }
      } else {
        const legacy = JSON.parse(localStorage.getItem('endless-meadow.biomes') || '[]');
        if (Array.isArray(legacy)) legacy.forEach((id) => this.found.biome.add(id));
      }
    } catch (error) {}
  }

  save() {
    const plain = (sets) => Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, [...v]]));
    try {
      localStorage.setItem(this.key, JSON.stringify({ found: plain(this.found), unseen: plain(this.unseen) }));
    } catch (error) {}
  }

  has(cat, id) {
    return this.found[cat].has(id);
  }

  add(cat, id) {
    if (this.found[cat].has(id)) return false;
    this.found[cat].add(id);
    this.unseen[cat].add(id);
    this.save();
    return true;
  }

  markSeen(cat, id) {
    this.unseen[cat].delete(id);
    this.save();
  }

  get unseenCount() {
    return Object.values(this.unseen).reduce((sum, set) => sum + set.size, 0);
  }

  reset() {
    for (const cat of Object.keys(this.found)) {
      this.found[cat].clear();
      this.unseen[cat].clear();
    }
    this.save();
  }
}

class Hud {
  constructor() {
    document.getElementById('version').textContent = 'version: ' + GAME_VERSION;
    this.banner = document.getElementById('biome-banner');
    this.queue = [];
    this.busy = false;
  }

  show(sub, name, isNew) {
    this.queue.push({ sub, name, isNew });
    if (!this.busy) this.next();
  }

  next() {
    const item = this.queue.shift();
    if (!item) {
      this.busy = false;
      return;
    }
    this.busy = true;
    this.banner.innerHTML = `
      <span class="banner-sub">${item.sub}</span>
      <span class="banner-name">${item.name}${item.isNew ? '<em class="new-tag">NEW</em>' : ''}</span>`;
    this.banner.classList.remove('show');
    void this.banner.offsetWidth;
    this.banner.classList.add('show');
    setTimeout(() => this.next(), this.queue.length ? 2600 : 3600);
  }
}

class Journal {
  constructor(store, audio) {
    this.store = store;
    this.audio = audio;
    this.isOpen = false;
    this.page = 0;
    this.revealTimers = [];
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
        <nav class="journal-tabs">
          ${JOURNAL_PAGES.map((p, i) => `<button type="button" class="journal-tab" data-page="${i}">${p.title}<span class="tab-dot" hidden></span></button>`).join('')}
        </nav>
        ${JOURNAL_PAGES.map((p, i) => `
          <section class="journal-page" data-page="${i}">
            <div class="biome-grid">
              ${p.infos.map((info) => `
                <article class="biome-card" data-cat="${p.key}" data-id="${info.id}">
                  <div class="sketch-frame">${p.sketches()[info.id]}<em class="card-new">NEW</em><span class="card-stamp">發現！</span></div>
                  <h4 data-name="${info.name}">${p.hideName ? '？？？' : info.name}</h4>
                  <p class="card-text">${info.text}</p>
                  <p class="card-locked">${p.locked}</p>
                </article>`).join('')}
            </div>
          </section>`).join('')}
        <footer>Tab 收起 · ← → 或點書籤切換頁面</footer>
      </div>
      <div class="scroll-rod bottom"><span></span></div>`;
    this.tabs = [...this.panel.querySelectorAll('.journal-tab')];
    this.pages = [...this.panel.querySelectorAll('.journal-page')];
    this.tabs.forEach((tab, i) => tab.addEventListener('click', () => this.showPage(i)));
    this.panel.addEventListener('click', (e) => e.stopPropagation());
    this.fresh = new Set();
    this.showPage(0, true);
    this.refresh();
  }

  card(cat, id) {
    return this.panel.querySelector(`.biome-card[data-cat="${cat}"][data-id="${id}"]`);
  }

  refresh() {
    for (const card of this.panel.querySelectorAll('.biome-card')) {
      const cat = card.dataset.cat;
      const id = Number(card.dataset.id);
      const found = this.store.has(cat, id);
      const pending = this.store.unseen[cat].has(id) && !card.classList.contains('unlocking');
      card.classList.toggle('found', found);
      card.classList.toggle('pending', pending);
      const title = card.querySelector('h4');
      const page = JOURNAL_PAGES.find((p) => p.key === cat);
      title.textContent = found && !pending ? title.dataset.name : page.hideName ? '？？？' : title.dataset.name;
    }
    const page = JOURNAL_PAGES[this.page];
    this.panel.querySelector('.journal-progress').textContent = `${page.title} 已記錄 ${this.store.found[page.key].size} / ${page.infos.length}`;
    JOURNAL_PAGES.forEach((p, i) => { this.tabs[i].querySelector('.tab-dot').hidden = this.store.unseen[p.key].size === 0; });
    this.badge.hidden = this.store.unseenCount === 0;
  }

  notify() {
    this.refresh();
    this.button.classList.remove('nudge');
    void this.button.offsetWidth;
    this.button.classList.add('nudge');
  }

  showPage(index, silent = false) {
    this.page = (index + JOURNAL_PAGES.length) % JOURNAL_PAGES.length;
    this.tabs.forEach((tab, i) => tab.classList.toggle('active', i === this.page));
    this.pages.forEach((page, i) => page.classList.toggle('active', i === this.page));
    this.refresh();
    if (!silent && this.audio) this.audio.rustle();
    if (this.isOpen) this.scheduleReveal(360);
  }

  scheduleReveal(delay) {
    this.revealTimers.forEach(clearTimeout);
    this.revealTimers = [];
    const cat = JOURNAL_PAGES[this.page].key;
    [...this.store.unseen[cat]].forEach((id, i) => {
      this.revealTimers.push(setTimeout(() => this.reveal(cat, id), delay + i * 650));
    });
  }

  reveal(cat, id) {
    if (!this.isOpen) return;
    const card = this.card(cat, id);
    if (!card) return;
    this.store.markSeen(cat, id);
    this.fresh.add(card);
    card.classList.remove('pending');
    card.classList.add('unlocking', 'fresh');
    card.querySelector('h4').textContent = card.querySelector('h4').dataset.name;
    if (this.audio) this.audio.chime();
    setTimeout(() => card.classList.remove('unlocking'), 2400);
    this.refresh();
  }

  step(direction) {
    if (this.isOpen) this.showPage(this.page + direction);
  }

  toggle(force) {
    const open = force === undefined ? !this.isOpen : force;
    if (open === this.isOpen) return;
    this.isOpen = open;
    this.panel.classList.toggle('open', open);
    this.button.classList.toggle('active', open);
    if (this.audio) this.audio.rustle();
    if (open) {
      const withNew = JOURNAL_PAGES.findIndex((p) => this.store.unseen[p.key].size > 0);
      if (withNew >= 0) this.showPage(withNew, true);
      this.refresh();
      this.scheduleReveal(800);
    } else {
      this.revealTimers.forEach(clearTimeout);
      this.revealTimers = [];
      this.fresh.forEach((card) => card.classList.remove('fresh', 'unlocking'));
      this.fresh.clear();
      this.refresh();
    }
  }
}
