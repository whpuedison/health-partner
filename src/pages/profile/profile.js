// pages/profile/profile.js
const { getUserProfile } = require('../../services/user.service');
const { getHealthSummary } = require('../../services/health.service');

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    profile: {
      height: 0,
      weight: 0,
      age: 0,
      bmi: 0,
    },
    
    // 统计数据
    stats: {
      totalDays: 0,
      dietRecords: 0,
      exerciseRecords: 0,
      healthRecords: 0,
    },
    
    // 我的目标
    goals: [
      { id: 'weight', icon: '⚖️', title: '目标体重', value: '0', unit: 'kg', color: '#FF6B6B' },
      { id: 'bodyFat', icon: '💧', title: '目标体脂', value: '0', unit: '%', color: '#4ECDC4' },
      { id: 'exercise', icon: '🏃', title: '每日运动', value: '30', unit: '分钟', color: '#FFD93D' },
      { id: 'water', icon: '💦', title: '每日饮水', value: '8', unit: '杯', color: '#45B7D1' },
    ],
    
    // 功能菜单
    menuItems: [
      { id: 'history', icon: '📊', title: '历史记录', arrow: true },
      { id: 'goal', icon: '🎯', title: '目标设置', arrow: true },
      { id: 'remind', icon: '⏰', title: '提醒设置', arrow: true },
      { id: 'about', icon: 'ℹ️', title: '关于我们', arrow: true },
    ],
    
    // 目标设置对话框
    showGoalDialog: false,
    editingGoal: null,
    goalValue: '',
  },

  onLoad() {
    this.loadUserInfo();
    this.loadProfile();
    this.loadStats();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 2 });
    }
    this.loadUserInfo();
    this.loadProfile();
    this.loadStats();
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo,
        hasUserInfo: true,
      });
    }
  },

  // 加载用户资料
  loadProfile() {
    const profile = getUserProfile();
    const summary = getHealthSummary();
    
    // 加载保存的目标
    const savedGoals = wx.getStorageSync('userGoals') || {};
    const goals = this.data.goals.map(goal => ({
      ...goal,
      value: savedGoals[goal.id] || goal.value,
    }));
    
    this.setData({
      profile: {
        ...profile,
        bmi: summary.bmi || 0,
      },
      goals,
    });
  },

  // 加载统计数据
  loadStats() {
    const dietRecords = wx.getStorageSync('dietRecords') || [];
    const exerciseRecords = wx.getStorageSync('exerciseRecords') || [];
    const healthRecords = wx.getStorageSync('healthRecords') || [];
    const startDate = wx.getStorageSync('startDate') || new Date().toLocaleDateString('zh-CN');
    
    // 计算使用天数
    const start = new Date(startDate);
    const today = new Date();
    const days = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
    
    this.setData({
      stats: {
        totalDays: days,
        dietRecords: dietRecords.length,
        exerciseRecords: exerciseRecords.length,
        healthRecords: healthRecords.length,
      },
    });
    
    // 保存开始日期
    if (!wx.getStorageSync('startDate')) {
      wx.setStorageSync('startDate', startDate);
    }
  },

  // 获取用户信息
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
      fail: () => {
        wx.showToast({
          title: '获取信息失败',
          icon: 'none',
        });
      },
    });
  },

  // 打开目标设置对话框
  openGoalDialog(e) {
    const goal = e.currentTarget.dataset.goal;
    this.setData({
      showGoalDialog: true,
      editingGoal: goal,
      goalValue: goal.value,
    });
  },

  // 关闭目标对话框
  closeGoalDialog() {
    this.setData({ showGoalDialog: false });
  },

  // 输入目标值
  onGoalInput(e) {
    this.setData({ goalValue: e.detail.value });
  },

  // 保存目标
  saveGoal() {
    const { editingGoal, goalValue, goals } = this.data;
    
    if (!goalValue) {
      wx.showToast({
        title: '请输入目标值',
        icon: 'none',
      });
      return;
    }
    
    // 更新目标列表
    const updatedGoals = goals.map(goal => {
      if (goal.id === editingGoal.id) {
        return { ...goal, value: goalValue };
      }
      return goal;
    });
    
    // 保存到本地存储
    const savedGoals = wx.getStorageSync('userGoals') || {};
    savedGoals[editingGoal.id] = goalValue;
    wx.setStorageSync('userGoals', savedGoals);
    
    this.setData({ goals: updatedGoals });
    this.closeGoalDialog();
    
    wx.showToast({
      title: '设置成功',
      icon: 'success',
    });
  },

  // 菜单项点击
  onMenuTap(e) {
    const id = e.currentTarget.dataset.id;
    
    switch (id) {
      case 'history':
        wx.showToast({
          title: '功能开发中',
          icon: 'none',
        });
        break;
      case 'goal':
        wx.showToast({
          title: '请点击上方目标卡片设置',
          icon: 'none',
        });
        break;
      case 'remind':
        wx.showToast({
          title: '功能开发中',
          icon: 'none',
        });
        break;
      case 'about':
        wx.showModal({
          title: '关于健康伙伴',
          content: '健康伙伴 v1.0.0\n\n一款专为亚健康、高体脂人群打造的健康管理小程序。\n\n帮助您科学管理饮食、合理安排运动，轻松达成健康目标。',
          showCancel: false,
          confirmText: '知道了',
        });
        break;
    }
  },

  // 清除数据
  clearData() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有数据吗？此操作不可恢复。',
      confirmColor: '#E53E3E',
      success: res => {
        if (res.confirm) {
          wx.clearStorageSync();
          this.loadProfile();
          this.loadStats();
          wx.showToast({
            title: '已清除数据',
            icon: 'success',
          });
        }
      },
    });
  },

  onShareAppMessage() {
    return {
      title: '健康伙伴 - 你的专属健康管理助手',
      path: '/pages/index/index',
    };
  },
});
