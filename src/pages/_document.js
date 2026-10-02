import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    // 默认中文；用户在页面上切换语言时，language-provider 会同步更新 lang 属性
    <Html lang="zh-CN">
      <Head>
        {/* 移动端必需：没有它手机浏览器会按 980px 虚拟宽度缩放，页面看上去被压扁 */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#ffffff" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
