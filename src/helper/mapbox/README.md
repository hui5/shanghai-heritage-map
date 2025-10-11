# Mapbox 高亮工具

通用的地图位置高亮工具集，用于在地图上临时高亮显示位置。

## 工具列表

### 1. LocationHighlighter - 单点高亮

用于高亮显示单个位置，适合临时标记某个地点。

**特点：**
- 绿色圆环样式
- 自动消失（默认3秒）
- 可自定义颜色和持续时间

**使用示例：**

```typescript
import { createLocationHighlighter } from '@/helper/mapbox/locationHighlight';

// 创建高亮管理器
const highlighter = createLocationHighlighter(mapInstance, {
  layerIdPrefix: 'my-highlight',
  style: {
    color: '#4ade80',        // 绿色
    glowOpacity: 0.3,        // 光晕透明度
    strokeOpacity: 0.9,      // 描边透明度
    duration: 3000,          // 3秒后自动清除，0表示不自动清除
  },
});

// 显示高亮
highlighter.highlight([121.4737, 31.2304], '某个地点');

// 手动清除
highlighter.clear();

// 销毁（组件卸载时）
highlighter.destroy();
```

### 2. MultiLocationHighlighter - 多点高亮

用于同时高亮显示多个位置，适合搜索结果等场景。

**特点：**
- 红色圆环样式（可自定义）
- 支持显示文字标签
- 适合搜索结果等多点显示场景

**使用示例：**

```typescript
import { createMultiLocationHighlighter } from '@/helper/mapbox/multiLocationHighlight';

// 创建高亮管理器
const highlighter = createMultiLocationHighlighter(mapInstance, {
  layerIdPrefix: 'search-highlight',
  color: '#ff6b6b',         // 红色
  showLabels: true,         // 显示标签
});

// 显示多个位置
highlighter.highlight([
  {
    coordinates: [121.4737, 31.2304],
    name: '地点1',
    type: 'building',
  },
  {
    coordinates: [121.4837, 31.2404],
    name: '地点2',
    type: 'landmark',
  },
]);

// 清除所有高亮
highlighter.clear();

// 销毁（组件卸载时）
highlighter.destroy();
```

## 实际应用

### FloatingInfoController - Panel 关闭时的位置提示

当用户关闭全屏信息面板时，在地图上短暂显示位置标记：

```typescript
// 初始化
const highlighterRef = useRef<ReturnType<typeof createLocationHighlighter> | null>(null);

useEffect(() => {
  if (!mapInstance) return;
  highlighterRef.current = createLocationHighlighter(mapInstance, {
    layerIdPrefix: 'panel-close-highlight',
  });
  return () => {
    highlighterRef.current?.destroy();
  };
}, [mapInstance]);

// 监听关闭事件
useEffect(() => {
  if (panelJustClosed && wasFullscreen && locationInfo?.coordinates) {
    highlighterRef.current?.highlight(
      locationInfo.coordinates,
      locationInfo.name,
    );
  }
}, [isOpen, isFullscreen, locationInfo]);
```

### useMapSearch - 搜索结果高亮

搜索功能使用多点高亮显示所有搜索结果：

```typescript
const highlighterRef = useRef<ReturnType<typeof createMultiLocationHighlighter> | null>(null);

useEffect(() => {
  if (!mapInstance) return;
  highlighterRef.current = createMultiLocationHighlighter(mapInstance, {
    layerIdPrefix: 'search-highlight',
    color: '#ff6b6b',
    showLabels: true,
  });
  return () => {
    highlighterRef.current?.destroy();
  };
}, [mapInstance]);

// 显示搜索结果
highlighterRef.current?.highlight(
  results.map(result => ({
    coordinates: result.coordinates,
    name: result.name,
    type: result.type,
  }))
);
```

## API 参考

### LocationHighlighter

```typescript
interface HighlightStyle {
  color?: string;          // 圆环颜色，默认 '#4ade80'
  glowOpacity?: number;    // 光晕透明度，默认 0.3
  strokeOpacity?: number;  // 描边透明度，默认 0.9
  duration?: number;       // 持续时间（毫秒），默认 3000，0 表示不自动清除
}

interface LocationHighlightOptions {
  layerIdPrefix?: string;  // 图层 ID 前缀
  style?: HighlightStyle;  // 样式配置
}

class LocationHighlighter {
  highlight(coordinates: [number, number], name?: string, customDuration?: number): void;
  clear(): void;
  destroy(): void;
}
```

### MultiLocationHighlighter

```typescript
interface HighlightLocation {
  coordinates: [number, number];
  name: string;
  type?: string;
}

interface MultiLocationHighlightOptions {
  layerIdPrefix?: string;  // 图层 ID 前缀
  color?: string;          // 圆环颜色，默认 '#ff6b6b'
  showLabels?: boolean;    // 是否显示标签，默认 true
}

class MultiLocationHighlighter {
  highlight(locations: HighlightLocation[]): void;
  clear(): void;
  destroy(): void;
}
```

## 注意事项

1. **记得销毁**：在组件卸载时调用 `destroy()` 方法清理资源
2. **图层 ID**：使用唯一的 `layerIdPrefix` 避免与其他图层冲突
3. **样式切换**：工具会自动处理地图样式切换，重新初始化图层
4. **错误处理**：所有操作都包含错误处理，不会影响主流程

