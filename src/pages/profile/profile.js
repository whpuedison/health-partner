// pages/profile/profile.js
const { calculateBMI } = require('../../utils/health-calculator');
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');

const app = getApp();

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    nickname: '',
    profile: {
      height: 0,
      weight: 0,
      age: 0,
      bmi: 0,
    },
    // 功能菜单
    menuItems: [
      { id: 'goal', icon: '👤', title: '个人档案', arrow: true },
      { id: 'charts', icon: '📉', title: '瘦身历程', arrow: true },
      { id: 'timeline', icon: '💃', title: '体型变化', arrow: true },
      { id: 'about', icon: 'ℹ️', title: '关于我们', arrow: true },
    ],
  },

  onLoad() {
    this.loadUserInfo();
    this.loadProfile();
  },


  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 2 });
    }
    this.loadUserInfo();
    this.loadProfile();
  },

  // 加载用户信息
  loadUserInfo() {
    // 从全局数据或本地存储加载用户信息
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (userInfo && (userInfo.nickName || userInfo.avatarUrl)) {
      this.setData({
        userInfo: userInfo,
        nickname: userInfo.nickName || '',
        hasUserInfo: !!(userInfo.avatarUrl && userInfo.nickName)
      });
    }
  },

  // 加载用户资料
  loadProfile() {    
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      // 如果没有 openId，等待一下再试
      setTimeout(() => {
        this.loadProfile();
      }, 500);
      return;
    }

    Http.get(API.USER_PROFILE, {
      openId: openId
    }).then((result) => {
      if (result.data) {
        const profile = result.data;
        // 更新全局数据和本地存储
        app.globalData.profile = profile;
        wx.setStorageSync('profile', profile);
        
        // 计算 BMI
        const bmi = calculateBMI(profile.weight, profile.height);
        
        this.setData({
          profile: {
            height: profile.height || 0,
            weight: profile.weight || 0,
            age: profile.age || 0,
            bmi: bmi > 0 ? parseFloat(bmi.toFixed(1)) : 0,
          },
        });
      }
    }).catch((error) => {
      console.error('获取健康档案失败', error);
      // 如果获取失败，显示默认值
      this.setData({
        profile: {
          height: 0,
          weight: 0,
          age: 0,
          bmi: 0,
        },
      });
    });
  },

  // 后台刷新健康档案数据（不阻塞UI）
  refreshProfile() {
    // 防止重复调用
    if (this._refreshingProfile) {
      return;
    }
    this._refreshingProfile = true;
    
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      this._refreshingProfile = false;
      return;
    }
    
    Http.get(API.USER_PROFILE, {
      openId: openId
    }).then((result) => {
      if (result.data) {
        // 更新全局数据和本地存储
        app.globalData.profile = result.data;
        wx.setStorageSync('profile', result.data);
        
        // 重新计算并更新显示
        const bmi = calculateBMI(result.data.height, result.data.weight);
        this.setData({
          profile: {
            height: result.data.height || 0,
            weight: result.data.weight || 0,
            age: result.data.age || 0,
            bmi: bmi > 0 ? parseFloat(bmi.toFixed(1)) : 0,
          },
        });
      }
      this._refreshingProfile = false;
    }).catch((error) => {
      // 静默失败，不影响UI
      console.error('后台刷新健康档案失败', error);
      this._refreshingProfile = false;
    });
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    const userInfo = this.data.userInfo || {};
    
    // 先显示临时头像（tmp路径）
    userInfo.avatarUrl = avatarUrl;
    this.setData({
      userInfo: userInfo,
    }, () => {
      this.checkUserInfoComplete();
    });

    // 上传头像到服务器
    wx.showLoading({
      title: '上传中...',
      mask: true
    });
    
    const { Http } = require('../../utils/http');
    Http.uploadFile(avatarUrl).then((result) => {
      wx.hideLoading();
      if (result.data && result.data.avatarUrl) {
        // 使用服务器返回的永久URL
        const serverAvatarUrl = result.data.avatarUrl;
        userInfo.avatarUrl = serverAvatarUrl;
        this.setData({
          userInfo: userInfo,
        });
        
        // 更新后端用户信息
        this.updateUserInfo({
          avatarUrl: serverAvatarUrl,
        });
      }
    }).catch((error) => {
      wx.hideLoading();
      console.error('头像上传失败', error);
      wx.showToast({
        title: '头像上传失败，请重试',
        icon: 'none',
      });
    });
  },

  // 输入昵称
  onNicknameInput(e) {
    const nickname = e.detail.value || '';
    const userInfo = this.data.userInfo || {};
    userInfo.nickName = nickname;
    
    this.setData({
      nickname: nickname,
      userInfo: userInfo,
    }, () => {
      this.checkUserInfoComplete();
    });

    // 更新后端用户信息（延迟执行，避免频繁请求）
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
      this.updateUserInfo({
        nickname: nickname,
      });
    }, 500);
  },

  // 更新后端用户信息
  updateUserInfo(userInfo) {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      console.warn('openId 不存在，无法更新用户信息');
      return;
    }

    Http.post(API.USER_UPDATE, {
      openId: openId,
      nickname: userInfo.nickname,
      avatarUrl: userInfo.avatarUrl,
    }).then((result) => {
      // 更新成功后，同步更新本地存储和全局数据
      if (result.data) {
        const updatedUserInfo = {
          nickName: result.data.nickname || '',
          avatarUrl: result.data.avatarUrl || ''
        };
        app.globalData.userInfo = updatedUserInfo;
        wx.setStorageSync('userInfo', updatedUserInfo);
        
        // 更新页面显示
        this.setData({
          userInfo: updatedUserInfo,
          nickname: updatedUserInfo.nickName || '',
          hasUserInfo: !!(updatedUserInfo.avatarUrl && updatedUserInfo.nickName)
        });
      }
    }).catch((error) => {
      console.error('更新用户信息失败', error);
    });
  },

  // 检查用户信息是否完整
  checkUserInfoComplete() {
    // 使用 setTimeout 确保数据更新完成
    setTimeout(() => {
      const { userInfo, nickname } = this.data;
      
      // 如果头像和昵称都有，则显示完整信息
      if (userInfo && userInfo.avatarUrl && (userInfo.nickName || nickname)) {
        this.setData({
          hasUserInfo: true,
          nickname: userInfo.nickName || nickname,
        });
      }
    }, 100);
  },

  // 菜单项点击
  onMenuTap(e) {
    const id = e.currentTarget.dataset.id;
    console.log('点击菜单项:', id);
    
    switch (id) {
      case 'charts':
        wx.navigateTo({
          url: '/pages/charts/charts',
          fail: (err) => {
             console.error('跳转失败:', err);
             wx.showToast({ title: '页面不存在', icon: 'none' });
          }
        });
        break;
      case 'history':
        wx.showToast({
          title: '功能开发中',
          icon: 'none',
        });
        break;
      case 'goal':
        console.log('跳转到目标页面');
         wx.navigateTo({
          url: '/pages/goal/goal',
          success: () => {
            console.log('跳转成功');
          },
          fail: (err) => {
            console.error('跳转失败:', err);
            wx.showToast({
              title: '页面不存在',
              icon: 'none'
            });
          }
        });
        break;
      case 'timeline':
        console.log('跳转到时光轴页面');
        wx.navigateTo({
          url: '/pages/timeline/timeline',
          success: () => {
            console.log('跳转成功');
          },
          fail: (err) => {
            console.error('跳转失败:', err);
            wx.showToast({
              title: '页面不存在',
              icon: 'none'
            });
          }
        });
        break;
      case 'about':
        wx.showModal({
          title: '番茄控卡',
          content: '一款专门为减肥人群打造的健康管理小程序',
          showCancel: false,
          confirmText: '知道了',
        });
        break;
      default:
        console.warn('未处理的菜单项:', id);
        break;
    }
  },

    recordShareAction(scene) {
        const openId = app.globalData.openId || wx.getStorageSync('openId');
        if (!openId) return;
        
        const recordUrl = '/api/v1/user/share';
        Http.post(recordUrl, {
            openId,
            scene: scene, 
            page: 'pages/profile/profile' // 记录来源页面
        }).then(res => {
            if (res.success) {
                this.setData({ isLocked: false });
                wx.showToast({
                    title: '解锁成功',
                    icon: 'success'
                });
            }
        });
      },
  
    onShareAppMessage() {
      this.recordShareAction(1);
      const openId = app.globalData.openId || wx.getStorageSync('openId');
      return {
        title: '拍照识热量，轻松控饮食',
        path: `/pages/questionnaire/questionnaire?referrerId=${openId}`,
        imageUrl: 'https://whpuedison.online/images/kongka_share.jpg'
      };
    },
    
    onShareTimeline() {
      this.recordShareAction(2);
      const openId = app.globalData.openId || wx.getStorageSync('openId');
      return {
            title: '拍照识热量，轻松控饮食',
            query: `referrerId=${openId}`,
            imageUrl: 'https://whpuedison.online/images/tomato.jpg'
          };
     }
});
