import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        <meta charSet="utf-8" />
        <meta
          name="description"
          content="上海市历史建筑与文物地图可视化系统 - 探索上海的历史文化遗产"
        />
        <meta
          name="keywords"
          content="上海,历史建筑,文物保护,地图,可视化,文化遗产"
        />
        <meta name="author" content="Shanghai Heritage Map" />
        <link rel="icon" href="/icons/highway-rest-area.svg" />
        {/* 优化地图加载的预连接（Mapbox） */}
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
        {/* <script
          defer
          src="https://analytics-proxy.openda.top/app.js"
          data-cf-beacon='{"token": "5e5d550b57f543e48c8538d387318e48"}'
        ></script> */}
        {/* <script
          defer
          src="https://analytics-proxy-vercel.openda.top/app.js"
        ></script> */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
