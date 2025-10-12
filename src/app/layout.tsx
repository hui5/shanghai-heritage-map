import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import "../styles/globals.css";
import MapLayout from "./MapLayout";

export const metadata: Metadata = {
  title: "上海历史建筑地图",
  description: "探索上海的历史建筑与文化遗产",
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
        <MapLayout>{children}</MapLayout>
        <Analytics scriptSrc="/va/script.js" />
      </body>
    </html>
  );
}
