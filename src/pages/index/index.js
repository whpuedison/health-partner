// pages/index/index.js
const { calculateBMI, getBMIStatus, calculateDailyCalories, calculateNutrientGrams } = require('../../utils/health-calculator');
const { exerciseCategories } = require('../../utils/exercise-data');
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');

const app = getApp();

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    nickname: '',
    
    // 1. 体重进度
    weightData: {
      initial: 0,
      current: 0,
      target: 0,
      diff: 0, // 较初始
      remain: 0, // 距目标
      currentBMI: 0,
      initialBMI: 0,
      targetBMI: 0,
      progress: 0, // 进度百分比
    },

    // 2. 热量平衡
    calorieData: {
      intake: 0,
      burned: 0, // 运动消耗 + 基础代谢
      activeBurn: 0,
      diff: 0, // 摄入 - 消耗
      projectedLoss: 0, // 预计日减重 (kg)
      gapStatus: '', // 燃脂区间/过量等
    },

    // 3. 营养构成
    nutritionData: {
      carbs: { current: 0, target: 0, percent: 0 },
      protein: { current: 0, target: 0, percent: 0 },
      fat: { current: 0, target: 0, percent: 0 },
      totalCalories: 0,
      advice: '' // 智能建议
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
      totalDuration: 0,
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

    // UI控制
    showBMIModal: false,
    bmiModalData: null,
    
    // 健康小贴士
    healthTips: [
      '💧 每天喝足8杯水，促进新陈代谢',
      '😴 保持7-8小时优质睡眠',
      '🏃 每天至少30分钟有氧运动',
      '🥗 多吃蔬菜水果，均衡营养',
    ],
    currentTip: 0,
    
    // 功能锁定
    isLocked: true, // 默认锁定
  },

  onLoad() {
    this.startTipRotation();
    // 初始加载
    this.initData();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 0 });
    }
    // 每次显示刷新数据
    this.initData();
  },

  onUnload() {
    if (this.tipTimer) clearInterval(this.tipTimer);
    if (this._userDataTimer) clearTimeout(this._userDataTimer);
  },

  initData() {
    this.loadUserData();
    this.loadTodayData();
  },

  loadUserData() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (userInfo && (userInfo.nickName || userInfo.avatarUrl)) {
      this.setData({
        userInfo: userInfo,
        nickname: userInfo.nickName || '',
        hasUserInfo: !!(userInfo.avatarUrl && userInfo.nickName)
      });
    }
  },

  // 检查分享状态
  checkShareStatus() {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) return;

    // 添加新的 API 常量到 api.js 或者直接在这里使用路径（建议统一管理，但这里先直接请求）
    // 假设 API.USER_SHARE_STATUS = '/api/v1/user/share/status'
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
      // 检查是否受限链接
      const url = e.currentTarget.dataset.url;
      // 饮食记录和拍照记录页面受限
      if (url && (url.includes('diet-record'))) {
          if (this.data.isLocked) {
               wx.showToast({
                title: '请先分享解锁功能',
                icon: 'none'
              });
              return;
          }
      }
      if (url) wx.navigateTo({ url });
  },

  // 核心数据加载
  loadTodayData() {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) return;
    
    // 检查分享状态
    this.checkShareStatus();

    // 获取今日日期 YYYY-MM-DD
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

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

      // 2. 处理热量与营养数据 (依赖饮食记录)
      this.processDietAndNutrition(dietList, profile, goals);

      // 3. 处理运动数据 (依赖运动记录)
      this.processExerciseData(exerciseList);

      // 4. 汇总热量平衡 (依赖上述计算结果)
      this.calculateCalorieBalance(profile);

    }).catch(err => {
      console.error('首页数据加载失败', err);
    });
  },

  // 处理体重进度
  processWeightData(profile, goals) {
    const currentWeight = profile.weight || 0;
    const height = profile.height || 0;
    const targetWeight = goals.targetWeight || 0;
    
    const initialWeight = profile.originalWeight;

    if (height > 0 && currentWeight > 0) {
      const currentBMI = calculateBMI(currentWeight, height);
      const initialBMI = calculateBMI(initialWeight, height);
      const targetBMI = calculateBMI(targetWeight, height);

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
          initialBMI,
          targetBMI,
          progress: progress.toFixed(0)
        }
      });
    }
  },

  // 处理饮食与营养
  processDietAndNutrition(dietList, profile, goals) {
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
    let totalIntake = 0;

    // 映射餐次
    const mealMap = { 'breakfast': '早餐', 'lunch': '午餐', 'dinner': '晚餐', 'snack': '加餐' };
    // 反向映射用于分组
    const typeMap = { '早餐': 'breakfast', '午餐': 'lunch', '晚餐': 'dinner', '加餐': 'snack' };

    dietList.forEach(item => {
      const typeKey = typeMap[item.mealType] || 'snack';
      dietRecords[typeKey].list.push(item);
      dietRecords[typeKey].calories += item.calories;

      totalIntake += item.calories;
      totalCarbs += item.carbs || 0;
      totalProtein += item.protein || 0;
      totalFat += item.fat || 0;
    });

    this.setData({
      dietRecords,
      calorieData: {
        ...this.data.calorieData,
        intake: Math.round(totalIntake)
      }
    });

    // 计算营养和建议
    // 这里简单使用 calculateDailyCalories 或者 goals 中的值
    const activeBurn = this.data.calorieData.activeBurn;
    const dailyTarget = calculateDailyCalories(profile) + activeBurn;
    
    // 假设宏量营养素比例 21:21:58 (或者从 profile/goals 获取)
    const nutrientTargets = calculateNutrientGrams(dailyTarget, { protein: 21, fat: 21, carbs: 58 });
    
    // 生成建议
    let advice = '营养均衡，继续保持！';
    if (totalProtein < nutrientTargets.proteinGrams * 0.8) advice = '蛋白质摄入不足，建议增加肉蛋奶摄入。';
    else if (totalCarbs > nutrientTargets.carbsGrams * 1.2) advice = '碳水摄入偏高，建议晚餐减少主食。';
    else if (totalFat > nutrientTargets.fatGrams * 1.2) advice = '脂肪摄入偏高，注意控制油脂。';

    this.setData({
      nutritionData: {
        totalCalories: {
          current: Math.round(totalIntake),
          target: Math.round(dailyTarget),
          percent: Math.min(100, (totalIntake / dailyTarget) * 100).toFixed(0)
        },
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
        advice
      }
    });
  },

  // 处理运动数据
  processExerciseData(exerciseList) {
    const exerciseRecords = {
      daily: { list: [], duration: 0, calories: 0 },
      cardio: { list: [], duration: 0, calories: 0 },
      strength: { list: [], duration: 0, calories: 0 },
      totalDuration: 0,
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
      exerciseRecords[catId].duration += item.duration;
      exerciseRecords[catId].calories += item.calories;

      exerciseRecords.totalDuration += item.duration;
      exerciseRecords.totalCalories += item.calories;
    });

    this.setData({
        exerciseRecords,
        calorieData: {
            ...this.data.calorieData,
            activeBurn: Math.round(exerciseRecords.totalCalories)
        }
    });
  },

  // 计算热量平衡
  calculateCalorieBalance(profile) {
    const intake = this.data.calorieData.intake;
    const activeBurn = this.data.calorieData.activeBurn;
    const totalBurned = calculateDailyCalories(profile) + activeBurn;
    const diff = intake - totalBurned;
    
    // 预计日减重 (每7700kcal约1kg脂肪)
    // 只有当有缺口(diff < 0)时才计算减重
    const projectedLoss = diff < 0 ? (Math.abs(diff) / 7700).toFixed(2) : 0;
    
    let gapStatus = '';
    if (diff < -300 && diff > -800) gapStatus = '🔥 燃脂区间';
    else if (diff <= -800) gapStatus = '⚠️ 缺口过大';
    else if (diff > 300) gapStatus = '📈 热量盈余';
    else gapStatus = '⚖️ 热量平衡';

    this.setData({
        calorieData: {
            intake,
            activeBurn,
            burned: totalBurned,
            diff: diff, // 显示如 -500
            projectedLoss,
            gapStatus
        }
    });
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

  startTipRotation() {
    this.tipTimer = setInterval(() => {
      const next = (this.data.currentTip + 1) % this.data.healthTips.length;
      this.setData({ currentTip: next });
    }, 5000);
  },

  onShareAppMessage() {
    this.recordShareAction(1); 
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    
    return {
      title: '拍照识热量，轻松控饮食',
      path: `/pages/questionnaire/questionnaire?referrerId=${openId}`, // 带上 openId
      imageUrl: 'https://whpuedison.online/images/kongka_share.jpg'
    };
  },

  onShareTimeline() {
    // 朋友圈分享
    this.recordShareAction(2);
    
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    return {
          title: '拍照识热量，轻松控饮食',
          path: `/pages/questionnaire/questionnaire?referrerId=${openId}`, // 带上 openId
          imageUrl: 'https://whpuedison.online/images/tomato.jpg'
        };
   }
});

