// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import fetchCleanMarkdownFromUrl from "./_scrapper";
import path from "path";
import os from "os";
import fs from "fs";
import archiver from "archiver";

export default async function handler(req, res) {
  // get params from body
  let { url, downloadImages, imagesDir, imagesBasePathOverride, removeNonContent, applyGpt, bigModel } = req.body;

  if (!url || typeof url !== 'string') {
    // 注意：必须 return，否则会拿着空 url 继续往下跑
    return res.status(400).send("Missing url parameter");
  }

  if (!/^https?:\/\//i.test(url)) {
      url = 'http://' + url;
  }

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
      bigModel === true
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
