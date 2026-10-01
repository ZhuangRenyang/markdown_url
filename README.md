<div align="center">
  <h1>📥</h1>
  <h2>Markdown<b>Down</b></h2>
  <p>把任意网页转成干净的 Markdown，图片可一并打包下载。</p>
  <p><b>界面支持中文 / English 双语切换，默认中文。</b></p>
</div>

## ✨ 功能

- 用 [Puppeteer](https://pptr.dev/) 或 Cloudflare 浏览器渲染抓取网页，再用 [Turndown](https://github.com/mixmark-io/turndown) 转成 Markdown
- 用 [Mozilla Readability](https://github.com/mozilla/readability) 剔除页头、页脚、广告等无关内容
- 可下载图片、改写为本地引用，并打包成 zip
- 可选「GPT 处理」：用自定义指令再清洗一遍 Markdown（摘要、去链接、改标题层级等）
- 同时会生成一份干净排版的 HTML 版本

## 🌐 界面语言

右上角有 **中 / EN** 切换按钮：

- 首次打开默认**中文**；若浏览器语言是英文则跟随英文
- 选择会记在浏览器本地（localStorage），下次打开仍是上次的语言
- `src/lib/i18n.js` 里集中管理所有文案，新增界面文字时同时补 `zh` 和 `en` 两份即可

## 🚀 部署到 Vercel（推荐方案）

Vercel 的 Serverless Function 有 250MB 体积上限，装不下 Puppeteer 自带的 Chromium。
所以**网页抓取交给免费的 Cloudflare Worker**，Next.js 只负责转换和打包。

### 第一步：部署 Cloudflare Worker（抓网页用）

```bash
cd cfworker
npm install
npx wrangler login        # 首次需要登录 Cloudflare 账号
npx wrangler deploy       # 部署后会得到一串网址
```

部署成功会输出类似：

```
https://markdownworker.<你的子域>.workers.dev
```

复制这个地址（**结尾不要带斜杠**）。Cloudflare 免费计划包含每天 10 分钟的浏览器渲染额度，个人使用足够。

### 第二步：部署到 Vercel

1. 把代码推到 GitHub（本项目仓库：`https://github.com/ZhuangRenyang/markdown_url.git`）
2. 打开 [vercel.com](https://vercel.com) → **Add New → Project** → 导入该仓库
3. Framework Preset 保持 **Next.js**，其它不用改，直接点 **Deploy**
4. 在 **Settings → Environment Variables** 里添加：

| 变量名 | 是否必填 | 说明 |
| --- | --- | --- |
| `HTMLFETCH_API` | ✅ 必填 | 上一步拿到的 Cloudflare Worker 地址 |
| `OPENAI_API_KEY` | 可选 | 要用「GPT 处理」才需要 |
| `BROWSERLESS_KEY` | 可选 | 不想用 Cloudflare 时，改用 browserless.io 远程浏览器 |
| `NEXT_PUBLIC_SITE_URL` | 可选 | 你的 Vercel 域名，用于生成分享卡片链接 |

5. 填完环境变量后点 **Redeploy**（环境变量改动需要重新部署才生效）

### 关于 Puppeteer

- 仓库里已放 `.npmrc`（`puppeteer_skip_download=true`），Vercel 安装依赖时**不会下载 Chromium**
- `next.config.mjs` 里也排除了 puppeteer 相关文件，不会打进函数包
- 线上若既没配 `HTMLFETCH_API` 也没配 `BROWSERLESS_KEY`，转换会直接报「Puppeteer 不可用」

## 💻 本地运行

```bash
npm install
npm run dev
```

本地默认会启动自带的 Puppeteer 实例（需要 Chromium）。如果安装时被跳过了，取消 `.npmrc` 里那行注释后重装即可；或者在 `.env.local` 里填 `HTMLFETCH_API` / `BROWSERLESS_KEY` 走远程抓取。

## 🤖 关于 GPT 处理

当前大模型不擅长原样返回整篇 Markdown，所以这里让模型只返回一组「替换操作」，再由程序把改动应用到原文上。GPT-3.5 效果尚可，GPT-4 更好。实现见 [src/pages/api/_gpt.js](./src/pages/api/_gpt.js)。

## 📄 License

MIT，详见 [LICENSE.md](./LICENSE.md)。
