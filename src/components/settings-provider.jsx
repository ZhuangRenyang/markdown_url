import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "markdowndown.ai";

// 预设站点。自定义那条 baseUrl 留空，由用户自己填。
export const PRESETS = [
  {
    id: "apihub",
    labelZh: "中转站",
    labelEn: "API Hub",
    baseUrl: "https://apihub.agnes-ai.com/v1",
  },
  {
    id: "openai",
    labelZh: "OpenAI 官方",
    labelEn: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
  },
  {
    id: "custom",
    labelZh: "自定义",
    labelEn: "Custom",
    baseUrl: "",
  },
];

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [loaded, setLoaded] = useState(false);

  // 首屏不读 localStorage，挂载后再读，避免服务端/客户端渲染不一致
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setBaseUrl(parsed.baseUrl || "");
        setApiKey(parsed.apiKey || "");
        setModel(parsed.model || "");
      }
    } catch (e) {
      /* localStorage 不可用时忽略 */
    }
    setLoaded(true);
  }, []);

  const save = useCallback((next) => {
    const value = {
      baseUrl: next.baseUrl || "",
      apiKey: next.apiKey || "",
      model: next.model || "",
    };
    setBaseUrl(value.baseUrl);
    setApiKey(value.apiKey);
    setModel(value.model);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (e) {
      /* ignore */
    }
  }, []);

  const clear = useCallback(() => {
    setBaseUrl("");
    setApiKey("");
    setModel("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      baseUrl,
      apiKey,
      model,
      hasKey: !!apiKey,
      loaded,
      save,
      clear,
    }),
    [baseUrl, apiKey, model, loaded, save, clear]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings 必须在 <SettingsProvider> 内部使用");
  }
  return ctx;
}
