// pages/index/index.js
const { calculateBMI, getBMIStatus, calculateDailyCalories, calculateNutrientGrams } = require('../../utils/health-calculator');
const { exerciseCategories } = require('../../utils/exercise-data');
const { Http } = require('../../utils/http');
const { formatDate } = require('../../utils/util');
const { API } = require('../../config/api');

const app = getApp();

Page({
  data: {
    // 1. 体重进度
    weightData: {
      initial: 0,
      current: 0,
      target: 0,
      diff: 0, // 较初始
      remain: 0, // 距目标
      currentBMI: 0,
      progress: 0, // 进度百分比
    },

    // 2. 热量平衡
    calorieData: {
      intake: 0, // 饮食摄入
      activeBurn: 0, // 运动消耗
      dailyTarget: 0, // 预算
      diff: 0, // 还可吃
      projectedLoss: 0, // 预计日减重 (kg)
    },

    // 3. 营养构成
    nutritionData: {
      carbs: { current: 0, target: 0, percent: 0 },
      protein: { current: 0, target: 0, percent: 0 },
      fat: { current: 0, target: 0, percent: 0 },
    },

    // 4. 饮食记录 (按餐次分组)
    dietRecords: {
      breakfast: { list: [], calories: 0 },
      lunch: { list: [], calories: 0 },
      dinner: { list: [], calories: 0 },
      snack: { list: [], calories: 0 },
      hasRecords: false
    },

    // 5. 运动记录 (按分类分组)
    exerciseRecords: {
      daily: { list: [], duration: 0, calories: 0 },
      cardio: { list: [], duration: 0, calories: 0 },
      strength: { list: [], duration: 0, calories: 0 },
      totalCalories: 0,
      hasRecords: false
    },

    // 6. UI控制
    expandedMeal: {
        breakfast: false,
        lunch: false,
        dinner: false,
        snack: false
    },
    expandedExercise: {
        daily: false,
        cardio: false,
        strength: false
    },

    // UI控制
    showBMIModal: false,
    
    // 功能锁定
    isLocked: true, // 默认锁定
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 0 });
    }
    // 每次显示刷新数据
    this.loadTodayData();
  },

  // 检查分享状态
  checkShareStatus() {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) return;

    const statusUrl = '/api/v1/user/share/status'; 
    
    Http.get(statusUrl, { openId }).then(res => {
      if (res.success) {
        this.setData({
          isLocked: !res.data.hasShared
        });
      }
    }).catch(err => {
        console.error('Check share status failed', err);
    });
  },

  recordShareAction(scene) {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) return;
    
    const recordUrl = '/api/v1/user/share';
    Http.post(recordUrl, {
        openId,
        scene: scene, // 1: 好友, 2: 朋友圈
        page: 'pages/index/index'
    }).then(res => {
        if (res.success) {
            // 记录成功后，如果是首次分享，可能需要更新状态
            // 但因为分享是异步的且用户可能取消，这里直接更新解锁状态也是一种策略（鼓励分享）
            // 用户要求：分享好友/朋友圈都算。点击即算尝试分享。
            this.setData({ isLocked: false });
            wx.showToast({
                title: '解锁成功',
                icon: 'success'
            });
        }
    });
  },
  
  // 处理受限功能点击
  onLockedFeatureTap() {
    if (this.data.isLocked) {
      wx.showToast({
        title: '请先分享解锁功能',
        icon: 'none'
      });
      return;
    }
    // 如果没锁，这种绑定如果是在容器上，内部按钮事件会冒泡，
    // 需要在具体跳转逻辑里判断 isLocked。
    // 但是更好的做法是用蒙层通过 catchtap 拦截点击。
  },

  navigateTo(e) {
      const url = e.currentTarget.dataset.url;
      if (url) wx.navigateTo({ url });
  },

  // 核心数据加载
  loadTodayData() {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) return;
    
    // 检查分享状态
    this.checkShareStatus();

    // 获取今日日期 YYYY-MM-DD
    const dateStr = formatDate(new Date());

    Promise.all([
      Http.get(API.USER_PROFILE, { openId }),            // 档案 (基础代谢计算)
      Http.get(API.USER_GOALS, { openId }),              // 目标
      Http.get(API.USER_DIET_RECORDS, { openId, startDate: dateStr, endDate: dateStr }),     // 饮食记录明细
      Http.get(API.USER_EXERCISE_RECORDS, { openId, startDate: dateStr, endDate: dateStr }), // 运动记录明细
      Http.get(API.USER_DIET_STATS, { openId }),         // 饮食统计 (虽然有记录明细，但统计接口可能有汇总值，这里主要用明细聚合)
    ]).then(([profileRes, goalsRes, dietRes, exerciseRes]) => {
      const profile = profileRes.data || {};
      const goals = goalsRes.data || {};
      const dietList = dietRes.data || [];
      const exerciseList = exerciseRes.data || [];

      // 1. 处理体重数据
      this.processWeightData(profile, goals);

      // 2. 处理其他数据
      this.processDietAndNutrition(dietList, profile, exerciseList);

    }).catch(err => {
      console.error('首页数据加载失败', err);
    });
  },

  // 处理体重进度
  processWeightData(profile, goals) {
    const currentWeight = profile.weight;
    const height = profile.height;
    const targetWeight = goals.targetWeight;
    const initialWeight = profile.originalWeight;

    if (height > 0 && currentWeight > 0) {
      const currentBMI = calculateBMI(currentWeight, height);

      // 计算进度 (初始 -> 目标)
      // 总减重任务 = 初始 - 目标 (假设是减重)
      // 已完成 = 初始 - 当前
      const totalTask = Math.abs(initialWeight - targetWeight);
      const done = Math.abs(initialWeight - currentWeight);
      let progress = 0;
      if (totalTask > 0) {
        progress = (done / totalTask) * 100;
        if (progress > 100) progress = 100;
        if (progress < 0) progress = 0;
      }
      
      this.setData({
        weightData: {
          initial: initialWeight,
          current: currentWeight,
          target: targetWeight,
          diff: (currentWeight - initialWeight).toFixed(1), // 负数代表已减
          remain: (currentWeight - targetWeight).toFixed(1),
          currentBMI,
          progress: progress.toFixed(0)
        }
      });
    }
  },

  // 处理饮食与营养
  processDietAndNutrition(dietList, profile, exerciseList) {
    const dietRecords = {
      breakfast: { list: [], calories: 0 },
      lunch: { list: [], calories: 0 },
      dinner: { list: [], calories: 0 },
      snack: { list: [], calories: 0 },
      hasRecords: dietList.length > 0
    };

    let totalCarbs = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalIntake = 0

    // 映射餐次
    const mealMap = { 'breakfast': '早餐', 'lunch': '午餐', 'dinner': '晚餐', 'snack': '加餐' };
    // 反向映射用于分组
    const typeMap = { '早餐': 'breakfast', '午餐': 'lunch', '晚餐': 'dinner', '加餐': 'snack' };

    dietList.forEach(item => {
      const typeKey = typeMap[item.mealType];
      dietRecords[typeKey].list.push(item);
      dietRecords[typeKey].calories += item.calories;

      totalIntake += item.calories;
      totalCarbs += item.carbs || 0;
      totalProtein += item.protein || 0;
      totalFat += item.fat || 0;
    });
    
    // 计算营养和建议
    const { exerciseRecords, activeBurn } = this.processExerciseData(exerciseList)
    const dailyTarget = calculateDailyCalories(profile);
    const totalBurned = dailyTarget + activeBurn;
    const diff = totalBurned - totalIntake;
    // 预计日减重 (每7700kcal约1kg脂肪)
    // 只有当有缺口(diff < 0)时才计算减重
    const projectedLoss = diff > 0 ? (Math.abs(diff) / 7700).toFixed(2) : 0;
    
    // 假设宏量营养素比例 21:21:58
    const nutrientTargets = calculateNutrientGrams(dailyTarget, { protein: 21, fat: 21, carbs: 58 });

    this.setData({
      dietRecords,
      exerciseRecords,
      calorieData: {
          intake: Math.round(totalIntake),
          diff,
          dailyTarget,
          activeBurn,
          projectedLoss
      },
      nutritionData: {
        carbs: { 
          current: Math.round(totalCarbs), 
          target: Math.round(nutrientTargets.carbsGrams), 
          percent: Math.min(100, (totalCarbs / nutrientTargets.carbsGrams) * 100).toFixed(0) 
        },
        protein: { 
          current: Math.round(totalProtein), 
          target: Math.round(nutrientTargets.proteinGrams), 
          percent: Math.min(100, (totalProtein / nutrientTargets.proteinGrams) * 100).toFixed(0) 
        },
        fat: { 
          current: Math.round(totalFat), 
          target: Math.round(nutrientTargets.fatGrams), 
          percent: Math.min(100, (totalFat / nutrientTargets.fatGrams) * 100).toFixed(0) 
        },
      }
    });
  },

  // 处理运动数据
  processExerciseData(exerciseList) {
    const exerciseRecords = {
      daily: { list: [], calories: 0 },
      cardio: { list: [], calories: 0 },
      strength: { list: [], calories: 0 },
      totalCalories: 0,
      hasRecords: exerciseList.length > 0
    };

    // 需要将 exerciseType 映射到 categories (daily, cardio, strength)
    // 这需要遍历 exerciseCategories
    const getCategory = (name) => {
        for (const cat of exerciseCategories) {
            if (cat.exercises.find(e => e.name === name)) return cat.id; // 'daily', 'cardio', 'strength'
        }
        return 'daily'; // 默认
    };

    exerciseList.forEach(item => {
      const catId = getCategory(item.exerciseType);
      exerciseRecords[catId].list.push(item);
      exerciseRecords[catId].calories += item.calories;
      exerciseRecords.totalCalories += item.calories;
    });

    return { 
      exerciseRecords, 
      activeBurn: Math.round(exerciseRecords.totalCalories) 
    }
  },

  // 交互：显示BMI详情
  showBMIInfo() {
      const { status, suggestions } = getBMIStatus(this.data.weightData.currentBMI);
      wx.showModal({
          title: `BMI ${this.data.weightData.currentBMI} - ${status}`,
          content: suggestions.join('\n'),
          showCancel: false,
          confirmText: '知道了'
      });
  },
  
  // 交互：跳转页面
  navigateTo(e) {
      const url = e.currentTarget.dataset.url;
      if (url) wx.navigateTo({ url });
  },

  // 交互：切换餐次折叠
  toggleMealSection(e) {
    const meal = e.currentTarget.dataset.meal;
    if (meal) {
        this.setData({
            [`expandedMeal.${meal}`]: !this.data.expandedMeal[meal]
        });
    }
  },

  // 交互：切换运动分类折叠
  toggleExerciseSection(e) {
    const category = e.currentTarget.dataset.category;
    if (category) {
        this.setData({
            [`expandedExercise.${category}`]: !this.data.expandedExercise[category]
        });
    }
  },

  onShareAppMessage() {
    this.recordShareAction(1); 
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    
    return {
      title: '拍照识热量，轻松控饮食',
      path: `/pages/questionnaire/questionnaire?referrerId=${openId}&channel=wechat`,
      imageUrl: 'https://whpuedison.online/images/kongka_share.jpg'
    };
  },

  onShareTimeline() {
    // 朋友圈分享
    this.recordShareAction(2);
    
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    return {
          title: '拍照识热量，轻松控饮食',
          query: `referrerId=${openId}&channel=wechat`,
          imageUrl: 'https://whpuedison.online/images/tomato.jpg'
        };
   }
});

