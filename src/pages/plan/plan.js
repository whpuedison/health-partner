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
  
    onShareAppMessage: function() {
      return {
        title: '我的专属体重管理方案',
        path: '/pages/plan/plan',
        imageUrl: '/images/share-poster.jpg'
      };
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
        formattedTargetDate: questionnaireData.targetDate || ''
      });
    },
  
    /**
     * 计算计划相关数据
     */
    calculatePlanData: function() {
      const { currentWeight, targetWeight, age, height } = this.data;
      
      // 1. 计算总减重量
      const weightLossTotal = (currentWeight - targetWeight).toFixed(1);
      
      // 2. 计算BMI和状态
      const heightInM = height / 100;
      const bmi = (currentWeight / (heightInM * heightInM)).toFixed(1);
      const { bmiStatus, bmiStatusClass } = this.getBMIStatus(bmi);
      
      // 3. 计算代谢水平
      const { metabolismLevel, metabolismText } = this.getMetabolismLevel(age);
      
      // 4. 计算减重难度
      const { difficultyClass, difficultyText } = this.getDifficultyLevel(
        weightLossTotal, 
        this.data.planDays
      );
      
      // 5. 计算每日热量
      const dailyCalories = this.calculateDailyCalories();

      // 6. 计算营养素克数
      const { proteinPercent, fatPercent, carbsPercent } = this.data;
      const proteinGrams = ((proteinPercent / 100) * dailyCalories / 4).toFixed(1);
      const fatGrams = ((fatPercent / 100) * dailyCalories / 9).toFixed(1);
      const carbsGrams = ((carbsPercent / 100) * dailyCalories / 4).toFixed(1);

      // 7. 计算计划天数（如果提供了目标日期）
      if (this.data.formattedTargetDate) {
        const planDays = this.calculatePlanDays(this.data.formattedTargetDate);
        this.setData({ planDays: planDays });
      }

      // 8. 计算每周减重率
      const weeklyLossRate = (weightLossTotal / (this.data.planDays / 7)).toFixed(1);
      
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
     * 获取BMI状态
     */
    getBMIStatus: function(bmi) {
      if (bmi < 18.5) {
        return { bmiStatus: '偏瘦', bmiStatusClass: 'bmi-underweight' };
      } else if (bmi < 24) {
        return { bmiStatus: '正常', bmiStatusClass: 'bmi-normal' };
      } else if (bmi < 28) {
        return { bmiStatus: '偏重', bmiStatusClass: 'bmi-overweight' };
      } else {
        return { bmiStatus: '肥胖', bmiStatusClass: 'bmi-obese' };
      }
    },
  
    /**
     * 获取代谢水平
     */
    getMetabolismLevel: function(age) {
      if (age < 30) {
        return { metabolismLevel: 'high', metabolismText: '高' };
      } else if (age < 50) {
        return { metabolismLevel: 'medium', metabolismText: '中' };
      } else {
        return { metabolismLevel: 'low', metabolismText: '低' };
      }
    },
  
    /**
     * 获取难度等级
     */
    getDifficultyLevel: function(weightLossTotal, planDays) {
      const weeklyLoss = (weightLossTotal / (planDays / 7)).toFixed(1);
      
      if (weeklyLoss < 0.5) {
        return { difficultyClass: 'difficulty-easy', difficultyText: '轻松' };
      } else if (weeklyLoss < 0.8) {
        return { difficultyClass: 'difficulty-medium', difficultyText: '适中' };
      } else {
        return { difficultyClass: 'difficulty-hard', difficultyText: '挑战' };
      }
    },
  
    /**
     * 计算每日建议热量
     */
    calculateDailyCalories: function() {
      const { currentWeight, height, age, gender, metabolismLevel } = this.data;
      
      // 基础代谢率 (BMR) 计算
      let bmr;
      if (gender === 'male') {
        bmr = 10 * currentWeight + 6.25 * height - 5 * age + 5;
      } else {
        bmr = 10 * currentWeight + 6.25 * height - 5 * age - 161;
      }
      
      // 根据活动水平调整
      let activityMultiplier = 1.375;
      // switch(metabolismLevel) {
      //   case 'high':
      //     activityMultiplier = 1.55; // 中等活动
      //     break;
      //   case 'medium':
      //     activityMultiplier = 1.375; // 轻度活动
      //     break;
      //   case 'low':
      //     activityMultiplier = 1.2; // 久坐
      //     break;
      //   default:
      //     activityMultiplier = 1.375;
      // }
      
      // 维持当前体重的每日热量
      const maintenanceCalories = bmr * activityMultiplier;
      
      // 减重热量缺口 (500卡路里缺口，约每周减重0.5kg)
      const weightLossCalories = maintenanceCalories - 500;
      
      return Math.round(weightLossCalories);
    },
  
    /**
     * 计算计划天数
     */
    calculatePlanDays: function(targetDateStr) {
      const today = new Date();
      const targetDate = new Date(targetDateStr);
      
      // 计算相差的天数
      const timeDiff = targetDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      return Math.max(daysDiff, 1); // 至少1天
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
