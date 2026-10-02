// Next.js API route: 把明文 Cookie 加密成「恢复 token」，不落盘、无状态。
// 前端拿到 token 后构造 /?restore=<token> 链接，发给手机点开即自动配置。
import { encryptCookie } from "@/lib/cookieVault";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const cookie = (req.body && req.body.cookie) || "";
  if (typeof cookie !== "string" || !cookie.trim()) {
    return res.status(400).json({ error: "cookie 为空" });
  }
  const restoreToken = encryptCookie(cookie.trim());
  return res.json({ restoreToken });
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};
