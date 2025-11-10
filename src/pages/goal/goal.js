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
    
    this.setData({
      profile,
      idealWeightRange: idealRange,
      bmr,
      tdee,
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
    if (!goals.targetWeight) {
      wx.showToast({
        title: '请填写目标体重',
        icon: 'none',
      });
      return;
    }
    
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

