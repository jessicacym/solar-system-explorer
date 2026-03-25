# Solar System Explorer - 开发对话记录

## 1. 整合三个文件到项目

### 用户需求

将三个文件整合进项目：

1. 把 `api/horizons.js` 这个文件夹和文件原样加到项目根目录
2. 把 `vercel.json` 加到项目根目录
3. 打开 `main.js`，找到 `const HORIZONS_API` 开头的那段，一直到 `fetchHorizonsData` 函数结束，把这整段全部替换成 PATCH_main.js 里的内容

### 执行的操作

#### 1.1 创建 `api/horizons.js`

Vercel Serverless Function，作为 NASA Horizons API 的代理，解决浏览器 CORS 问题。

```js
// api/horizons.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const params = new URLSearchParams(req.query);
  const nasaUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;

  try {
    const nasaResponse = await fetch(nasaUrl);
    const text = await nasaResponse.text();
    res.setHeader("Content-Type", "application/json");
    return res.status(nasaResponse.status).send(text);
  } catch (err) {
    return res.status(502).json({
      error: "Failed to reach NASA Horizons",
      detail: err.message,
    });
  }
}
```

#### 1.2 创建 `vercel.json`

Vercel 路由和 CORS 配置。

```json
{
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/$1" }],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [{ "key": "Access-Control-Allow-Origin", "value": "*" }]
    }
  ]
}
```

#### 1.3 替换 `main.js` 中的 Horizons API 部分

**删除的旧代码（第445-520行）：**

- `const HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api"`
- `const CORS_PROXIES = [...]`
- `async function fetchWithCorsRetry(url) {...}`
- `const HORIZONS_CODES = {...}`
- `async function fetchHorizonsData(...) {...}`

**替换为新代码：**

- 根据环境自动选择 API 地址（本地直连 NASA / Vercel 走 `/api/horizons` 代理）
- 使用 `URLSearchParams` 构建请求参数
- 去掉了 CORS proxy fallback（后续又加回，见下文）

---

## 2. 将 Settings 按钮文字改为 Location

### 用户需求

将 setting 按钮的文字换成 Location

### 执行的操作

修改 `index.html` 第151行：

```html
<!-- 修改前 -->
<button class="recalc-btn" id="recalc-btn">Settings</button>

<!-- 修改后 -->
<button class="recalc-btn" id="recalc-btn">Location</button>
```

---

## 3. 修复 "Current Distance from Earth" 显示 N/A 的问题

### 用户反馈

修改参数后，详情面板第一行 "Current Distance from Earth" 显示 N/A，这个数据最重要。

### 问题分析

本地开发时直接请求 NASA API 被浏览器 CORS 拦截，`fetchHorizonsData` 失败后被 `.catch` 吞掉返回 `null`，`distEarthAU` 保持 `null`，显示 N/A。

### 修复方案

在 `main.js` 的 `fetchHorizonsData` 中恢复 CORS proxy fallback 机制。本地开发时依次尝试：

1. 直连 NASA API
2. `corsproxy.io` 代理
3. `allorigins` 代理

部署到 Vercel 后走 `/api/horizons` serverless proxy，不受影响。

**修改后的关键代码：**

```js
const IS_LOCAL =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost";

const HORIZONS_API = IS_LOCAL
  ? "https://ssd.jpl.nasa.gov/api/horizons.api"
  : "/api/horizons";

const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url=",
];

async function fetchHorizonsData(planetId, lat, lon, elev, datetime) {
  // ...参数构建...

  const directUrl = `${HORIZONS_API}?${params.toString()}`;

  // Try direct first, then CORS proxies if on localhost
  const attempts = [directUrl];
  if (IS_LOCAL) {
    const nasaUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
    CORS_PROXIES.forEach((proxy) =>
      attempts.push(proxy + encodeURIComponent(nasaUrl)),
    );
  }

  let response;
  for (const url of attempts) {
    try {
      response = await fetch(url);
      if (response.ok) break;
    } catch (e) {
      continue;
    }
  }
  if (!response || !response.ok)
    throw new Error("All fetch attempts failed (CORS)");

  // ...解析响应...
}
```

---

## 4. 左上角添加标题 "Solar System Explorer"

### 用户需求

在网页左上角写上标题：Solar System Explorer，使用 Bitcount Prop Double 字体。

### 执行的操作

#### 4.1 在 `index.html` 中添加字体链接和标题元素

**添加 Google Fonts 链接：**

```html
<link
  href="https://fonts.googleapis.com/css2?family=Bitcount+Prop+Double+Ink:wght@100..900&family=Bitcount+Prop+Double:wght@100..900&display=swap"
  rel="stylesheet"
/>
```

**添加标题元素（`<body>` 内最前面）：**

```html
<h1 class="site-title">Solar System Explorer</h1>
```

#### 4.2 在 `style.css` 中添加样式

```css
.site-title {
  position: fixed;
  top: 28px;
  left: 32px;
  z-index: 100;
  font-family: "Bitcount Prop Double", var(--font-sans);
  font-size: clamp(42px, 5vw, 64px);
  font-weight: 400;
  letter-spacing: 0.12em;
  line-height: 1;
  color: rgba(255, 255, 255, 0.82);
  text-transform: uppercase;
  pointer-events: none;
  user-select: none;
}

@media (max-width: 768px) {
  .site-title {
    font-size: 32px;
    top: 16px;
    left: 16px;
    letter-spacing: 0.08em;
  }
}
```

### 后续调整

用户反馈字体太小，从固定 `28px` 放大到 `clamp(42px, 5vw, 64px)`，响应式适配：桌面端最大 64px，移动端回落到 32px。

---

## 修改的文件清单

| 文件              | 操作 | 说明                                        |
| ----------------- | ---- | ------------------------------------------- |
| `api/horizons.js` | 新建 | Vercel serverless proxy                     |
| `vercel.json`     | 新建 | Vercel 路由和 CORS 配置                     |
| `main.js`         | 修改 | 替换 Horizons API 逻辑 + 加回 CORS fallback |
| `index.html`      | 修改 | 按钮文字改 Location + 添加字体链接和标题    |
| `style.css`       | 修改 | 添加 .site-title 样式                       |
