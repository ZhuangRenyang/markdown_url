// 管理员设置预置 Cookie 的接口。
// GET  -> 返回当前是否已配置、掩码、是否在用默认口令（便于前端提示）。
// POST -> 校验口令后保存/清空服务端 Cookie（不进环境变量、不进 git）。
import {
  getServerCookie,
  hasServerCookie,
  setServerCookie,
  checkAdminPass,
  usingDefaultAdminPass,
  maskedCookie,
} from "@/lib/serverCookie";

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      configured: hasServerCookie(),
      masked: maskedCookie(),
      usingDefaultPass: usingDefaultAdminPass(),
    });
  }

  if (req.method === "POST") {
    const { passphrase, cookie } = req.body || {};
    if (!checkAdminPass(passphrase)) {
      return res.status(401).json({ ok: false, error: "口令错误 / Wrong passphrase" });
    }
    setServerCookie(cookie || "");
    return res.status(200).json({
      ok: true,
      configured: hasServerCookie(),
      masked: maskedCookie(),
    });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
