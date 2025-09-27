import dynamic from "next/dynamic";
import Head from "next/head";

// 动态导入地图组件，避免SSR问题
const MapContainer = dynamic(() => import("@/components/Map/MapContainer"), {
  ssr: false,
});

export default function HomePage() {
  return (
    <>
      <Head>
        <title>上海历史建筑地图</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="map-container">
        <MapContainer />
      </main>
    </>
  );
}
