// pages/plan/plan.js
Page({
    data: {
      // 用户基本信息
      gender: 'female',
      age: 22,
      height: 165,
      currentWeight: 56.3,
      targetWeight: 51.2,
      bmi: 22.0,
      bmiStatus: '正常',
      bmiStatusClass: 'bmi-normal',
      
      // 代谢水平
      metabolismLevel: 'high',
      metabolismText: '高',
      
      // 目标信息
      weightLossTotal: 5.1,
      planDays: 119,
      weeklyLossRate: 0.3,
      formattedTargetDate: '2026-04-01',
      difficultyClass: 'difficulty-medium',
      difficultyText: '适中',
      progressPercentage: 0, // 进度百分比，默认0
      
      // 饮食方案
      dailyCalories: 1856,
      proteinPercent: 21,
      proteinGrams: null,
      fatPercent: 21,
      fatGrams: null,
      carbsPercent: 58,
      carbsGrams: null,
      dietMethod: '16+8轻断食减肥法',
      
      // 运动方案
      cardioCalories: 250,
      
      // 其他
      showSuccessStories: true
    },
  
    onLoad: function(options) {
      console.log('方案页面接收到的参数：', options);
      
      // 从app.globalData中获取数据
      this.initDataFromGlobalData();
      
      // 计算相关数据
      this.calculatePlanData();
      
      // 初始化进度动画
      this.startProgressAnimation();
    },
  
    onShow: function() {
      // 页面显示时的逻辑
    },
  
    /**
     * 从app.globalData初始化数据
     */
    initDataFromGlobalData: function() {
      const app = getApp();
      const questionnaireData = app.globalData.questionnaireData || {};
      
      // 从全局数据获取问卷结果
      this.setData({
        gender: questionnaireData.gender || 'female',
        age: parseInt(questionnaireData.age) || 22,
        height: parseFloat(questionnaireData.height) || 165,
        currentWeight: parseFloat(questionnaireData.currentWeight) || 56.3,
        targetWeight: parseFloat(questionnaireData.targetWeight) || 51.2,
        formattedTargetDate: questionnaireData.targetDate || '',
        dailyCalories: questionnaireData.dailyCalories || null // 读取计算好的卡路里
      });
    },
  
    /**
     * 计算计划数据
     */
    calculatePlanData: function() {
      const healthCalculator = require('../../utils/health-calculator');
      const { currentWeight, targetWeight, height, age, gender, dailyCalories: preCalculatedCalories } = this.data;
      
      // 1. 计算总减重目标
      const weightLossTotal = (currentWeight - targetWeight).toFixed(1);
      
      // 2. 计算BMI
      const bmi = healthCalculator.calculateBMI(currentWeight, height);
      const { status: bmiStatus, statusClass: bmiStatusClass } = healthCalculator.getBMIStatus(parseFloat(bmi));
      
      // 3. 计算代谢水平
      const { metabolismLevel, metabolismText } = healthCalculator.getMetabolismLevel(age);
      
      // 4. 计算减重难度
      const { difficultyClass, difficultyText } = healthCalculator.getDifficultyLevel(
        weightLossTotal, 
        this.data.planDays
      );
      
      // 5. 使用预计算的每日热量（从问卷传过来的）
      const dailyCalories = preCalculatedCalories || healthCalculator.calculateDailyCalories({
        currentWeight,
        height,
        age,
        gender,
        metabolismLevel
      });

      // 6. 计算营养素克数
      const { proteinPercent, fatPercent, carbsPercent } = this.data;
      const { proteinGrams, fatGrams, carbsGrams } = healthCalculator.calculateNutrientGrams(
        dailyCalories,
        { protein: proteinPercent, fat: fatPercent, carbs: carbsPercent }
      );

      // 7. 计算计划天数（如果提供了目标日期）
      if (this.data.formattedTargetDate) {
        const planDays = healthCalculator.calculatePlanDays(this.data.formattedTargetDate);
        this.setData({ planDays: planDays });
      }

      // 8. 计算每周减重率
      const weeklyLossRate = healthCalculator.calculateWeeklyLossRate(weightLossTotal, this.data.planDays);
      
      // 更新数据
      this.setData({
        weightLossTotal: weightLossTotal,
        bmi: bmi,
        bmiStatus: bmiStatus,
        bmiStatusClass: bmiStatusClass,
        metabolismLevel: metabolismLevel,
        metabolismText: metabolismText,
        difficultyClass: difficultyClass,
        difficultyText: difficultyText,
        dailyCalories: dailyCalories,
        proteinGrams: proteinGrams,
        fatGrams: fatGrams,
        carbsGrams: carbsGrams,
        weeklyLossRate: weeklyLossRate
      });
    },
  
    /**
     * 开始进度条动画
     */
    startProgressAnimation: function() {
      // 模拟进度加载动画
      let progress = 0;
      const timer = setInterval(() => {
        progress += 5;
        if (progress > 100) {
          progress = 100;
          clearInterval(timer);
        }
        this.setData({
          progressPercentage: progress
        });
      }, 30);
    },
  
    /**
     * 开始计划按钮点击事件
     */
    startPlan: function() {
        wx.switchTab({
            url: '/pages/index/index'
        });
    },
  
    /**
     * 返回上一页
     */
    goBack: function() {
      wx.navigateBack({
        delta: 1
      });
    }
  });
