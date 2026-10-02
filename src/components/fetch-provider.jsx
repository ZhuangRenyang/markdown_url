import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "markdowndown.fetch";

// 抓取服务预设。auto = 默认，直接用免费服务（Jina Reader），无需任何注册。
// 想用更强的服务再自己选、自己填 key，key 只存在浏览器本地，随请求发给服务端用一次就走。
export const FETCH_PROVIDERS = [
  {
    id: "auto",
    labelZh: "自动（免费，推荐）",
    labelEn: "Auto (free, recommended)",
    keyField: null,
    free: true,
    freeZh: "免费·无需注册",
    freeEn: "Free · no signup",
  },
  {
    id: "jina",
    labelZh: "Jina Reader",
    labelEn: "Jina Reader",
    keyField: "jinaKey",
    keyPlaceholder: "可留空，免费版无需 key（填了额度更高）",
    free: true,
    freeZh: "免费",
    freeEn: "Free",
  },
  {
    id: "scraperapi",
    labelZh: "ScraperAPI",
    labelEn: "ScraperAPI",
    keyField: "scraperapiKey",
    keyPlaceholder: "ScraperAPI 的 API Key（免费 5000 次/月）",
    free: false,
    freeZh: "需注册",
    freeEn: "Signup",
  },
  {
    id: "scrapingant",
    labelZh: "ScrapingAnt",
    labelEn: "ScrapingAnt",
    keyField: "scrapingantKey",
    keyPlaceholder: "ScrapingAnt 的 x-api-key（免费 10000 次/月）",
    free: false,
    freeZh: "需注册",
    freeEn: "Signup",
  },
];

const FetchContext = createContext(null);

const EMPTY = {
  provider: "auto",
  jinaKey: "",
  scraperapiKey: "",
  scrapingantKey: "",
};

export function FetchProvider({ children }) {
  const [config, setConfig] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);

  // 首屏不读 localStorage，挂载后再读，避免服务端/客户端渲染不一致
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setConfig({
          provider: parsed.provider || "auto",
          jinaKey: parsed.jinaKey || "",
          scraperapiKey: parsed.scraperapiKey || "",
          scrapingantKey: parsed.scrapingantKey || "",
        });
      }
    } catch (e) {
      /* localStorage 不可用时忽略 */
    }
    setLoaded(true);
  }, []);

  const save = useCallback((next) => {
    const value = {
      provider: next.provider || "auto",
      jinaKey: next.jinaKey || "",
      scraperapiKey: next.scraperapiKey || "",
      scrapingantKey: next.scrapingantKey || "",
    };
    setConfig(value);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (e) {
      /* ignore */
    }
  }, []);

  const clear = useCallback(() => {
    setConfig(EMPTY);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
  }, []);

  // 给服务端用的精简对象：只带被选中服务的 key，避免把无关密钥也发出去
  const requestConfig = useMemo(() => {
    const out = { provider: config.provider || "auto" };
    const preset = FETCH_PROVIDERS.find((p) => p.id === out.provider);
    if (preset && preset.keyField && config[preset.keyField]) {
      out.key = config[preset.keyField];
    }
    return out;
  }, [config]);

  const value = useMemo(
    () => ({
      provider: config.provider,
      jinaKey: config.jinaKey,
      scraperapiKey: config.scraperapiKey,
      scrapingantKey: config.scrapingantKey,
      // 当前选中的服务是否已配置好（auto 永远算已配置）
      hasProviderKey:
        config.provider === "auto" ||
        (() => {
          const preset = FETCH_PROVIDERS.find((p) => p.id === config.provider);
          return !!(preset && preset.keyField && config[preset.keyField]);
        })(),
      requestConfig,
      loaded,
      save,
      clear,
    }),
    [config, requestConfig, loaded, save, clear]
  );

  return (
    <FetchContext.Provider value={value}>{children}</FetchContext.Provider>
  );
}

export function useFetchProvider() {
  const ctx = useContext(FetchContext);
  if (!ctx) {
    throw new Error("useFetchProvider 必须在 <FetchProvider> 内部使用");
  }
  return ctx;
}
