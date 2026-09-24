# ARCHITECTURE

3D 網頁小遊戲專案。目前主體是「無盡原野」探索原型：操控膠囊角色在無限生成的低多邊形地形上自由移動，沒有目標與 UI，重點在移動手感與探索感。

- 部署：GitHub Pages（Settings → Pages → Deploy from a branch → `main` / root），推上 `main` 自動部署
- 網址：https://archie-30.github.io/project-unknow-claude-code-/
- 練習頁：https://archie-30.github.io/project-unknow-claude-code-/practice/01-basic-scene.html

## 技術選擇

- Three.js **r147**（`three@0.147.0`），jsDelivr CDN `<script>` 引入，不使用 import / 打包工具
- 固定 r147 的原因：r148 起官方移除 `examples/js/`（非模組版附加元件），只剩 ES module。要維持純 `<script>` 就停在 r147
- 使用的附加元件：`examples/js/math/SimplexNoise.js`（`THREE.SimplexNoise`，可傳入自訂亂數產生器做種子）
- r147 的 `InstancedMesh` 沒有自己的包圍球（r151 才加），自動視錐剔除會用錯範圍，所以裝飾物件關閉 `frustumCulled`，改由 `World.cull()` 以區塊為單位手動剔除

## 檔案結構

```
.
├── index.html                    # 遊戲原型（CSS + 全部 JS）
├── practice/
│   └── 01-basic-scene.html       # 練習 01：方塊 + 兩盞燈 + OrbitControls
├── ARCHITECTURE.md               # 本文件
└── README.md
```

## 操作

| 輸入 | 動作 |
| --- | --- |
| WASD | 以鏡頭方向為基準移動 |
| 按住 Shift | 跑步（純速度切換，無資源消耗） |
| 空白鍵 | 跳躍（落地後才能再跳） |
| 滑鼠拖曳 / 觸控單指拖曳 | 旋轉鏡頭 |
| 滾輪 / 雙指捏合 | 鏡頭跟隨距離 |
| 網址加 `?seed=數字` | 固定世界種子（不加則每次隨機） |

## index.html 程式邏輯

程式由上而下依序是：設定 → 工具函式 → 地形 → 材質/資源 → 天空/光源 → 區塊 → 世界 → 輸入 → 玩家 → 鏡頭 → 主迴圈。

### `CONFIG`
所有可調參數集中處：區塊大小與載入範圍、陰影範圍、霧距、物理（重力、走/跑速度、加速度、跳躍速度、coyote time、跳躍緩衝）、角色尺寸、鏡頭距離與俯仰限制。調手感優先改這裡。

### 工具函式
- `mulberry32(seed)`：可設種子的亂數產生器
- `hash2(x, z, seed)`：整數座標雜湊，讓每個區塊的裝飾物擺放固定（卸載後回來看到的一樣）
- `smoothstep`、`damp`（與幀率無關的平滑趨近）、`readSeed`（讀網址 seed）

### `Terrain`（地形高度與顏色，純函式，不依賴區塊是否已載入）
- `sampleHeight(x, z)`：在格點上取原始高度。由三層 simplex noise 組成：
  - 大尺度「丘陵度」遮罩：決定此區是平原還是山區
  - 寬緩起伏（±7m）＋ 4 層 fbm 細節（振幅隨丘陵度放大）
  - 山脊 noise（`1-|n|` 的三次方）只在丘陵度高的區域疊加，形成尖峰
- `surfaceAt(x, z, out)` / `heightAt(x, z)`：**與網格完全相同的三角形內插**取得地表高度與法線 y 分量。角色、鏡頭碰撞、裝飾物擺放都用它，所以不會浮空或陷入
- `colorAt(...)`：依高度與坡度決定每個三角面的顏色（雪 > 30m、陡坡岩石、較陡/高處泥土、低窪沙地、其餘三種草色依 noise 分塊），再加少量亮度抖動

格點間距 `Terrain.cell` = 48 / 24 = 2m。每格固定切成 (00,11,10) 與 (00,01,11) 兩個三角形，`surfaceAt` 的內插必須和 `Chunk.buildTerrain` 的切法一致。

### 材質與資源
- `createGradientMap(renderer)`：3 格 `DataTexture`（95/175/240），`NearestFilter`、不產生 mipmap → 三階硬邊色調
- `createMaterials()`：全部都是 `MeshToonMaterial` 並共用同一張 gradientMap（地形用 vertexColors）
- `flatShaded(geometry)`：轉成非索引幾何並重算法線 → 每個面獨立法線，呈現低多邊形硬邊
- `createDecorAssets()`：樹幹、松樹冠（圓錐）、闊葉樹冠（二十面體）、石塊（頂點隨機縮放的十二面體）、灌木，**整個遊戲各只建立一份 geometry/material**

### 天空與光源
- `createSky()`：CanvasTexture 垂直漸層（淡水藍 → 地平線暖白）貼在跟著鏡頭移動的反面球體上，不受霧影響；霧色與地平線同色，遠處地形自然融入天空
- `createLights()`：
  - 環境光 `0xbfe4ff`（微青藍冷色）
  - 太陽 `DirectionalLight 0xffe0a3`（暖鵝黃）投射陰影，陰影相機只涵蓋玩家周圍 ±36m
  - `follow(center)`：每幀把太陽與陰影相機移到玩家位置，並在光源空間對齊陰影貼圖 texel，避免移動時陰影邊緣閃爍

### `Chunk`（一個 48m × 48m 區塊）
- `buildTerrain()`：取 25×25 格點高度 → 產生 1152 個平面著色三角形（本地座標，位置/顏色 buffer），只接收陰影、不投射
- `buildDecorations()`：以 6m 間距的抖動格點取候選位置，依「森林密度 noise」、坡度、高度決定放樹 / 石塊 / 灌木（灌木有機率成叢）。同類物件合併成一個 `InstancedMesh`（每區塊最多 5 個 draw call），每個實例有隨機旋轉、縮放、色調
- 碰撞體 `colliders`：樹幹為不可站立的圓柱；石塊為可站上去的圓柱（`top` 高度、`walkable`）
- `box`：區塊的世界座標包圍盒，用於手動剔除
- `setCastShadow()`、`dispose()`：切換陰影投射；卸載時釋放地形 geometry 與 instance buffer（共用 geometry/material 不釋放）

### `World`（區塊管理）
- `update(position, velocity)`：玩家跨進新區塊時才執行 `refresh()`；之後每幀最多生成 `chunksPerFrame`（1）個區塊，避免卡頓
- `refresh()`：
  - 卸載距離超過 `unloadRadius`（5 格）的區塊（載入 3 格、卸載 5 格，中間留緩衝避免來回邊界時反覆生成）
  - 更新陰影投射：只有玩家周圍 1 格內的區塊裝飾物投射陰影
  - 把 7×7 範圍內缺少的區塊排進佇列，依「玩家位置 + 速度 × 1.5 秒」的預測點距離排序 → 往哪走就先生成哪邊
- `loadAll()`：開場同步生成全部 49 塊
- `cull(camera)`：以區塊包圍盒對鏡頭視錐做剔除；玩家周圍 1 格內永遠顯示（確保陰影投射物不會消失）
- `groundHeight(x, z, feetY)`：地形高度，或腳下可站立石塊的頂面
- `resolveObstacles(position, velocity, radius)`：水平圓形推擠，並移除朝向障礙物的速度分量（貼著樹滑過去而不是卡住）

### `Input`
鍵盤狀態（WASD / Shift / Space），空白鍵以「按下事件」排入佇列，由物理步驟消耗；視窗失焦時清空按鍵避免卡鍵。

### `Player`（物理驅動角色）
- 以 120Hz 固定時間步長更新（`fixedUpdate`），渲染時在前後兩個物理狀態間內插（`render`）
- 水平移動：以鏡頭 yaw 換算方向，速度用加速度趨近目標速度（地面 45、空中 12 m/s²）；上坡時依坡度降速
- 跳躍：跳躍緩衝（提早 0.12 秒按也算）+ coyote time（走下邊緣 0.1 秒內仍可跳）；`hasJumped` 旗標保證空中不能二段跳
- 重力 28 m/s²，落地判定：腳低於地面 → 貼齊並歸零下墜速度；下坡時若離地 < 0.35m 則吸附地面，避免跑下坡時一直小跳
- 外觀：平面著色膠囊 + 深色面罩（指示面向），面向平滑轉向移動方向；落地依衝擊力做壓扁回彈，空中依垂直速度微拉伸

### `CameraRig`（第三人稱鏡頭）
- Pointer Events：單指/滑鼠拖曳改 yaw/pitch，滾輪與雙指捏合改距離
- 焦點平滑跟隨角色（水平跟得快、垂直稍慢，跳躍時鏡頭不會劇烈晃動）
- 地形碰撞：從焦點沿鏡頭方向分 28 段取樣，遇到地形就把距離縮短；拉近立即、拉遠緩慢恢復；最後再保證鏡頭高於地面 0.45m

### 主迴圈 `frame()`
`dt`（上限 0.1 秒）→ 累加器跑固定步長物理 → 角色渲染內插 → 區塊更新 → 鏡頭 → 太陽跟隨 → 天空球跟隨 → 區塊剔除 → render

## 效能重點

- 區塊每幀最多生成 1 個（單塊約 2ms），跨區塊時才重算需求
- 裝飾物共用 geometry/material，並以 `InstancedMesh` 繪製
- 陰影：2048 貼圖只涵蓋玩家周圍 ±36m，且只有周圍 1 格區塊的裝飾物投射陰影，地形不投射
- 像素比上限 1.5（平板高 DPI 螢幕的填充率考量）
- 已測試：連續移動 3000m，同時存在的區塊最多 65 個，會隨卸載回落

## 進度

### 已完成
- [x] 練習 01：基本渲染流程（`practice/01-basic-scene.html`）
- [x] 無限區塊地形（simplex noise，平原/丘陵/山脈交錯）、動態生成與卸載
- [x] 物理驅動角色：走、跑、跳、重力、落地、下坡吸附、coyote time、跳躍緩衝
- [x] 樹幹碰撞、可站上石塊
- [x] 第三人稱鏡頭：拖曳旋轉、滾輪/捏合縮放、地形碰撞
- [x] 低多邊形 toon 風格：三階 gradientMap、暖色陽光陰影、冷色環境光、漸層天空與霧

### 未完成 / 之後可能的方向
- [ ] 觸控移動操作（目前平板只能轉鏡頭，移動需要鍵盤）
- [ ] 過陡坡面滑落（目前極陡坡只是減速，仍可慢慢爬上）
- [ ] 鏡頭與樹木的碰撞（目前只處理地形）
- [ ] 角色動畫 / 模型、腳步揚塵等手感回饋
- [ ] 水面、天氣、日夜變化
- [ ] 區塊生成移到 Web Worker（若之後地形變複雜）
- [ ] 檔案拆分方式（index.html 約 900 行，繼續擴充前建議討論）
