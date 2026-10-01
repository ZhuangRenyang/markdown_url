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

  applyGpt: "用 GPT 处理 Markdown",
  applyGptHelp:
    "用自定义指令，通过 GPT-3.5 进一步清洗或改写 Markdown 内容（需要配置 OPENAI_API_KEY）。",

  imageOptions: "图片选项",
  overrideImagesFolder: "自定义图片文件夹名称",
  overrideImagesFolderHelp: "覆盖默认的图片文件夹名称（仅在「下载图片」时生效）。",
  enterFolderName: "输入文件夹名称",
  overrideBasePath: "自定义 Markdown 中的图片路径前缀",
  overrideBasePathHelp:
    "覆盖 Markdown 中图片引用的路径前缀（仅在「下载图片」时生效）。",

  gptOptions: "GPT 选项",
  useGpt4: "使用 GPT-4（耗时更长）",
  gptPlaceholder: `给 GPT 的指令，例如：

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

  applyGpt: "Apply GPT Filter on Markdown",
  applyGptHelp:
    "Apply custom instructions to further clean up or transform the markdown content using GPT-3.5 (requires OPENAI_API_KEY).",

  imageOptions: "Image Options",
  overrideImagesFolder: "Override Images Folder Name",
  overrideImagesFolderHelp:
    "Override the default folder name for images (Only used when downloading images).",
  enterFolderName: "Enter folder name",
  overrideBasePath: "Override base path for images in markdown",
  overrideBasePathHelp:
    "Override the base path for linked images in markdown (Only used when downloading images).",

  gptOptions: "GPT Options",
  useGpt4: "Use GPT4 (takes longer)",
  gptPlaceholder: `Instructions for GPT like:

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
