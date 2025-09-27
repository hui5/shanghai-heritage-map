/**
 * 地图位置存储工具类
 */
class LocalStorageUtil {
  private isClient = typeof window !== "undefined";

  /**
   * 保存地图位置和缩放级别
   */
  saveMapPosition(center: [number, number], zoom: number): boolean {
    if (!this.isClient) return false;

    try {
      const mapPosition = {
        center,
        zoom,
        timestamp: Date.now(),
      };
      localStorage.setItem("shanghaiMapPosition", JSON.stringify(mapPosition));
      return true;
    } catch (error) {
      console.warn("地图位置保存失败:", error);
      return false;
    }
  }

  /**
   * 加载地图位置和缩放级别
   */
  loadMapPosition(): { center?: [number, number]; zoom?: number } {
    if (!this.isClient) return {};

    try {
      const savedData = localStorage.getItem("shanghaiMapPosition");
      if (!savedData) return {};

      const parsed = JSON.parse(savedData);
      return {
        center: parsed.center,
        zoom: parsed.zoom,
      };
    } catch (error) {
      console.warn("地图位置加载失败:", error);
      return {};
    }
  }
}

// 导出单例实例
export const localStorageUtil = new LocalStorageUtil();
