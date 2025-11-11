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
    calorieRecommendation: null, // 新的推荐热量信息
    today: '',
    
    goals: {
      targetWeight: '',
      targetDate: '',
      restDayCalories: '',
      exerciseDayCalories: '',
      dailyExercise: '',
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
          calorieRecommendation: data.calorieRecommendation,
          goals: {
            targetWeight: data.goals.targetWeight ? data.goals.targetWeight.toString() : '',
            targetDate: data.goals.targetDate || '',
            restDayCalories: data.goals.targetCaloriesRestDay ? data.goals.targetCaloriesRestDay.toString() : (data.calorieRecommendation ? data.calorieRecommendation.restDayIntake.toString() : ''),
            exerciseDayCalories: data.goals.targetCaloriesExerciseDay ? data.goals.targetCaloriesExerciseDay.toString() : (data.calorieRecommendation ? data.calorieRecommendation.exerciseDayIntake.toString() : ''),
            dailyExercise: data.goals.targetExercise ? data.goals.targetExercise.toString() : '30',
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
    }, () => {
      // 当目标体重或运动时长变化时，重新计算推荐热量
      if (field === 'targetWeight' || field === 'dailyExercise') {
        this.updateCalorieRecommendation();
      }
      // 当热量输入变化时，如果还没有值，使用推荐值填充
      if ((field === 'restDayCalories' || field === 'exerciseDayCalories') && !e.detail.value && this.data.calorieRecommendation) {
        if (field === 'restDayCalories' && !this.data.goals.restDayCalories) {
          this.setData({
            'goals.restDayCalories': this.data.calorieRecommendation.restDayIntake.toString()
          });
        } else if (field === 'exerciseDayCalories' && !this.data.goals.exerciseDayCalories) {
          this.setData({
            'goals.exerciseDayCalories': this.data.calorieRecommendation.exerciseDayIntake.toString()
          });
        }
      }
    });
  },
  
  // 更新推荐热量（根据当前输入的目标体重和运动时长）
  updateCalorieRecommendation() {
    const { profile, goals, bmr } = this.data;
    if (!bmr || !profile.weight) return;
    
    const targetWeight = goals.targetWeight ? parseFloat(goals.targetWeight) : null;
    const exerciseDuration = goals.dailyExercise ? parseInt(goals.dailyExercise) : 0;
    
    // 调用后端接口重新计算推荐热量
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) return;
    
    // 防抖：避免频繁请求
    clearTimeout(this.recommendationTimer);
    this.recommendationTimer = setTimeout(() => {
      const params = { openId: openId };
      if (targetWeight) {
        params.targetWeight = targetWeight;
      }
      if (exerciseDuration) {
        params.exerciseDuration = exerciseDuration;
      }
      
      Http.get(API.USER_GOAL_PAGE_DATA, params)
        .then((result) => {
          if (result.data && result.data.calorieRecommendation) {
            this.setData({
              calorieRecommendation: result.data.calorieRecommendation
            });
          }
        })
        .catch((err) => {
          console.error('更新推荐热量失败', err);
        });
    }, 500); // 500ms 防抖
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

    const exerciseDuration = parseInt(goals.dailyExercise) || 30;
    const targetWeight = parseFloat(goals.targetWeight);
    
    // 保存目标
    Http.post(API.USER_GOALS, {
      openId: openId,
      targetWeight: targetWeight,
      targetDate: goals.targetDate || null,
      targetExercise: exerciseDuration,
      targetCaloriesRestDay: goals.restDayCalories ? parseInt(goals.restDayCalories) : null,
      targetCaloriesExerciseDay: goals.exerciseDayCalories ? parseInt(goals.exerciseDayCalories) : null
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

