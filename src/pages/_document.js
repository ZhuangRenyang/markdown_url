import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    // 默认中文；用户在页面上切换语言时，language-provider 会同步更新 lang 属性
    <Html lang="zh-CN">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
