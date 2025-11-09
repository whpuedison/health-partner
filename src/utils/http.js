/**
 * API 基础配置
 */
const BASE_URL = 'https://api.example.com'; // 替换为实际的 API 地址
const TIMEOUT = 10000;

/**
 * HTTP 请求封装
 */
export class Http {
  /**
   * 通用请求方法
   */
  static request(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: BASE_URL + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'content-type': 'application/json',
          ...options.header,
        },
        timeout: TIMEOUT,
        success: res => {
          const data = res.data;
          if (data.code === 200) {
            resolve(data);
          } else {
            wx.showToast({
              title: data.message || '请求失败',
              icon: 'none',
            });
            reject(data);
          }
        },
        fail: err => {
          wx.showToast({
            title: '网络请求失败',
            icon: 'none',
          });
          reject(err);
        },
      });
    });
  }

  /**
   * GET 请求
   */
  static get(url, data) {
    return this.request({ url, method: 'GET', data });
  }

  /**
   * POST 请求
   */
  static post(url, data) {
    return this.request({ url, method: 'POST', data });
  }

  /**
   * PUT 请求
   */
  static put(url, data) {
    return this.request({ url, method: 'PUT', data });
  }

  /**
   * DELETE 请求
   */
  static delete(url, data) {
    return this.request({ url, method: 'DELETE', data });
  }
}

