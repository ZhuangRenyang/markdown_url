import { Homepage } from "@/components/homepage";
import Head from 'next/head'

// 部署到 Vercel 后，可在环境变量里设置 NEXT_PUBLIC_SITE_URL 为自己的域名，
// 例如 https://markdown-url.vercel.app（不要带结尾斜杠）
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://markdowndown.vercel.app').replace(/\/$/, '');

const metadata = {
  title: 'MarkdownDown · 网页转 Markdown',
  description: '把任意网页转成干净的 Markdown，图片可一并打包下载。',
  openGraph: {
    title: 'MarkdownDown · 网页转 Markdown',
    description: '把任意网页转成干净的 Markdown，图片可一并打包下载。',
    url: siteUrl,
    siteName: 'MarkdownDown',
    images: [
      {
        url: `${siteUrl}/og.png`, // Must be an absolute URL
        width: 1200,
        height: 630,
      }
    ],
    locale: 'zh_CN',
    type: 'website',
  },
}
export default function Home() {
  return (
    <>
    <Head>
      <title>{metadata.title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content={metadata.description} />
      <meta property="og:title" content={metadata.openGraph.title} />
      <meta property="og:description" content={metadata.openGraph.description} />
      <meta property="og:url" content={metadata.openGraph.url} />
      <meta property="og:site_name" content={metadata.openGraph.siteName} />
      <meta property="og:type" content={metadata.openGraph.type} />
      <meta property="og:locale" content={metadata.openGraph.locale} />
      <meta property="og:image" content={metadata.openGraph.images[0].url} />
      <meta property="og:image:width" content={metadata.openGraph.images[0].width} />
      <meta property="og:image:height" content={metadata.openGraph.images[0].height} />
    </Head>
    <Homepage />
    </>
  );
}
