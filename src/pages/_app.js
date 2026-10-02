import "@/styles/globals.css";
import { LanguageProvider } from "@/components/language-provider";
import { SettingsProvider } from "@/components/settings-provider";
import { FetchProvider } from "@/components/fetch-provider";

export default function App({ Component, pageProps }) {
  return (
    <LanguageProvider>
      <SettingsProvider>
        <FetchProvider>
          <Component {...pageProps} />
        </FetchProvider>
      </SettingsProvider>
    </LanguageProvider>
  );
}
