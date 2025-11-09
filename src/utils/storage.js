/**
 * 存储工具类
 */
export class Storage {
  /**
   * 设置存储
   */
  static set(key, data) {
    try {
      wx.setStorageSync(key, data);
    } catch (error) {
      console.error('存储失败', error);
    }
  }

  /**
   * 获取存储
   */
  static get(key) {
    try {
      return wx.getStorageSync(key);
    } catch (error) {
      console.error('读取存储失败', error);
      return null;
    }
  }

  /**
   * 移除存储
   */
  static remove(key) {
    try {
      wx.removeStorageSync(key);
    } catch (error) {
      console.error('移除存储失败', error);
    }
  }

  /**
   * 清空所有存储
   */
  static clear() {
    try {
      wx.clearStorageSync();
    } catch (error) {
      console.error('清空存储失败', error);
    }
  }
}

