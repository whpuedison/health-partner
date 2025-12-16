// pages/questionnaire/questionnaire.js
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');
const healthCalculator = require('../../utils/health-calculator');
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
    // 目标日期选择
    targetDate: '',
    targetDateTimestamp: 0,
    showTargetDatePicker: false,
    targetMinDate: new Date().getTime(), // 目标日期至少明天开始
    targetMaxDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).getTime(), // 最多两年后
    daysLeft: 0,
    weeklyChangeForDate: 0,
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
    // 推荐人ID
    referrerId: null,
    // 渠道来源
    channel: null
  },

  onLoad(options) {
    // 获取推荐人ID和渠道来源
    const { referrerId, channel } = options;
    this.setData({
      referrerId,
      channel
    });
    
    // 初始化年龄（基于默认日期）
    const initialDate = new Date(this.data.currentDate);
    const initialAge = healthCalculator.calculateAge(initialDate);
    this.setData({
      age: initialAge,
      ageDescription: healthCalculator.getAgeDescription(initialAge)
    });

    // 检查loading状态
    this.checkLoading();
  },

  // 选择性别
  onSelectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      selectedGender: gender
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
      selectedHeight: height
    });
  },

  // 体重变化处理
  onWeightChange(e) {
    const weight = e.detail.value;
    this.setData({
      selectedWeight: weight,
      // 同时更新目标体重，保证进入第五步时无延迟
      targetWeight: weight
    });

    // 实时计算BMI和目标体重对比
    this.calculateBMI();
  },

  // 目标体重变化处理
  onTargetWeightChange(e) {
    const targetWeight = e.detail.value;
    this.setData({
      targetWeight: targetWeight
    });

    // 计算目标体重对比结果
    this.calculateTargetComparison();
  },

  // 显示日期选择器
  showDatePicker() {
    this.setData({ showDatePicker: true });
  },

  // 隐藏日期选择器
  hideDatePicker() {
    this.setData({ showDatePicker: false });
  },

  // 日期选择器确认（点击确定按钮）
  onDateConfirm(e) {
    const date = new Date(e.detail);
    const formattedDate = healthCalculator.formatDate(date);
    const age = healthCalculator.calculateAge(date);
    const ageDescription = healthCalculator.getAgeDescription(age);

    this.setData({
      showDatePicker: false,
      formattedDate: formattedDate,
      age: age,
      ageDescription: ageDescription
    });
  },

  // 日期选择器取消（点击取消按钮）
  onDateCancel() {
    this.setData({
      showDatePicker: false
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
    const formattedDate = healthCalculator.formatDate(date);
    const daysLeft = healthCalculator.calculateDaysLeft(date);
    const weeksToTarget = daysLeft / 7;
    const { selectedWeight, targetWeight } = this.data
    const weightChangeForDate = healthCalculator.calculateWeeklyChangeForDate(weeksToTarget, selectedWeight, targetWeight);
    const goalDateEncouragement = healthCalculator.getGoalDateEncouragement(weightChangeForDate);

    this.setData({
      showTargetDatePicker: false,
      targetDate: formattedDate,
      targetDateTimestamp: e.detail,
      daysLeft: Math.floor(daysLeft),
      weeklyChangeForDate: weightChangeForDate,
      goalDateEncouragement: goalDateEncouragement
    });
  },

  // 目标日期选择器取消
  onTargetDateCancel() {
    this.setData({ showTargetDatePicker: false });
  },

  // 下一步
  nextStep() {
    console.log('age', this.data.age)
    const nextStepNum = this.data.currentStep + 1;
    this.setData({
      currentStep: nextStepNum
    });
    if (nextStepNum === 6) {
      this.initializeTargetDate()
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

  // 提交问卷
  async submitQuestionnaire() {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    const { selectedGender, selectedHeight, selectedWeight, age, targetWeight, targetDate, referrerId, channel } = this.data;

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
        referrerId, // 传入推荐人ID
        channel // 传入渠道来源
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

      const goalsResult = await Http.post(API.USER_GOALS, goalsData);
      
      if (!goalsResult.success) {
        throw new Error(goalsResult.message || '更新目标失败');
      }

      // 更新全局数据
      if (profileResult.data) {
        app.globalData.profile = profileResult.data;
        wx.setStorageSync('profile', profileResult.data);
      }

      // 计算每日所需卡路里
      const dailyCalories = healthCalculator.calculateDailyCalories({
        currentWeight: selectedWeight,
        height: selectedHeight,
        age: age,
        gender: selectedGender
      });

      // 将卡路里添加到目标数据中
      goalsData.targetCalories = dailyCalories;
    
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

    // BMI公式：体重(kg) ÷ (身高(m)的平方)
    const bmiValue = healthCalculator.calculateBMI(weight, height);

    // 获取BMI状态和建议
    const status = healthCalculator.getBMIStatus(bmiValue);
    const indicatorPosition = healthCalculator.calculateIndicatorPosition(bmiValue);

    this.setData({
      bmi: bmiValue,
      bmiStatus: status.status,
      bmiIndicatorPosition: indicatorPosition,
      bmiSuggestions: status.suggestions
    });
  },

  // 计算目标体重对比
  calculateTargetComparison() {
    const { selectedWeight, targetWeight } = this.data;

    if (!selectedWeight || !targetWeight) {
      this.setData({
        weightChangeType: 'maintain'
      });
      return;
    }

    // 计算体重差异和百分比
    const diff = targetWeight - selectedWeight;
    const percent = Math.abs(diff) / selectedWeight * 100;
    const roundedPercent = Math.round(percent * 10) / 10; // 保留一位小数

    let encouragement = '';
    if (roundedPercent <= 5) {
       encouragement = '🎯 温和减重最健康！逐步调整饮食习惯，你会发现身体发生惊喜变化！';
    } else if (roundedPercent <= 15) {
       encouragement = '🏃‍♀️ 减重目标积极进取！结合运动和饮食控制，你一定能实现理想身材！';
    } else {
       encouragement = '🔥 减重决心值得赞赏！在医生指导下科学减重，恭喜你开启健康之旅！';
    }

    this.setData({
      weightChangePercent: roundedPercent,
      weightChangeType: 'lose',
      targetEncouragement: encouragement
    });
  },

  // 初始化目标日期
  initializeTargetDate() {
    const defaultTargetDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
    const formattedDate = healthCalculator.formatDate(defaultTargetDate);

    this.setData({
      targetDate: formattedDate,
      targetDateTimestamp: defaultTargetDate.getTime()
    });

    // 立即计算目标日期规划
    this.updateTargetDatePlanning(defaultTargetDate.getTime());
  },

  // 更新目标日期规划
  updateTargetDatePlanning(timestamp) {
    const date = new Date(timestamp);
    const daysLeft = healthCalculator.calculateDaysLeft(date);
    const weeksToTarget = daysLeft / 7;
    const { selectedWeight, targetWeight } = this.data
    const weightChangeForDate = healthCalculator.calculateWeeklyChangeForDate(weeksToTarget, selectedWeight, targetWeight);
    const goalDateEncouragement = healthCalculator.getGoalDateEncouragement(weightChangeForDate);

    this.setData({
      daysLeft: Math.floor(daysLeft),
      weeklyChangeForDate: weightChangeForDate,
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
    // 设置超时保护，避免无限loading (只取消loading显示，后台继续检查登录结果)
    setTimeout(() => {
      // 超时后，先让用户能操作，不清除定时器，万一登录稍后成功了还能自动跳走
      if (this.data.isLoading) {
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
        path: `/pages/questionnaire/questionnaire?referrerId=${openId}&channel=wechat`,
        imageUrl: 'https://whpuedison.online/images/kongka_share.jpg'
      };
    },
    
    onShareTimeline() {
      this.recordShareAction(2);
      const openId = app.globalData.openId || wx.getStorageSync('openId');
      return {
            title: '拍照识热量，轻松控饮食',
            query: `referrerId=${openId}&channel=wechat`,
            imageUrl: 'https://whpuedison.online/images/tomato.jpg'
          };
     }
});
