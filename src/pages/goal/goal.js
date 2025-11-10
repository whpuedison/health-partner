// pages/goal/goal.js
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');
const { calculateBMI } = require('../../services/user.service');

const app = getApp();

Page({
  data: {
    profile: {
      weight: 0,
      height: 0,
      age: 0,
      gender: '男',
      bmi: 0
    },
    idealWeightRange: { min: 0, max: 0 },
    bmr: 0,
    tdee: 0,
    today: '',
    
    goals: {
      targetWeight: '',
      targetDate: '',
      dailyCalories: '',
      dailyExercise: '',
      dailyWater: '',
    },
  },

  onLoad() {
    // 设置今天的日期（用于日期选择器的start）
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.setData({
      today: `${year}-${month}-${day}`
    });
    
    this.loadData();
  },

  loadData() {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      setTimeout(() => {
        this.loadData();
      }, 500);
      return;
    }

    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    Http.get(API.USER_GOAL_PAGE_DATA, {
      openId: openId
    }).then((result) => {
      wx.hideLoading();
      if (result.data) {
        const data = result.data;
        
        // 计算BMI（如果后端没有返回）
        let bmi = data.profile.bmi;
        if (!bmi && data.profile.height && data.profile.weight) {
          bmi = calculateBMI(data.profile.height, data.profile.weight);
        }
        
        this.setData({
          profile: {
            ...data.profile,
            bmi: bmi
          },
          idealWeightRange: data.idealWeightRange,
          bmr: data.bmr,
          tdee: data.tdee,
          goals: {
            targetWeight: data.goals.targetWeight ? data.goals.targetWeight.toString() : '',
            targetDate: data.goals.targetDate || '',
            dailyCalories: data.goals.targetCalories ? data.goals.targetCalories.toString() : data.tdee.toString(),
            dailyExercise: data.goals.targetExercise ? data.goals.targetExercise.toString() : '30',
            dailyWater: data.goals.targetWater ? data.goals.targetWater.toString() : '8',
          }
        });
      }
    }).catch((error) => {
      wx.hideLoading();
      console.error('加载目标设置数据失败', error);
      wx.showToast({
        title: error.message || '加载失败，请重试',
        icon: 'none',
      });
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
    
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }

    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    Http.post(API.USER_GOALS, {
      openId: openId,
      targetWeight: parseFloat(goals.targetWeight),
      targetDate: goals.targetDate || null,
      targetExercise: parseInt(goals.dailyExercise) || 30,
      targetWater: parseInt(goals.dailyWater) || 8,
      targetCalories: parseInt(goals.dailyCalories) || this.data.tdee
    }).then((result) => {
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        success: () => {
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        },
      });
    }).catch((error) => {
      wx.hideLoading();
      console.error('保存目标失败', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
      });
    });
  },

  onShareAppMessage() {
    return {
      title: '设定健康目标 - 健康伙伴',
      path: '/pages/goal/goal',
    };
  },
});

