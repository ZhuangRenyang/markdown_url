// 服务端预置的 CSDN Cookie 存储（管理员在 /admin-cookie 页面设置一次）。
// 设计目标：Cookie 不进环境变量、不进代码仓库、不进 git，避免明文暴露。
// 存储方式：进程内内存（Serverless 温实例期间有效）+ 临时文件（仅在有持久磁盘的主机上有用）。
import fs from "fs";
import os from "os";
import path from "path";

let memoryCookie = null;

// 临时文件路径：用 os.tmpdir() 而非项目根，兼容 Vercel 等只读源码的 Serverless 环境。
const COOKIE_FILE = path.join(os.tmpdir(), "mdcati_csdn_cookie.json");

// 启动时尝试从临时文件恢复（有持久磁盘的主机可跨请求保留；Serverless 则主要靠内存）。
try {
  if (fs.existsSync(COOKIE_FILE)) {
    const v = fs.readFileSync(COOKIE_FILE, "utf8").trim();
    if (v) memoryCookie = v;
  }
} catch {
  // 忽略：恢复失败不影响运行，管理员重新设置即可。
}

export function getServerCookie() {
  return memoryCookie;
}

export function hasServerCookie() {
  return !!memoryCookie;
}

export function setServerCookie(cookie) {
  const v = (cookie && String(cookie).trim()) || "";
  memoryCookie = v || null;
  try {
    if (memoryCookie) {
      fs.writeFileSync(COOKIE_FILE, memoryCookie, { mode: 0o600 });
    } else if (fs.existsSync(COOKIE_FILE)) {
      fs.unlinkSync(COOKIE_FILE);
    }
  } catch {
    // 写文件失败不影响内存中的使用（Serverless /tmp 偶尔不可写）。
  }
}

// 管理员口令：默认 "mdcati"。生产环境请通过环境变量 ADMIN_PASSWORD 改成强口令，
// 否则知道默认口令的人能改掉服务端预置的 Cookie。
const DEFAULT_ADMIN_PASS = "mdcati";

export function checkAdminPass(phrase) {
  const expected = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASS;
  return typeof phrase === "string" && phrase === expected;
}

export function usingDefaultAdminPass() {
  return !process.env.ADMIN_PASSWORD;
}

// 仅用于状态展示的掩码，绝不返回完整 Cookie。
export function maskedCookie() {
  if (!memoryCookie) return "";
  const head = memoryCookie.slice(0, 20);
  return head + (memoryCookie.length > 20 ? "…(其余已隐藏)" : "");
}
