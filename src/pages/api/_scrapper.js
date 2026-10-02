// Import the necessary modules using ES6 import syntax
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { processMarkdownWithImages } from './_imgProcessor';
import fs from 'fs';
import { runGPT } from './_gpt';
import Showdown from 'showdown';
import { wrapInStyledHtml } from './_htmlwrap';

// 模型可用环境变量覆盖，默认用 apihub 上可用的 agnes-3.0-flash
const gptModel = process.env.OPENAI_MODEL || 'agnes-3.0-flash';
const gptModelBig = process.env.OPENAI_MODEL_BIG || process.env.OPENAI_MODEL || 'agnes-3.0-flash';

// 抓取策略：只用普通 HTTP 请求，不启动任何浏览器（最简单、零额外依赖）
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 15000);
// 抓到的正文少于这个字符数，认为「可能是 JS 渲染的空壳」，给明确提示而不是返回空结果
const MIN_CONTENT_LENGTH = Number(process.env.MIN_CONTENT_LENGTH || 200);

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// 普通 HTTP 请求：不消耗浏览器额度，速度快，但拿不到 JS 渲染后的内容
// customHeaders：用户在前端「高级选项」传入的 Cookie / 自定义请求头（用于绕过 CSDN 等反爬）
async function fetchHtmlPlain(url, customHeaders = {}){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    console.log('[plain] 普通 HTTP 请求抓取...');
    const resp = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': BROWSER_UA,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        ...customHeaders,
      },
    });
    if (!resp.ok){
      throw new Error(`HTTP ${resp.status}`);
    }
    const contentType = resp.headers.get('content-type') || '';
    if (contentType && !/text\/html|application\/xhtml|text\/plain|application\/json/i.test(contentType)){
      console.log(`[plain] 提示：返回类型是 ${contentType}，可能不是网页`);
    }
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

// 反爬验证页识别：CSDN、知乎等会返回「请进行安全验证」之类的人机验证页。
// 此时服务端没有下发正文，必须带登录态（Cookie）才能拿到文章。
function looksLikeAntiBotPage(html){
  return /请进行安全验证|Security Verification|人机验证|访问验证|verify you are human|checking your browser/i.test(html);
}

// 站点模板优先识别：部分站点的「正文容器」有固定 class（如 VuePress 的 theme-default-content、
// CSDN 的 content_views）。直接定位比交给 Readability 自动判断更稳，能避免把目录/侧边栏误判为正文。
function extractMainContainer(document){
  const candidates = [
    'div.theme-default-content', // VuePress 文档站（如 pdai.tech）
    'div#content_views',         // CSDN 新版博客正文
    'div.blog-content-box',      // CSDN 旧版
    'article',
    'main',
    '.post-content',
    '.article-content',
    '.markdown-body',
  ];
  for (const sel of candidates){
    const el = document.querySelector(sel);
    if (el && (el.textContent || '').trim().length > 200){
      return el;
    }
  }
  return null;
}

// 还原懒加载图片并解析成绝对地址，这样 Turndown 能抓到真实链接、_imgProcessor 也能下载。
// 纯 DOM 操作，不需要浏览器。
function normalizeImages(doc, baseUrl){
  const resolve = (val) => {
    if (!val) return val;
    try { return new URL(val, baseUrl).href; } catch { return val; }
  };
  const normSrcset = (ss) => ss.split(',').map((s) => {
    const parts = s.trim().split(/\s+/);
    const u = parts.shift();
    return parts.length ? `${resolve(u)} ${parts.join(' ')}` : resolve(u);
  }).join(', ');

  doc.querySelectorAll('img').forEach((img) => {
    const curSrc = img.getAttribute('src') || '';
    const isPlaceholder = !curSrc || /^data:/i.test(curSrc);
    const real = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src');
    if (real && isPlaceholder){
      // 懒加载占位图 + data-src：用真实地址替换
      img.setAttribute('src', resolve(real));
    } else if (curSrc && !/^https?:/i.test(curSrc) && !/^data:/i.test(curSrc)){
      // 相对地址（非 data:）：解析成绝对地址，否则 _imgProcessor 不会下载
      img.setAttribute('src', resolve(curSrc));
    }
    if (img.getAttribute('srcset')){
      img.setAttribute('srcset', normSrcset(img.getAttribute('srcset')));
    }
    const lazySrcset = img.getAttribute('data-srcset') || img.getAttribute('data-originalset');
    if (lazySrcset && !img.getAttribute('srcset')){
      img.setAttribute('srcset', normSrcset(lazySrcset));
    }
    // 只有 srcset 没有 src 时，从 srcset 取第一张补上 src
    if (!img.getAttribute('src') && img.getAttribute('srcset')){
      const first = img.getAttribute('srcset').split(',')[0].trim().split(/\s+/)[0];
      if (first) img.setAttribute('src', first);
    }
  });

  doc.querySelectorAll('source').forEach((s) => {
    const raw = s.getAttribute('data-srcset') || s.getAttribute('data-src') || s.getAttribute('srcset');
    if (raw){
      s.setAttribute('srcset', normSrcset(raw));
    }
  });
}

// HTML -> Markdown
export function htmlToMarkdown(data, url, removeNonContent){
  const dom = new JSDOM(data, { url });
  const document = dom.window.document;
  normalizeImages(document, url);
  const turndownService = new TurndownService();
  if (!removeNonContent){
    return turndownService.turndown(document.body.innerHTML);
  }
  // 先尝试已知站点模板容器，命中就直接用它，避开 Readability 的误判
  const container = extractMainContainer(document);
  if (container){
    const title = document.title || '';
    return turndownService.turndown(`<h1>${title}</h1>${container.innerHTML}`);
  }
  // 回退到 Readability
  const reader = new Readability(document);
  const article = reader.parse();
  if (!article){
    throw new Error('无法提取正文（Readability 返回空）');
  }
  return turndownService.turndown(`<h1>${article.title}</h1>${article.content}`);
}

// ================= 第三方抓取兜底服务链 =================
// 服务端直抓被反爬拦（CSDN 521 / 知乎 403）或 SPA 拿不到正文时，依次尝试下列服务。
// key 的来源优先级：① 用户在前端设置里填的（随请求传来）② 服务端环境变量（部署方兜底）。
// 用户选了具体某个服务时，就只用那一个；选 auto 才按顺序全试一遍。
// 关闭某个服务可设环境变量 <NAME>=off。

// 通用：把第三方返回的文本当 Markdown 校验（长度 + 反爬页）
function validThirdPartyMarkdown(md){
  if (!md) return null;
  const t = String(md).trim();
  if (t.length < MIN_CONTENT_LENGTH) return null;
  if (looksLikeAntiBotPage(t)) return null;
  return t;
}

// Jina Reader 会在正文前加一段「信封」元信息，例如：
//   Title: xxx
//   URL Source: https://...
//   Published Time: 2025-03-12T17:42:27+08:00
//   Markdown Content:
//   <正文开始>
// 这段不是文章内容，必须剥掉，否则会混进最终结果。
function stripJinaEnvelope(md){
  let t = String(md || '').replace(/^\uFEFF/, '');
  // 只在前 40 行里找「Markdown Content:」这一行，找到就丢掉它及之前的所有内容
  const lines = t.split('\n');
  const limit = Math.min(lines.length, 40);
  for (let i = 0; i < limit; i++){
    if (/^\s*Markdown Content:\s*$/i.test(lines[i])){
      return lines.slice(i + 1).join('\n').trim();
    }
  }
  // 没有信封分隔行时，至少把开头的 Title:/URL Source:/Published Time: 逐行去掉
  while (lines.length && /^\s*(Title:|URL Source:|Published Time:|Image \d+:)\s*/i.test(lines[0])){
    lines.shift();
  }
  return lines.join('\n').trim();
}

// 已知站点的「正文容器」CSS 选择器。
// 命中时交给 Jina 的 x-target-selector 直接锁定正文，比事后文本清洗可靠得多。
function pickTargetSelector(url){
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch { return null; }
  if (host.endsWith('csdn.net')) return '#content_views';
  if (host.endsWith('zhihu.com')) return '.RichText, .Post-RichTextContainer';
  if (host.endsWith('juejin.cn')) return '#article-root, .article-viewer';
  if (host.endsWith('cnblogs.com')) return '#cnblogs_post_body';
  if (host.endsWith('segmentfault.com')) return '.article';
  if (host.endsWith('jianshu.com')) return 'article';
  if (host.endsWith('51cto.com')) return '.article-content, #content';
  return null;
}

// 第三方服务（尤其 Jina）返回的是「整页」Markdown，可能包含导航栏、推荐阅读等噪音。
// 这里做**保守**的文本级净化：只剔除「明确无疑」的噪音，绝不冒险裁剪正文。
//
// 教训：曾用「找尾部标记往前切」的激进做法，结果 CSDN 页面里 `版权声明` 出现在
// 正文之前，导致正文被整段切掉（只剩 549 字符）。所以现在只做逐行级过滤，
// 不做大段裁剪；正文定位交给 Jina 的 x-target-selector。
export function refineThirdPartyMarkdown(md, url){
  let t = stripJinaEnvelope(md);

  const lines = t.split('\n');

  // 只丢「整行就是站点导航/交互」的短行，且要求该行不含中文正文特征（较长的句子）
  const NOISE_LINE = /^\s*(\[?搜索\]?|登录|注册|立即登录|消息|创作中心|创作|关注|点赞|踩|收藏|评论|分享|目录|扫码关注|微信公众号|客服|返回顶部|下载APP|毕业设计|作业解答|AI编程|提问|取消|确定|补充说明（选填）|登录后您可以|未登录|会员·新人礼包|最新推荐文章于|本内容遵循|小编推荐)\s*$/;

  const kept = [];
  for (const line of lines){
    if (NOISE_LINE.test(line)) continue;
    // 整行只由「本页自链接」构成 → 站点导航残留，丢弃
    const onlySelfLinks = /^[\s*\-•·]*(\[[^\]]*\]\([^)]*\)[\s,·]*)+$/.test(line) &&
      /blog\.csdn\.net\/[^)]*\/article\/details|csdnimg\.cn|csdn\.net\/vip|mall\.csdn\.net|g\.csdnimg\.cn|link\.csdn\.net|i\.csdn\.net|mp\.csdn\.net/i.test(line);
    if (onlySelfLinks) continue;
    kept.push(line);
  }

  const cleaned = kept.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s*\n+/, '')
    .trim();

  const result = validThirdPartyMarkdown(cleaned);
  if (result){
    console.log(`[refine] 净化：${String(md).length} → ${result.length} 字符`);
    return result;
  }
  // 净化的结果太短说明误删了，退回只剥信封的版本
  console.log('[refine] 净化后内容过少，退回未净化版本');
  return stripJinaEnvelope(md);
}

// 用统一的超时 fetch 拉文本
async function fetchTextWithTimeout(endpoint, headers, timeoutMs){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(endpoint, { signal: controller.signal, headers });
    if (!resp.ok) {
      console.log(`[fetch] ${endpoint.slice(0,60)} HTTP ${resp.status}`);
      return null;
    }
    return await resp.text();
  } catch (e) {
    console.log(`[fetch] ${endpoint.slice(0,60)} 异常:`, e && e.message ? e.message : e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// 带重试的版本：免费服务（尤其 Jina）首次请求常因冷启动/限速失败，
// 多试一次能显著提高成功率。只在「拿不到东西」时重试，HTTP 4xx 这类硬失败不重试。
async function fetchTextWithRetry(endpoint, headers, timeoutMs, attempts = 2){
  for (let i = 1; i <= attempts; i++) {
    const raw = await fetchTextWithTimeout(endpoint, headers, timeoutMs);
    if (raw) return raw;
    if (i < attempts) {
      console.log(`[fetch] 第 ${i} 次无结果，稍后重试...`);
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  return null;
}

// 1) Jina Reader（免费，无 key 也能用；有 key 额度更高）
// 这是「自动」模式下的默认免费兜底，所以额外做一次重试。
// Jina 默认会跑一遍它自己的 Readability 过滤，但对部分站点（如 CSDN）会失效，
// 导航栏、推荐位仍会混进来。这里用 x-target-selector 显式指向已知的正文容器，
// 用 x-remove-selector 先删掉明显噪音，再用 x-respond-with 保留它自己的过滤。
async function fetchMarkdownViaJina(url, userKey){
  if ((process.env.JINA_READER || '').toLowerCase() === 'off') return null;
  const headers = { 'accept': 'text/plain' };
  const key = userKey || process.env.JINA_API_KEY;
  if (key) headers['authorization'] = 'Bearer ' + key;

  // 已知站点的正文容器：命中就直接锁定，避免把导航/侧栏当成正文
  const target = pickTargetSelector(url);
  if (target) {
    headers['x-target-selector'] = target;
    console.log(`[jina] 指定正文容器：${target}`);
  }
  // 常见的站点外围元素，先删掉能显著降低噪音
  headers['x-remove-selector'] =
    'nav, header, footer, aside, .sidebar, #nav, #footer, #csdn-toolbar, ' +
    '.toolbar, .recommend-box, .recommend, #recommend, .article-info-box, ' +
    '.blog-footer, .hide-article-box, .passport-login-container';

  const raw = await fetchTextWithRetry(
    'https://r.jina.ai/' + url,
    headers,
    Number(process.env.JINA_TIMEOUT_MS || 30000),
    2
  );
  const valid = validThirdPartyMarkdown(raw);
  if (!valid) return null;
  // 指定了容器时结果已相当干净，只需剥信封；没指定则做文本级净化
  const md = target ? (validThirdPartyMarkdown(stripJinaEnvelope(valid)) || valid)
                    : refineThirdPartyMarkdown(valid, url);
  if (md) console.log(`[jina] 成功，正文 ${md.length} 字符`);
  return md;
}

// 2) ScraperAPI（免费 5000/月，需 key）
async function fetchMarkdownViaScraperAPI(url, userKey){
  const key = userKey || process.env.SCRAPERAPI_KEY;
  if (!key || key.toLowerCase() === 'off') return null;
  const endpoint = `https://api.scraperapi.com/?api_key=${encodeURIComponent(key)}&url=${encodeURIComponent(url)}`;
  const raw = await fetchTextWithRetry(endpoint, {}, Number(process.env.SCRAPERAPI_TIMEOUT_MS || 40000), 2);
  if (!raw) return null;
  // 该服务返回 HTML，用本地逻辑转 MD
  try {
    const md = htmlToMarkdown(raw, url, true);
    const ok = validThirdPartyMarkdown(md);
    if (ok) console.log(`[scraperapi] 成功，正文 ${ok.length} 字符`);
    return ok;
  } catch (e) {
    console.log('[scraperapi] 转换失败:', e.message);
    return null;
  }
}

// 3) ScrapingAnt（免费 10000/月，需 key）
async function fetchMarkdownViaScrapingAnt(url, userKey){
  const key = userKey || process.env.SCRAPINGANT_KEY;
  if (!key || key.toLowerCase() === 'off') return null;
  const endpoint = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(url)}&x-api-key=${encodeURIComponent(key)}`;
  const raw = await fetchTextWithRetry(endpoint, {}, Number(process.env.SCRAPINGANT_TIMEOUT_MS || 40000), 2);
  if (!raw) return null;
  try {
    const md = htmlToMarkdown(raw, url, true);
    const ok = validThirdPartyMarkdown(md);
    if (ok) console.log(`[scrapingant] 成功，正文 ${ok.length} 字符`);
    return ok;
  } catch (e) {
    console.log('[scrapingant] 转换失败:', e.message);
    return null;
  }
}

const PROVIDER_MAP = {
  jina: fetchMarkdownViaJina,
  scraperapi: fetchMarkdownViaScraperAPI,
  scrapingant: fetchMarkdownViaScrapingAnt,
};
// auto 模式的尝试顺序：免费且无需 key 的 Jina 排第一，保证「默认免费、开箱即用」。
// 后两个需要部署方配了 key 或用户自带 key 才真正生效，否则会立刻跳过。
const PROVIDER_ORDER = ['jina', 'scraperapi', 'scrapingant'];

// 抓取服务调度：
// - providerConfig.provider 指定了某个服务 → 只用它（用户自带的 key 优先）
// - auto / 未指定 → 按顺序把所有可用的服务试一遍，谁先成功用谁
// 返回第一个成功的 Markdown；全失败返回 null
async function fetchMarkdownViaFallbacks(url, providerConfig){
  const wanted = providerConfig && providerConfig.provider;
  const userKey = (providerConfig && providerConfig.key) || '';

  const list = (wanted && wanted !== 'auto' && PROVIDER_MAP[wanted])
    ? [[wanted, PROVIDER_MAP[wanted]]]
    : PROVIDER_ORDER.map((name) => [name, PROVIDER_MAP[name]]);

  for (const [name, fn] of list) {
    try {
      console.log(`[fallback] 尝试 ${name} ...`);
      const md = await fn(url, userKey);
      if (md) return md;
    } catch (e) {
      console.log(`[fallback] ${name} 异常:`, e && e.message ? e.message : e);
    }
  }
  return null;
}

// Define the function using ES6 arrow function syntax
const fetchCleanMarkdownFromUrl = async (url, filePath, fetchImages = false, imgDirName = "images", imagesBasePathOverride = undefined, removeNonContent = true, applyGpt="", bigModel = false, aiConfig = {}, customHeaders = {}, providerConfig = {}) => {
  try {
    let markdown;

    try {
      const data = await fetchHtmlPlain(url, customHeaders);
      // 反爬验证页：明确报错，提示用户带登录 Cookie
      if (looksLikeAntiBotPage(data)){
        throw new Error(
          '抓取到的页面是反爬验证页（如 CSDN 的「请进行安全验证」）。' +
          '该站点拦截了无登录态的请求，请登录后在「高级选项」中粘贴 Cookie 再转换。'
        );
      }
      markdown = htmlToMarkdown(data, url, removeNonContent);
      console.log(`[plain] 成功，正文 ${markdown.length} 字符`);
    } catch (e) {
      // 直抓失败（反爬 5xx/403、SPA 空壳等）→ 自动走第三方抓取服务再试
      console.log(`[plain] 失败：${e.message}，尝试第三方服务...`);
      const fbMd = await fetchMarkdownViaFallbacks(url, providerConfig);
      if (fbMd) {
        markdown = fbMd;
      } else {
        throw new Error(
          `抓取失败：${e.message}。` +
          '该网页可能需要 JS 渲染或拒绝了请求。可到右上角「设置」里切换抓取服务并填入对应 API 密钥。'
        );
      }
    }

    if (markdown.trim().length < MIN_CONTENT_LENGTH){
      // 直抓得到的正文太短也走第三方服务（SPA 常见）
      const fbMd = await fetchMarkdownViaFallbacks(url, providerConfig);
      if (fbMd) {
        markdown = fbMd;
      } else {
        throw new Error(
          '抓取到的正文太少（不足 ' + MIN_CONTENT_LENGTH + ' 字）。' +
          '该站点很可能是纯 JS 渲染（SPA），初始 HTML 里没有正文，普通 HTTP 请求拿不到。' +
          '建议：①到「设置」里切换抓取服务并填密钥；②换贴该站的 AMP 版 / RSS / 原文链接。'
        );
      }
    }

    fs.writeFileSync(filePath, markdown, 'utf8');
    if (!fetchImages){
      return markdown;
    }
    
    // move images to local
    console.log("Moving images to local...");
    await processMarkdownWithImages(filePath, imgDirName, imagesBasePathOverride);
    // Apply GPT if requested
    if (applyGpt){
      const curMarkdown = fs.readFileSync(filePath, "utf8");
      console.log("Applying AI...");
      const instructions = applyGpt
      // 用户在前端填的模型和接口优先，其次才是服务端环境变量
      const model = aiConfig.model || (bigModel ? gptModelBig : gptModel);
      const gptResponse = await runGPT(model, curMarkdown, instructions, aiConfig);
      markdown = gptResponse.content || markdown;
      fs.writeFileSync(filePath, markdown, 'utf8');
    }

    // also save the markdown to html
    const converter = new Showdown.Converter();
    const html = converter.makeHtml(markdown);
    fs.writeFileSync(filePath.replace(".md", ".html"), wrapInStyledHtml(html), 'utf8');
  } catch (error) {
    console.error(`Error fetching clean markdown from URL: ${error.message}`);
    throw error;
  }
};

// Export the function as a default export
export default fetchCleanMarkdownFromUrl;
