/**
 * API 基础配置
 */
// 注意：小程序无法访问 localhost，需要使用本机 IP 地址
// 获取本机 IP：在终端运行 ifconfig (macOS/Linux) 或 ipconfig (Windows)
const BASE_URL = 'http://10.247.18.103:3000'; // 替换为实际的服务器地址
const TIMEOUT = 10000;

/**
 * HTTP 请求封装
 */
class Http {
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

  /**
   * 上传文件
   */
  static uploadFile(filePath, name = 'file') {
    return new Promise((resolve, reject) => {
      const openId = getApp().globalData.openId || wx.getStorageSync('openId');
      
      wx.uploadFile({
        url: BASE_URL + '/api/v1/user/upload-avatar',
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

