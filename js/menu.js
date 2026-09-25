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
    this.root.innerHTML = `
      <div class="menu-card">
        <div class="scroll-rod top"><span></span></div>
        <div class="menu-paper">
          <h1>無盡原野</h1>
          <p class="menu-sub">一位探險家的田野筆記</p>
          <div class="menu-main">
            <button type="button" class="menu-button primary" data-action="resume">開始探險</button>
            <button type="button" class="menu-button" data-panel="settings">設定</button>
            <button type="button" class="menu-button" data-panel="help">操作說明</button>
          </div>
          <section class="menu-panel" data-panel="settings" hidden>
            <label class="menu-row"><span>靜音</span><input type="checkbox" data-setting="muted" ${v.muted ? 'checked' : ''}></label>
            <label class="menu-row"><span>主音量</span><input type="range" min="0" max="1" step="0.05" data-setting="master" value="${v.master}"></label>
            <label class="menu-row"><span>環境音</span><input type="range" min="0" max="1" step="0.05" data-setting="ambient" value="${v.ambient}"></label>
            <label class="menu-row"><span>音效</span><input type="range" min="0" max="1" step="0.05" data-setting="sfx" value="${v.sfx}"></label>
            <label class="menu-row"><span>滑鼠靈敏度</span><input type="range" min="0.3" max="2.5" step="0.1" data-setting="sensitivity" value="${v.sensitivity}"></label>
            <label class="menu-row"><span>鏡頭自動跟隨</span><input type="checkbox" data-setting="autoCamera" ${v.autoCamera ? 'checked' : ''}></label>
            <label class="menu-row"><span>畫質</span>
              <select data-setting="quality">
                <option value="high" ${v.quality === 'high' ? 'selected' : ''}>高</option>
                <option value="medium" ${v.quality === 'medium' ? 'selected' : ''}>中</option>
                <option value="low" ${v.quality === 'low' ? 'selected' : ''}>低（平板建議）</option>
              </select>
            </label>
            <button type="button" class="menu-button danger" data-action="reset">重置探險紀錄</button>
            <button type="button" class="menu-button" data-panel="main">返回</button>
          </section>
          <section class="menu-panel" data-panel="help" hidden>
            <ul class="help-list">
              <li><b>WASD</b> 移動</li>
              <li><b>E</b>（按住）跑步</li>
              <li><b>空白鍵</b> 跳躍</li>
              <li><b>滑鼠</b> 轉動視角，<b>滾輪</b> 拉近拉遠</li>
              <li><b>1</b> 第一人稱 · <b>3</b> 第三人稱</li>
              <li><b>Tab</b> 探險筆記，<b>← →</b> 切換頁面</li>
              <li><b>Esc</b> 暫停選單</li>
              <li>平板：手指拖曳轉視角、雙指縮放，右上角按鈕暫停</li>
            </ul>
            <button type="button" class="menu-button" data-panel="main">返回</button>
          </section>
          <p class="menu-foot">version ${GAME_VERSION}</p>
        </div>
        <div class="scroll-rod bottom"><span></span></div>
      </div>`;
    this.resumeButton = this.root.querySelector('[data-action="resume"]');
    this.root.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;
      if (handlers.onClick) handlers.onClick();
      if (target.dataset.action === 'resume') handlers.onResume();
      if (target.dataset.action === 'reset') this.confirmReset(target);
      if (target.dataset.panel) this.showPanel(target.dataset.panel);
    });
    this.root.addEventListener('input', (e) => {
      const input = e.target;
      if (!input.dataset.setting) return;
      const value = input.type === 'checkbox' ? input.checked : input.tagName === 'SELECT' ? input.value : Number(input.value);
      settings.set(input.dataset.setting, value);
      handlers.onChange(settings.values);
    });
  }

  confirmReset(button) {
    if (button.dataset.armed) {
      this.handlers.onReset();
      button.textContent = '已重置';
      delete button.dataset.armed;
      setTimeout(() => { button.textContent = '重置探險紀錄'; }, 1500);
    } else {
      button.dataset.armed = '1';
      button.textContent = '再按一次確認重置';
      setTimeout(() => {
        if (button.dataset.armed) {
          delete button.dataset.armed;
          button.textContent = '重置探險紀錄';
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
