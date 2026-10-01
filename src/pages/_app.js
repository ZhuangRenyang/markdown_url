import "@/styles/globals.css";
import { LanguageProvider } from "@/components/language-provider";

export default function App({ Component, pageProps }) {
  return (
    <LanguageProvider>
      <Component {...pageProps} />
    </LanguageProvider>
  );
}
