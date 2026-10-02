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
1. 把以下 **6 个文件**复制到项目对应路径（覆盖）：

```
src/pages/api/_scrapper.js
src/pages/api/tomd.js
src/pages/api/cookie.js          # 新增：生成恢复链接
src/lib/cookieVault.js           # 新增：Cookie 加解密（无状态）
src/components/homepage.jsx
src/lib/i18n.js
```

2. 部署环境变量（重要）：设置 `COOKIE_VAULT_SECRET` 为一个随机强密钥。
   恢复链接的密文用它加密，**不设置会退回不安全的 fallback，生产务必配置**。
   - Vercel：Project Settings → Environment Variables → 添加 `COOKIE_VAULT_SECRET=你的随机串`

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
