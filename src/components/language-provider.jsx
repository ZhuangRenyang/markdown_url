import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LANGUAGE,
  detectLanguage,
  getDictionary,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
} from "@/lib/i18n";

const STORAGE_KEY = "markdowndown.lang";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  // 首屏固定用默认语言（中文），避免服务端与客户端渲染不一致
  const [lang, setLang] = useState(DEFAULT_LANGUAGE);

  // 挂载后再读取本地偏好，读取不到则按浏览器语言猜测
  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      /* localStorage 不可用（如隐私模式）时忽略 */
    }
    const normalized = normalizeLanguage(saved);
    if (normalized) {
      setLang(normalized);
      return;
    }
    setLang(detectLanguage());
  }, []);

  // 语言变化时同步 <html lang> 并记住选择
  useEffect(() => {
    if (typeof document !== "undefined") {
      const meta = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
      if (meta) document.documentElement.lang = meta.htmlLang;
    }
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* ignore */
    }
  }, [lang]);

  const t = useCallback(
    (key) => {
      const dict = getDictionary(lang);
      return dict[key] !== undefined ? dict[key] : key;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage 必须在 <LanguageProvider> 内部使用");
  }
  return ctx;
}

/** 右上角的中 / EN 切换按钮 */
export function LanguageSwitch() {
  const { lang, setLang, t } = useLanguage();
  const other = SUPPORTED_LANGUAGES.find((l) => l.code !== lang);

  return (
    <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white/80 p-1 text-xs shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/70">
      {SUPPORTED_LANGUAGES.map((item) => {
        const active = item.code === lang;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => setLang(item.code)}
            aria-pressed={active}
            title={active ? undefined : `切换到${item.label}`}
            className={
              "rounded-full px-2.5 py-1 font-medium transition-colors " +
              (active
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100")
            }>
            {item.short}
          </button>
        );
      })}
      <span className="sr-only">{t("langName")}</span>
    </div>
  );
}
