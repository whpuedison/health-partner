// pages/exercise/exercise.js
const { getExerciseRecords, addExerciseRecord, getExerciseRecommendations } = require('../../services/health.service');

Page({
  data: {
    activeTab: 0,
    tabs: ['今日运动', '运动推荐', '运动记录'],
    
    // 今日运动数据
    todayStats: {
      duration: 0,
      calories: 0,
      distance: 0,
      target: 30,
    },
    
    // 运动记录
    todayRecords: [],
    weekRecords: [],
    
    // 运动推荐
    recommendations: [],
    
    // 快捷运动
    quickExercises: [
      { id: 1, name: '跑步', icon: '🏃', calories: 300, duration: 30, color: '#FF6B6B' },
      { id: 2, name: '游泳', icon: '🏊', calories: 400, duration: 30, color: '#4ECDC4' },
      { id: 3, name: '骑行', icon: '🚴', calories: 250, duration: 30, color: '#FFD93D' },
      { id: 4, name: '瑜伽', icon: '🧘', calories: 150, duration: 30, color: '#A8E6CF' },
      { id: 5, name: '力量训练', icon: '🏋️', calories: 200, duration: 30, color: '#9B59B6' },
      { id: 6, name: '跳绳', icon: '🪢', calories: 350, duration: 30, color: '#E74C3C' },
    ],
    
    // 添加对话框
    showAddDialog: false,
    currentExercise: null,
    durationInput: '',
    caloriesInput: '',
  },

  onLoad() {
    this.loadTodayRecords();
    this.loadWeekRecords();
    this.loadRecommendations();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: -1 });
    }
  },

  // 切换标签
  onTabChange(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ activeTab: index });
  },

  // 加载今日记录
  loadTodayRecords() {
    const records = getExerciseRecords('today');
    let totalDuration = 0;
    let totalCalories = 0;
    let totalDistance = 0;
    
    records.forEach(record => {
      totalDuration += record.duration || 0;
      totalCalories += record.calories || 0;
      totalDistance += record.distance || 0;
    });
    
    this.setData({
      todayRecords: records,
      todayStats: {
        ...this.data.todayStats,
        duration: totalDuration,
        calories: Math.round(totalCalories),
        distance: totalDistance.toFixed(1),
      },
    });
  },

  // 加载本周记录
  loadWeekRecords() {
    const records = getExerciseRecords('week');
    this.setData({ weekRecords: records });
  },

  // 加载运动推荐
  loadRecommendations() {
    const recommendations = getExerciseRecommendations();
    this.setData({ recommendations });
  },

  // 打开添加对话框
  openAddDialog(e) {
    const exercise = e.currentTarget.dataset.exercise;
    this.setData({
      showAddDialog: true,
      currentExercise: exercise,
      durationInput: exercise.duration.toString(),
      caloriesInput: exercise.calories.toString(),
    });
  },

  // 关闭对话框
  closeAddDialog() {
    this.setData({ showAddDialog: false });
  },

  // 输入处理
  onDurationInput(e) {
    this.setData({ durationInput: e.detail.value });
  },

  onCaloriesInput(e) {
    this.setData({ caloriesInput: e.detail.value });
  },

  // 添加运动记录
  addRecord() {
    const { currentExercise, durationInput, caloriesInput } = this.data;
    
    if (!durationInput || !caloriesInput) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none',
      });
      return;
    }
    
    const record = {
      id: Date.now(),
      name: currentExercise.name,
      icon: currentExercise.icon,
      duration: parseInt(durationInput),
      calories: parseInt(caloriesInput),
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('zh-CN'),
    };
    
    addExerciseRecord(record);
    this.loadTodayRecords();
    this.loadWeekRecords();
    this.closeAddDialog();
    
    wx.showToast({
      title: '添加成功',
      icon: 'success',
    });
  },

  // 删除记录
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: res => {
        if (res.confirm) {
          let records = wx.getStorageSync('exerciseRecords') || [];
          records = records.filter(r => r.id !== id);
          wx.setStorageSync('exerciseRecords', records);
          this.loadTodayRecords();
          this.loadWeekRecords();
          wx.showToast({
            title: '删除成功',
            icon: 'success',
          });
        }
      },
    });
  },

  // 开始运动计划
  startPlan(e) {
    const plan = e.currentTarget.dataset.plan;
    wx.showModal({
      title: plan.name,
      content: `难度: ${plan.level}\n时长: ${plan.duration}分钟\n\n${plan.description}\n\n立即开始运动？`,
      confirmText: '开始',
      success: res => {
        if (res.confirm) {
          wx.showToast({
            title: '开始运动！加油！',
            icon: 'success',
          });
        }
      },
    });
  },

  onShareAppMessage() {
    return {
      title: '我的运动计划 - 健康伙伴',
      path: '/pages/exercise/exercise',
    };
  },
});

