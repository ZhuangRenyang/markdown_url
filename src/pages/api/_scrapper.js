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

// 第三方抓取兜底：Jina Reader（免费，https://r.jina.ai/<url>），把目标页转成 Markdown 返回。
// 服务端直抓被反爬拦（如 CSDN 521 / 知乎 403）或 SPA 拿不到正文时，用它再试一次。
// 可用环境变量 JINA_READER=off 关闭；JINA_API_KEY 可选（提高限速与稳定性）。
async function fetchMarkdownViaJina(url){
  if ((process.env.JINA_READER || '').toLowerCase() === 'off') return null;
  const endpoint = 'https://r.jina.ai/' + url;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.JINA_TIMEOUT_MS || 30000));
  try {
    console.log('[jina] 兜底：通过 Jina Reader 抓取...');
    const headers = { 'accept': 'text/plain' };
    if (process.env.JINA_API_KEY) headers['authorization'] = 'Bearer ' + process.env.JINA_API_KEY;
    const resp = await fetch(endpoint, { signal: controller.signal, headers });
    if (!resp.ok) {
      console.log(`[jina] 失败 HTTP ${resp.status}`);
      return null;
    }
    const md = await resp.text();
    // 命中反爬/失败页则视为无效
    if (!md || md.trim().length < MIN_CONTENT_LENGTH) return null;
    if (looksLikeAntiBotPage(md)) return null;
    console.log(`[jina] 成功，正文 ${md.length} 字符`);
    return md.trim();
  } catch (e) {
    console.log('[jina] 异常:', e && e.message ? e.message : e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Define the function using ES6 arrow function syntax
const fetchCleanMarkdownFromUrl = async (url, filePath, fetchImages = false, imgDirName = "images", imagesBasePathOverride = undefined, removeNonContent = true, applyGpt="", bigModel = false, aiConfig = {}, customHeaders = {}) => {
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
      // 直抓失败（反爬 5xx/403、SPA 空壳等）→ 自动改用 Jina Reader 兜底再试一次
      console.log(`[plain] 失败：${e.message}，尝试 Jina 兜底...`);
      const jinaMd = await fetchMarkdownViaJina(url);
      if (jinaMd) {
        markdown = jinaMd;
      } else {
        throw new Error(
          `抓取失败：${e.message}。` +
          '该网页可能需要 JS 渲染或拒绝了请求。'
        );
      }
    }

    if (markdown.trim().length < MIN_CONTENT_LENGTH){
      // 直抓得到的正文太短也走 Jina 兜底（SPA 常见）
      const jinaMd = await fetchMarkdownViaJina(url);
      if (jinaMd) {
        markdown = jinaMd;
      } else {
        throw new Error(
          '抓取到的正文太少（不足 ' + MIN_CONTENT_LENGTH + ' 字）。' +
          '该站点很可能是纯 JS 渲染（SPA），初始 HTML 里没有正文，普通 HTTP 请求拿不到。' +
          '建议：①换贴该站的 AMP 版 / RSS / 原文链接；②若是你自己的站点，确认服务端有预渲染。'
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
