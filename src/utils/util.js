/**
 * 工具函数 - 格式化日期
 */
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 工具函数 - 格式化时间
 */
export function formatTime(date) {
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

/**
 * 工具函数 - 格式化日期时间
 */
export function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * 工具函数 - 防抖
 */
export function debounce(func, wait) {
  let timeout = null;
  return function (...args) {
    const context = this;
    if (timeout !== null) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * 工具函数 - 节流
 */
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

