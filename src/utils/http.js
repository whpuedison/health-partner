/**
 * API 基础配置
 */
// 注意：小程序无法访问 localhost，需要使用本机 IP 地址
// 获取本机 IP：在终端运行 ifconfig (macOS/Linux) 或 ipconfig (Windows)
// const BASE_URL = 'https://whpuedison.online'; // 替换为实际的服务器地址
const BASE_URL = 'http://127.0.0.1:3000'; // 替换为实际的服务器地址
const TIMEOUT = 10000;
const LONG_TIMEOUT = 300000; // 长时间请求超时（5分钟），用于图片识别等

/**
 * HTTP 请求封装
 */
class Http {
  /**
   * 通用请求方法
   */
  static request(options) {
    return new Promise((resolve, reject) => {
      let url = BASE_URL + options.url;
      const method = options.method || 'GET';
      const data = options.data || {};
      
      // GET 和 DELETE 请求将 data 作为查询参数
      if (method === 'GET' || method === 'DELETE') {
        const queryString = Object.keys(data)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
          .join('&');
        if (queryString) {
          url += (url.includes('?') ? '&' : '?') + queryString;
        }
      }
      
      // 判断是否为长时间请求（通过参数指定）
      const timeout = options.longTimeout ? LONG_TIMEOUT : TIMEOUT;
      
      const requestTask = wx.request({
        url: url,
        method: method,
        data: (method === 'GET' || method === 'DELETE') ? {} : data,
        header: {
          'content-type': 'application/json',
          ...options.header,
        },
        timeout: timeout,
        success: res => {
          const data = res.data;
          // 后端返回格式：{ success: true, code: 200, data: {...}, message: '...' }
          if (data.success && data.code === 200) {
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
          if (!err?.errMsg?.includes('abort')) {
             wx.showToast({
                title: '网络请求失败',
                icon: 'none',
             });
          }
          reject(err);
        },
      });

      // 如果提供了回调，传回 requestTask
      if (options.onRequestTask) {
        options.onRequestTask(requestTask);
      }
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
   * @param {string} url - 请求URL
   * @param {object} data - 请求数据
   * @param {object} queryParams - 查询参数（可选）
   * @param {boolean} longTimeout - 是否使用长超时（可选，默认false）
   * @param {object} options - 额外选项，如 { onRequestTask: fn }
   */
  static post(url, data, queryParams, longTimeout = false, options = {}) {
    let finalUrl = url;
    if (queryParams) {
      const queryString = Object.keys(queryParams)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
        .join('&');
      if (queryString) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryString;
      }
    }
    return this.request({ 
      url: finalUrl, 
      method: 'POST', 
      data: data || {},
      longTimeout: longTimeout,
      onRequestTask: options.onRequestTask
    });
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

  /**
   * 上传文件
   */
  static uploadFile(filePath, name = 'file', options = {}) {
    return new Promise((resolve, reject) => {
      const openId = getApp().globalData.openId || wx.getStorageSync('openId');
      const uploadType = options.type || 'avatar'; // avatar 或 post
      
      // 根据类型选择不同的上传接口
      let uploadUrl = uploadType === 'post' 
        ? BASE_URL + '/api/v1/post/upload-image'
        : BASE_URL + '/api/v1/user/upload-avatar';
      
      // 确保 URL 使用 HTTPS（防止 HTTP 重定向导致问题）
      if (uploadUrl.startsWith('http://')) {
        uploadUrl = uploadUrl.replace('http://', 'https://');
      }
      
      wx.uploadFile({
        url: uploadUrl,
        filePath: filePath,
        name: name,
        formData: {
          openId: openId
        },
        header: {
          'content-type': 'multipart/form-data'
        },
        success: res => {
          try {
            const data = JSON.parse(res.data);
            // 后端返回格式：{ success: true, code: 200, data: {...}, message: '...' }
            if (data.success && data.code === 200) {
              resolve(data);
            } else {
              wx.showToast({
                title: data.message || '上传失败',
                icon: 'none',
              });
              reject(data);
            }
          } catch (e) {
            wx.showToast({
              title: '解析响应失败',
              icon: 'none',
            });
            reject(e);
          }
        },
        fail: err => {
          wx.showToast({
            title: '上传失败',
            icon: 'none',
          });
          reject(err);
        },
      });
    });
  }
}

module.exports = { Http };

