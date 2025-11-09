// app.js
App({
  globalData: {
    userInfo: null,
  },

  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);

    // 登录
    wx.login({
      success: res => {
        console.log('登录成功', res.code);
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    });

    // 获取系统信息
    this.getSystemInfo();
  },

  getSystemInfo() {
    wx.getSystemInfo({
      success: res => {
        console.log('系统信息', res);
      },
    });
  },

  onShow() {
    console.log('App Show');
  },

  onHide() {
    console.log('App Hide');
  },
});

