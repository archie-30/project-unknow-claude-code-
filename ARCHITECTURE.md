# ARCHITECTURE

3D 網頁小遊戲練習專案。目前處於「基本功練習」階段，尚未決定正式遊戲題材。

- 部署：GitHub Pages，推上 `main` 分支自動部署
- 網址：https://archie-30.github.io/project-unknow-claude-code-/

## 技術選擇

- Three.js **r147**（`three@0.147.0`），透過 jsDelivr CDN 的 `<script>` 引入，不使用 import / 打包工具
- 為何固定 r147：r148 起官方移除了 `examples/js/`（非模組版的 OrbitControls 等附加元件），只剩 ES module 版本。要維持「純 `<script>`、不用 import」就必須停在 r147
- 全域物件：`THREE`（核心）、`THREE.OrbitControls`（由 `examples/js/controls/OrbitControls.js` 掛上）
- 若日後需要升級新版 Three.js，需改用 `<script type="module">` + importmap，屆時再討論

## 檔案結構

```
.
├── index.html        # 唯一頁面，含 CSS 與全部 JS
├── ARCHITECTURE.md   # 本文件：結構、邏輯說明、進度
└── README.md
```

## index.html 程式邏輯

| 函式 | 功能 |
| --- | --- |
| `createRenderer()` | 建立 `WebGLRenderer`（antialias），像素比上限 2，全螢幕尺寸，canvas 加入 body |
| `createScene()` | 建立 `Scene`，背景色 `#1a1d24` |
| `createCamera()` | `PerspectiveCamera`（FOV 60，near 0.1，far 100），位置 `(3, 2.5, 4)` |
| `addLights(scene)` | 環境光 `AmbientLight`（強度 0.35）＋方向光 `DirectionalLight`（強度 1.0，位置 `(5, 8, 4)`） |
| `addCube(scene)` | 場景中央 1.5 邊長方塊，`MeshStandardMaterial` 藍色 `#4f9dff`（需光源才看得到明暗） |
| `createControls(camera, dom)` | `OrbitControls`：左鍵拖曳旋轉、滾輪縮放、右鍵平移；開啟 damping，縮放距離限制 2–20 |
| `handleResize(camera, renderer)` | 視窗縮放時更新相機長寬比與 renderer 尺寸 |
| `animate()` | `requestAnimationFrame` 迴圈：`controls.update()`（damping 需要）→ `renderer.render()` |

執行順序：renderer → scene → camera → 光源 → 方塊 → controls → resize 監聽 → 啟動 animate 迴圈。

## 進度

### 已完成
- [x] 練習 01：基本渲染流程（場景、相機、renderer、渲染迴圈）
- [x] 中央方塊幾何體
- [x] 兩盞光源（環境光＋方向光）
- [x] OrbitControls 滑鼠旋轉／滾輪縮放
- [x] 視窗 resize 自適應

### 未完成 / 之後可能的練習方向
- [ ] 陰影（shadow map）
- [ ] 地板平面、格線輔助（GridHelper / AxesHelper）
- [ ] 物件動畫（自轉、時間差 `Clock`）
- [ ] 鍵盤輸入與角色移動
- [ ] 滑鼠點選物件（Raycaster）
- [ ] 載入外部模型（GLTFLoader）
- [ ] 練習項目變多後的檔案拆分方式（待討論）
- [ ] 決定正式遊戲題材
