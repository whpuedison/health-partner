// pages/index/index.js
const { calculateBMI, getHealthStatus } = require('../../services/user.service');
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
      status: '未评估',
    },
    todayStats: {
      exercise: 0,
      targetExercise: 30,
      water: 0,
      targetWater: 8,
      calories: 0,
      targetCalories: 0, // 将从用户目标中获取，或使用默认值
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
    // 重置重试计数器
    this._userDataRetryCount = 0;
    // 加载用户数据（会自动重试直到获取到数据）
    this.loadUserData();
    
    this.loadHealthData();
    this.loadTodayProgress();
    this.startTipRotation();
  },


  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 0 });
    }
    // 每次显示时都重新加载用户数据，确保显示最新信息
    // 重置重试计数器，允许重新尝试
    this._userDataRetryCount = 0;
    this.loadUserData();
    this.loadHealthData();
    // 刷新今日进度（从其他页面返回时可能需要更新）
    this.loadTodayProgress();
  },

  onUnload() {
    if (this.tipTimer) {
      clearInterval(this.tipTimer);
    }
    // 清除用户数据加载定时器
    if (this._userDataTimer) {
      clearTimeout(this._userDataTimer);
      this._userDataTimer = null;
    }
    // 重置重试计数器
    this._userDataRetryCount = 0;
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
      // 如果已经有数据，清除轮询定时器
      if (this._userDataTimer) {
        clearTimeout(this._userDataTimer);
        this._userDataTimer = null;
      }
    } else {
      // 如果没有数据，延迟再试（最多尝试3次，每次间隔500ms）
      if (!this._userDataRetryCount) {
        this._userDataRetryCount = 0;
      }
      if (this._userDataRetryCount < 3) {
        this._userDataRetryCount++;
        this._userDataTimer = setTimeout(() => {
          this.loadUserData();
        }, 500);
      } else {
        // 重置计数器，以便下次可以重试
        this._userDataRetryCount = 0;
      }
    }
  },


  loadHealthData() {
    // 从全局数据或本地存储获取健康档案数据（登录时已获取）
    const profile = app.globalData.profile || wx.getStorageSync('profile');
    
    if (profile && (profile.height || profile.weight)) {
      const bmi = calculateBMI(profile.height, profile.weight);
      const status = getHealthStatus(bmi);
      
      this.setData({
        healthData: {
          bmi: bmi > 0 ? parseFloat(bmi.toFixed(1)) : 0,
          weight: profile.weight || 0,
          height: profile.height || 0,
          status: status.bmiStatus || '未评估',
        },
      });
    } else {
      // 如果没有健康档案数据，显示默认值
      this.setData({
        healthData: {
          bmi: 0,
          weight: 0,
          height: 0,
          status: '未评估',
        },
      });
    }
  },

  // 加载今日完成情况
  loadTodayProgress() {
    // 防止重复调用
    if (this._loadingTodayProgress) {
      return;
    }
    
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      setTimeout(() => {
        this.loadTodayProgress();
      }, 500);
      return;
    }

    this._loadingTodayProgress = true;

    // 并行请求今日进度和运动统计（卡路里）
    Promise.all([
      Http.get(API.USER_TODAY_PROGRESS, { openId }),
      Http.get(API.USER_EXERCISE_STATS, { openId }),
      Http.get(API.USER_GOALS, { openId })
    ]).then(([progressResult, statsResult, goalsResult]) => {
      this._loadingTodayProgress = false;
      
      const progress = progressResult.data || {};
      const stats = statsResult.data || {};
      const goals = goalsResult.data || {};
      
      this.setData({
        todayStats: {
          exercise: progress.exercise?.completed || 0,
          targetExercise: progress.exercise?.target || 30,
          water: progress.water?.completed || 0,
          targetWater: progress.water?.target || 8,
          calories: stats.totalCalories || 0,
          targetCalories: goals.targetCalories || 0, // 如果没有目标，则不显示进度条
        }
      });
    }).catch((error) => {
      this._loadingTodayProgress = false;
      console.error('获取今日完成情况失败', error);
    });
  },

  // 快速打卡
  onCheckIn(e) {
    const type = e.currentTarget.dataset.type;
    const currentValue = e.currentTarget.dataset.value || 0;
    
    // 运动时长和卡路里打卡：跳转到运动计划页面
    if (type === 'exercise' || type === 'calories') {
      wx.navigateTo({
        url: '/pages/exercise/exercise'
      });
      return;
    }
    
    // 根据类型确定默认增加值和单位
    let defaultValue = 0;
    let unit = '';
    let title = '';
    
    if (type === 'water') {
      defaultValue = 1;
      unit = '杯';
      title = '饮水打卡';
    }
    
    wx.showModal({
      title: title,
      editable: true,
      placeholderText: `请输入${unit}数（当前：${currentValue}${unit}）`,
      success: (res) => {
        if (res.confirm) {
          const value = res.content ? parseFloat(res.content) : defaultValue;
          if (isNaN(value) || value <= 0) {
            wx.showToast({
              title: '请输入有效数值',
              icon: 'none',
            });
            return;
          }
          
          this.doCheckIn(type, value);
        }
      }
    });
  },

  // 执行打卡
  doCheckIn(type, value) {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }
    
    wx.showLoading({
      title: '打卡中...',
      mask: true
    });
    
    Http.post(API.USER_CHECK_IN, {
      openId: openId,
      type: type,
      value: value
    }).then((result) => {
      wx.hideLoading();
      if (result.data) {
        // 更新今日完成情况
        const progress = result.data;
        // 重新加载完整数据（包括卡路里）
        this.loadTodayProgress();
        
        wx.showToast({
          title: '打卡成功',
          icon: 'success',
        });
      }
    }).catch((error) => {
      wx.hideLoading();
      console.error('打卡失败', error);
      wx.showToast({
        title: '打卡失败，请重试',
        icon: 'none',
      });
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

