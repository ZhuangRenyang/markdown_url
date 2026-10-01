<div align="center">
  <h1>📥</h1>
  <h2>Markdown<b>Down</b></h2>
  <p>把任意网页转成干净的 Markdown，图片可一并打包下载。</p>
  <p><b>界面支持中文 / English 双语切换，默认中文。</b></p>
</div>

## ✨ 功能

- 抓取网页（默认用普通 HTTP 请求，可选浏览器渲染），再用 [Turndown](https://github.com/mixmark-io/turndown) 转成 Markdown
- 用 [Mozilla Readability](https://github.com/mozilla/readability) 剔除页头、页脚、广告等无关内容
- 可下载图片、改写为本地引用，并打包成 zip
- 可选「用 AI 处理 Markdown」：用自定义指令再清洗一遍（加摘要、去链接、改标题层级等）
- 同时会生成一份干净排版的 HTML 版本

## 🌐 界面语言

右上角有 **中 / EN** 切换按钮：

- 首次打开默认**中文**；若浏览器语言是英文则跟随英文
- 选择会记在浏览器本地（localStorage），下次打开仍是上次的语言
- `src/lib/i18n.js` 里集中管理所有文案，新增界面文字时同时补 `zh` 和 `en` 两份即可

## 🚀 部署到 Vercel

不需要任何浏览器后端，直接部署就行。

1. 把代码推到 GitHub（本项目仓库：`https://github.com/ZhuangRenyang/markdown_url.git`）
2. 打开 [vercel.com](https://vercel.com) → **Add New → Project** → 导入该仓库
3. Framework Preset 保持 **Next.js**，其它不用改，直接点 **Deploy**
4. 在 **Settings → Environment Variables** 里按需添加：

| 变量名 | 是否必填 | 说明 |
| --- | --- | --- |
| `FETCH_MODE` | 可选 | 抓取模式，默认就是 `plain`，一般不填也行 |
| `OPENAI_API_KEY` | 可选 | 要用「用 AI 处理 Markdown」才需要 |
| `OPENAI_BASE_URL` | 可选 | 用第三方中转站时填，OpenAI 官方留空 |
| `OPENAI_MODEL` | 可选 | 默认 `agnes-3.0-flash` |
| `OPENAI_MODEL_BIG` | 可选 | 勾选「更强的模型」时用的模型 |
| `NEXT_PUBLIC_SITE_URL` | 可选 | 你的域名，用于生成分享卡片链接 |

5. 填完环境变量后点 **Redeploy**（环境变量改动需要重新部署才生效）

## 🔧 抓取模式

大多数网页用普通 HTTP 请求就能拿到正文，只有纯 JS 渲染的 SPA 才需要浏览器。用 `FETCH_MODE` 控制：

| 模式 | 行为 |
| --- | --- |
| `plain`（**默认**） | 只用普通 HTTP 请求，不启动任何浏览器 —— 不需要部署任何抓取服务 |
| `auto` | 先发普通请求，正文少于 200 字符（疑似 JS 渲染空壳）才回退浏览器 |
| `browser` | 只用浏览器渲染抓取，需要 `BROWSERLESS_KEY` 或容器里装了 Chromium |

实测（普通请求，不用浏览器）：

| 网页 | 结果 |
| --- | --- |
| 阮一峰的博客文章 | 抓到 12513 字符正文 ✅ |
| React 官方文档 | 抓到 17436 字符正文 ✅ |

`plain` 模式的代价：纯 SPA 抓不到正文（会提示你改用 `auto`/`browser`），部分懒加载图片会漏掉。

其它可调项：`MIN_MARKDOWN_LENGTH`（回退阈值，默认 200）、`FETCH_TIMEOUT_MS`（抓网页超时，默认 15000）、
`IMG_FETCH_TIMEOUT_MS`（图片超时）、`MAX_IMAGE_BYTES`（单图上限，默认 10MB）。

## 🤖 AI 处理（可选）

支持 OpenAI 官方，也支持任何 OpenAI 兼容的中转站（设 `OPENAI_BASE_URL` 即可）。

本项目用的中转站是 `https://apihub.agnes-ai.com/v1`，实测可用模型：

| 模型 | 状态 |
| --- | --- |
| `agnes-3.0-flash` | ✅ 可用，支持 JSON 模式（默认） |
| `agnes-2.5-flash` | ✅ 可用 |
| `agnes-2.0-flash` | ✅ 可用 |
| `agnes-2.5-pro` | ❌ 报余额不足，别用 |

所以界面上「使用更强的模型」这个勾选项，建议**先别勾**，除非你确认账户里有余额。

实现原理：让模型只返回一组「替换操作」，再由程序把改动应用到原文上——比让它原样吐出整篇 Markdown 可靠得多。见 [src/pages/api/_gpt.js](./src/pages/api/_gpt.js)。

## 🧭 想换别的免费平台？

| 平台 | 能不能跑 | 关键限制 |
| --- | --- | --- |
| **Vercel** Hobby | ✅ 推荐 | 函数最长 60 秒，包体积 250MB，最省事 |
| **Render** 免费 | ✅ 可以 | 512MB 内存 / 0.1 CPU，**15 分钟无流量会休眠**，冷启动要约 30–60 秒 |
| **Koyeb** 免费 | ✅ 可以 | 512MB 内存 / 0.1 vCPU，不休眠，同样用 Docker 部署 |
| **Netlify** 免费 | ⚠️ 不推荐 | 同步函数响应体上限 **6MB**，下载带图片的 zip 很容易超 |
| **Cloudflare Pages / Workers** | ❌ 免费版不行 | CPU 上限 **10ms/请求**，转换一个网页要几百毫秒到几秒；且没有真正的文件系统 |

### 部署到 Render（可选）

仓库里已放好 `Dockerfile` 和 `render.yaml`：

1. push 代码后，在 [render.com](https://render.com) → **New → Blueprint** → 选这个仓库
2. Render 会自动读 `render.yaml`，实例类型选 **Free**
3. 按需填 AI 相关的环境变量
4. 等首次构建完成（Docker 构建比较慢，约 5–10 分钟）

> 免费实例 15 分钟没访问就会休眠，下次打开要先等它启动，第一次点「转换」可能要等半分钟以上。

如果要在容器里跑浏览器抓 SPA：把 `Dockerfile` 里 `apt-get install chromium` 那段注释打开，
设 `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`，并把 `FETCH_MODE` 设成 `browser`。
注意 512MB 内存的免费实例跑 Chromium 很勉强，建议至少 1GB。

## 💻 本地运行

```bash
npm install
npm run dev
```

本地配置写在 `.env.local`（不会进 git），可以直接照着 `.env.example` 抄一份改。

## 📄 License

MIT，详见 [LICENSE.md](./LICENSE.md)。
