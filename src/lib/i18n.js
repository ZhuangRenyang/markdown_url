// 界面文案字典：中文 / 英文
// 新增文案时，请同时在 zh 与 en 两份里补齐，否则会回退到英文。

export const DEFAULT_LANGUAGE = "zh";

export const SUPPORTED_LANGUAGES = [
  { code: "zh", label: "中文", short: "中", htmlLang: "zh-CN" },
  { code: "en", label: "English", short: "EN", htmlLang: "en" },
];

const zh = {
  langName: "中文",

  title: "MarkdownDown",
  subtitle: "把任意网页转成干净的 Markdown",
  subtitle2: "图片可一并打包下载",

  urlPlaceholder: "粘贴网页地址，例如 https://example.com",
  clearInput: "清空输入框",
  convert: "转换",
  converting: "转换中...",

  options: "选项",

  removeNonContent: "移除无关内容元素",
  removeNonContentHelp:
    "移除页头、页脚、广告、侧边栏等非正文元素，只保留文章主体。",

  downloadImages: "下载图片到本地并改写链接",
  downloadImagesHelp:
    "不使用远程图片链接，而是把图片下载到本地并在 Markdown 中引用。最终会得到一个包含 Markdown 文件和图片文件夹的 zip 压缩包。",

  applyGpt: "用 AI 处理 Markdown",
  applyGptHelp:
    "用自定义指令让 AI 进一步清洗或改写 Markdown 内容，比如在开头加摘要、删除所有链接、改标题层级（需要配置 OPENAI_API_KEY）。",

  // 粘贴网页内容模式：手机没有书签栏时的替代方案
  pasteMode: "粘贴网页内容模式",
  pasteModeHelp:
    "手机没有书签栏？在文章页长按全选复制正文（或复制网页源码），回到这里粘贴，即可转成 Markdown。适合 CSDN、知乎等反爬站。",
  pasteCardTitle: "粘贴网页内容",
  pasteCardDesc:
    "在目标文章页：长按选中正文 → 复制（若复制的是纯文字也可以）。回到本页粘贴到下面，点「转换」即可生成 Markdown。可在下方补充文章链接（可选，用于给图片补全地址）。",
  pastePlaceholder: "在这里粘贴文章正文 / 网页 HTML / 纯文字……",
  uploadHtmlLabel: "或：上传本地网页文件（.html/.htm/.txt）",
  fileLoadedTitle: "已载入文件",
  fileLoadedHint: "已载入：",
  pasteModeNote: "已开启粘贴模式：请在下方粘贴内容后点「转换」，上方输入框可填文章链接（可选）。",
  fallbackTitle: "已自动切换为「粘贴网页内容」模式",
  fallbackBlockedDesc:
    "该站点有反爬拦截（如 CSDN、知乎），服务端无法直接抓取。请在浏览器打开该文章 → 长按全选复制正文（或保存网页为 .html）→ 回本页粘贴/上传后点转换。",
  fallbackSpaDesc:
    "该页面是 JS 动态渲染的，服务端拿不到正文。请在浏览器打开该文章 → 复制正文（或保存网页为 .html）→ 回本页粘贴/上传后点转换。",
  pasteEmptyTitle: "请先粘贴内容",
  pasteEmptyDesc: "把文章页复制的内容粘贴到上面的文本框再点转换。",

  imageOptions: "图片选项",
  overrideImagesFolder: "自定义图片文件夹名称",
  overrideImagesFolderHelp: "覆盖默认的图片文件夹名称（仅在「下载图片」时生效）。",
  enterFolderName: "输入文件夹名称",
  overrideBasePath: "自定义 Markdown 中的图片路径前缀",
  overrideBasePathHelp:
    "覆盖 Markdown 中图片引用的路径前缀（仅在「下载图片」时生效）。",

  gptOptions: "AI 选项",
  useGpt4: "使用更强的模型（更慢，可能产生额外费用）",
  gptPlaceholder: `给 AI 的指令，例如：

"在开头加一段内容摘要"
"删除所有链接"
"把所有小标题改成三级标题"`,

  invalidUrlTitle: "网址无效",
  invalidUrlDesc: "请输入有效的网址",

  failedTitle: "转换失败",
  failedDesc: "网址无效或服务器繁忙，请稍后再试。",

  successTitle: "转换成功",
  successDesc: "Markdown 文件正在下载。",

  downloadStartedTitle: "开始下载",
  downloadStartedDesc: "Markdown 与图片正在以 zip 压缩包形式下载。",

  // 设置弹窗
  settingsTitle: "AI 服务设置",
  settingsSubtitle:
    "密钥只保存在当前浏览器的 localStorage 中，不会上传到服务器，也不会写进代码仓库。",
  apiSite: "API 站点",
  baseUrl: "Base URL",
  apiKey: "API 密钥",
  model: "模型（可选）",
  modelPlaceholder: "留空则用服务端默认模型",
  show: "显示",
  hide: "隐藏",
  keyWarning: "不要在共享设备或公开页面上保存真实密钥。",
  clearKey: "清除本地密钥",
  saveConnection: "保存连接",
  status: "当前状态",
  statusConfigured: "已配置",
  statusNotConfigured: "未配置",
  statusSaved: "已保存",
  testConnection: "测试连接",
  fetchServiceTitle: "网页抓取服务",
  fetchServiceDesc:
    "遇到 CSDN、知乎等反爬站，或纯 JS 渲染的页面时，用第三方抓取服务来取正文。默认走免费服务，无需注册；密钥只存在本地，随本次请求发给服务器用一次。",
  fetchProvider: "抓取方式",
  fetchKeyHelp: "可留空。填了用你自己的额度，避免和其他访客共用。",
  fetchAutoHelp:
    "自动模式：先服务端直抓，失败后自动用免费的 Jina Reader 兜底，无需注册、无需填密钥，开箱即用。",
  fetchNeedKey: "该服务需要先注册并填入 API 密钥，否则会被自动跳过。",
  testing: "测试中...",
  testOk: "连接成功",
  testFail: "连接失败",
  modelsAvailable: "个可用模型",
  needApiKeyTitle: "缺少 API 密钥",
  needApiKeyDesc:
    "勾选了「用 AI 处理 Markdown」，但还没配置密钥。请在设置里填写 API 密钥后再试。",
};

const en = {
  langName: "English",

  title: "MarkdownDown",
  subtitle: "Convert any webpage to a clean markdown",
  subtitle2: "w/ images downloaded.",

  urlPlaceholder: "Paste a webpage URL, e.g. https://example.com",
  clearInput: "Clear input",
  convert: "Convert",
  converting: "Converting...",

  options: "Options",

  removeNonContent: "Remove non-content elements",
  removeNonContentHelp:
    "Removes non-content elements like headers, footers, ads, sidebars, etc.",

  downloadImages: "Download images locally and link them",
  downloadImagesHelp:
    "Instead of linking to remote images, download them locally and link them in the markdown. Gives you a zip file with markdown and images folder.",

  applyGpt: "Process Markdown with AI",
  applyGptHelp:
    "Use custom instructions to further clean up or transform the markdown with AI, e.g. add a summary, remove all links (requires OPENAI_API_KEY).",

  // Paste mode: fallback when mobile browser has no bookmarks bar
  pasteMode: "Paste page content mode",
  pasteModeHelp:
    "No bookmarks bar on mobile? Long-press and select the article text (or copy the page source) on the article page, come back here and paste it to get Markdown. Works for anti-bot sites like CSDN or Zhihu.",
  pasteCardTitle: "Paste page content",
  pasteCardDesc:
    "On the target article page, long-press to select the body and copy it (plain text is fine too). Paste it below and click Convert to get Markdown. Optionally add the article URL below so images get absolute paths.",
  pastePlaceholder: "Paste article text / page HTML / plain text here…",
  uploadHtmlLabel: "Or: upload a saved web page file (.html/.htm/.txt)",
  fileLoadedTitle: "File loaded",
  fileLoadedHint: "Loaded: ",
  pasteModeNote: "Paste mode is on: paste your content below and click Convert. The field above takes the article URL (optional).",
  fallbackTitle: "Switched to \"Paste page content\" mode",
  fallbackBlockedDesc:
    "This site blocks automated fetching (e.g. CSDN, Zhihu). Open the article in your browser → long-press to copy the body (or save the page as .html) → come back and paste/upload it to convert.",
  fallbackSpaDesc:
    "This page is JS-rendered, so the server can't get the content. Open the article in your browser → copy the body (or save the page as .html) → come back and paste/upload it to convert.",
  pasteEmptyTitle: "Nothing pasted yet",
  pasteEmptyDesc: "Paste the content you copied from the article page, then click Convert.",

  imageOptions: "Image Options",
  overrideImagesFolder: "Override Images Folder Name",
  overrideImagesFolderHelp:
    "Override the default folder name for images (Only used when downloading images).",
  enterFolderName: "Enter folder name",
  overrideBasePath: "Override base path for images in markdown",
  overrideBasePathHelp:
    "Override the base path for linked images in markdown (Only used when downloading images).",

  gptOptions: "AI Options",
  useGpt4: "Use the stronger model (slower, may cost extra)",
  gptPlaceholder: `Instructions for the AI, like:

'Add a tldr section at the top'
'Remove all links'
'Change all subheadings to h3'`,

  invalidUrlTitle: "Invalid URL",
  invalidUrlDesc: "Please enter a valid URL",

  failedTitle: "Failed to Convert",
  failedDesc:
    "Either the URL is invalid or the server is too busy. Please try again later.",

  successTitle: "Converted Successfully",
  successDesc: "Your markdown is being downloaded as a text file.",

  downloadStartedTitle: "Download Started",
  downloadStartedDesc:
    "Your markdown and images are being downloaded as a zip file.",

  // Settings dialog
  settingsTitle: "AI Service Settings",
  settingsSubtitle:
    "The key is stored in this browser's localStorage only. It is never uploaded to the server or committed to the repo.",
  apiSite: "API site",
  baseUrl: "Base URL",
  apiKey: "API key",
  model: "Model (optional)",
  modelPlaceholder: "Leave empty to use the server default",
  show: "Show",
  hide: "Hide",
  keyWarning: "Do not save a real key on a shared device or public page.",
  clearKey: "Clear local key",
  saveConnection: "Save connection",
  status: "Status",
  statusConfigured: "Configured",
  statusNotConfigured: "Not configured",
  statusSaved: "Saved",
  testConnection: "Test connection",
  fetchServiceTitle: "Web scraping service",
  fetchServiceDesc:
    "For anti-bot sites (CSDN, Zhihu) or JS-rendered pages, fetch content via a third-party scraping service. Uses a free service by default — no signup needed. The key stays local and is sent once per request.",
  fetchProvider: "Fetch method",
  fetchKeyHelp: "Optional. With your own key, you get your own quota instead of sharing it.",
  fetchAutoHelp:
    "Auto: try a direct fetch first, then fall back to the free Jina Reader. No signup or key required — works out of the box.",
  fetchNeedKey: "This service requires an API key; without one it is skipped automatically.",
  testing: "Testing...",
  testOk: "Connected",
  testFail: "Failed",
  modelsAvailable: "models available",
  needApiKeyTitle: "Missing API key",
  needApiKeyDesc:
    "You enabled AI processing but no key is configured. Add an API key in settings first.",
};

export const dictionaries = { zh, en };

export function normalizeLanguage(lang) {
  if (lang === "zh" || lang === "zh-CN" || lang === "zh-Hans") return "zh";
  if (lang === "en" || lang === "en-US") return "en";
  return null;
}

export function getDictionary(lang) {
  return dictionaries[normalizeLanguage(lang)] || dictionaries[DEFAULT_LANGUAGE];
}

// 根据浏览器语言猜测初始语言，默认中文
export function detectLanguage() {
  if (typeof navigator === "undefined") return DEFAULT_LANGUAGE;
  const candidates = navigator.languages || [navigator.language];
  for (const c of candidates) {
    const normalized = normalizeLanguage(c);
    if (normalized) return normalized;
  }
  return DEFAULT_LANGUAGE;
}
