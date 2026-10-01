import "@/styles/globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { SettingsProvider } from "@/components/settings-provider";

export default function App({ Component, pageProps }) {
  return (
    <LanguageProvider>
      <SettingsProvider>
        <Component {...pageProps} />
      </SettingsProvider>
    </LanguageProvider>
  );
}
