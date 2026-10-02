// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import fetchCleanMarkdownFromUrl from "./_scrapper";
import path from "path";
import os from "os";
import fs from "fs";
import archiver from "archiver";
import { decryptCookie } from "@/lib/cookieVault";

// 轻量 SSRF 防护：挡掉内网 / 保留地址与非常规协议。
// 注：只校验 hostname 字面量，未做 DNS 解析后二次校验（防 DNS 重绑需要解析 + 比对 IP，
// 在 Serverless 里成本较高），对个人自用已是足够的正向防御。
function isBlockedUrl(target) {
  let u;
  try {
    u = new URL(target);
  } catch {
    return true;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.internal') || host.endsWith('.local')) return true;
  if (host === 'metadata' || host === 'metadata.google.internal') return true;
  if (/^\[?::1\]?$/.test(host) || host.startsWith('fe80')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const p = host.split('.').map(Number);
    if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] >= 224) return true;
  }
  return false;
}

// 把前端传入的 Cookie / 自定义请求头整理成 fetch 可用的 headers 对象。
// 仅用于本次抓取请求，不写入日志、不落服务器。
function buildCustomHeaders(cookie, customHeaders) {
  const h = {};
  if (cookie && typeof cookie === 'string' && cookie.trim()) {
    h['cookie'] = cookie.trim();
  }
  if (customHeaders && typeof customHeaders === 'object') {
    for (const [k, v] of Object.entries(customHeaders)) {
      if (typeof v === 'string' && v.trim()) {
        h[String(k).toLowerCase()] = v.trim();
      }
    }
  }
  return h;
}

export default async function handler(req, res) {
  // get params from body
  let { url, downloadImages, imagesDir, imagesBasePathOverride, removeNonContent, applyGpt, bigModel, cookie, customHeaders, restoreToken } = req.body;

  if (!url || typeof url !== 'string') {
    // 注意：必须 return，否则会拿着空 url 继续往下跑
    return res.status(400).send("Missing url parameter");
  }

  if (!/^https?:\/\//i.test(url)) {
      url = 'http://' + url;
  }

  // SSRF 防护：挡掉内网 / 保留地址
  if (isBlockedUrl(url)) {
    return res.status(400).send("目标地址不被允许 / Target URL not allowed");
  }

  // 用户在前端设置里填的凭据（每次请求随请求头带来，不落服务器）
  const aiConfig = {
    apiKey: req.headers["x-api-key"],
    baseURL: req.headers["x-base-url"],
    model: req.headers["x-model"],
  };

  // SSRF 防护：AI 中转地址也不能指向内网
  if (aiConfig.baseURL && isBlockedUrl(aiConfig.baseURL)) {
    return res.status(400).send("Base URL 不被允许 / Base URL not allowed");
  }

  // 反爬站点（如 CSDN）需要登录态：优先用明文 cookie；否则尝试用「恢复链接」token 解密复用
  if ((!cookie || !cookie.trim()) && restoreToken) {
    try {
      cookie = decryptCookie(restoreToken);
    } catch (e) {
      return res.status(400).send("恢复凭据无效 / Invalid restore token");
    }
  }
  const headersForFetch = buildCustomHeaders(cookie, customHeaders);

  console.log(`Fetching ${url}`);
  // random tmp folder in tmp directory
  const folder = path.join(os.tmpdir(), `markdd-${Math.random().toString(36).substring(7)}`);
  try {
    fs.mkdirSync(folder, { recursive: true });
  } catch (e) {
    console.log(e);
  }

  // 用完必须删掉临时目录，否则每次请求都会在 /tmp 里留一份，久了会撑爆磁盘
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      fs.rmSync(folder, { recursive: true, force: true });
    } catch (e) {
      console.log('清理临时目录失败:', e.message);
    }
  };

  try {
    const md = await fetchCleanMarkdownFromUrl(
      url,
      `${folder}/index.md`,
      downloadImages === true,
      imagesDir || "images",
      imagesBasePathOverride,
      removeNonContent === true,
      applyGpt,
      bigModel === true,
      aiConfig,
      headersForFetch
    );

    if (downloadImages === true){
      // Set the headers to indicate a file download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=markdd.zip');

      const archive = archiver('zip', {
        zlib: { level: 9 } // Compression level
      });

      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn(err);
        } else {
          throw err;
        }
      });
      archive.on('error', (err) => {
        throw err;
      });

      // 等 zip 真正写完再删临时目录，否则包里会是空的
      archive.on('end', cleanup);
      res.on('close', cleanup);

      archive.pipe(res);
      archive.directory(folder, false);
      archive.finalize();
    }
    else{
      res.setHeader("Content-Type", "text/plain");
      res.send(md);
      cleanup();
    }
  } catch (error) {
    console.error('转换失败:', error.message);
    cleanup();
    if (!res.headersSent){
      res.status(500).send(error.message || 'Conversion failed');
    }
  }
}

// Vercel 免费版(Hobby)上限 60 秒，Pro/Enterprise 可改到 300 秒
export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
