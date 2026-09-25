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
    this.biomeLabel = document.getElementById('biome-label');
    this.biomeLabel.innerHTML = `
      <span class="biome-pin"></span>
      <span class="biome-names"><span class="biome-name current"></span></span>
      <em class="biome-new" hidden>NEW</em>
      <span class="run-tag" hidden>跑步</span>`;
    this.biomeNames = this.biomeLabel.querySelector('.biome-names');
    this.biomeNew = this.biomeLabel.querySelector('.biome-new');
    this.runTag = this.biomeLabel.querySelector('.run-tag');
  }

  setBiome(info, isNew) {
    const old = this.biomeNames.querySelector('.biome-name.current');
    const fresh = document.createElement('span');
    fresh.className = 'biome-name entering';
    fresh.textContent = info.name;
    this.biomeNames.appendChild(fresh);
    if (old && old.textContent) {
      old.classList.remove('current');
      old.classList.add('leaving');
      setTimeout(() => old.remove(), 700);
    } else if (old) {
      old.remove();
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fresh.classList.remove('entering');
      fresh.classList.add('current');
    }));
    this.biomeLabel.classList.remove('changed', 'discovered');
    void this.biomeLabel.offsetWidth;
    this.biomeLabel.classList.add(isNew ? 'discovered' : 'changed');
    this.biomeNew.hidden = !isNew;
    clearTimeout(this.newTimer);
    if (isNew) this.newTimer = setTimeout(() => { this.biomeNew.hidden = true; }, 6000);
  }

  setRunning(running) {
    this.runTag.hidden = !running;
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
          ${JOURNAL_PAGES.map((p, i) => `<button type="button" class="journal-tab" data-page="${i}">${p.title}<kbd>${i + 1}</kbd><span class="tab-dot" hidden></span></button>`).join('')}
        </nav>
        <div class="journal-pages">
        ${JOURNAL_PAGES.map((p, i) => `
          <section class="journal-page" data-page="${i}">
            <div class="biome-grid">
              ${p.infos.map((info) => `
                <article class="biome-card" data-cat="${p.key}" data-id="${info.id}">
                  <div class="sketch-frame"><div class="sketch-ink">${p.sketches()[info.id]}</div><div class="sketch-color">${p.sketches()[info.id]}</div></div>
                  <h4 data-name="${info.name}">${p.hideName ? '？？？' : info.name}</h4>
                  <p class="card-text">${info.text}</p>
                  <p class="card-locked">${p.locked}</p>
                </article>`).join('')}
            </div>
          </section>`).join('')}
        </div>
        <footer><kbd>Tab</kbd> 收起 · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> 或 <kbd>←</kbd><kbd>→</kbd> 換頁</footer>
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
    const previous = this.page;
    this.page = (index + JOURNAL_PAGES.length) % JOURNAL_PAGES.length;
    const direction = this.page >= previous ? 1 : -1;
    this.tabs.forEach((tab, i) => tab.classList.toggle('active', i === this.page));
    this.pages.forEach((page, i) => {
      page.classList.remove('enter-left', 'enter-right', 'leave-left', 'leave-right');
      if (i === this.page) {
        page.classList.add('active');
        if (!silent && previous !== this.page) page.classList.add(direction > 0 ? 'enter-right' : 'enter-left');
      } else if (i === previous && !silent && previous !== this.page) {
        page.classList.add('leaving', direction > 0 ? 'leave-left' : 'leave-right');
        clearTimeout(page.leaveTimer);
        page.leaveTimer = setTimeout(() => page.classList.remove('active', 'leaving', 'leave-left', 'leave-right'), 450);
      } else {
        page.classList.remove('active', 'leaving');
      }
    });
    this.refresh();
    if (!silent && this.audio) this.audio.rustle();
    if (this.isOpen) this.scheduleReveal(silent ? 800 : 500);
  }

  handleKey(e) {
    if (!this.isOpen) return false;
    const digit = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
    if (digit !== undefined) {
      if (digit !== this.page) this.showPage(digit);
      return true;
    }
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      this.showPage(this.page + (e.code === 'ArrowRight' ? 1 : -1));
      return true;
    }
    return false;
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
    card.classList.add('unlocking');
    card.querySelector('h4').textContent = card.querySelector('h4').dataset.name;
    if (this.audio) this.audio.chime();
    setTimeout(() => card.classList.remove('unlocking'), 2600);
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
