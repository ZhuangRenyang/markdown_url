# MarkdownDown 修复说明

## 背景
两个网页之前无法转换，根因不同：

- **CSDN 文章**：服务端返回「请进行安全验证」反爬页（HTTP 521）。原代码 `fetchHtmlPlain` 只发固定 UA、**不带任何 Cookie**，因此拿不到正文，Readability 只能解析出一张空验证页 → 转换失败。
- **pdai.tech（VuePress）**：正文在 `theme-default-content` 容器里，原代码只依赖 Readability 自动判断，对这类站点不如「直接定位容器」稳。

## 修改的文件（共 4 个，均已通过语法校验）

### 1. `src/pages/api/_scrapper.js`（核心抓取）
- `fetchHtmlPlain(url, customHeaders)`：新增 `customHeaders` 参数，把用户传入的 Cookie / 自定义请求头合并进请求头。
- 新增 `looksLikeAntiBotPage(html)`：识别反爬验证页（CSDN「请进行安全验证」等）。命中即抛出**明确提示**，引导用户去填 Cookie，而不是返回空结果。
- 新增 `extractMainContainer(document)`：按模板优先级定位正文容器
  - `div.theme-default-content`（VuePress，如 pdai.tech）
  - `div#content_views` / `div.blog-content-box`（CSDN 博客）
  - 回退 `article` / `main` / `.post-content` / `.markdown-body` / Readability
- `fetchCleanMarkdownFromUrl` 增加 `customHeaders` 形参，并在抓取后先做反爬页检测。

### 2. `src/pages/api/tomd.js`（API 路由）
- 从请求体读取 `cookie` / `customHeaders`。
- 新增 `buildCustomHeaders()`：整理成 fetch 可用的 headers 对象（仅本次请求使用，不写日志、不落服务器），透传给 scrapper。

### 3. `src/components/homepage.jsx`（前端）
- 新增「**高级选项**」卡片，内含 Cookie 输入框（带帮助提示）。
- `payload` 带上 `cookie`，并存到 `localStorage`。
- 转换失败时**显示服务端返回的具体原因**（如反爬提示），而不是笼统的「转换失败」。

### 4. `src/lib/i18n.js`（文案）
- `zh` / `en` 各新增：`advancedOptions`、`advancedOptionsHelp`、`cookieLabel`、`cookiePlaceholder`、`cookieHelp`。

## 如何使用（针对 CSDN 等反爬站）
1. 浏览器登录目标站点（如 CSDN）；
2. `F12` → Application → Cookies → 复制整段 Cookie 字符串；
3. 在工具的「高级选项」里粘贴 Cookie；
4. 正常粘贴文章 URL 点「转换」。

pdai.tech 这类 VuePress 文档站**无需任何操作**，现在会直接命中 `theme-default-content` 容器正常转换。

## 应用 / 部署方式
1. 把以下文件复制到项目对应路径（覆盖/新增）：

```
src/pages/api/_scrapper.js
src/pages/api/tomd.js
src/pages/api/cookie.js          # 新增：生成恢复链接
src/pages/api/admin-cookie.js    # 新增：管理员预置 Cookie 接口
src/lib/cookieVault.js           # 新增：Cookie 加解密（无状态）
src/lib/serverCookie.js          # 新增：服务端 Cookie 存储（内存+临时文件）
src/pages/admin-cookie.jsx       # 新增：管理员预置 Cookie 页面
src/components/homepage.jsx
src/lib/i18n.js
```

2. 部署环境变量（可选）：`COOKIE_VAULT_SECRET` 为恢复链接加密密钥。
   **未设置时改为「启动时随机生成」**，无需配置即可使用；仅当你希望恢复链接跨 Serverless 冷启动仍有效时才建议设置固定值。
   - Vercel：Project Settings → Environment Variables → 添加 `COOKIE_VAULT_SECRET=你的随机串`（可选）

3. 本地验证：
```bash
npm install && npm run dev
```

4. 提交：
```bash
git add . && git commit -m "..." && git push
```

## 注意事项
- **Cookie 是登录凭证**：仅本次请求经服务端内存使用，不落服务器；但切勿在公开/共享部署上让他人填你自己的 Cookie。
- Cookie 有有效期，失效后重新复制即可。
- 若你的部署服务器 IP 被 Cloudflare 标黑，极个别情况带 Cookie 仍会被拦（IP 声誉问题），需更换出口 IP。

---

## 第二阶段：Cookie 保险箱 / 恢复链接（手机免粘贴）

手动复制 CSDN 的 Cookie 对手机用户极不友好——浏览器的同源策略 + HttpOnly 决定了服务端**无法自动读取**用户在 CSDN 的登录态。
为此新增「恢复链接」机制，目标：**任一设备填一次 Cookie，手机免重复粘贴**。

### 新增文件
- `src/pages/api/cookie.js`：POST `{cookie}` → 用 `COOKIE_VAULT_SECRET` 加密，返回 `restoreToken`（**无状态，不落盘**）。
- `src/lib/cookieVault.js`：`encryptCookie` / `decryptCookie`（AES-256-GCM，Node `crypto`）。

### 改动
- `tomd.js`：请求体支持 `restoreToken`，自动解密复用，无需明文 Cookie。
- `homepage.jsx`：
  - 高级选项卡片新增「**生成恢复链接**」按钮；
  - 页面加载时若 URL 带 `?restore=<token>`，自动取出并配置（同时清理地址栏避免泄漏）；
  - 转换请求自动携带 `restoreToken`（并存于 localStorage）。
- `i18n.js`：补中英文案。

### 使用流程（对手机用户）
1. 桌面浏览器：登录 CSDN → F12 复制 Cookie → 在工具「高级选项」粘贴 → 点「生成恢复链接」；
2. 链接**自动复制到剪贴板**，发到手机微信/QQ；
3. 手机打开链接 → 自动配置好凭据 → 之后转换全程免粘贴 Cookie。

### 安全说明
- `restoreToken` 即加密后的 Cookie 密文，密钥 `COOKIE_VAULT_SECRET` 不公开，第三方拿到 token 也无法解密利用；
- 链接含 token，可能留在浏览器历史 / 代理日志——属同风险等级，建议仅自用、用完可重新生成；
- 无状态、不落盘，部署在 Vercel 等 Serverless 也正常（不受临时文件系统影响）。

---

## 第三阶段：管理员预置 Cookie（普通用户零操作）

「恢复链接」对小白仍偏麻烦（需桌面取 Cookie 再发手机）。本阶段让**站长预置一次自己的 CSDN Cookie，所有访客直接贴 URL 就能转**，普通手机用户完全零操作。

### 新增文件
- `src/pages/admin-cookie.jsx`：独立管理员页面 `/admin-cookie`，带口令保护，粘贴一次 CSDN Cookie 保存。
- `src/pages/api/admin-cookie.js`：GET 返回配置状态（掩码）；POST `{passphrase, cookie}` 校验口令后保存/清空。
- `src/lib/serverCookie.js`：服务端 Cookie 存储（内存 + 临时文件），掩码展示，不进环境变量、不进 git。

### 改动
- `tomd.js`：抓取凭据按优先级解析
  1. 用户本次请求明文 `cookie`；
  2. `restoreToken` 解密（恢复链接）；
  3. 服务端内存 Cookie（管理员页 `/admin-cookie`）；
  4. **Vercel 环境变量 `CSDN_COOKIE`**（持久兜底，加密存储、不进仓库）。
- `cookieVault.js`：密钥未配置时改为「启动时随机生成」，不再用不安全的硬编码兜底。

### 两种预置方式（任选其一）
- **方式 A · 管理员页面（推荐体验）**：部署后访问 `你的域名/admin-cookie`，输入口令（默认 `mdcati`，生产请设 `ADMIN_PASSWORD` 改强口令），粘贴 CSDN Cookie 保存。
  保存在服务端内存，Serverless 冷启动后会清空，需重新保存一次。
- **方式 B · Vercel 环境变量（永久持久）**：Vercel Project Settings → Environment Variables → 添加
  `CSDN_COOKIE=你的CSDN Cookie`。加密存储、不进代码仓库，且不受冷启动影响，最省心。

> 普通用户 thereafter：打开网站 → 粘贴 CSDN 文章 URL → 点转换，全程无需任何 Cookie / 账号操作。

### 安全说明
- Cookie 不进代码仓库、不以明文出现在前端；管理员页展示仅掩码。
- 管理员页默认口令 `mdcati` 仅为方便，生产务必设 `ADMIN_PASSWORD` 环境变量，否则他人可改预置 Cookie。
- 共用的是站长自己的 CSDN 会话，有频率上限（个人低频使用足够）；Cookie 过期后在管理员页或环境变量重新设置即可。

---

## 第四阶段：书签工具（Bookmarklet，根治 Cookie / 环境变量痛点）

第三阶段「预置 Cookie」对多站点不通用、环境变量又常过期。本阶段换个思路：
**把"读页面"这一步挪到用户自己已登录的浏览器里**——用户的浏览器本来就有所有站点的登录态，所以服务端再也不需要 Cookie、也无需配置任何环境变量。任意反爬站（CSDN、知乎……）都能转，普通用户零操作。

### 新增文件
- `src/pages/api/fromhtml.js`：接收书签 POST 来的「当前页面完整 HTML」（已含登录态），在服务端转成 Markdown 返回。
  - 带 `Access-Control-Allow-Origin: *` 并正确处理 `OPTIONS` 预检，允许跨域（书签运行在文章站源站）；
  - 请求体上限放宽到 8MB（完整页面 HTML 可能较大）。

### 改动
- `src/pages/api/_scrapper.js`：
  - 导出 `htmlToMarkdown(html, url, removeNonContent)`，供 fromhtml 端点复用；
  - **修复 bug**：`htmlToMarkdown` 原把 JSDOM 实例误当 document 传给 `normalizeImages`（调用 `querySelectorAll` 为 undefined），会导致每次转换抛错。现统一用 `dom.window.document`。
- `src/components/homepage.jsx`：新增「**书签工具**」卡片
  - 显示可拖拽的书签链接（默认指向当前站点源，自托管可在输入框改 API 地址）；
  - 含「复制书签代码」按钮；
  - 书签代码读取 `document.documentElement.outerHTML` → POST `/api/fromhtml` → 新标签页展示 Markdown（可复制 / 下载 .md）。
- `src/lib/i18n.js`：补中英文案。

### 使用流程（最省心，任意站点通用）
1. 打开 `你的域名`，把「🔖 拖我到收藏栏」拖进浏览器收藏栏；
2. 打开要转换的文章页（**已登录**即可，CSDN / 知乎都行）；
3. 点收藏栏里的书签 → 自动在弹出的新标签页生成 Markdown，可复制或下载。

> 全程不需要懂 Cookie、不需要配环境变量；换站、Cookie 过期都与你无关。
> 手机浏览器（iOS Safari / Android Chrome）同样支持书签，体验一致。

### 备注
- 之前各阶段的 Cookie / 环境变量能力仍保留作兜底（少数不支持书签的场景可用），但**首选路径已是书签**。
- 书签依赖目标站点允许用户脚本运行（绝大多数站点允许）；个别极严格 CSP 站点可能拦截，属极少数。

---

## 第五阶段：修复问号帮助气泡在手机上"点一下就消失"

`HelpTooltip` 原先使用 Radix/shadcn 的 `Tooltip`，它在触屏上没有真正的 hover：一次 tap 会先后触发 `mouseenter`（打开）与 `mouseleave`（关闭），于是气泡一闪即逝，手机用户看不到内容。

### 改动
- `src/components/homepage.jsx`：`HelpTooltip` 改为自实现的受控浮层
  - 桌面端（`pointerType === "mouse"`）：保留 hover 显隐；
  - 触屏端：点击 `?` 开关气泡，点击浮层外部（`pointerdown` 落在气泡外）才关闭；
  - 用 `pointerType` 区分鼠标 / 触摸，屏蔽触摸伪 hover 事件导致的瞬关；
  - 移除对 `@/components/ui/tooltip` 的依赖。

---

## 第六阶段：修复书签报「Failed to fetch」

用户反馈点书签后弹出 `转换出错：Failed to fetch`。经真实浏览器复现与对照实验确认：

- 服务端 `/api/fromhtml`、CORS 预检（OPTIONS→204 带 `access-control-allow-origin: *`）、Cloudflare 均正常；
- 错误根因：书签卡片里那个「接口地址」输入框被填成了 **文章地址**（如 `https://blog.csdn.net/...`）。书签会拿它当服务器地址，向 `blog.csdn.net/.../api/fromhtml` 发请求，跨域被拦 → `Failed to fetch`。
- 对照：接口地址填错 → `Failed to fetch`；填 `https://md.cati.cc.cd` → `HTTP 200` 正常返回 Markdown。

### 改动
- `src/components/homepage.jsx`
  - **移除**书签卡片的「接口地址」输入框；书签固定用 `window.location.origin` 自动生成，用户无需也无法误填。
  - 书签脚本新增两道防护：
    - 在本工具页面点击书签时（`location.host === 接口host`）直接提示「请到目标文章页点」并中止；
    - fetch 失败时的报错附带「若是 Failed to fetch，通常是没在文章页点」的引导。
- `src/lib/i18n.js`：`bookmarkletDesc` 中英文案补充「请在文章页点，不要在本工具页面点」。

---

## 第七阶段：书签在工具页点击时自动打开文章页（解决"点了没作用"）

用户习惯在工具页粘贴 URL 后点书签，但书签必须在文章页才能抓正文，于是点下去只看到"请到文章页点"的提示，体感像"没作用"。

### 改动
- `src/components/homepage.jsx`
  - 首页 URL 输入框加 `id="md-src-url"`；
  - 书签脚本的守卫逻辑升级：当在工具页点击书签时，读取输入框里的链接，**自动在新标签打开该文章**，并提示"请在文章页再点一次书签"；若浏览器拦截弹窗则回退为当前标签跳转；输入框为空时给出粘贴引导。
  - 用户操作变成：工具页粘贴 URL → 点书签（自动打开文章页）→ 在文章页再点一次书签 → 生成 Markdown。
- `src/lib/i18n.js`：`bookmarkletDesc` / `bookmarkletUsage` 中英文案改为说明新行为（含手机"长按链接→添加书签"提示）。

---

## 第八阶段：新增「粘贴网页内容」模式（手机无书签栏的替代方案）

用户在手机 Edge 上没有「书签栏」入口，书签流程（长按收藏 → 文章页再点一次）过于曲折。本阶段新增**粘贴模式**：在文章页复制正文/源码，回工具页粘贴即可转 Markdown。

### 改动
- `src/components/homepage.jsx`
  - 新增 state `pasteMode` / `pastedHtml`；
  - 选项卡片新增复选框「粘贴网页内容模式」；
  - 开启后渲染「粘贴网页内容」卡片：多行文本框 + 可选 URL 输入 + 转换按钮；
  - 新增 `submitPasted()`：把粘贴内容（HTML 或纯文字，纯文字会包成 `<pre>`）POST 到 `/api/fromhtml` 转成 Markdown 并下载，复用与 `submit` 一致的下载逻辑；
  - 主输入区在粘贴模式下显示一行提示，避免与卡片内 URL 框混淆。
- `src/lib/i18n.js`：新增 `pasteMode` / `pasteModeHelp` / `pasteCardTitle` / `pasteCardDesc` / `pastePlaceholder` / `pasteEmptyTitle` / `pasteEmptyDesc` / `pasteModeNote` 中英文案。

### 使用流程（手机）
1. 打开目标文章页（已登录），**长按全选正文 → 复制**（或复制网页源码）；
2. 回到工具页，勾选「粘贴网页内容模式」；
3. 粘贴到文本框（可补上文章链接用于图片补全），点「转换」→ 下载 Markdown。

---

## 第九阶段：书签「一次点击全自动」+ 修复书签代码语法错误

用户反馈：在工具页点书签后跳到文章页就"没下文"，需再点第二次，体验差；且上一版书签代码因多层手写转义存在**语法错误**（`missing ) after argument list`），浏览器直接不执行。

### 改动
- `src/components/homepage.jsx`：重写 `buildBookmarklet`
  - 抓取逻辑写成**真实函数**，用 `Function.prototype.toString()` 序列化注入，彻底避开手写字符串转义；
  - 主逻辑分三种情形：
    - 页面带 `?__mdrun=1`（书签从工具页跳转而来）→ 延迟 1.2s（等正文渲染）**自动抓取并弹结果**，无需再点第二次；
    - 在工具页点书签 → 读取 `#md-src-url` 输入框链接，跳转并附 `__mdrun=1`，实现"粘贴链接→点书签→全自动"；
    - 已在文章页手动点书签 → 直接抓当前页。
  - 修复语法错误：JSON.stringify 注入 API 地址、函数 toString 注入逻辑。
- `src/lib/i18n.js`：`bookmarkletDesc` / `bookmarkletUsage` 更新为"一次点击全自动"说明。

---

## 第十阶段：粘贴卡片新增「上传本地网页文件」

用户反馈书签在手机端仍不好用，倾向"下载网页 → 本地转换"。本阶段给「粘贴网页内容」卡片补上**文件上传**入口：手机浏览器"保存网页"后，直接选该 `.html` 文件即可转换，完全不依赖书签 / 弹窗 / 服务端抓取。

### 改动
- `src/components/homepage.jsx`
  - 新增 state `fileName`；
  - 「粘贴网页内容」卡片新增 `<input type="file" accept=".html,.htm,.txt">`：选中后读取文本填入粘贴框并提示已载入；
  - 复用既有 `submitPasted()` 提交逻辑（同一套 HTML→Markdown 转换链路）。
- `src/lib/i18n.js`：新增 `uploadHtmlLabel` / `fileLoadedTitle` / `fileLoadedHint` 中英文案。

---

## 第十一阶段：移除书签（Bookmarklet）功能

书签方案在手机端体验差（无书签栏、需二次点击、弹窗易被拦），用户决定弃用。前端移除书签卡片。

### 改动
- `src/components/homepage.jsx`
  - 删除「书签工具」卡片（UI）；
  - 删除 `buildBookmarklet()` 函数、`copyBookmarklet()` 函数；
  - 删除 `apiBase` / `bookmarkletCode` / `bookmarkletHref` 相关 state 与派生值。
  - 修正删除过程中误伤的结构（补回 `return (` / `(<main ...>`，去掉多余 `}`）。
- `src/lib/i18n.js`：修正上一阶段编辑造成的两处文案粘连（`pasteModeNote`/`pasteEmptyTitle`、`bookmarkletTitle`/`bookmarkletHelp`）；书签相关文案键保留（未被引用，无害）。

> 首选的手机方案现在是：**「粘贴网页内容模式」+ 上传本地网页文件**。后端 `/api/fromhtml`、`/api/cookie`、`/api/admin-cookie` 等能力仍保留作兜底。

---

## 第十二阶段：URL 抓取失败时自动降级到「粘贴网页内容」

用户希望"输入 URL 直接转换"。但实测表明：服务端直抓**只能搞定静态站**（pdai ✅），反爬站（CSDN 521、知乎 403）和 SPA（掘金）抓不到——这是服务端抓取的天花板。

### 改动
- `src/components/homepage.jsx`：`submit()` 失败分支新增**自动降级**
  - 解析服务端返回的错误文案：
    - 命中 `403/521/503/拒绝/反爬/安全验证/人机/验证` → 判定为**反爬拦截**；
    - 命中 `正文太少/JS 渲染/SPA` → 判定为**JS 动态渲染**；
  - 命中任一 → **自动开启「粘贴网页内容模式」**，并弹出针对性引导文案，用户无需自行判断该用哪种方式。
- `src/lib/i18n.js`：新增 `fallbackTitle` / `fallbackBlockedDesc` / `fallbackSpaDesc` 中英文案。

### 现在的完整逻辑
1. 贴 URL → 服务端直抓 → 成功即出 Markdown（普通站点一步到位）；
2. 失败（反爬/SPA）→ 自动切粘贴模式 + 明确引导 → 用户复制正文或上传 .html 即可转换。

---

## 第十三阶段：接入 Jina Reader 作为抓取兜底

服务端直抓只能搞定静态站；反爬站（CSDN 521）/SPA（掘金）抓不到。为提升"贴 URL 直接转换"的覆盖率，接入**第三方抓取服务 Jina Reader**（免费、无需注册即可用）作为**自动兜底**。

### 改动
- `src/pages/api/_scrapper.js`
  - 新增 `fetchMarkdownViaJina(url)`：请求 `https://r.jina.ai/<url>`，直接把目标页转成 Markdown 返回；
  - 在 `fetchCleanMarkdownFromUrl` 的两处失败点接入兜底：
    1. 服务端直抓抛错（5xx/403/网络失败）→ 自动改用 Jina 再试；
    2. 直抓成功但正文过短（SPA 空壳）→ 也用 Jina 再试；
  - 兜底结果仍会做反爬页/长度校验，无效则抛出原错误。
- 环境变量（均可选）：
  - `JINA_READER=off`：关闭兜底；
  - `JINA_API_KEY`：填了走你自己的 key（提高限速/稳定性）；
  - `JINA_TIMEOUT_MS`：超时，默认 30000。

### 说明与局限
- Jina Reader 对**普通站**效果好；对**强反爬站（CSDN 等）通过率有限**，可能返回反爬页 → 此时仍回落到「粘贴/上传」路径（前端已有自动降级提示）。
- 数据经第三方中转，敏感 URL 请勿使用。
