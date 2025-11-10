// app.js
const { Http } = require('./utils/http');
const { API } = require('./config/api');

App({
  globalData: {
    userInfo: null,
    openId: null,
    profile: null, // 健康档案信息
  },

  onLaunch() {
    // 登录并获取 openId
    this.login();

    // 获取系统信息
    this.getSystemInfo();
  },

  // 登录并获取 openId
  login() {
    wx.login({
      success: (res) => {
        if (res.code) {
          // 发送 code 到后台换取 openId
          Http.post(API.USER_LOGIN, {
            code: res.code,
          }).then((result) => {
            if (result.data && result.data.openId) {
              this.globalData.openId = result.data.openId;
              wx.setStorageSync('openId', result.data.openId);
              
              // 直接使用登录接口返回的用户信息
              if (result.data.nickname || result.data.avatarUrl) {
                const userInfo = {
                  nickName: result.data.nickname || '',
                  avatarUrl: result.data.avatarUrl || ''
                };
                this.globalData.userInfo = userInfo;
                wx.setStorageSync('userInfo', userInfo);
              }
              
              // 保存健康档案信息（如果存在）
              if (result.data.profile) {
                this.globalData.profile = result.data.profile;
                wx.setStorageSync('profile', result.data.profile);
              }
            }
          }).catch((error) => {
            console.error('获取 openId 失败', error);
          });
        }
      },
      fail: (error) => {
        console.error('登录失败', error);
      },
    });
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

