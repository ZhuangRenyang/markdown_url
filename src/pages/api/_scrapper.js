// Import the necessary modules using ES6 import syntax
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { processMarkdownWithImages } from './_imgProcessor';
import fs from 'fs';
import { runGPT } from './_gpt';
import Showdown from 'showdown';
import { wrapInStyledHtml } from './_htmlwrap';
const gptModel = 'gpt-3.5-turbo-0125';
const gptModelBig = 'gpt-4-turbo-2024-04-09'
const browserFetchUrl = process.env.HTMLFETCH_API?`${process.env.HTMLFETCH_API}/?url=`:undefined;
const browserWSEndpoint = process.env.BROWSERLESS_KEY? `https://chrome.browserless.io?token=${process.env.BROWSERLESS_KEY}`:undefined;

// 抓取策略：
//   auto    （默认）先用普通 HTTP 请求，内容太少再回退到浏览器 —— 省浏览器额度
//   plain   只用普通 HTTP 请求，完全不启动浏览器（可以不用部署 Cloudflare Worker）
//   browser 只用浏览器渲染抓取（原来的行为，兼容性最好）
const FETCH_MODE = (process.env.FETCH_MODE || 'auto').toLowerCase();
// auto 模式下，普通请求抓出的正文少于这个字符数就认为「可能是 JS 渲染的空壳」，改用浏览器
const MIN_MARKDOWN_LENGTH = Number(process.env.MIN_MARKDOWN_LENGTH || 200);
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 15000);

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Puppeteer 只在浏览器抓取方案里才需要。Vercel 部署时通过 HTMLFETCH_API(Cloudflare Worker)
// 或 BROWSERLESS_KEY 抓取网页，因此这里改成按需加载，避免把 Chromium 打进函数包。
async function loadPuppeteer(){
  try {
    const mod = await import('puppeteer');
    return mod.default || mod;
  } catch (e) {
    throw new Error(
      '浏览器不可用 / No browser backend available. ' +
      '请配置 HTMLFETCH_API（Cloudflare Worker 地址）或 BROWSERLESS_KEY，' +
      '或者在容器里安装 puppeteer。若只想用普通 HTTP 请求，可设 FETCH_MODE=plain。' +
      'Original error: ' + e.message
    );
  }
}

// 普通 HTTP 请求：不消耗浏览器额度，速度快，但拿不到 JS 渲染后的内容
async function fetchHtmlPlain(url){
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

// 浏览器渲染抓取：Cloudflare Worker > Browserless > 本地 Puppeteer
let browser;
async function fetchHtmlWithBrowser(url){
  if (browserFetchUrl){
    console.log('[browser] 通过 Cloudflare Worker 抓取...');
    const resp = await fetch(`${browserFetchUrl}${url}`);
    if (!resp.ok){
      throw new Error(`Worker 抓取失败: HTTP ${resp.status}`);
    }
    return await resp.text();
  }

  console.log('[browser] 启动 Puppeteer...');
  if (!browser){
    const puppeteer = await loadPuppeteer();
    if (browserWSEndpoint){
      browser = await puppeteer.connect({browserWSEndpoint});
    }
    else{
      browser = await puppeteer.launch();
    }
  }
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle0' });
  const data = await page.content();
  await page.close();
  return data;
}

// HTML -> Markdown
function htmlToMarkdown(data, url, removeNonContent){
  const doc = new JSDOM(data, { url });
  const turndownService = new TurndownService();
  if (!removeNonContent){
    return turndownService.turndown(data);
  }
  const reader = new Readability(doc.window.document);
  const article = reader.parse();
  if (!article){
    throw new Error('无法提取正文（Readability 返回空）');
  }
  return turndownService.turndown(`<h1>${article.title}</h1>${article.content}`);
}

// Define the function using ES6 arrow function syntax
const fetchCleanMarkdownFromUrl = async (url, filePath, fetchImages = false, imgDirName = "images", imagesBasePathOverride = undefined, removeNonContent = true, applyGpt="", bigModel = false) => {
  try {
    let markdown;

    if (FETCH_MODE === 'browser'){
      const data = await fetchHtmlWithBrowser(url);
      markdown = htmlToMarkdown(data, url, removeNonContent);
    }
    else{
      let needBrowser = false;
      try {
        const data = await fetchHtmlPlain(url);
        markdown = htmlToMarkdown(data, url, removeNonContent);
        console.log(`[plain] 成功，正文 ${markdown.length} 字符`);
        if (FETCH_MODE === 'auto' && markdown.trim().length < MIN_MARKDOWN_LENGTH){
          console.log(`[plain] 正文不足 ${MIN_MARKDOWN_LENGTH} 字符，疑似需要 JS 渲染`);
          needBrowser = true;
        }
      } catch (e) {
        if (FETCH_MODE === 'plain'){
          throw new Error(
            `普通 HTTP 请求失败：${e.message}。` +
            '该网页可能需要 JS 渲染或拒绝了请求，可把 FETCH_MODE 改成 auto 或 browser 再试。'
          );
        }
        console.log(`[plain] 失败（${e.message}），改用浏览器`);
        needBrowser = true;
      }

      if (needBrowser){
        const data = await fetchHtmlWithBrowser(url);
        markdown = htmlToMarkdown(data, url, removeNonContent);
        console.log(`[browser] 成功，正文 ${markdown.length} 字符`);
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
      console.log("Applying GPT...");
      const instructions = applyGpt
      const gptResponse = await runGPT(bigModel?gptModelBig:gptModel, curMarkdown, instructions);
      markdown = gptResponse.content || markdown;
      fs.writeFileSync(filePath, markdown, 'utf8');
      // fs.writeFileSync(filePath.replace(".md", ".gpt.json"), JSON.stringify(gptResponse.changes), 'utf8');
    }

    // also save the markdown to html
    const converter = new Showdown.Converter();
    const html = converter.makeHtml(markdown);
    fs.writeFileSync(filePath.replace(".md", ".html"), wrapInStyledHtml(html), 'utf8');
  } catch (error) {
    console.error(`Error fetching clean markdown from URL: ${error.message}`);
    if (browser){
      try { browser.close(); } catch (e) { /* ignore */ }
      browser = null;
    }
    throw error;
  }
};

// Export the function as a default export
export default fetchCleanMarkdownFromUrl;
