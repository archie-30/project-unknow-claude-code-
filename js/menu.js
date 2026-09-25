const DEFAULT_SETTINGS = {
  master: 0.8,
  ambient: 0.8,
  sfx: 0.9,
  muted: false,
  sensitivity: 1,
  autoCamera: true,
  quality: 'high',
};

const QUALITY_PRESETS = {
  high: { pixelRatio: 1.5, shadowMapSize: 2048, detailRadius: 2, maxAnimals: 14, softShadows: true },
  medium: { pixelRatio: 1.25, shadowMapSize: 1536, detailRadius: 2, maxAnimals: 10, softShadows: false },
  low: { pixelRatio: 1, shadowMapSize: 1024, detailRadius: 1, maxAnimals: 7, softShadows: false },
};

class Settings {
  constructor(key) {
    this.key = key;
    this.values = { ...DEFAULT_SETTINGS, quality: window.matchMedia('(pointer: coarse)').matches ? 'medium' : 'high' };
    try {
      Object.assign(this.values, JSON.parse(localStorage.getItem(key) || '{}'));
    } catch (error) {}
  }

  set(name, value) {
    this.values[name] = value;
    try {
      localStorage.setItem(this.key, JSON.stringify(this.values));
    } catch (error) {}
  }
}

class PauseMenu {
  constructor(settings, handlers) {
    this.settings = settings;
    this.handlers = handlers;
    this.isOpen = false;
    this.openedAt = 0;
    this.root = document.getElementById('menu');
    const v = settings.values;
    const k = (key) => `<kbd>${key}</kbd>`;
    this.root.innerHTML = `
      <div class="menu-card">
        <div class="scroll-rod top"><span></span></div>
        <div class="menu-paper">
          <h1>無盡原野</h1>
          <p class="menu-sub">一位探險家的田野筆記</p>
          <div class="menu-main">
            <button type="button" class="menu-button primary" data-action="resume" data-key="Digit1"><span class="label">開始探險</span>${k('1')}</button>
            <button type="button" class="menu-button" data-panel="settings" data-key="Digit2">設定${k('2')}</button>
            <button type="button" class="menu-button" data-panel="help" data-key="Digit3">操作說明${k('3')}</button>
          </div>
          <section class="menu-panel" data-panel="settings" hidden>
            <label class="menu-row"><span>靜音 ${k('1')}</span><input type="checkbox" data-setting="muted" data-key="Digit1" ${v.muted ? 'checked' : ''}></label>
            <label class="menu-row"><span>主音量</span><input type="range" min="0" max="1" step="0.05" data-setting="master" value="${v.master}"></label>
            <label class="menu-row"><span>環境音</span><input type="range" min="0" max="1" step="0.05" data-setting="ambient" value="${v.ambient}"></label>
            <label class="menu-row"><span>音效</span><input type="range" min="0" max="1" step="0.05" data-setting="sfx" value="${v.sfx}"></label>
            <label class="menu-row"><span>滑鼠靈敏度</span><input type="range" min="0.3" max="2.5" step="0.1" data-setting="sensitivity" value="${v.sensitivity}"></label>
            <label class="menu-row"><span>鏡頭自動跟隨 ${k('2')}</span><input type="checkbox" data-setting="autoCamera" data-key="Digit2" ${v.autoCamera ? 'checked' : ''}></label>
            <label class="menu-row"><span>畫質 ${k('3')}</span>
              <select data-setting="quality" data-key="Digit3">
                <option value="high" ${v.quality === 'high' ? 'selected' : ''}>高</option>
                <option value="medium" ${v.quality === 'medium' ? 'selected' : ''}>中</option>
                <option value="low" ${v.quality === 'low' ? 'selected' : ''}>低（平板建議）</option>
              </select>
            </label>
            <button type="button" class="menu-button danger" data-action="reset" data-key="Digit4" data-label="重置圖鑑"><span class="label">重置圖鑑</span>${k('4')}</button>
            <button type="button" class="menu-button" data-action="defaults" data-key="Digit5"><span class="label">恢復預設設定</span>${k('5')}</button>
            <button type="button" class="menu-button" data-panel="main" data-key="Digit0">返回${k('0')}</button>
          </section>
          <section class="menu-panel" data-panel="help" hidden>
            <ul class="help-list">
              <li>${k('W')}${k('A')}${k('S')}${k('D')} 移動</li>
              <li>${k('E')} 切換跑步（放開方向鍵後自動變回走路）</li>
              <li>${k('空白鍵')} 跳躍</li>
              <li>滑鼠 轉動視角，滾輪 拉近拉遠</li>
              <li>${k('1')} 第一人稱 · ${k('3')} 第三人稱</li>
              <li>${k('Tab')} 探險筆記（開啟時遊戲暫停，${k('Esc')} 關閉），筆記中 ${k('1')}${k('2')}${k('3')} 或 ${k('←')}${k('→')} 換頁</li>
              <li>${k('Esc')} 暫停選單 / 返回，選單內用數字鍵選擇</li>
              <li>第一人稱時按住 ${k('V')} 使用望遠鏡</li>
              <li>平板：手指拖曳轉視角、雙指縮放，右上角按鈕暫停</li>
            </ul>
            <button type="button" class="menu-button" data-panel="main" data-key="Digit0">返回${k('0')}</button>
          </section>
          <p class="menu-foot">version ${GAME_VERSION}</p>
        </div>
        <div class="scroll-rod bottom"><span></span></div>
      </div>`;
    this.resumeButton = this.root.querySelector('[data-action="resume"] .label');
    this.root.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      this.press(target);
    });
    this.root.addEventListener('input', (e) => {
      const input = e.target;
      if (!input.dataset.setting) return;
      const value = input.type === 'checkbox' ? input.checked : input.tagName === 'SELECT' ? input.value : Number(input.value);
      settings.set(input.dataset.setting, value);
      handlers.onChange(settings.values);
    });
  }

  press(target) {
    if (this.handlers.onClick) this.handlers.onClick();
    target.classList.remove('pressed');
    void target.offsetWidth;
    target.classList.add('pressed');
    if (target.dataset.action === 'resume') this.handlers.onResume();
    if (target.dataset.action === 'reset') this.confirmReset(target);
    if (target.dataset.action === 'defaults') this.resetDefaults();
    if (target.dataset.panel) this.showPanel(target.dataset.panel);
  }

  currentPanel() {
    const visible = [...this.root.querySelectorAll('.menu-panel')].find((p) => !p.hidden);
    return visible ? visible.dataset.panel : 'main';
  }

  handleKey(e) {
    if (!this.isOpen) return false;
    const panel = this.currentPanel();
    if (e.code === 'Escape' || e.code === 'Backspace') {
      if (panel !== 'main') {
        this.showPanel('main');
        return true;
      }
      if (e.code === 'Escape' && performance.now() - this.openedAt > 350) this.handlers.onResume();
      return true;
    }
    const scope = panel === 'main' ? this.root.querySelector('.menu-main') : this.root.querySelector(`.menu-panel[data-panel="${panel}"]`);
    let code = e.code.startsWith('Numpad') && /\d$/.test(e.code) ? 'Digit' + e.code.slice(-1) : e.code;
    if ((code === 'Enter' || code === 'NumpadEnter') && panel === 'main') code = 'Digit1';
    const target = scope.querySelector(`[data-key="${code}"]`);
    if (!target) return true;
    if (target.tagName === 'BUTTON') this.press(target);
    else if (target.type === 'checkbox') {
      target.checked = !target.checked;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (target.tagName === 'SELECT') {
      target.selectedIndex = (target.selectedIndex + 1) % target.options.length;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return true;
  }

  resetDefaults() {
    const quality = window.matchMedia('(pointer: coarse)').matches ? 'medium' : 'high';
    for (const [name, value] of Object.entries({ ...DEFAULT_SETTINGS, quality })) {
      this.settings.set(name, value);
      const input = this.root.querySelector(`[data-setting="${name}"]`);
      if (!input) continue;
      if (input.type === 'checkbox') input.checked = value;
      else input.value = value;
    }
    this.handlers.onChange(this.settings.values);
  }

  confirmReset(button) {
    const label = button.querySelector('.label');
    if (button.dataset.armed) {
      this.handlers.onReset();
      label.textContent = '圖鑑已重置';
      delete button.dataset.armed;
      setTimeout(() => { label.textContent = button.dataset.label; }, 1500);
    } else {
      button.dataset.armed = '1';
      label.textContent = '再按一次確認重置';
      setTimeout(() => {
        if (button.dataset.armed) {
          delete button.dataset.armed;
          label.textContent = button.dataset.label;
        }
      }, 3000);
    }
  }

  showPanel(name) {
    this.root.querySelector('.menu-main').hidden = name !== 'main';
    this.root.querySelectorAll('.menu-panel').forEach((panel) => { panel.hidden = panel.dataset.panel !== name; });
  }

  open(mode = 'pause') {
    this.isOpen = true;
    this.openedAt = performance.now();
    this.resumeButton.textContent = mode === 'start' ? '開始探險' : '繼續探險';
    this.showPanel('main');
    this.root.classList.add('open');
  }

  close() {
    this.isOpen = false;
    this.root.classList.remove('open');
  }
}
