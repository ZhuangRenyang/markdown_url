// 书签（bookmarklet）端点：接收「用户已登录的浏览器」直接发来的页面 HTML，
// 在服务端转成 Markdown 后返回。这样抓取发生在用户自己的浏览器里（已带登录态），
// 服务端不再需要 Cookie / 环境变量，CSDN、知乎等反爬站也能转。
//
// 跨域说明：书签运行在文章页源站（如 blog.csdn.net），向本站发 POST 属于跨域请求，
// 因此必须返回 Access-Control-Allow-Origin，并处理 OPTIONS 预检。

import { htmlToMarkdown } from "./_scrapper";

export default async function handler(req, res) {
  // CORS：允许任意源（书签来自任意文章站点）
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 预检请求直接放行
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    let html = "";
    let url = "https://example.com/";
    let removeNonContent = true;

    const body = req.body;
    if (body && typeof body === "object") {
      html = typeof body.html === "string" ? body.html : "";
      if (typeof body.url === "string" && body.url.trim()) url = body.url.trim();
      if (typeof body.removeNonContent === "boolean") removeNonContent = body.removeNonContent;
    } else if (typeof body === "string") {
      // 兜底：整段当作 HTML
      html = body;
    }

    if (!html || html.trim().length < 50) {
      return res.status(400).send("缺少正文 HTML / Missing HTML body");
    }

    const md = htmlToMarkdown(html, url, removeNonContent);
    if (md.trim().length < 50) {
      return res
        .status(422)
        .send("正文提取失败：页面可能尚未渲染完成（纯 JS 应用），请等页面加载完再点一次书签。");
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(md);
  } catch (e) {
    console.error("fromhtml error:", e && e.message ? e.message : e);
    return res.status(500).send("转换失败：" + (e && e.message ? e.message : e));
  }
}

// 书签发来的完整页面 HTML 可能较大，这里把请求体上限放宽到 8MB
export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};
