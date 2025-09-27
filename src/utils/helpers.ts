import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 Tailwind CSS 类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 延迟执行函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 格式化数字
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

/**
 * 生成随机 ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function isNonEmptyArray(val: any): val is any[] {
  return Array.isArray(val) && val.length > 0;
}

export const escapeHtml = (unsafe: string): string =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

// 将可能是字符串的列表转换为字符串数组
export const coerceToStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((v) => (v == null ? "" : String(v)))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    // 尝试按 JSON 解析
    if (
      (s.startsWith("[") && s.endsWith("]")) ||
      (s.startsWith('"') && s.endsWith('"'))
    ) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed
            .map((v) => (v == null ? "" : String(v)))
            .map((x) => x.trim())
            .filter((x) => x.length > 0);
        }
      } catch {}
    }
    // 回退：按分隔符切分（含中英文逗号/分号/竖线）
    return s
      .split(/[;,，；|]+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }
  return [];
};

// 将可能是字符串/混合数组的列表转换为数字数组
export const coerceToNumberArray = (value: unknown): number[] => {
  const numbers: number[] = [];
  const pushIfFinite = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(String(v).trim());
    if (Number.isFinite(n)) numbers.push(n);
  };

  if (Array.isArray(value)) {
    value.forEach(pushIfFinite);
    return numbers;
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    // 尝试 JSON 数组
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          parsed.forEach(pushIfFinite);
          return numbers;
        }
      } catch {}
    }
    // 回退：按分隔符切分
    s.split(/[;,，；|\s]+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
      .forEach(pushIfFinite);
    return numbers;
  }
  // 单值数字
  if (typeof value === "number" && Number.isFinite(value)) return [value];
  return [];
};
