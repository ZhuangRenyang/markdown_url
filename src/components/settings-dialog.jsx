import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLanguage } from "./language-provider";
import { PRESETS, useSettings } from "./settings-provider";

export function SettingsDialog({ open, onClose }) {
  const { t, lang } = useLanguage();
  const { baseUrl, apiKey, model, hasKey, save, clear } = useSettings();

  const [baseUrlInput, setBaseUrlInput] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [preset, setPreset] = useState("apihub");
  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState(null);
  const [saved, setSaved] = useState(false);

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
  }, [open, baseUrl, apiKey, model]);

  if (!open) return null;

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold">{t("settingsTitle")}</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("settingsSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm">{t("apiSite")}</Label>
            <div className="flex gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickPreset(p)}
                  className={
                    "rounded-lg px-3 py-1.5 text-xs transition-colors " +
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
            <Label className="mb-1 block text-sm" htmlFor="cfg-baseurl">
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
              <Label className="text-sm" htmlFor="cfg-apikey">
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
            <Label className="mb-1 block text-sm" htmlFor="cfg-model">
              {t("model")}
            </Label>
            <Input
              id="cfg-model"
              value={modelInput}
              placeholder={t("modelPlaceholder")}
              onChange={(e) => setModelInput(e.target.value)}
            />
          </div>

          <p className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
            ⚠ {t("keyWarning")}
          </p>

          <div className="flex items-center justify-between text-xs">
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
            <Button variant="outline" className="flex-1" onClick={handleClear}>
              {t("clearKey")}
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              {saved ? `✓ ${t("saveConnection")}` : t("saveConnection")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
