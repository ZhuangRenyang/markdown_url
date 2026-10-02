import { useState, useEffect } from "react";

// 管理员预置 CSDN Cookie 的页面。
// 用途：你（站长）登录 CSDN 后复制整段 Cookie 粘进来保存一次，
// 之后所有访客直接贴 URL 就能转换 CSDN，无需任何 Cookie 操作。
export default function AdminCookie() {
  const [passphrase, setPassphrase] = useState("");
  const [cookie, setCookie] = useState("");
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin-cookie")
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => {});
  }, []);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase, cookie }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setMsg("❌ " + (d.error || "保存失败"));
      } else {
        setMsg(
          d.configured
            ? "✅ 已保存。所有访客现在可直接转换 CSDN，无需再填 Cookie。"
            : "✅ 已清空服务端预置 Cookie。"
        );
        setStatus(d);
      }
    } catch (e) {
      setMsg("❌ 网络错误");
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">管理员 · 预置 CSDN Cookie</h1>
      <p className="text-sm text-zinc-500 mb-6">
        在这里粘贴一次你自己的 CSDN Cookie，之后所有访客无需任何操作即可转换 CSDN 文章。
        Cookie 仅保存在服务端内存，不进环境变量、不进代码仓库。
      </p>

      {status && status.usingDefaultPass && (
        <div className="mb-4 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          安全提示：当前使用的是默认口令 <code className="font-mono">mdcati</code>。
          生产环境请设置环境变量 <code className="font-mono">ADMIN_PASSWORD</code> 改成强口令，否则他人可能改掉预置 Cookie。
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">管理员口令</label>
        <input
          type="password"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder="默认 mdcati（生产请改）"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">CSDN Cookie</label>
        <textarea
          className="w-full min-h-[8rem] rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs"
          placeholder="粘贴 CSDN 的 Cookie，例如 uuid_tt_dd=...; UserName=...; token=..."
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
        />
        <p className="mt-1 text-xs text-zinc-400">
          获取方式：电脑 Chrome 登录 CSDN → F12 → Network → 刷新 → 点任意请求 → Request Headers 里的 Cookie。
          留空并保存可清空。
        </p>
      </div>

      <button
        onClick={save}
        disabled={busy}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {busy ? "保存中..." : "保存"}
      </button>

      {msg && <p className="mt-4 text-sm">{msg}</p>}

      {status && (
        <p className="mt-4 text-xs text-zinc-400">
          当前状态：{status.configured ? `已配置（${status.masked}）` : "未配置"}
        </p>
      )}

      <p className="mt-8 text-xs text-zinc-400">
        持久化建议：本页面保存的 Cookie 存在服务端内存，Serverless（如 Vercel）冷启动后会清空。
        若要永久持久、不被冷启动影响，最稳妥是在 Vercel 项目设置里加一个环境变量
        <code className="font-mono"> CSDN_COOKIE</code>（值填你的 CSDN Cookie），服务端会自动读取，且加密存储、不进代码仓库。
      </p>
    </main>
  );
}
