import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLanguage } from "./language-provider";
import { PRESETS, useSettings } from "./settings-provider";
import { FETCH_PROVIDERS, useFetchProvider } from "./fetch-provider";

export function SettingsDialog({ open, onClose }) {
  const { t, lang } = useLanguage();
  const { baseUrl, apiKey, model, hasKey, save, clear } = useSettings();
  const fetchCfg = useFetchProvider();

  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [preset, setPreset] = useState("apihub");
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState(null);
  const [saved, setSaved] = useState(false);

  // 抓取服务相关的表单状态
  const [fetchProvider, setFetchProvider] = useState("auto");
  const [fetchKeys, setFetchKeys] = useState({
    jinaKey: "",
    scraperapiKey: "",
    scrapingantKey: "",
  });
  const [showFetchKey, setShowFetchKey] = useState(false);
  const [fetchSaved, setFetchSaved] = useState(false);

  // 每次打开弹窗时，用已保存的值填充表单
  useEffect(() => {
    if (!open) return;
    setBaseUrlInput(baseUrl || PRESETS[0].baseUrl);
    setApiKeyInput(apiKey || "");
    setModelInput(model || "");
    setTest(null);
    setSaved(false);
    setShowKey(false);
    const hit = PRESETS.find((p) => p.baseUrl && p.baseUrl === baseUrl);
    setPreset(hit ? hit.id : baseUrl ? "custom" : "apihub");
    // 抓取服务
    setFetchProvider(fetchCfg.provider || "auto");
    setFetchKeys({
      jinaKey: fetchCfg.jinaKey || "",
      scraperapiKey: fetchCfg.scraperapiKey || "",
      scrapingantKey: fetchCfg.scrapingantKey || "",
    });
    setShowFetchKey(false);
    setFetchSaved(false);
  }, [open, baseUrl, apiKey, model, fetchCfg]);

  if (!open) return null;

  // 当前抓取服务预设（决定要不要显示 key 输入框、placeholder 是什么）
  const activeFetchPreset =
    FETCH_PROVIDERS.find((p) => p.id === fetchProvider) || FETCH_PROVIDERS[0];

  function handleSaveFetch() {
    fetchCfg.save({ provider: fetchProvider, ...fetchKeys });
    setFetchSaved(true);
  }

  function pickPreset(p) {
    setPreset(p.id);
    if (p.baseUrl) setBaseUrlInput(p.baseUrl);
  }

  function handleSave() {
    save({
      baseUrl: baseUrlInput.trim(),
      apiKey: apiKeyInput.trim(),
      model: modelInput.trim(),
    });
    setSaved(true);
  }

  function handleClear() {
    clear();
    setBaseUrlInput(PRESETS[0].baseUrl);
    setApiKeyInput("");
    setModelInput("");
    setPreset("apihub");
    setSaved(false);
    setTest(null);
  }

  async function handleTest() {
    setTest({ state: "testing" });
    try {
      const resp = await fetch("/api/aitest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKeyInput.trim(),
          "x-base-url": baseUrlInput.trim(),
        },
        body: JSON.stringify({}),
      });
      const data = await resp.json();
      if (data.ok) {
        setTest({
          state: "ok",
          message: `${t("testOk")}（${data.modelCount} ${t("modelsAvailable")}）`,
        });
      } else {
        setTest({ state: "fail", message: data.message || t("testFail") });
      }
    } catch (e) {
      setTest({ state: "fail", message: e.message });
    }
  }

  const statusText = hasKey
    ? saved
      ? t("statusSaved")
      : t("statusConfigured")
    : t("statusNotConfigured");

  return (
    <div
      className="safe-bottom fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 sm:p-6"
      onClick={onClose}>
      <div
        className="safe-bottom flex max-h-[72vh] w-full max-w-[22rem] flex-col rounded-xl border border-gray-200 bg-white shadow-lg sm:max-h-[86vh] sm:max-w-lg sm:rounded-2xl lg:max-w-xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-6 sm:py-4">
          <div>
            <h2 className="text-sm font-semibold">{t("settingsTitle")}</h2>
            <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400 sm:text-xs">
              {t("settingsSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 shrink-0 rounded p-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800">
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3 sm:space-y-4 sm:px-6 sm:py-5">
          <div>
            <Label className="mb-1.5 block text-[13px] font-medium sm:text-sm">{t("apiSite")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickPreset(p)}
                  className={
                    "rounded-md px-2.5 py-1.5 text-xs transition-colors sm:py-1 " +
                    (preset === p.id
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300")
                  }>
                  {lang === "zh" ? p.labelZh : p.labelEn}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-[13px] font-medium sm:text-sm" htmlFor="cfg-baseurl">
              {t("baseUrl")}
            </Label>
            <Input
              id="cfg-baseurl"
              value={baseUrlInput}
              placeholder="https://api.openai.com/v1"
              onChange={(e) => setBaseUrlInput(e.target.value)}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label className="text-[13px] font-medium sm:text-sm" htmlFor="cfg-apikey">
                {t("apiKey")}
              </Label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-xs text-gray-500 underline hover:text-gray-800 dark:hover:text-gray-200">
                {showKey ? t("hide") : t("show")}
              </button>
            </div>
            <Input
              id="cfg-apikey"
              type={showKey ? "text" : "password"}
              value={apiKeyInput}
              placeholder="sk-..."
              autoComplete="off"
              onChange={(e) => setApiKeyInput(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-1 block text-[13px] font-medium sm:text-sm" htmlFor="cfg-model">
              {t("model")}
            </Label>
            <Input
              id="cfg-model"
              value={modelInput}
              placeholder={t("modelPlaceholder")}
              onChange={(e) => setModelInput(e.target.value)}
            />
          </div>

          <p className="rounded-md bg-orange-50 px-2.5 py-1.5 text-[11.5px] sm:px-2.5 sm:py-1.5 sm:text-[11px] text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
            ⚠ {t("keyWarning")}
          </p>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-500 dark:text-gray-400">
              {t("status")}: <b className="text-gray-800 dark:text-gray-100">{statusText}</b>
            </span>
            <button
              type="button"
              onClick={handleTest}
              disabled={!apiKeyInput.trim() || test?.state === "testing"}
              className="underline disabled:opacity-40">
              {test?.state === "testing" ? t("testing") : t("testConnection")}
            </button>
          </div>

          {test && test.state !== "testing" && (
            <p
              className={
                "text-xs " +
                (test.state === "ok"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400")
              }>
              {test.message}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="h-11 flex-1 sm:h-10" onClick={handleClear}>
              {t("clearKey")}
            </Button>
            <Button className="h-11 flex-1 sm:h-10" onClick={handleSave}>
              {saved ? `✓ ${t("saveConnection")}` : t("saveConnection")}
            </Button>
          </div>

          {/* ===== 网页抓取服务：反爬 / SPA 站点用它来抓正文 ===== */}
          <div className="border-t border-gray-200 pt-2.5 dark:border-gray-700 sm:pt-3">
            <h3 className="text-xs font-semibold">{t("fetchServiceTitle")}</h3>
            <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
              {t("fetchServiceDesc")}
            </p>
          </div>

          <div>
            <Label className="mb-1.5 block text-[13px] font-medium sm:text-sm">{t("fetchProvider")}</Label>
            <div className="flex flex-wrap gap-2">
              {FETCH_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFetchProvider(p.id)}
                  className={
                    "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs transition-colors sm:py-1 " +
                    (fetchProvider === p.id
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300")
                  }>
                  <span>{lang === "zh" ? p.labelZh : p.labelEn}</span>
                  <span
                    className={
                      "rounded px-1 py-0.5 text-[10px] leading-none sm:text-[10px] " +
                      (p.free
                        ? fetchProvider === p.id
                          ? "bg-white/25 text-white"
                          : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                        : fetchProvider === p.id
                          ? "bg-white/25 text-white"
                          : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400")
                    }>
                    {lang === "zh" ? p.freeZh : p.freeEn}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {fetchProvider === "auto" && (
            <p className="rounded-md bg-green-50 px-2.5 py-1.5 text-[11.5px] sm:px-2.5 sm:py-1.5 sm:text-[11px] text-green-700 dark:bg-green-950/40 dark:text-green-300">
              ✓ {t("fetchAutoHelp")}
            </p>
          )}

          {activeFetchPreset.keyField ? (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <Label className="text-[13px] font-medium sm:text-sm" htmlFor="cfg-fetchkey">
                  {activeFetchPreset.labelZh} {t("apiKey")}
                </Label>
                <button
                  type="button"
                  onClick={() => setShowFetchKey(!showFetchKey)}
                  className="text-xs text-gray-500 underline hover:text-gray-800 dark:hover:text-gray-200">
                  {showFetchKey ? t("hide") : t("show")}
                </button>
              </div>
              <Input
                id="cfg-fetchkey"
                type={showFetchKey ? "text" : "password"}
                value={fetchKeys[activeFetchPreset.keyField] || ""}
                placeholder={activeFetchPreset.keyPlaceholder}
                autoComplete="off"
                onChange={(e) =>
                  setFetchKeys({ ...fetchKeys, [activeFetchPreset.keyField]: e.target.value })
                }
              />
              <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                {t("fetchKeyHelp")}
              </p>
            </div>
          ) : null}

          {fetchProvider !== "auto" &&
            activeFetchPreset.keyField &&
            !fetchKeys[activeFetchPreset.keyField] &&
            !activeFetchPreset.free && (
              <p className="rounded-md bg-orange-50 px-2.5 py-1.5 text-[11.5px] sm:px-2.5 sm:py-1.5 sm:text-[11px] text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                ⚠ {t("fetchNeedKey")}
              </p>
            )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="h-11 flex-1 sm:h-10"
              onClick={() => {
                fetchCfg.clear();
                setFetchProvider("auto");
                setFetchKeys({ jinaKey: "", scraperapiKey: "", scrapingantKey: "" });
                setFetchSaved(false);
              }}>
              {t("clearKey")}
            </Button>
            <Button className="h-11 flex-1 sm:h-10" onClick={handleSaveFetch}>
              {fetchSaved ? `✓ ${t("saveConnection")}` : t("saveConnection")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
