import fs from "fs";
import path from "path";
import pReplace from "string-replace-async";
import crypto from "crypto";

const IMG_FETCH_TIMEOUT_MS = Number(process.env.IMG_FETCH_TIMEOUT_MS || 15000);
// 单张图片上限，默认 10MB，避免遇到超大图把内存/磁盘吃光
const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES || 10 * 1024 * 1024);
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function sha1(str) {
  const hash = crypto.createHash("sha1");
  hash.update(str);
  return hash.digest("hex");
}

async function downloadImage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMG_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": BROWSER_UA },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new Error(`图片超过 ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB`);
    }
    return buffer;
  } finally {
    clearTimeout(timer);
  }
}

export async function processMarkdownWithImages(filePath, imgDirName, imagesBasePathOverride) {
  console.log(`Processing: ${filePath}`);
    const content = fs.readFileSync(filePath, "utf8");
    const { dir: fileDir } = path.parse(filePath);
    const imagesDir = `${fileDir || "."}/${imgDirName}`;
    try {
      fs.mkdirSync(imagesDir, { recursive: true });
    } catch (e) {
      // 目录创建失败直接报错，绝不能 process.exit —— 那会把整个服务进程杀掉
      if (e.code !== "EEXIST") {
        throw new Error(`无法创建图片目录 ${imagesDir}: ${e.message}`);
      }
    }

    const transformed = await pReplace(
      content,
      /!\[[^\]]*\]\(([^)]*)\)/g,
      async (match, url, ...rest) => {
        if (!/^http/.test(url)) {
          // ignore local images
          return match;
        }
        const cleanUrl = url.split(/[?#]/)[0];
        const imgName = `${sha1(url)}${path.extname(cleanUrl)}`
        const destImagePath = `${imagesDir}/${imgName}`;
        if (await checkFileExists(destImagePath)) {
          console.log(`Skipping: ${url} (already exists)`);
          if (imagesBasePathOverride){
            return match.replace(url, `${imagesBasePathOverride}${imgName}`)
          }
          return match.replace(url, `./${path.relative(fileDir, destImagePath)}`);
        }

        let buffer;
        try {
          console.log(`Downloading: ${url} to ${destImagePath}`);
          buffer = await downloadImage(url);
        } catch (e) {
          // 单张图片失败不该让整篇文章转换失败，保留原来的远程链接
          console.log(`图片下载失败，保留远程链接: ${url} (${e.message})`);
          return match;
        }

        fs.writeFileSync(destImagePath, buffer, "binary");

        if (imagesBasePathOverride){
          return match.replace(url, `${imagesBasePathOverride}${imgName}`)
        }
        return match.replace(url, `./${path.relative(fileDir, destImagePath)}`);
      }
    );
    fs.writeFileSync(filePath, transformed, "utf8");
}

async function checkFileExists(file) {
  return fs.promises
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}
