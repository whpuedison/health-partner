// pages/questionnaire/questionnaire.js
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');
const app = getApp();

Page({
  data: {
    // 是否显示loading
    isLoading: true,
    // 当前步骤（从1开始）
    currentStep: 1,
    // 总步骤数（后续可以扩展）
    totalSteps: 6,
    // 选择的性别
    selectedGender: null,
    // 选择的身高
    selectedHeight: 170,
    // 选择的体重
    selectedWeight: 70,
    // 选择的目标体重（默认为当前体重减2kg作为合理减重目标）
    targetWeight: 70,
    // 目标体重对比
    weightChangePercent: 0,
    weightChangeType: 'maintain', // maintain | gain | lose
    targetEncouragement: '',
    // 目标达成时间线
    targetWeeks: 12, // 默认12周达成目标
    weeklyChange: 0,
    speedMode: 'moderate', // gentle | moderate | aggressive
    timelineEncouragement: '',
    // 目标日期选择
    targetDate: '',
    targetDateTimestamp: new Date(new Date().setMonth(new Date().getMonth() + 1)).getTime(), // 默认一个月后
    showTargetDatePicker: false,
    targetMinDate: new Date().getTime(), // 目标日期至少明天开始
    targetMaxDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).getTime(), // 最多两年后
    daysLeft: 0,
    weeklyChangeForDate: 0,
    weightChangeTypeForDate: 'maintain',
    goalDateEncouragement: '',
    // 出生日期选择
    currentDate: new Date('2000-01-01').getTime(), // 默认2000年1月1日的时间戳
    showDatePicker: false,
    minDate: new Date(new Date().getFullYear() - 80, 0, 1).getTime(), // 最小日期为80年前 (约1944年)
    maxDate: new Date(new Date().getFullYear() - 18, 11, 31).getTime(), // 最大日期为18年前 (约2006年)
    formatter(type, value) {
      if (type === 'year') {
        return `${value}年`;
      }
      if (type === 'month') {
        return `${value}月`;
      }
      return value;
    },
    formattedDate: '2000-01-01',  // 用于显示的格式化日期字符串
    // 年龄计算结果
    age: 0,
    ageDescription: '',
    // BMI计算结果
    bmi: 0,
    bmiStatus: '正常',
    bmiIndicatorPosition: 0,
    bmiSuggestions: [],
    // 问卷数据
    questionnaireData: {
      gender: null,
      height: null,
      weight: null,
      birth_date: null,
      age: null,
      bmi: null,
      target_weight: null,
      target_weight: null,
      target_date: null
    },
    // 推荐人ID
    referrerId: null
  },

  onLoad(options) {
    // 获取推荐人ID
    if (options && options.referrerId) {
      this.setData({
        referrerId: options.referrerId
      });
      console.log('Referrer ID:', options.referrerId);
    }

    // 设置 tabBar 隐藏（如果存在）
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: -1 });
    }

    // 初始化时如果已经有身高体重数据，计算BMI
    this.calculateBMI();

    // 初始化年龄评估（默认2000-01-01）
    const defaultBirth = new Date('2000-01-01');
    const age = this.calculateAge(defaultBirth);
    const ageDescription = this.getAgeDescription(age);
    const formattedDate = this.formatDate(defaultBirth);

    this.setData({
      age: age,
      ageDescription: ageDescription,
      formattedDate: formattedDate
    });

    // 初始化目标体重对比
    this.calculateTargetComparison();

    // 初始化时间线规划
    this.calculateTimelinePlanning();

    // 初始化目标日期（一个月后）
    this.initializeTargetDate();

    // 检查loading状态
    this.checkLoading();
  },

  // 选择性别
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      selectedGender: gender,
      'questionnaireData.gender': gender
    });

    // 延迟一下，让用户看到选择效果，然后进入下一步
    setTimeout(() => {
      this.nextStep();
    }, 300);
  },

  // 身高变化处理
  onHeightChange(e) {
    const height = e.detail.value;
    this.setData({
      selectedHeight: height,
      'questionnaireData.height': height
    });
  },

  // 体重变化处理
  onWeightChange(e) {
    const weight = e.detail.value;
    this.setData({
      selectedWeight: weight,
      targetWeight: weight, // 同时更新目标体重，保证进入第五步时无延迟
      'questionnaireData.weight': weight
    });

    // 实时计算BMI和目标体重对比
    this.calculateBMI();
    this.calculateTargetComparison();
  },

  // 目标体重变化处理
  onTargetWeightChange(e) {
    const targetWeight = e.detail.value;
    this.setData({
      targetWeight: targetWeight,
      'questionnaireData.target_weight': targetWeight
    });

    // 计算目标体重对比结果
    this.calculateTargetComparison();
  },

  // 目标周数变化处理
  onTargetWeeksChange(e) {
    const targetWeeks = e.detail.value;
    this.setData({
      targetWeeks: targetWeeks,
      'questionnaireData.target_weeks': targetWeeks
    });

    // 计算时间线规划和速度评估
    this.calculateTimelinePlanning();
  },

  // 显示日期选择器
  showDatePicker() {
    this.setData({ showDatePicker: true });
  },

  // 隐藏日期选择器
  hideDatePicker() {
    this.setData({ showDatePicker: false });
  },

  // 日期输入处理（用于bind:input）
  onInput(e) {
    this.setData({
      currentDate: e.detail,
    });
  },

  // 日期选择器确认（点击确定按钮）
  onDateConfirm(e) {
    const date = new Date(e.detail);
    const formattedDate = this.formatDate(date);
    const age = this.calculateAge(date);
    const ageDescription = this.getAgeDescription(age);

    this.setData({
      showDatePicker: false,
      formattedDate: formattedDate,
      age: age,
      ageDescription: ageDescription,
      'questionnaireData.birth_date': formattedDate,
      'questionnaireData.age': age
    });
  },

  // 日期选择器取消（点击取消按钮）
  onDateCancel() {
    this.setData({
      showDatePicker: false
    });
  },

  // 出生日期确认（弹窗关闭时触发）
  onPopupClose() {
    // 弹窗手动关闭时也更新数据
    const date = new Date(this.data.currentDate);
    const formattedDate = this.formatDate(date);
    const age = this.calculateAge(date);
    const ageDescription = this.getAgeDescription(age);

    this.setData({
      showDatePicker: false,
      formattedDate: formattedDate,
      age: age,
      ageDescription: ageDescription,
      'questionnaireData.birth_date': formattedDate,
      'questionnaireData.age': age
    });
  },

  // 隐藏日期选择器（弃用）
  hideDatePicker() {
    this.setData({ showDatePicker: false });
  },

  // 显示目标日期选择器
  showTargetDatePicker() {
    this.setData({ showTargetDatePicker: true });
  },

  // 目标日期选择器确认
  onTargetDateConfirm(e) {
    const date = new Date(e.detail);
    const formattedDate = this.formatDate(date);
    const daysLeft = this.calculateDaysLeft(date);
    const weeksToTarget = daysLeft / 7;
    const weightChangeForDate = this.calculateWeeklyChangeForDate(weeksToTarget);
    const changeTypeForDate = this.getWeightChangeTypeForDate(weightChangeForDate);
    const goalDateEncouragement = this.getGoalDateEncouragement(weightChangeForDate, changeTypeForDate);

    this.setData({
      showTargetDatePicker: false,
      targetDate: formattedDate,
      targetDateTimestamp: e.detail,
      daysLeft: Math.floor(daysLeft),
      weeklyChangeForDate: weightChangeForDate,
      weightChangeTypeForDate: changeTypeForDate,
      goalDateEncouragement: goalDateEncouragement,
      'questionnaireData.target_date': formattedDate
    });
  },

  // 目标日期选择器取消
  onTargetDateCancel() {
    this.setData({ showTargetDatePicker: false });
  },

  // 计算到目标日期的天数
  calculateDaysLeft(targetDate) {
    const today = new Date();
    const target = new Date(targetDate);
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays); // 至少1天
  },

  // 计算基于目标日期的每周变化量
  calculateWeeklyChangeForDate(weeks) {
    if (!weeks || weeks <= 0) return 0;

    const { selectedWeight, targetWeight } = this.data;
    const totalChange = targetWeight - selectedWeight;
    return Math.round((totalChange / weeks) * 100) / 100; // 保留两位小数
  },

  // 获取基于日期的体重变化类型
  getWeightChangeTypeForDate(weeklyChange) {
    if (weeklyChange > 0) return 'gain';
    if (weeklyChange < 0) return 'lose';
    return 'maintain';
  },

  // 获取目标日期的鼓励文字
  getGoalDateEncouragement(weeklyChange, changeType) {
    const absWeeklyChange = Math.abs(weeklyChange);

    if (changeType === 'gain') {
      if (absWeeklyChange <= 0.2) {
        return '🌱 科学增重计划已制定！坚持规律锻炼和营养补充，你会健康达成目标！';
      } else if (absWeeklyChange <= 0.5) {
        return '💪 增重进度合理！结合蛋白质补充和力量训练，你的目标指日可待！';
      } else {
        return '⚡ 高效增重方案！在教练指导下科学增肌，让你快速实现理想体态！';
      }
    } else if (changeType === 'lose') {
      if (absWeeklyChange <= 0.3) {
        return '🌿 健康减重第一步！温和调整饮食习惯，你会发现身体发生的惊喜变化！';
      } else if (absWeeklyChange <= 0.7) {
        return '🏃‍♀️ 专业减重方案！结合运动和饮食控制，让你拥有持久的减重效果！';
      } else {
        return '🔥 高效减重计划！在医生指导下科学控制，帮你快速实现目标身材！';
      }
    } else {
      return '🏆 维持现状也很棒！保持健康的生活方式，你已经在正确的轨道上！';
    }
  },

  // 目标日期弹窗关闭处理
  onTargetDatePopupClose() {
    const date = new Date(this.data.targetDateTimestamp);
    const formattedDate = this.formatDate(date);
    const daysLeft = this.calculateDaysLeft(date);
    const weeksToTarget = daysLeft / 7;
    const weightChangeForDate = this.calculateWeeklyChangeForDate(weeksToTarget);
    const changeTypeForDate = this.getWeightChangeTypeForDate(weightChangeForDate);
    const goalDateEncouragement = this.getGoalDateEncouragement(weightChangeForDate, changeTypeForDate);

    this.setData({
      showTargetDatePicker: false,
      targetDate: formattedDate,
      daysLeft: Math.floor(daysLeft),
      weeklyChangeForDate: weightChangeForDate,
      weightChangeTypeForDate: changeTypeForDate,
      goalDateEncouragement: goalDateEncouragement,
      'questionnaireData.target_date': formattedDate
    });
  },

  // 格式化日期为YYYY-MM-DD格式
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 计算年龄
  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  },

  // 获取年龄描述
  getAgeDescription(age) {
    if (age < 18) {
      return '青少年时期，身体发育关键阶段。基础代谢水平较高，建议保持均衡营养摄入和适量运动，促进身体健康成长。';
    } else if (age < 30) {
      return '青年时期，新陈代谢旺盛，能量消耗较高。这是建立健康生活习惯的最好时机，坚持规律锻炼可以帮助维持体形。';
    } else if (age < 45) {
      return '中年初期，工作压力增大，基础代谢水平开始下降。建议注重饮食健康，规律运动，避免脂肪堆积。';
    } else if (age < 60) {
      return '中年后期，基础代谢水平进一步下降，身体各项机能需要保养。建议定期体检，注重骨骼健康和心血管保健。';
    } else if (age < 75) {
      return '老年初期，基础代谢水平明显下降，肌肉量减少。建议补充优质蛋白质，轻柔有氧运动，促进钙吸收。';
    } else {
      return '高龄阶段，需要特别关注营养均衡和身体机能保养。建议定期咨询医生，定制适合的养生方案。';
    }
  },

  // 下一步
  nextStep() {
    const nextStepNum = this.data.currentStep + 1;

      // 如果进入第五步（目标体重选择），设置默认目标体重等于当前体重
      if (nextStepNum === 5 && this.data.selectedWeight) {
        this.setData({
          targetWeight: this.data.selectedWeight, // 默认等于当前体重
          'questionnaireData.target_weight': this.data.selectedWeight,
          currentStep: nextStepNum
        });
      } else if (nextStepNum === 6) {
        // 进入第六步：重新计算目标日期规划，确保方框内容显示正确
        this.setData({
          currentStep: nextStepNum
        });
        // 立即更新目标日期规划显示
        this.updateTargetDatePlanning(this.data.targetDateTimestamp);
      } else {
        this.setData({
          currentStep: nextStepNum
        });
      }
  },

  // 上一步
  prevStep() {
    if (this.data.currentStep > 1) {
      this.setData({
        currentStep: this.data.currentStep - 1
      });
    }
  },

  objToParams(obj) {
    return Object.keys(obj)
      .map(key => `${key}=${encodeURIComponent(obj[key])}`)
      .join('&');
  },

  // 提交问卷
  async submitQuestionnaire() {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    const { selectedGender, selectedHeight, selectedWeight, age, targetWeight, targetDate, referrerId } = this.data;

    // 显示加载提示
    wx.showLoading({
      title: '方案生成中...',
      mask: true
    });

    try {
      // 1. 更新用户健康档案
      const profileData = {
        openId: openId,
        height: selectedHeight,
        weight: selectedWeight,
        age: age,
        gender: selectedGender === 'male' ? '男' : '女',
        referrerId // 传入推荐人ID
      };

      const profileResult = await Http.post(API.USER_PROFILE, profileData);
      
      if (!profileResult.success) {
        throw new Error(profileResult.message || '更新健康档案失败');
      }

      // 2. 更新用户目标
      const goalsData = {
        openId: openId,
        targetWeight: targetWeight,
        targetDate: targetDate // YYYY-MM-DD 格式
      };

      // 计算每日所需卡路里
      const healthCalculator = require('../../utils/health-calculator');
      const dailyCalories = healthCalculator.calculateDailyCalories({
        currentWeight: selectedWeight,
        height: selectedHeight,
        age: age,
        gender: selectedGender,
        metabolismLevel: 'medium' // 默认中等代谢
      });

      // 将卡路里添加到目标数据中
      goalsData.targetCalories = dailyCalories;

      const goalsResult = await Http.post(API.USER_GOALS, goalsData);
      
      if (!goalsResult.success) {
        throw new Error(goalsResult.message || '更新目标失败');
      }

      // 更新全局数据
      if (profileResult.data) {
        app.globalData.profile = profileResult.data;
        wx.setStorageSync('profile', profileResult.data);
      }
    
      // 将问卷数据保存到全局数据，供plan页面使用
      app.globalData.questionnaireData = {
        age,
        targetWeight,
        targetDate,
        gender: selectedGender,
        height: selectedHeight,
        currentWeight: selectedWeight,
        dailyCalories: dailyCalories // 传递计算好的卡路里
      };

     setTimeout(() => {
      wx.hideLoading();
      wx.navigateTo({
        url: '/pages/plan/plan'
      })
     }, 500);
    } catch (error) {
      wx.hideLoading();
      console.error('提交问卷失败:', error);
      wx.showToast({
        title: error.message || '提交失败，请重试',
        icon: 'none',
        duration: 3000
      });
    }
  },

  // 计算BMI
  calculateBMI() {
    const { selectedHeight: height, selectedWeight: weight } = this.data;

    if (!height || !weight || height <= 0 || weight <= 0) {
      // 数据不完整，不计算BMI
      this.setData({
        bmi: 0,
        bmiStatus: '未评估',
        bmiIndicatorPosition: 25, // 正常位置
        bmiSuggestions: []
      });
      return;
    }

    const healthCalculator = require('../../utils/health-calculator');

    // BMI公式：体重(kg) ÷ (身高(m)的平方)
    const bmiValue = parseFloat(healthCalculator.calculateBMI(weight, height));

    // 获取BMI状态和建议
    const status = healthCalculator.getBMIStatus(bmiValue);
    const indicatorPosition = healthCalculator.calculateIndicatorPosition(bmiValue);

    this.setData({
      bmi: bmiValue.toFixed(1),
      bmiStatus: status.status,
      bmiIndicatorPosition: indicatorPosition,
      bmiSuggestions: status.suggestions,
      'questionnaireData.bmi': bmiValue.toFixed(1)
    });
  },

  // 计算目标体重对比
  calculateTargetComparison() {
    const { selectedWeight, targetWeight } = this.data;

    if (!selectedWeight || !targetWeight) {
      this.setData({
        weightChangePercent: 0,
        weightChangeType: 'maintain',
        targetEncouragement: '设定清晰目标是成功的第一步！'
      });
      return;
    }

    // 计算体重差异和百分比
    const diff = targetWeight - selectedWeight;
    const percent = Math.abs(diff) / selectedWeight * 100;
    const roundedPercent = Math.round(percent * 10) / 10; // 保留一位小数

    let changeType = 'maintain';
    let encouragement = '';

    if (diff > 0) {
      // 需要增重
      changeType = 'gain';
      if (roundedPercent <= 5) {
        encouragement = '👏 小幅增重更容易坚持！相信你可以逐步达成目标，加油！';
      } else if (roundedPercent <= 15) {
        encouragement = '💪 增重目标很合理！通过优质蛋白质和规律运动，你能健康达成目标！';
      } else {
        encouragement = '🌟 增重决心很棒！在专业指导下合理增重，身体会发生积极变化！';
      }
    } else if (diff < 0) {
      // 需要减重
      changeType = 'lose';
      if (roundedPercent <= 5) {
        encouragement = '🎯 温和减重最健康！逐步调整饮食习惯，你会发现身体发生惊喜变化！';
      } else if (roundedPercent <= 15) {
        encouragement = '🏃‍♀️ 减重目标积极进取！结合运动和饮食控制，你一定能实现理想身材！';
      } else {
        encouragement = '🔥 减重决心值得赞赏！在医生指导下科学减重，恭喜你开启健康之旅！';
      }
    } else {
      // 体重目标等于当前体重
      changeType = 'maintain';
      encouragement = '📍 你比其他人都了解自己！保持当前体重，意味着你已经找到了平衡状态！';
    }

    this.setData({
      weightChangePercent: roundedPercent,
      weightChangeType: changeType,
      targetEncouragement: encouragement
    });
  },

  // 计算目标达成时间线规划
  calculateTimelinePlanning() {
    const { selectedWeight, targetWeight, targetWeeks } = this.data;

    if (!selectedWeight || !targetWeight || !targetWeeks || targetWeeks <= 0) {
      this.setData({
        weeklyChange: 0,
        speedMode: 'moderate',
        timelineEncouragement: '选择合适的达成周期，让目标更加可行！'
      });
      return;
    }

    // 计算总变化量
    const totalChange = targetWeight - selectedWeight;

    // 计算每周变化量
    const weeklyChangeValue = totalChange / targetWeeks;
    const roundedWeekly = Math.round(weeklyChangeValue * 100) / 100; // 保留两位小数

    // 判断速度模式
    let speedMode = 'moderate';
    let timelineEncouragement = '';

    const absWeeklyChange = Math.abs(roundedWeekly);

    if (totalChange > 0) {
      // 增重模式
      if (absWeeklyChange <= 0.2) {
        speedMode = 'gentle';
        timelineEncouragement = '🌱 温和增重模式：适合长期坚持，注重品质而非速度，身心健康第一！';
      } else if (absWeeklyChange <= 0.5) {
        speedMode = 'moderate';
        timelineEncouragement = '💪 适中增重模式：科学增重的最佳选择，既有效果又安全可靠！';
      } else {
        speedMode = 'aggressive';
        timelineEncouragement = '⚡ 急速增重模式：决心不凡！在专业指导下快速达成目标，展现你的意志力！';
      }
    } else if (totalChange < 0) {
      // 减重模式
      if (absWeeklyChange <= 0.3) {
        speedMode = 'gentle';
        timelineEncouragement = '🌿 温和减重模式：健康减重第一法则，每周0.3kg内最不容易反弹！';
      } else if (absWeeklyChange <= 0.7) {
        speedMode = 'moderate';
        timelineEncouragement = '🏃‍♀️ 适中减重模式：专业级减重速度，既有效果又能保持健康活力！';
      } else {
        speedMode = 'aggressive';
        timelineEncouragement = '🔥 急速减重模式：燃烧意志的时刻！科学控制下高速减重，需要强大的自律力！';
      }
    } else {
      // 维持体重
      speedMode = 'gentle';
      timelineEncouragement = '🏆 体重维持模式：你已经找到了最佳状态！保持稳定意味着养生智慧！';
    }

    this.setData({
      weeklyChange: roundedWeekly,
      speedMode: speedMode,
      timelineEncouragement: timelineEncouragement
    });
  },

  // 初始化目标日期
  initializeTargetDate() {
    const defaultTargetDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
    const formattedDate = this.formatDate(defaultTargetDate);

    this.setData({
      targetDate: formattedDate,
      'questionnaireData.target_date': formattedDate
    });

    // 立即计算目标日期规划
    this.updateTargetDatePlanning(defaultTargetDate.getTime());
  },

  // 更新目标日期规划
  updateTargetDatePlanning(timestamp) {
    const date = new Date(timestamp);
    const daysLeft = this.calculateDaysLeft(date);
    const weeksToTarget = daysLeft / 7;
    const weightChangeForDate = this.calculateWeeklyChangeForDate(weeksToTarget);
    const changeTypeForDate = this.getWeightChangeTypeForDate(weightChangeForDate);
    const goalDateEncouragement = this.getGoalDateEncouragement(weightChangeForDate, changeTypeForDate);

    this.setData({
      daysLeft: Math.floor(daysLeft),
      weeklyChangeForDate: weightChangeForDate,
      weightChangeTypeForDate: changeTypeForDate,
      goalDateEncouragement: goalDateEncouragement
    });
  },

  // 检查loading状态
  checkLoading() {
    if (!app.globalData.loading) {
      // 如果loading已完成，检查是否有profile
      if (app.globalData.profile) {
        // 有用户信息，直接跳转到首页
        wx.reLaunch({
          url: '/pages/index/index',
        });
      } else {
        // 隐藏loading，显示问卷
        this.setData({
          isLoading: false
        });
      }
      return;
    }

    // 如果还在loading，监听变化
    this.loadingTimer = setInterval(() => {
      if (!app.globalData.loading) {
        clearInterval(this.loadingTimer);
        if (app.globalData.profile) {
          // 有用户信息，跳转到首页
          wx.reLaunch({
            url: '/pages/index/index',
          });
        } else {
          // 隐藏loading，显示问卷
          this.setData({
            isLoading: false
          });
        }
      }
    }, 200); // 每200ms检查一次

    // 设置超时保护，避免无限loading
    setTimeout(() => {
      if (this.loadingTimer) {
        clearInterval(this.loadingTimer);
        // 如果超时，默认显示问卷
        this.setData({
          isLoading: false
        });
      }
    }, 8000); // 8秒超时
  },

  onUnload() {
    // 清除定时器
    if (this.loadingTimer) {
      clearInterval(this.loadingTimer);
      this.loadingTimer = null;
    }
  },

  // 计算进度百分比
  getProgressPercent() {
    return (this.data.currentStep / this.data.totalSteps) * 100;
  },

    recordShareAction(scene) {
        const openId = app.globalData.openId || wx.getStorageSync('openId');
        if (!openId) return;
        
        const recordUrl = '/api/v1/user/share';
        Http.post(recordUrl, {
            openId,
            scene: scene, 
            page: 'pages/questionnaire/questionnaire' // 记录来源页面
        }).then(res => {
            if (res.success) {
                this.setData({ isLocked: false });
                wx.showToast({
                    title: '解锁成功',
                    icon: 'success'
                });
            }
        });
      },
  
    onShareAppMessage() {
      this.recordShareAction(1);
      const openId = app.globalData.openId || wx.getStorageSync('openId');
      return {
        title: '拍照识热量，轻松控饮食',
        path: `/pages/questionnaire/questionnaire?referrerId=${openId}`,
        imageUrl: 'https://whpuedison.online/images/kongka_share.jpg'
      };
    },
    
    onShareTimeline() {
      this.recordShareAction(2);
      const openId = app.globalData.openId || wx.getStorageSync('openId');
      return {
            title: '拍照识热量，轻松控饮食',
            query: `referrerId=${openId}`,
            imageUrl: 'https://whpuedison.online/images/tomato.jpg'
          };
     }
});
