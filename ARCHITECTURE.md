# ARCHITECTURE

3D 網頁小遊戲專案「無盡原野」：操控探險家在無限生成的低多邊形世界（六種生態域、湖泊、動植物）裡自由探索，並用探險筆記記錄發現的生態域。

- 目前版本：見 `js/config.js` 的 `GAME_VERSION`，更新內容見 `CHANGELOG.md`
- 部署：GitHub Pages（Settings → Pages → Deploy from a branch → `main` / root），推上 `main` 約 1 分鐘自動部署
- 網址：https://archie-30.github.io/project-unknow-claude-code-/
- 練習頁：https://archie-30.github.io/project-unknow-claude-code-/practice/01-basic-scene.html

## 技術選擇

- Three.js **r147**（`three@0.147.0`），jsDelivr CDN `<script>` 引入，不使用 import / 打包工具
  - r148 起官方移除 `examples/js/`（非模組附加元件），要維持純 `<script>` 就停在 r147
  - 附加元件：`examples/js/math/SimplexNoise.js`
- 多個一般 `<script>` 依序載入，彼此透過全域的 `const` / `class` 共用（不是 ES module），**載入順序有依賴關係**，見下方檔案表
- 所有本地 CSS/JS 網址帶 `?v=版本號`，每次發版要同步修改，避免瀏覽器快取舊檔
- r147 的 `InstancedMesh` 沒有自己的包圍球，裝飾物件關閉 `frustumCulled`，改由 `World.cull()` 以區塊為單位剔除
- 模型全部由程式用基本幾何體組成；捲軸簡圖是內嵌 SVG
- 字型：Google Fonts「LXGW WenKai TC」（手寫感楷體，失敗時退回系統楷體）

## 檔案結構（依載入順序）

```
index.html                 頁面骨架：提示框、生態域橫幅、版本號、捲軸按鈕與面板容器、script 載入順序
css/style.css              所有 UI 樣式與捲軸簡圖動畫 keyframes
js/config.js               GAME_VERSION、CONFIG（所有可調參數）、SUN_DIRECTION、BIOME、BIOME_INFO（名稱與描述）
js/utils.js                mulberry32、hash2、smoothstep、clamp、lerp、damp、wrapAngle、Spring（彈簧）、WORLD_SEED
js/terrain.js              Terrain：高度函數、三角形內插、生態域判定、地面顏色
js/materials.js            shaderTime、gradientMap、addWind（植物搖擺）、addWaves（水波）、createMaterials、flatShaded、jitterVertices
js/models.js               Models（所有植物／石頭／雲的幾何體）、createDecorAssets
js/decor-rules.js          DECOR_TYPES（每種物件的縮放、碰撞、細節旗標）、BIOME_DECOR（4m 主物件機率）、GROUND_COVER（2m 地被機率）
js/environment.js          createSky（漸層天空＋太陽光暈）、createLights（環境光＋太陽陰影跟隨）、Clouds
js/chunk.js                Chunk：單一區塊的地形、水面、裝飾物、碰撞體
js/world.js                World：區塊載入／卸載佇列、剔除、碰撞查詢
js/wildlife.js             Butterflies、Birds
js/effects.js              Ripples（水面漣漪池）
js/explorer.js             createExplorer（角色模型骨架）、ExplorerAnimator（程序動畫）
js/input.js                Input：鍵盤狀態、跳躍佇列、Tab 回呼
js/player.js               Player：物理、游泳、落地／入水事件、面向與轉向速度
js/camera.js               CameraRig：Pointer Lock、拖曳／觸控、自動跟隨、地形／水面碰撞
js/journal-sketches.js     六種生態域的 SVG 手繪簡圖、手繪抖動濾鏡、捲軸圖示
js/ui.js                   DiscoveryStore（localStorage 紀錄）、Hud（版本號、生態域橫幅）、Journal（捲軸）
js/main.js                 建立所有物件、生態域追蹤、漣漪觸發、主迴圈
practice/01-basic-scene.html   練習 01
CHANGELOG.md               更新日誌與版本號規則
```

## 操作

| 輸入 | 動作 |
| --- | --- |
| 點擊畫面 | 鎖定並隱藏滑鼠，移動滑鼠轉視角（不支援鎖定的裝置改為按住拖曳） |
| Esc | 釋放滑鼠，畫面中央出現操作提示 |
| WASD | 以鏡頭方向為基準移動 |
| 按住 E | 跑步（刻意不用 Shift，避免平板切換輸入法） |
| 空白鍵 | 跳躍（落地或游泳時才能再跳） |
| Tab ／ 點左下捲軸圖示 | 開關探險筆記 |
| 滾輪 ／ 雙指捏合 | 鏡頭距離 |
| 觸控單指拖曳 | 轉視角 |
| 網址加 `?seed=數字` | 固定世界種子 |

## 各模組重點

### 地形 `Terrain`
- `sampleHeight`：丘陵度遮罩 × fbm 細節 + 寬緩起伏 + 山脊（丘陵區）− 湖盆（平原區）
- `interpolate / surfaceAt / heightAt`：與網格相同切法（(00,11,10)、(00,01,11)）的三角形內插，角色、鏡頭、裝飾物都貼合實際網格
- `biomeAt`：溫度（低頻 noise − 海拔降溫）＋濕度 → 雪原、針葉林、沙漠、莽原、森林、草原
- `colorAt`：水下沙床、沙灘、陡坡岩石（含層理條紋）、泥土、各生態域三色地面，邊界加雜湊抖動

### 區塊 `Chunk`（48m × 48m，1.5m 格點）
- `sampleHeights`：多取一圈外框格點 → 可算曲率且不必重算 noise
- `buildTerrain`：平面著色三角形；顏色 × 曲率明暗（山脊亮、凹處暗）
- `buildWater`：只在有水的格子生成水面；頂點 RGBA 依水深（泡沫 → 淺綠 → 深藍）；材質 `addWaves` 在頂點著色器做波浪，`flatShading` 用導數算面法線呈現低多邊形水面
- `buildBiomeGrid / biomeNear`：4m 解析度的生態域快取
- `localSurface`：用快取格點計算高度（不再呼叫 noise）
- `buildDecorations`：4m 抖動格點放主物件（樹、石、灌木…）＋ 2m 抖動格點放地被（草、花、蕨…）；同資產合併成一個 `InstancedMesh`；小物件放 `detailGroup`（只在周圍 2 格顯示、不投影）
- 建一個區塊約 6ms（軟體渲染測試環境），每幀最多一個

### 世界 `World`
跨區塊才重算：卸載 5 格外、依「位置＋速度預測」排序生成、周圍 1 格投影、2 格顯示細節；`cull` 做區塊視錐剔除；`groundHeight / resolveObstacles` 提供碰撞。

### 角色 `createExplorer` / `ExplorerAnimator`
- 骨架：`root → lean（轉彎傾斜）→ body（骨盆，高 0.95）→ torso → head → hat`；`torso → shoulder → elbow`；`body → hip → knee → ankle`；`torso → pack`、`scarfA/B`
- 動畫：每幀依狀態算出「地面／空中／游泳」三組目標姿勢，用 `air`、`swim` 權重混合後以 `damp` 趨近
  - 地面：`phase` 依移動距離 ÷ 步長推進；走跑用 `run` 權重混合步幅；骨盆與軀幹反向扭轉、重心左右轉移、`cos²` 上下起伏、腳踝補償讓腳掌貼地
  - 待機：呼吸、重心搖擺、隨機張望
  - 彈簧（`Spring`）：`bob`（落地下蹲回彈）、`lean`（加減速前後傾）、`roll`（轉彎內傾）、`pack`、`scarf`、`hat`

### 玩家 `Player`
120Hz 固定步長物理＋渲染內插；加速度移動、上坡減速、水深減速；跳躍緩衝＋coyote time；水深超過游泳深度時漂浮；記錄 `landImpact`（給動畫）與 `splash`（給漣漪）；`turnRate` 給轉彎傾斜。

### 鏡頭 `CameraRig`
- 桌機點擊 → Pointer Lock；失敗（`pointerlockerror`）或觸控裝置 → 拖曳模式
- `autoFollow`：手動操作後 `autoCameraDelay` 秒起，移動時把 yaw 平滑轉向「移動方向的背後」（面向鏡頭跑時不轉，避免甩鏡頭）；閒置久了俯仰角回到 `autoCameraPitch`
- 碰撞：沿鏡頭方向 28 段取樣，地面取地形與水面的較高者

### 介面 `ui.js`
- `DiscoveryStore`：`localStorage` 鍵 `endless-meadow.biomes`（讀寫都包 try/catch）
- `Hud.showBiome`：重播 CSS 動畫顯示生態域名稱與 NEW
- `Journal`：`toggle`（Tab／按鈕）、`markDiscovered`（紅點、NEW、下次打開播放點亮動畫）；未發現的卡片用 CSS `filter` 呈現咖啡色素描並暫停動畫，發現後 `filter: none` 漸變為彩色
- 生態域判定在 `main.js`：每 0.2 秒取樣，新生態域持續 0.6 秒才切換（避免邊界來回閃）

### 主迴圈 `frame()`
shaderTime → 固定步長物理 → 角色動畫 → 區塊 → 鏡頭 → 太陽 → 蝴蝶／鳥／雲 → 漣漪 → 生態域判定 → 天空跟隨 → 剔除 → render

## 如何新增內容

- **新生態域**：`BIOME`、`BIOME_INFO`（config）→ `Terrain.biomeAt` 條件與 `groundPalette` → `BIOME_DECOR`、`GROUND_COVER` → `BIOME_SKETCHES` 加簡圖
- **新植物／物件**：`Models` 加幾何體 → `createDecorAssets` 註冊 → `DECOR_TYPES` 定義 → 加進生態域機率表
- **發版**：改 `GAME_VERSION`、`index.html` 的 `?v=`、`CHANGELOG.md`

## 效能重點

- 每幀最多建 1 個區塊，跨區塊才重算需求；裝飾物用 `localSurface` 與生態域快取避免重算 noise
- 同類物件一個 InstancedMesh、共用 geometry／材質；細節物件只在近距離顯示且不投影
- 陰影貼圖只涵蓋玩家周圍 ±36m
- 像素比上限 1.5
- 已測試：連續移動 3000m，同時存在區塊最多 65 個；鏡頭不會穿到地面下

## 進度

### 已完成
- [x] 無限區塊地形、六種生態域、湖泊與水面效果
- [x] 植物／石頭約 20 種、地被層、風吹搖擺；蝴蝶、鳥群、雲
- [x] 探險家角色與程序動畫（待機／走／跑／跳／游泳、彈簧次級動作）
- [x] 物理：走、跑、跳、游泳、碰撞、站上石頭／倒木
- [x] 鏡頭：Pointer Lock、拖曳、觸控、自動跟隨、地形與水面碰撞
- [x] 探險筆記捲軸（生態域圖鑑）、生態域進入提示、版本號、更新日誌

### 未完成 / 之後可能的方向
- [ ] 地標（捲軸已預留擴充空間）
- [ ] 讓世界更有生命感（見對話中的提案）
- [ ] 觸控移動（虛擬搖桿）
- [ ] 日夜循環、天氣、音效
- [ ] 過陡坡面滑落、鏡頭與樹木碰撞
- [ ] 區塊生成移到 Web Worker
