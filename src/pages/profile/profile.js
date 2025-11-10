// pages/profile/profile.js
const { getUserProfile } = require('../../services/user.service');
const { getHealthSummary } = require('../../services/health.service');
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
    const profile = getUserProfile();
    const summary = getHealthSummary();
    
    this.setData({
      profile: {
        ...profile,
        bmi: summary.bmi || 0,
      },
    });
  },

  // 加载统计数据
  loadStats() {
    this.setData({
      stats: {
        totalDays: 0,
        dietRecords: 0,
        exerciseRecords: 0,
        healthRecords: 0,
      },
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

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  onShareAppMessage() {
    return {
      title: '健康伙伴 - 你的专属健康管理助手',
      path: '/pages/index/index',
    };
  },
});
