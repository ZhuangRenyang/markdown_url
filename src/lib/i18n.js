// 界面文案字典：中文 / 英文
// 新增文案时，请同时在 zh 与 en 两份里补齐，否则会回退到英文。

export const DEFAULT_LANGUAGE = "zh";

export const SUPPORTED_LANGUAGES = [
  { code: "zh", label: "中文", short: "中", htmlLang: "zh-CN" },
  { code: "en", label: "English", short: "EN", htmlLang: "en" },
];

const zh = {
  langName: "中文",
  switchTo: "English",

  title: "MarkdownDown",
  subtitle: "把任意网页转成干净的 Markdown",
  subtitle2: "图片可一并打包下载",

  urlPlaceholder: "粘贴网页地址，例如 https://example.com",
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

  // 高级选项：反爬站点（如 CSDN）需要登录态才能抓取
  advancedOptions: "高级选项",
  advancedOptionsHelp:
    "用于需要登录态的站点（如 CSDN）。登录后复制 Cookie 粘贴此处，即可绕过反爬验证页。",
  cookieLabel: "自定义请求头 / Cookie",
  cookiePlaceholder: "粘贴 Cookie，例如 uuid_tt_dd=...; token=...",
  cookieHelp:
    "仅本次请求使用，不会保存到服务器。Cookie 含登录凭证，请勿在公开设备填写。",

  // 书签工具：在已登录文章页点一下即可转换，无需 cookie / 环境变量
  bookmarkletTitle: "书签工具",
  bookmarkletHelp:
    "在已登录的文章页点一下书签即可转换，彻底免去复制 Cookie 和配置环境变量。适合 CSDN、知乎等反爬站点。",
  bookmarkletDesc:
    "把下面的书签拖到浏览器收藏栏。转换时打开那篇文章（已登录），点一下书签即可生成 Markdown——无需懂 Cookie、无需配置任何变量。若在本工具页点书签，会自动帮你打开输入框里粘贴的文章链接。",
  bookmarkletDrag: "拖我到收藏栏 / 点我转换",
  bookmarkletDragHint: "把此链接拖到书签栏；或右键收藏。以后在文章页点它即可转换。",
  bookmarkletCopyBtn: "复制书签代码",
  bookmarkletCopied: "已复制书签代码",
  bookmarkletCopyFail: "复制失败，请手动复制上方链接。",
  bookmarkletUsage:
    "用法：①把上面的「🔖」拖进收藏栏（手机可长按链接→添加书签）；②输入框粘贴文章链接后点书签，会自动打开文章页；③在文章页再点一次书签，即可在新标签页生成 Markdown，可复制或下载。",

  // Cookie 保险箱 / 恢复链接：填一次，手机免粘贴
  generateRestoreBtn: "生成恢复链接",
  generating: "生成中...",
  restoreReady: "已就绪",
  restoreLinkTitle: "恢复链接已生成并复制",
  restoreLinkDesc: "把链接发到手机，用手机打开即可自动配置，之后转换免粘贴 Cookie。",
  restoreLinkHint: "把下面链接发到手机打开（已自动复制）：",
  restoreGenFail: "生成失败，请重试。",
  invalidCookieTitle: "请先填写 Cookie",
  invalidCookieDesc: "要生成恢复链接，请先在上方粘贴 CSDN 的 Cookie。",

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
  testing: "测试中...",
  testOk: "连接成功",
  testFail: "连接失败",
  modelsAvailable: "个可用模型",
  needApiKeyTitle: "缺少 API 密钥",
  needApiKeyDesc:
    "勾选了「用 AI 处理 Markdown」，但还没配置密钥。请在设置里填写 API 密钥后再试。",

  footerMadeBy: "由",
};

const en = {
  langName: "English",
  switchTo: "中文",

  title: "MarkdownDown",
  subtitle: "Convert any webpage to a clean markdown",
  subtitle2: "w/ images downloaded.",

  urlPlaceholder: "Paste a webpage URL, e.g. https://example.com",
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

  // Advanced options: anti-bot sites (e.g. CSDN) need login state to fetch
  advancedOptions: "Advanced",
  advancedOptionsHelp:
    "For sites that require login (e.g. CSDN). Paste the Cookie after logging in to bypass the anti-bot verification page.",
  cookieLabel: "Custom headers / Cookie",
  cookiePlaceholder: "Paste cookie, e.g. uuid_tt_dd=...; token=...",
  cookieHelp:
    "Used only for this request, never stored on the server. Contains login credentials — don't enter on shared devices.",

  // Bookmarklet: one click on any logged-in article page, no cookie / no env vars
  bookmarkletTitle: "Bookmarklet",
  bookmarkletHelp:
    "One click on any logged-in article page converts it — no cookie copy, no env vars. Great for anti-bot sites like CSDN or Zhihu.",
  bookmarkletDesc:
    "Drag the bookmarklet below to your bookmarks bar. Open the article (logged in) and click it to get Markdown — no cookie knowledge, no env config. If you click it on this tool page, it will open the article URL from the input box for you.",
  bookmarkletDrag: "Drag me to bookmarks / Click to convert",
  bookmarkletDragHint: "Drag this link to your bookmarks bar, or right-click to bookmark. Click it on any article page to convert.",
  bookmarkletCopyBtn: "Copy bookmarklet",
  bookmarkletCopied: "Bookmarklet copied",
  bookmarkletCopyFail: "Copy failed, please copy the link above manually.",
  bookmarkletUsage:
    "How: ① drag the 🔖 into your bookmarks bar (on mobile, long-press the link → add bookmark); ② paste the article URL and click the bookmark — the article opens automatically; ③ click the bookmark again on the article page — Markdown opens in a new tab.",

  // Cookie vault / restore link: set once, no paste on phone
  generateRestoreBtn: "Generate restore link",
  generating: "Generating...",
  restoreReady: "Ready",
  restoreLinkTitle: "Restore link generated & copied",
  restoreLinkDesc:
    "Send the link to your phone, open it there to auto-configure. No more pasting cookie on mobile.",
  restoreLinkHint: "Send this link to your phone (already copied):",
  restoreGenFail: "Generation failed, please retry.",
  invalidCookieTitle: "Cookie required first",
  invalidCookieDesc: "To generate a restore link, paste the CSDN cookie above first.",

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
  testing: "Testing...",
  testOk: "Connected",
  testFail: "Failed",
  modelsAvailable: "models available",
  needApiKeyTitle: "Missing API key",
  needApiKeyDesc:
    "You enabled AI processing but no key is configured. Add an API key in settings first.",

  footerMadeBy: "Made by",
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
