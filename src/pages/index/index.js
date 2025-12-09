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
      intakeCalories: 0, // 今日已摄入热量
      targetIntakeCalories: 0, // 目标摄入热量（目标运动卡路里 + 基础代谢）
      exerciseCalories: 0, // 运动消耗的卡路里
      targetExerciseCalories: 0, // 目标运动消耗的卡路里
    },
    quickActions: [
      { id: 'diet', icon: '🍎', title: '饮食计划', color: '#FFB6C1', url: '/pages/diet-record/diet-record' }, // 浅粉色
      { id: 'exercise', icon: '🏃', title: '运动计划', color: '#87CEEB', url: '/pages/exercise-record/exercise-record' }, // 天蓝色
      { id: 'health', icon: '📊', title: '健康数据', color: '#98D8C8', tab: true }, // 薄荷绿
      { id: 'goal', icon: '🎯', title: '目标设置', color: '#D4A5FF', url: '/pages/goal/goal' }, // 淡紫色
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

    // 并行请求今日进度、运动统计（消耗热量）、饮食统计（摄入热量）、用户档案（用于计算基础代谢）
    Promise.all([
      Http.get(API.USER_TODAY_PROGRESS, { openId }),
      Http.get(API.USER_EXERCISE_STATS, { openId }),
      Http.get(API.USER_DIET_STATS, { openId }),
      Http.get(API.USER_GOALS, { openId }),
      Http.get(API.USER_PROFILE, { openId })
    ]).then(([progressResult, exerciseStatsResult, dietStatsResult, goalsResult, profileResult]) => {
      this._loadingTodayProgress = false;
      
      const progress = progressResult.data || {};
      const exerciseStats = exerciseStatsResult.data || {};
      const dietStats = dietStatsResult.data || {};
      const goals = goalsResult.data || {};
      const profile = profileResult.data || {};
      
      const intakeCalories = Math.round(dietStats.totalCalories || 0);
      const exerciseCalories = Math.round(exerciseStats.totalCalories || 0); // 运动消耗的卡路里
      const targetExercise = progress.exercise?.target || goals.targetExercise || 30;
      const todayExercise = progress.exercise?.completed || 0; // 今日已运动时间
      
      // 计算基础代谢率 (BMR) - 使用 Mifflin-St Jeor 公式
      let bmr = 0;
      if (profile.height && profile.weight && profile.age && profile.gender) {
        if (profile.gender === '男') {
          bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
        } else {
          bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
        }
        bmr = Math.round(bmr);
      }
      
      // 计算目标运动时长对应的卡路里（使用跑步类型，约11卡/分钟）
      const caloriesPerMinute = 11; // 跑步的卡路里消耗
      const targetExerciseCalories = Math.round(targetExercise * caloriesPerMinute);
      
      // 目标摄入热量：如果今日已运动时间 > 0，则用运动日摄入目标，否则用非运动日摄入目标
      let targetIntakeCalories = 0;
      if (todayExercise > 0) {
        // 今日已运动，使用运动日摄入目标
        targetIntakeCalories = goals.targetCaloriesExerciseDay || (targetExerciseCalories + bmr);
      } else {
        // 今日未运动，使用非运动日摄入目标
        targetIntakeCalories = goals.targetCaloriesRestDay || bmr;
      }
      
      this.setData({
        todayStats: {
          exercise: progress.exercise?.completed || 0,
          targetExercise: targetExercise,
          intakeCalories: intakeCalories, // 今日已摄入热量
          targetIntakeCalories: targetIntakeCalories, // 目标摄入热量（目标运动卡路里 + 基础代谢）
          exerciseCalories: exerciseCalories, // 运动消耗的卡路里
          targetExerciseCalories: targetExerciseCalories, // 目标运动消耗的卡路里
        }
      });
    }).catch((error) => {
      this._loadingTodayProgress = false;
      console.error('获取今日完成情况失败', error);
    });
  },

  // 快速打卡/跳转
  onCheckIn(e) {
    const type = e.currentTarget.dataset.type;
    
    // 运动：跳转到运动计划页面
    if (type === 'exercise') {
      wx.navigateTo({
        url: '/pages/exercise-record/exercise-record'
      });
      return;
    }
    
    // 今日已摄入热量：跳转到饮食计划页面
    if (type === 'intake') {
      wx.navigateTo({
        url: '/pages/diet-record/diet-record'
      });
      return;
    }
    
    // 今日已消耗热量：跳转到运动计划页面
    if (type === 'burned') {
      wx.navigateTo({
        url: '/pages/exercise-record/exercise-record'
      });
      return;
    }
    
    // 其他类型
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
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
      // 健康数据页面不再是 tab 页面，使用 navigateTo 跳转
      wx.navigateTo({ url: '/pages/health/health' });
    } else if (url) {
      wx.navigateTo({ url });
    }
  },

  onShareAppMessage() {
    return {
      title: '番茄控卡 - 你的专属健康管理助手',
      path: '/pages/index/index',
    };
  },
});

