// pages/index/index.js
const { getHealthSummary } = require('../../services/health.service');
const { getUserProfile: getProfile } = require('../../services/user.service');
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');

const app = getApp();

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    nickname: '',
    healthData: {
      bmi: 0,
      weight: 0,
      height: 0,
      bodyFat: 0,
      status: '未评估',
    },
    todayStats: {
      calories: 0,
      targetCalories: 2000,
      exercise: 0,
      targetExercise: 30,
      water: 0,
      targetWater: 8,
    },
    quickActions: [
      { id: 'diet', icon: '🍎', title: '饮食计划', color: '#FF6B6B', url: '/pages/diet/diet' },
      { id: 'exercise', icon: '🏃', title: '运动计划', color: '#4ECDC4', url: '/pages/exercise/exercise' },
      { id: 'health', icon: '📊', title: '健康数据', color: '#45B7D1', tab: true },
      { id: 'goal', icon: '🎯', title: '目标设置', color: '#FFA07A', url: '/pages/goal/goal' },
    ],
    healthTips: [
      '💧 每天喝足8杯水，促进新陈代谢',
      '😴 保持7-8小时优质睡眠',
      '🏃 每天至少30分钟有氧运动',
      '🥗 多吃蔬菜水果，均衡营养',
    ],
    currentTip: 0,
  },

  onLoad() {
    this.loadUserData();
    this.loadHealthData();
    this.startTipRotation();
  },


  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 0 });
    }
    this.loadHealthData();
  },

  onUnload() {
    if (this.tipTimer) {
      clearInterval(this.tipTimer);
    }
  },

  loadUserData() {
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


  loadHealthData() {
    const summary = getHealthSummary();
    const profile = getProfile();
    
    this.setData({
      healthData: {
        bmi: summary.bmi || 0,
        weight: profile.weight || 0,
        height: profile.height || 0,
        bodyFat: profile.bodyFat || 0,
        status: summary.status || '未评估',
      },
      todayStats: summary.todayStats || this.data.todayStats,
    });
  },

  startTipRotation() {
    this.tipTimer = setInterval(() => {
      const next = (this.data.currentTip + 1) % this.data.healthTips.length;
      this.setData({ currentTip: next });
    }, 5000);
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    const userInfo = this.data.userInfo || {};
    userInfo.avatarUrl = avatarUrl;
    
    this.setData({
      userInfo: userInfo,
    }, () => {
      this.checkUserInfoComplete();
    });

    // 更新后端用户信息
    this.updateUserInfo({
      avatarUrl: avatarUrl,
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

  onActionTap(e) {
    const { url, tab } = e.currentTarget.dataset;
    if (tab) {
      wx.switchTab({ url: '/pages/health/health' });
    } else if (url) {
      wx.navigateTo({ url });
    }
  },

  onShareAppMessage() {
    return {
      title: '健康伙伴 - 你的专属健康管理助手',
      path: '/pages/index/index',
    };
  },
});

