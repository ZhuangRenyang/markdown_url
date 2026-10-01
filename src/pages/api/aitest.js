// 测试 AI 接口连通性。密钥来自请求头（用户在前端填的），没有则回退到环境变量。
// 走服务端代理是为了避开浏览器直连中转站的 CORS 限制。

export default async function handler(req, res) {
  const baseUrl = (
    req.headers["x-base-url"] ||
    process.env.OPENAI_BASE_URL ||
    "https://api.openai.com/v1"
  )
    .toString()
    .replace(/\/$/, "");
  const apiKey = req.headers["x-api-key"] || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res
      .status(200)
      .json({ ok: false, message: "缺少 API 密钥 / Missing API key" });
  }

  try {
    const r = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(200).json({
        ok: false,
        message: `HTTP ${r.status} ${text.slice(0, 200)}`,
      });
    }
    const json = await r.json();
    const models = Array.isArray(json.data) ? json.data.map((m) => m.id) : [];
    return res.status(200).json({
      ok: true,
      modelCount: models.length,
      models: models.slice(0, 50),
    });
  } catch (e) {
    return res.status(200).json({ ok: false, message: e.message });
  }
}
