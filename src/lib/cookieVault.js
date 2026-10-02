// 无状态 Cookie 保险箱：把用户的 CSDN Cookie 加密成一个 token（恢复链接）。
// 服务端不落盘、不存储任何会话，token 本身就是加密后的 Cookie 密文。
// 密钥来自环境变量 COOKIE_VAULT_SECRET；未设置时退回内置 fallback（仅限本地开发，生产务必配置）。
import crypto from "crypto";

function getKey() {
  const secret = process.env.COOKIE_VAULT_SECRET || "dev-only-insecure-fallback-change-me";
  return crypto.createHash("sha256").update(secret).digest();
}

// 加密：iv(12) + authTag(16) + ciphertext，整体 base64url 编码（URL 安全）
export function encryptCookie(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

// 解密：拿到 token 还原出原始 Cookie。密钥不公开，token 泄露也无法被第三方解密利用。
export function decryptCookie(token) {
  const buf = Buffer.from(String(token), "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const cipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString("utf8");
}
