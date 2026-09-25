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
index.html                 頁面骨架：生態域橫幅、版本號、捲軸按鈕、暫停按鈕、捲軸與選單容器、script 載入順序
css/style.css              所有 UI 樣式、紙張紋理疊加、捲軸／選單、簡圖動畫 keyframes
js/config.js               GAME_VERSION、CONFIG、BIOME（含 OCEAN）／LANDMARK／SPECIES 與各自的名稱描述
js/utils.js                mulberry32、hash2、smoothstep、clamp、lerp、damp、wrapAngle、Spring、WORLD_SEED
js/terrain.js              Terrain：高度函數、三角形內插、生態域判定、地面顏色（紙藝配色）
js/materials.js            shaderTime／shaderWind／shaderPlayer、柔和 gradientMap、addWind（搖擺＋被角色推開）、addWaves
js/models.js               PAPER 色票、Models（紙葉、剪紙松樹、花、灌木…）、createDecorAssets
js/decor-rules.js          DECOR_TYPES、BIOME_DECOR、GROUND_COVER
js/environment.js          createSky（天空 shader、太陽、月亮、星星）、createHorizon（三層剪紙遠山）、createLights、Clouds
js/daynight.js             TimeOfDay：時間推進、關鍵影格插值 → env（天空色、光色、光方向、霧色、夜晚係數…）
js/weather.js              Weather：天氣狀態機、雨／雪／沙塵粒子、彩虹
js/landmarks.js            Landmarks（擺放規則）、LandmarkBuilder（飛機、小木屋模型與方塊碰撞體）、SmokePlumes
js/chunk.js                Chunk：地形、水面、地標、裝飾物、碰撞體
js/world.js                World：區塊佇列、剔除、圓形與方塊碰撞
js/wildlife.js             Butterflies（會飛散）、Birds（高空盤旋）
js/animals.js              AnimalModels（8 種紙藝動物）、ANIMAL_TYPES、Animal（行為與動畫）、AnimalManager
js/effects.js              Ripples（水面漣漪池）
js/particles.js            Footprints、DustPuffs、AirMotes（花粉；螢火蟲依 36m 格子固定在草原／森林的地點）、FallingLeaves、LightShafts、FishJumps、SkyEvents（流星、候鳥）
js/regional.js             Tornado（龍捲風與捲起玩家）、Aurora（極光 shader）
js/explorer.js             createExplorer（含右手燈籠與 PointLight）（layer 1，第一人稱時隱藏）、ExplorerAnimator（含 onStep 腳步事件）
js/input.js                Input：移動鍵、Tab、Esc、1／3、← →
js/player.js               Player：物理、游泳、跳躍／落地／入水事件
js/camera.js               CameraRig：Pointer Lock、拖曳、自動跟隨、第一／第三人稱切換與過渡
js/audio.js                AudioEngine：Web Audio 即時合成環境音與音效
js/journal-sketches.js     SketchKit、生態域簡圖、手繪濾鏡、捲軸圖示
js/sketches-extra.js       地標與物種簡圖
js/ui.js                   JOURNAL_PAGES、DiscoveryStore、Hud（橫幅佇列）、Journal（分頁與解鎖動畫）
js/menu.js                 DEFAULT_SETTINGS、QUALITY_PRESETS、Settings、PauseMenu
js/main.js                 建立所有系統、暫停／繼續、發現判定、腳步與漣漪事件、主迴圈
```

## 操作

| 輸入 | 動作 |
| --- | --- |
| 開始畫面「開始探險」／點擊畫面 | 鎖定並隱藏滑鼠，移動滑鼠轉視角 |
| Esc ／ 右上角暫停鈕 | 暫停選單（設定、操作說明、重置紀錄） |
| WASD | 移動 |
| E（按一次） | 切換跑步；放開所有方向鍵後自動回到走路（刻意不用 Shift） |
| 空白鍵 | 跳躍 |
| 1 ／ 3 | 第一人稱 ／ 第三人稱 |
| Tab ／ 左下捲軸圖示 | 探險筆記；1／2／3、← → 或點書籤切換分頁 |
| 選單內 | Enter 開始、S 設定、H 說明、B 返回、M 靜音、C 自動鏡頭、Q 畫質、R 重置圖鑑、D 預設設定 |
| 滾輪 ／ 雙指捏合 | 鏡頭距離 |
| 觸控或未鎖定時按住拖曳 | 轉視角 |
| 網址加 `?seed=數字` | 固定世界種子 |

## 各模組重點

### 畫風（紙藝）
- `createGradientMap`：6 格 LinearFilter 柔和漸層（非硬邊 toon）
- 所有植物用 `Models.leafGeometry`（沿中脈對摺的紙葉）＋ `scatterLeaves`（費氏球面分布、下方較暗）組成；`part()` 可傳 `shadeFn` 烘焙頂點明暗
- 裝飾物材質 `DoubleSide`；陰影 `PCFSoftShadowMap`（中／低畫質改 PCF）
- `body::after` 紙纖維＋暗角疊加（CSS，不進 WebGL）

### 日夜、天氣與環境
- `TimeOfDay.update(dt, weather)` 產生 `env`：天空頂／地平線色、光色與強度、半球光、雲色、太陽／月亮方向、`night`／`daylight`，再疊加天氣（陰天變灰、光變弱、霧／沙塵改霧色）
- `env` 被 `sky`、`horizon`、`lights`、`clouds`、霧、粒子、音效共用
- 光源方向夜晚改用月亮；仰角最低限制 0.22 避免陰影拉太長
- `Weather`：狀態 `clear／cloudy／rain／fog／windy`，每 90～220 秒換一次，所有數值 12 秒漸變；降水依生態域換成雨／雪／沙塵；雨停且白天時出現彩虹 70 秒

### 地形與區塊
- `Terrain` 與先前相同（高度、三角形內插、生態域），配色改紙藝色調
- `Chunk`：高度格點多取一圈外框（曲率明暗）、4m 生態域快取、每區塊水面、地標模型與碰撞、地標周圍清空植物
- `World`：碰撞體支援 `circle`（樹幹、石頭）與 `box`（有旋轉、可設定 `walkable` 頂面）

### 地標 `Landmarks` / `LandmarkBuilder`
- 世界切成 360m 格子，每格 75% 機率一個地標，位置需平坦且不在水中；出生格保證在 70～100m 處有一個，相鄰四格放另一種類型
- 模型建在地標本地座標（小木屋以地板高度為 0、飛機以地面為 0），整棟合併為單一幾何體（`materials.solid`，頂點色）
- 碰撞：小木屋四面牆（門口留空）、地板、玄關、台階、煙囪、柴堆；飛機機身、機翼、斷翼可站上去
- 飛機引擎冒煙（`SmokePlumes`），區塊載入時開始、卸載時移除

### 動物 `AnimalManager`
- 每 1.2 秒嘗試在玩家 32～66m 外依生態域（或水面）生成一群，總數上限依畫質
- `Animal`：`idle／walk／flee` 狀態機，靠近到 `fleeDistance` 就往反方向逃；不會走進水（野鴨相反）；距離 95m 外移除
- 步態動畫：`walk`（四腳對角擺動、吃草低頭）、`hop`（兔、松鼠）、`scurry`（蜥蜴扭動）、`swim`（野鴨浮動、潛頭）、`bird`（麻雀啄食，驚飛後 7 秒消失）

### 反應與粒子 `particles.js`
- `onStep` → 腳步聲、腳印（沙／雪）、跑步塵土；`landImpact` → 落地聲與塵土；`splash` → 入水聲與漣漪
- 草的推擠在 `addWind` 的頂點著色器內完成（`uPlayer`，只影響 `sway > 0` 的頂點）
- `FishJumps`：附近深水區每 5～14 秒一次；`SkyEvents`：夜晚流星、白天候鳥群

### 角色與鏡頭
- 動畫移除全身側傾，改頭部微轉；`onStep(side, run)` 給音效與腳印
- `CameraRig.setView(firstPerson)`：`view` 在 0.7 秒內 0↔1，鏡頭位置由第三人稱位置插值到眼睛高度，看向目標也插值，FOV 60→72；`blend > 0.8` 時關閉 layer 1 隱藏角色（陰影相機仍開啟 layer 1，所以影子還在）；第一人稱不自動跟隨

### 探險筆記 `Journal`
- `DiscoveryStore`（`localStorage: endless-meadow.discoveries`）：三類 `found` 與 `unseen`，舊版生態域紀錄會自動匯入
- 打開捲軸：翻到有 `unseen` 的第一頁 → 0.8 秒後逐張 `reveal()`（`unlocking` 動畫：墨線暈染成彩色、發光、印章）→ `markSeen`
- 未看過的卡片維持素描樣式（`.pending`），所以即使在捲軸關閉時解鎖，也一定能在打開時看到動畫

### 音效 `AudioEngine`
- 第一次按「開始探險」才建立 AudioContext（瀏覽器規定）
- 環境：風（棕噪音帶通＋LFO）、雨（白噪音）、水邊（低通噪音＋振幅 LFO），依 `update()` 傳入的狀態平滑調整；鳥鳴、蟲鳴、貓頭鷹用排程器隨機觸發
- 音效：`footstep(surface)`、`jump`、`land`、`splash`、`flutter`、`rustle`、`chime`、`click`
- 匯流排：master → ambient／sfx，對應設定中的三個音量

### 選單與設定 `menu.js`
- `Settings`（`localStorage: endless-meadow.settings`）；平板首次預設「中」畫質
- `QUALITY_PRESETS` 控制像素比、陰影貼圖大小、柔邊陰影、細節距離、動物數量
- 暫停時物理、時間、天氣全部停止，只繼續渲染

## 如何新增內容

- **新生態域**：`BIOME`、`BIOME_INFO`（config）→ `Terrain.biomeAt` 條件與 `groundPalette` → `BIOME_DECOR`、`GROUND_COVER` → `BIOME_SKETCHES` 加簡圖
- **新植物／物件**：`Models` 加幾何體 → `createDecorAssets` 註冊 → `DECOR_TYPES` 定義 → 加進生態域機率表
- **發版**：改 `GAME_VERSION`、`index.html` 的 `?v=`、`CHANGELOG.md`

## v2.1.00 補充

- 地形：`Chunk.buildTerrain` 改為索引網格＋頂點法線（中央差分）＋頂點色，不再是每面獨立顏色
- `Models.part(geometry, color, sway, shade, normalFn, blend)`：`normalFn` 可自訂法線（葉團徑向、草朝上、石頭圓潤）
- 大海：`Terrain.oceanMask` 低頻遮罩 → `sampleHeight` 在海岸收斂成緩坡、外海降到約 −24m；`biomeAt` 在水面附近且遮罩 > 0.45 時回傳 `BIOME.OCEAN`
- 游泳：`ExplorerAnimator` 的 `crawl` 權重把 `lean` 樞紐轉成趴姿並覆寫手臂（連續旋轉）、腿、頭部；`CameraRig.update(..., swimming)` 會抬高焦點
- 介面：`Hud.setBiome` 更新左上角標籤；`Journal` 每張卡片有 `.sketch-ink`（墨線）與 `.sketch-color`（彩色）兩層，解鎖時用 CSS mask 由左往右暈染；`PauseMenu.handleKey` 依 `data-key` 對應快捷鍵

## v2.1.01 補充

- 燈籠：`Player.render` 依 `nightLevel`（夜晚係數，有遲滯）推進 `lanternPhase`（0 收起 → 1 手持）；`ExplorerAnimator` 依相位覆寫右手（伸向背包 → 拿到身前），`PointLight` 掛在永遠可見的樞紐上（避免光源數量變動導致材質重新編譯）
- 暴風雪：`Weather.blizzard` 只在雪原計算，影響雪粒子、霧、`#frost` 疊加、移動速度（`player.slowFactor`）與風聲
- 龍捲風：`Tornado.update` 回傳是否正在捲起玩家；捲起時主迴圈暫停玩家物理，直接設定位置與速度
- `BIOME.LAKE`（原 OCEAN）：大湖泊；地形中其他小池塘仍屬周圍生態域

## v2.1.02 補充

- `index.html` 新增 `examples/js/geometries/RoundedBoxGeometry.js`，探險家與地標以圓角幾何建模
- `DiscoveryMarker`（`js/ui.js`）：把新發現的生物投影到螢幕，畫出手繪 SVG 圓圈並加上發光精靈
- 望遠鏡：`main.js` 的 `updateTelescope` 在第一人稱按住 V 時設定 `cameraRig.telescope`，鏡頭 FOV 縮到 16，移動鍵改為轉動視角（`input.suppressMove`）
- `journal.onChange` 在開啟時暫停模擬並釋放指標鎖定；`frame` 在筆記開啟時不執行 `simulate`
- `PauseMenu` 以數字鍵作為選項快捷鍵
- 粒子位置以世界座標格點包覆（`x + size * round((center - x) / size)`），不再跟隨玩家
- `Landmarks.inCell` 鄰格改用 150m 間距並嘗試 24 次；`SmokePlumes.add` 可指定煙的大小

## v2.1.03 補充

- `lights.update(env, center, glare)`：`main.js` 依生態域平滑計算 `glare`（雪原 0.74、沙漠 0.84），壓低太陽與半球光
- `Chunk.clearedByLandmark(x, z, margin)`：樹木額外多保留 6m，`nearbyLandmarks` 搜尋半徑同步加大

## 效能重點

- 每幀最多建 1 個區塊，跨區塊才重算需求；裝飾物用 `localSurface` 與生態域快取避免重算 noise
- 同類物件一個 InstancedMesh、共用 geometry／材質；細節物件只在近距離顯示且不投影
- 陰影貼圖只涵蓋玩家周圍 ±36m
- 像素比上限 1.5
- 已測試：連續移動 3000m，同時存在區塊最多 65 個；鏡頭不會穿到地面下

## 進度

### 已完成
- [x] 無限區塊地形、六種生態域、湖泊與水面效果
- [x] 紙藝畫風：紙葉植物、柔和光影、紙紋理、剪紙遠山、天空 shader
- [x] 日夜循環、天氣（雨／雪／沙塵／霧／強風）、彩虹、星空、螢火蟲
- [x] 世界反應：草被推開、腳印、塵土、蝴蝶飛散、麻雀驚飛、魚躍
- [x] 8 種動物與行為；流星、候鳥群、落葉、光束、花粉
- [x] 地標：墜落的飛機、荒廢的小木屋
- [x] 探險筆記：生態域／地標／物種三個分頁，開啟時播放解鎖動畫
- [x] 即時合成音效
- [x] 開始畫面、Esc 暫停選單、設定保存
- [x] 第一／第三人稱切換（1／3）

### 未完成 / 之後可能的方向
- [ ] 更多地標（見對話中的提案）
- [ ] 觸控移動（虛擬搖桿）
- [ ] 背景音樂
- [ ] 過陡坡面滑落、鏡頭與樹木／建築碰撞
- [ ] 區塊生成移到 Web Worker（紙葉植物讓區塊生成變慢）
