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

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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
const fetchCleanMarkdownFromUrl = async (url, filePath, fetchImages = false, imgDirName = "images", imagesBasePathOverride = undefined, removeNonContent = true, applyGpt="", bigModel = false, aiConfig = {}) => {
  try {
    let markdown;

    try {
      const data = await fetchHtmlPlain(url);
      markdown = htmlToMarkdown(data, url, removeNonContent);
      console.log(`[plain] 成功，正文 ${markdown.length} 字符`);
    } catch (e) {
      throw new Error(
        `抓取失败：${e.message}。` +
        '该网页可能需要 JS 渲染或拒绝了请求。'
      );
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
