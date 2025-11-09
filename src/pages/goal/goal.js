// pages/goal/goal.js
const { getUserProfile, getIdealWeightRange, calculateBMR, calculateTDEE } = require('../../services/user.service');

Page({
  data: {
    profile: null,
    idealWeightRange: { min: 0, max: 0 },
    bmr: 0,
    tdee: 0,
    
    goals: {
      targetWeight: '',
      targetBodyFat: '',
      targetDate: '',
      dailyCalories: '2000',
      dailyExercise: '30',
      dailyWater: '8',
    },
  },

  onLoad() {
    this.loadData();
  },

  loadData() {
    const profile = getUserProfile();
    const idealRange = getIdealWeightRange(profile.height, profile.gender);
    const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
    const tdee = calculateTDEE(bmr);
    
    // 加载已保存的目标
    const savedGoals = wx.getStorageSync('userGoals') || {};
    const goals = {
      targetWeight: savedGoals.weight || '',
      targetBodyFat: savedGoals.bodyFat || '',
      targetDate: savedGoals.targetDate || '',
      dailyCalories: savedGoals.calories || '2000',
      dailyExercise: savedGoals.exercise || '30',
      dailyWater: savedGoals.water || '8',
    };
    
    this.setData({
      profile,
      idealWeightRange: idealRange,
      bmr,
      tdee,
      goals,
    });
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`goals.${field}`]: e.detail.value,
    });
  },

  onDateChange(e) {
    this.setData({
      'goals.targetDate': e.detail.value,
    });
  },

  saveGoals() {
    const { goals } = this.data;
    
    // 验证输入
    if (!goals.targetWeight || !goals.targetBodyFat) {
      wx.showToast({
        title: '请填写目标体重和体脂率',
        icon: 'none',
      });
      return;
    }
    
    // 保存到本地存储
    const savedGoals = {
      weight: goals.targetWeight,
      bodyFat: goals.targetBodyFat,
      targetDate: goals.targetDate,
      calories: goals.dailyCalories,
      exercise: goals.dailyExercise,
      water: goals.dailyWater,
    };
    
    wx.setStorageSync('userGoals', savedGoals);
    
    wx.showToast({
      title: '保存成功',
      icon: 'success',
      success: () => {
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      },
    });
  },

  onShareAppMessage() {
    return {
      title: '设定健康目标 - 健康伙伴',
      path: '/pages/goal/goal',
    };
  },
});

