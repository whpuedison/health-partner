// pages/index/index.js
const { getHealthSummary } = require('../../services/health.service');
const { getUserProfile: getProfile } = require('../../services/user.service');

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
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
    const userInfo = wx.getStorageSync('userInfo');
    const profile = getProfile();
    if (userInfo) {
      this.setData({
        userInfo,
        hasUserInfo: true,
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

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: res => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true,
        });
        wx.setStorageSync('userInfo', res.userInfo);
      },
      fail: err => {
        wx.showToast({
          title: '获取信息失败',
          icon: 'none',
        });
      },
    });
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

