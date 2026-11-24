# 豆屿 · BEAD ISLE

> 一颗一颗，熨成一座岛。

豆屿是一款把「拼豆」从桌面搬到浏览器里的创作与分享工具：在无限大的拼豆板上逐颗放豆，一键熨成一块块零件，再去立体拼装台把零件立成一个小世界。成品截图可以挂上集市，其他玩家用豆币解锁图纸，照着淡色蓝图一颗一颗复刻，也可以换色、加零件，改成自己的版本。

打开后先到**首页**：继续上次的工位、新开一块板，或者去集市逛逛。顶部「首页 / 工位 / 集市」随时切换，工位里点左上角 logo 也能回来。

![豆屿首页](docs/screenshots/00-home.png)

![豆屿工作台](docs/screenshots/01-studio.png)

## 玩法

1. **放豆**：在无边板上点一下放一颗，拖拽连续铺。36 色 HAMA 风格色卡，支持 1–3 格笔刷、吸色、框选、撤销/重做。
2. **熨烫**：按 `Enter` 或点「自动熨烫」，相连的散豆会按连通块熔成一块块独立零件；也可以框选局部熨烫。
3. **立起来**：进入「立体拼装」，拖动彩色圆环移动、旋转、叠放零件。支持自动摆盘、立起/平放、正/斜/顶视角和桌面网格。
4. **截图发布**：在立体拼装台按「拍下成品」，会以 4:3、1200×900 截下当前画面，填写名字、说明和复刻价格后挂上集市，发布得 50 豆币。
5. **解锁复刻**：其他玩家支付豆币解锁零件图纸，图纸会以淡影铺在板上，逐颗放豆复刻。复刻进度按「覆盖了多少格」计算，换色也能完成；原色匹配会单独显示。

![集市](docs/screenshots/02-gallery.png)

## 小程序竖屏版

同一套玩法和服务端，另做了一套**竖屏、微信小程序式**的界面：状态栏、右上角胶囊按钮、底部 Tab（首页 / 工位 / 集市 / 我的）、底部弹层，以及为手指重新排过的工具栏。

- 桌面打开：<http://127.0.0.1:8787/#/mini>，会以 390 × 844 的手机框展示；桌面首页右上角也有「小程序版」入口。
- 手机打开根地址会自动进入竖屏版；也可以在「我的 / 胶囊菜单」里切回桌面版。

![小程序首页](docs/screenshots/11-mini-home-filled.png)

| 工位 | 立体拼装 |
| --- | --- |
| ![小程序工位](docs/screenshots/12-mini-studio.png) | ![小程序立体拼装](docs/screenshots/13-mini-assembly.png) |

| 集市 | 手机全屏 |
| --- | --- |
| ![小程序集市](docs/screenshots/14-mini-gallery.png) | <img src="docs/screenshots/16-mini-mobile.png" width="280" alt="手机竖屏" /> |

> **说明**：这是一个可交互的 H5 竖屏原型，页面结构、胶囊、TabBar、底部 Sheet 都按微信小程序的使用习惯实现，现在浏览器里就能完整体验。要真正导出成微信小程序包，还需要把 React 页面落到 WXML / WXSS / JS，3D 部分再接微信 WebGL（例如 three-platformize，或先做 2.5D 渲染）；这一步可以继续做。

### 在微信开发者工具里预览

仓库里带了一个 `wechat-mini/` **WebView 壳**，可以导入微信开发者工具：

1. 根目录运行 `npm start`
2. 微信开发者工具 → 导入项目 → 选择 `wechat-mini/`
3. 详情 → 本地设置 → 勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」
4. 模拟器会加载 `http://127.0.0.1:8787/#/mini`

详细说明见 [wechat-mini/README.md](wechat-mini/README.md)。真机/正式版的 `web-view` 需要 HTTPS 业务域名，配置方法也写在那里。

小程序名称、简称、简介和头像素材放在 [docs/brand/wechat-profile.md](docs/brand/wechat-profile.md)。

> 小程序的名字和头像跟着 **AppID / 公众平台账号** 走，不是代码里写的。不要复用已有小程序的 AppID，否则手机上显示的会是那个已有小程序的名字（例如「冰箱对对碰」）；要叫「豆屿」需要新建自己的小程序 AppID。
>
> 如果开发者工具报 `game.json: 未找到`，说明当前项目被当成「小游戏」编译了：重新导入为「小程序」，并使用小程序 AppID；不要新建 `game.json`。

## 微信小游戏版

如果 AppID 注册的是**小游戏**，不能用 `wechat-mini/` 的 `web-view` 小程序壳，需要用 `wechat-game/`：

- `game.json` + `game.js`
- Canvas 2D
- 已实现：29×29 拼板、8 色、放豆/收豆、撤销、熨烫、清空、照片转图纸、WebGL 3D 零件拼装（拖动/旋转/抬起/放下）、豆仓/缺色、按行跟做、集市/详情、收藏/心动/留言/解锁、解锁后铺回拼板、收藏筛选、A4 图纸导出、分享、保存到相册、本地保存
- 还没移植：PDF 图纸、3D 碰撞/吸附/多层支撑、多品牌色号、主动登录
- 导入开发者工具时，目录选 `wechat-game/`，项目类型选**小游戏**，AppID 用**小游戏 AppID**

完整说明见 [wechat-game/README.md](wechat-game/README.md)。

## 这次补上的图纸与集市能力

对照了颂拼豆、拼小豆、PindouAI、Perler 等拼豆工具和教程的常见做法，补上了从「有张图」到「真的能拼出来」之间最缺的几块：

- **照片转图纸**：JPG / PNG / WebP / PDF 本地转豆图，支持 24 / 36 / 48 / 64 格宽、8 / 16 / 24 / 全色、原色 / 清晰 / 柔和、渐变抖动、自动去背景；输出色卡可选 **豆屿 / Hama / Perler / Artkal / 全部（混合 512 色）**，选品牌后直接按该品牌色卡匹配并显示品牌编号；实时显示颗数、色数、成品尺寸、拼板数。混合全部适合看效果，跨品牌色号购买前要核对。
- **PDF 图纸导入**：PDF 会先转成图片再配豆，支持多页 PDF 切页；可以继续用「图纸网格」按行列取色，也可以手动裁剪。
- **图纸网格识别**：把 PDF 页/截图裁到网格外框，填列数、行数（29×29 / 48×48 / 58×58 / 64×64 或自定义），每格取中间 60% 的颜色配成豆图；还能点「自动猜行列」，用网格线的周期帮你估一个尺寸。适合把现成图纸翻成可编辑项目。不是自动读 PDF 的图例/坐标，网格尺寸需要你确认。
- **A4 色号清单自动分栏**：颜色多时（例如 121 色）自动排成 1–3 栏、缩小行高并截断过长名字，色块、色号和数量不再重叠；总览页和分板页都生效。
- **手动裁剪 / 去背景强度**：拖四边裁掉主体以外的部分；自动去背景可以调强度，复杂照片也能手动修。
- **AI 自动抠图（Beta）**：照片一键去背景，透明区域不会变成豆子；首次使用会下载模型，需要联网，速度取决于电脑。抠坏了仍然可以手动裁剪。
- **多角度作品照片**：发布时除封面外最多再加 3 张角度照片；作品详情有缩略图和左右切换，小程序里用圆点切换。
- **色号清单与备料**：每种颜色需要多少颗，按 1000 颗/包估算并建议多备 10%；按 5mm 中豆估算成品 cm 尺寸，按 29×29 标准拼板估算需要几块。
- **豆子编号 / 色号搜索**：画布上每颗豆子都能显示编号（P01…P36；品牌色用 Hama 近似号），可以一键开关；缩得很小时显示后两位，放大后显示完整编号。复刻图纸里的淡色目标豆也会显示编号，已经摆上的实色豆会盖住目标编号，不会重影。色卡底部搜索框支持豆屿 P 编号、Hama H 编号、Perler P 编号、Artkal S 编号以及颜色名，搜到后点一下即可换色。色号库共 532 条（豆屿 36 + Hama 101 + Perler 170 + Artkal 225），不再只有固定 36 色。
- **可打印图纸**：A4 横版，带色号图例、用量、坐标、29×29 分板线、零件虚线边界和制作顺序；大图自动分成「总览 + 每块拼板一页」，可以整份打印 / 存 PDF。
- **整色替换**：在色号清单里点「→」，把某一种颜色全部换成当前画笔色，方便合并相近色、换配色。
- **豆仓与缺色替代**：记下每种颜色手头有多少颗，自动算「还缺几颗」；缺色时从有库存的颜色里找最接近的替代色，点一下就能整色替换。
- **Hama / Perler / Artkal 近似色号**：每个豆屿色号旁边标一个「≈H02」这样的参考色号，可在三个品牌之间切换；只作近似参考，不是官方精确换色表。
- **按行跟做与计时**：一次只亮一行、其他行压暗，上一行 / 下一行翻；带 00:00 计时和归零，适合大图慢慢拼。复刻图纸会显示本行已摆/总数，完成的行会打勾，「下一行」会跳过已完成行。
- **29×29 拼板辅助线**：板上直接显示分板线和 A1 / B1 分区，和实物拼板对齐；大图可以按区拼。
- **拼板与熨烫教程**：29×29 / 5mm 尺寸、先拼接缝、美纹纸胶带法、逐颗扎孔、双面熨烫、趁热压平，以及不要用蓝色胶带 / 透明胶带等避坑。
- **收藏、留言、回复、@ 和举报**：作品页可以收藏，集市有「收藏」筛选，小程序「我的」里有收藏列表；作品页可以留言、回复、@ 作者，自己的留言可以删，作者也可以清理自己作品下的留言；作品和留言都可以提交举报（本地记录，暂无后台处理队列）。

![照片转图纸](docs/screenshots/20-photo-pattern.png)

| A4 图纸与色号 | 拼板 / 熨烫教程 |
| --- | --- |
| ![图纸与色号](docs/screenshots/21-pattern-sheet.png) | ![拼板与熨烫](docs/screenshots/22-craft-guide.png) |

| 小程序里的照片转图纸 | 29×29 拼板辅助线 |
| --- | --- |
| <img src="docs/screenshots/23-mini-pattern.png" width="280" alt="小程序照片转图纸" /> | ![拼板辅助线](docs/screenshots/24-board-lines.png) |

| 豆仓与缺色替代 | 按行跟做 + 计时 |
| --- | --- |
| ![豆仓](docs/screenshots/25-inventory.png) | ![按行跟做](docs/screenshots/26-row-build.png) |

| 小程序豆仓 |
| --- |
| <img src="docs/screenshots/27-mini-inventory.png" width="280" alt="小程序豆仓" /> |

| 作品留言 | 收藏列表 |
| --- | --- |
| ![留言](docs/screenshots/28-comments.png) | ![收藏](docs/screenshots/30-collections.png) |

![回复留言](docs/screenshots/36-reply.png)

| 多页图纸：总览 | 每块拼板一页 |
| --- | --- |
| ![总览](docs/screenshots/31-pattern-pages.png) | ![分板页](docs/screenshots/32-board-page.png) |

| 品牌近似色号 |
| --- |
| ![品牌色号](docs/screenshots/33-brand-select.png) |

| PDF / 手动裁剪 |
| --- |
| ![裁剪](docs/screenshots/34-crop.png) |

| 图纸网格识别 |
| --- |
| ![网格识别](docs/screenshots/35-grid-mode.png) |

| AI 抠图 | 多角度作品 |
| --- | --- |
| ![AI 抠图](docs/screenshots/37-ai-cutout.png) | ![多角度](docs/screenshots/38-multi-image.png) |

| 豆子编号 | 色号搜索 |
| --- | --- |
| ![编号](docs/screenshots/39-bead-codes.png) | ![搜索](docs/screenshots/40-color-search.png) |

![输出品牌色卡](docs/screenshots/42-output-brand.png)

![混合全部品牌](docs/screenshots/43-mixed-output.png)

![图纸目标也显示编号](docs/screenshots/41-guide-codes.png)

> 尺寸按 **5mm 中豆 + 29×29 标准方形拼板** 估算；如果你用的是 2.6mm 迷你豆，成品尺寸需要按比例缩小。照片只在本机浏览器里处理，不会上传到服务器；豆仓也只存在本机 `localStorage`。

## 快速开始

需要 **Node.js ≥ 22.5**（使用了内置的 `node:sqlite`，无需安装数据库）。

```bash
npm install
npm run build
npm start
```

打开 <http://127.0.0.1:8787>。

Windows 下也可以双击 `启动.bat`：缺依赖会先安装，缺构建会先构建，然后启动服务并打开浏览器。

首次启动会自动生成 6 件种子作品（摸鱼小猫、蘑菇小屋、月亮上的小熊、豆豆掌机、草莓奶油蛋糕、落日海）。账号是浏览器本机的游客身份，不需要注册。

### 开发

```bash
# 终端一：API（8787）
npm run dev:api

# 终端二：Vite 前端（5173，已代理 /api 和 /covers）
npm run dev
```

生产构建由 `npm run build` 完成，`npm start` 会同时托管构建产物和 API。

## 操作

| 操作 | 方式 |
| --- | --- |
| 回首页 / 去工位 / 去集市 | 顶部导航，或点左上角 logo |
| 放豆 | `B`，左键点/拖 |
| 收豆 | `E`，或直接右键拖 |
| 吸色 | `I`，点击板上的豆 |
| 框选 | `M`，拖出矩形后熨烫或收走 |
| 移动板面 | `H`，或按住空格拖，或中键拖 |
| 缩放 | 滚轮，或右下角 +/− |
| 熨烫 | `Enter` / 侧栏「自动熨烫」 |
| 撤销 / 重做 | `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` |
| 立体拼装移动 / 旋转 | `G` / `R`；拖动三轴圆环 |
| 清空选区 | `Delete` / `Backspace` |
| 照片转图纸 | 首页「照片转图纸」，或工位顶栏的图片按钮、侧栏「图纸与备料」 |
| 图纸 / 色号 / 打印 | 工位顶栏网格按钮，或侧栏「图纸 / 色号」 |
| 29×29 拼板辅助线 | 板面右下角的拼板按钮（四格图标） |
| 拼板 / 熨烫教程 | 首页底部、工位顶栏书本按钮、图纸页、或小程序工位菜单 |
| 豆仓 / 缺色替代 | 侧栏「图纸与备料」下的「豆仓 / 缺色替代」，或图纸页、小程序工位菜单 |
| 按行跟做 / 计时 | 侧栏「按行跟做」，或小程序工位菜单「按行跟做 · 计时」 |
| 收藏 / 留言 | 作品详情页的书签按钮和底部留言框；集市「收藏」筛选、小程序「我的 → 收藏」 |
| 多页图纸 / 打印全部 | 图纸页上方「总览 / A1 / B1 …」翻页；「打印全部」一次打印所有分板页 |

手机上工具栏收起为左侧竖条，右侧「零件」按钮打开工作台抽屉；调色板可横向滑动，缩放按钮在左下角。

<details>
<summary>更多截图</summary>

**作品详情 / 解锁图纸**

![作品详情](docs/screenshots/03-work.png)

**立体拼装**

![立体拼装](docs/screenshots/04-assembly.png)

**复刻蓝图**

![复刻蓝图](docs/screenshots/05-blueprint.png)

**移动端**

<img src="docs/screenshots/06-mobile.png" width="320" alt="移动端" />

</details>

## 豆币规则

- 新游客：**900 豆币**
- 发布作品：**+50 豆币**
- 作品被喜欢：作者 **+2 豆币**（取消喜欢会扣回，最低 0）
- 解锁别人定价的图纸：扣除作者设定的价格（0–999）
- 自己的作品、免费作品：不扣费
- 复刻后再发布，会自动标注「复刻自《原作》· @作者」

## 一些设计取舍

- **熨烫按四连通分件**：真实的拼豆就是连在一起才能烫成一块，所以零散的豆子会各自成件。框选局部熨烫时也按连通块分件。
- **进入立体拼装时自动熨掉散豆**：工作台上还留着散豆时切换到 3D，会先把它们熨成零件再摆出来，避免「明明放了豆却看不到东西」。这一步可以撤销。
- **复刻进度看覆盖，不看颜色**：原作的价值是零件的「板子」和形状，换色是再创作的一部分。所以进度条按已覆盖格数走，另给一个「原色匹配」百分比。
- **截图就是当前角度**：成品截图尊重玩家自己转到的视角；捕获时会自动居中作品、隐藏圆环和网格，并输出 4:3 JPEG。
- **零件用 InstancedMesh**：一块 500 颗豆的零件只占一个 draw call，能在浏览器里同时立起多块零件并保留实时阴影。
- **种子封面用 SVG 渲染**：种子作品的封面由服务端把 3D 场景投影成 SVG，首屏无需截图服务；玩家发布的作品则使用真实的 WebGL 截图。

## 目录

```
douyu/
├─ src/
│  ├─ components/          # 工作台、无限画布、立体拼装、集市、作品详情、图纸工具
│  ├─ mini/                # 竖屏小程序形态：首页/工位/集市/我的/发布
│  ├─ lib/
│  │  ├─ scene.ts          # 豆/零件/连通块/图纸进度/3D 布局
│  │  ├─ pattern.ts        # 照片转豆图：采样、配色、限色、抖动、去背景
│  │  ├─ pdf.ts            # PDF 页转图片（pdf.js）
│  │  ├─ gridDetect.ts     # 从网格线猜行列数
│  │  ├─ legend.ts         # 大色数色号清单自动分栏
│  │  ├─ beadCode.ts       # 豆子编号 / 品牌近似编号
│  │  ├─ patternSheet.ts   # A4 图纸画布、分板线、PNG/打印
│  │  ├─ patternPages.ts   # 总览 + 每块 29×29 拼板一页
│  │  ├─ metrics.ts        # 色号用量、5mm 尺寸、29×29 拼板数、时长
│  │  ├─ inventory.ts      # 豆仓缺口、近似替代色
│  │  ├─ render.ts         # 豆子、零件缩略图绘制
│  │  ├─ api.ts            # 前端 API 客户端
│  │  └─ capture.ts        # 截图通道
│  ├─ store.ts             # 工作台状态、撤销历史、自动保存、行跟做
│  ├─ inventoryStore.ts    # 豆仓（localStorage）
│  ├─ appStore.ts          # 用户、路由、Toast
│  └─ styles.css           # 设计系统
├─ wechat-mini/            # 微信小程序 WebView 壳（小程序 AppID）
├─ wechat-game/            # 微信小游戏 Canvas 核心版（小游戏 AppID）
├─ shared/
│  ├─ palette.mjs          # 豆屿 36 色色卡（前后端共用）
│  └─ brands.mjs           # Hama / Perler / Artkal 公开色号
├─ server/
│  ├─ index.mjs            # Express API + 静态托管
│  ├─ db.mjs               # node:sqlite、种子数据、封面写入
│  ├─ pattern.mjs          # 种子作品的像素画 DSL
│  └─ covers.mjs           # 3D 场景 → SVG 封面
├─ data/                   # douyu.db 与 covers/（运行后生成）
├─ dist/                   # npm run build 产物
└─ docs/screenshots/       # 本文截图
```

## 数据与重置

- 数据都在 `data/`：`douyu.db`（SQLite）和 `covers/`（封面图）。
- 重建种子作品（会清空作品、喜欢、购买、留言、收藏，不删除用户）：

  ```bash
  npm run reseed
  ```

- 想彻底从头开始：停止服务，删除 `data/`，再 `npm start`。
- 换端口：PowerShell 里 `$env:DOUYU_PORT=5188; npm start`（服务默认只监听 `127.0.0.1`）。
- 想让同一局域网的其他人打开：`$env:DOUYU_HOST="0.0.0.0"; npm start`，然后把电脑的局域网地址 `http://<你的IP>:8787` 发给他们；注意这只是本地演示服务，没有密码和防滥用机制。

## 已知边界

- 这是单机本地服务，没有实时协作和真正的注册/密码体系；身份是浏览器 `localStorage` 里的游客 token。
- 集市内容存在本地 SQLite，清理 `data/` 会一起清掉。
- 3D 编辑器面向桌面和触屏浏览器，未做 VR/AR。
- 种子作品与色卡名称为原创示意，色值参考常见拼豆色系。
- 照片转图纸目前使用豆屿自己的 36 色色卡，并给每个色号标了 **Hama / Perler / Artkal 近似色号**；这三个品牌的 HEX 来自公开色卡，不是官方精确换色表。自动去背景适合纯色商品图，复杂照片建议配合手动裁剪。
- 图纸是 **A4 横版**；大图会生成「总览 + 每块 29×29 拼板一页」，通过浏览器打印 / 另存为 PDF。PDF 导入是「PDF 页转图片再配豆」；图纸网格需要你裁到外框并填行列数，自动猜行列只估尺寸，不会读 PDF 里的图例/坐标。真正的主体分割已接 AI 抠图（Beta），但首次需要联网下载模型，复杂图仍建议手动修。
- 照片转图纸的输出色卡已经可以选豆屿 / Hama / Perler / Artkal / 全部；选单一品牌后项目会记住品牌，画布和报告显示该品牌编号。「全部」会混合 512 个去重颜色，适合预览效果，但同一张图可能跨品牌，购买前要按具体色号核对。色号仍是公开色卡的近似匹配，购买前以品牌实物色卡为准。
- 留言 / 收藏 / 回复 / @ / 举报已经可用；举报只写入本地报告表，还没有管理后台。豆仓是手动记数量，不会自动扣减；按行跟做只对「复刻图纸」自动算完成行，没有图纸时还是手动对照。
- 豆屿自己的 36 色有 P01–P36 编号；Hama/Perler/Artkal 全品牌色号可以搜索并直接上板，色号库共 532 条。非豆屿色在画布上会显示 **Hama 近似编号**（不是所选品牌的原编号），买豆时仍以品牌实物色卡为准。

## 参考

这些公开资料用来对照功能和实物做法，不是照搬：

- [颂拼豆（应用宝）](https://sj.qq.com/appdetail/com.pixel.ibeads)：照片转图纸、色号统计、色板管理、原图对照、PNG/PDF。
- [拼小豆（App Store）](https://apps.apple.com/cn/app/%E6%8B%BC%E5%B0%8F%E8%B1%86-%E6%8B%BC%E8%B1%86%E5%9B%BE%E7%BA%B8%E7%94%9F%E6%88%90%E5%99%A8/id6760588364)：主体识别、分板参考图、库存/缺色、按色跟做。
- [PindouAI：美纹纸胶带法](https://pindouai.app/en/blog/the-masking-tape-method-explained)：胶带、压紧、扎孔、翻面、熨烫流程。
- [PindouAI：多拼板大图](https://pindouai.app/en/blog/large-perler-bead-projects-multi-pegboard-guide)：29×29 分板、先拼接缝、分区熨烫。
- [Perler：The Tape Method](https://perler.com/blogs/projects/the-tape-method-for-fusing-large-projects)：官方胶带法说明。
- [Stitchmate：Hama 色卡](https://stitchmate.app/tools/hama-bead-color-chart)：Hama 近似色号参考。
- [Stitchmate：Perler 色卡](https://stitchmate.app/tools/perler-bead-color-chart)：Perler 近似色号参考。
- [Stitchmate：Artkal 色卡](https://stitchmate.app/tools/artkal-color-chart)：Artkal S 近似色号参考。
- [PindouAI：照片转拼豆](https://pindouai.app/en/blog/photo-to-perler-bead-pattern-complete-guide)：裁紧主体、去背景、限色 12–24 色的实操建议。

## 技术栈

React 19 · TypeScript · Vite 7 · three.js · Zustand · Canvas 2D · pdf.js · @imgly/background-removal · Express 5 · Node `node:sqlite`。

字体：站酷快乐体（标题）、Baloo 2（数字/Latin）、系统中文黑体（正文）。
