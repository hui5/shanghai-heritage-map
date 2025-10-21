import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import type { Metadata } from "next";
import "../styles/globals.css";
import { GlobalLightbox } from "../components/Map/interaction/panel/GlobalLightbox";
import MapLayout from "./MapLayout";

export const metadata: Metadata = {
  title: "上海历史建筑地图",
  description: "探索上海的历史建筑与文化遗产",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {children}
        <MapLayout />
        <GlobalLightbox />
        <Analytics scriptSrc="/va/script.js" />
        <SpeedInsights scriptSrc="/vercel-speed-script.js" />
      </body>
    </html>
  );
}
