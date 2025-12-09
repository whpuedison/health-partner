// pages/profile/profile.js
const { calculateBMI } = require('../../services/user.service');
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
      { id: 'weight', icon: '⚖️', title: '目标体重', value: '', unit: 'kg', color: '#FFB6C1' }, // 浅粉色
      { id: 'exercise', icon: '🏃', title: '每日运动', value: '', unit: '分钟', color: '#87CEEB' }, // 天蓝色
      { id: 'restDayIntake', icon: '🍽️', title: '非运动日摄入', value: '', unit: '卡', color: '#98D8C8' }, // 薄荷绿
      { id: 'exerciseDayIntake', icon: '🔥', title: '运动日摄入', value: '', unit: '卡', color: '#D4A5FF' }, // 淡紫色
    ],
    
    // 功能菜单
    menuItems: [
      // { id: 'timeline', icon: '📸', title: '体态记录', arrow: true },
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
    this.loadGoals();
    this.loadStats();
  },


  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 2 });
    }
    this.loadUserInfo();
    this.loadProfile();
    this.loadGoals();
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
    // 优先从全局数据或本地存储获取（登录时已获取）
    const cachedProfile = app.globalData.profile || wx.getStorageSync('profile');
    
    if (cachedProfile) {
      const profile = cachedProfile;
      // 计算 BMI
      const bmi = calculateBMI(profile.height, profile.weight);
      
      this.setData({
        profile: {
          height: profile.height || 0,
          weight: profile.weight || 0,
          age: profile.age || 0,
          bmi: bmi > 0 ? parseFloat(bmi.toFixed(1)) : 0,
        },
      });
      
      // 后台刷新数据（不阻塞UI）
      this.refreshProfile();
      return;
    }
    
    // 如果没有缓存数据，从接口获取
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
        const bmi = calculateBMI(profile.height, profile.weight);
        
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

  // 加载用户目标
  loadGoals() {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      // 如果没有 openId，等待一下再试
      setTimeout(() => {
        this.loadGoals();
      }, 500);
      return;
    }

    Http.get(API.USER_GOALS, {
      openId: openId
    }).then((result) => {
      if (result.data) {
        const goalsData = result.data;
        // 更新目标列表
        const goals = this.data.goals.map(goal => {
          let value = '0';
          if (goal.id === 'weight') {
            value = goalsData.targetWeight ? goalsData.targetWeight.toString() : '50';
          } else if (goal.id === 'exercise') {
            value = goalsData.targetExercise ? goalsData.targetExercise.toString() : '30';
          } else if (goal.id === 'restDayIntake') {
            value = goalsData.targetCaloriesRestDay ? goalsData.targetCaloriesRestDay.toString() : '2000';
          } else if (goal.id === 'exerciseDayIntake') {
            value = goalsData.targetCaloriesExerciseDay ? goalsData.targetCaloriesExerciseDay.toString() : '2000';
          }
          return { ...goal, value };
        });
        
        this.setData({ goals });
      }
    }).catch((error) => {
      console.error('获取用户目标失败', error);
      // 如果获取失败，使用默认值
    });
  },

  // 加载统计数据
  loadStats() {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      setTimeout(() => {
        this.loadStats();
      }, 500);
      return;
    }

    Http.get(API.USER_STATS, {
      openId: openId
    }).then((result) => {
      if (result.data) {
        this.setData({
          stats: {
            totalDays: result.data.totalDays || 0,
            dietRecords: result.data.dietRecords || 0,
            exerciseRecords: result.data.exerciseRecords || 0,
            healthRecords: result.data.healthRecords || 0,
          },
        });
      }
    }).catch((error) => {
      console.error('获取统计数据失败', error);
      // 如果获取失败，使用默认值
      this.setData({
        stats: {
          totalDays: 0,
          dietRecords: 0,
          exerciseRecords: 0,
          healthRecords: 0,
        },
      });
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
    const { editingGoal, goalValue } = this.data;
    
    if (!goalValue) {
      wx.showToast({
        title: '请输入目标值',
        icon: 'none',
      });
      return;
    }
    
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }
    
    // 构建更新数据
    const updateData = { openId };
    const numValue = parseFloat(goalValue);
    
    if (editingGoal.id === 'weight') {
      updateData.targetWeight = numValue;
    } else if (editingGoal.id === 'exercise') {
      updateData.targetExercise = parseInt(goalValue);
    } else if (editingGoal.id === 'restDayIntake') {
      updateData.targetCaloriesRestDay = parseInt(goalValue);
    } else if (editingGoal.id === 'exerciseDayIntake') {
      updateData.targetCaloriesExerciseDay = parseInt(goalValue);
    }
    
    // 调用后端接口保存
    Http.post(API.USER_GOALS, updateData).then((result) => {
      if (result.data) {
        // 更新本地目标列表
        const goals = this.data.goals.map(goal => {
          if (goal.id === editingGoal.id) {
            return { ...goal, value: goalValue };
          }
          return goal;
        });
        
        this.setData({ goals });
        this.closeGoalDialog();
        
        wx.showToast({
          title: '设置成功',
          icon: 'success',
        });
      }
    }).catch((error) => {
      console.error('保存目标失败', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
      });
    });
  },

  // 菜单项点击
  onMenuTap(e) {
    const id = e.currentTarget.dataset.id;
    console.log('点击菜单项:', id);
    
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
          title: '关于健康伙伴',
          content: '健康伙伴 v1.0.0\n\n一款专为亚健康、高体脂人群打造的健康管理小程序。\n\n帮助您科学管理饮食、合理安排运动，轻松达成健康目标。',
          showCancel: false,
          confirmText: '知道了',
        });
        break;
      default:
        console.warn('未处理的菜单项:', id);
        break;
    }
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
