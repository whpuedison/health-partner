// pages/diet/diet.js
const { getDietRecords, addDietRecord, getDietRecommendations } = require('../../services/health.service');

Page({
  data: {
    activeTab: 0,
    tabs: ['今日记录', '推荐食谱', '营养分析'],
    
    // 今日饮食记录
    todayRecords: [],
    totalCalories: 0,
    targetCalories: 2000,
    
    // 营养统计
    nutrition: {
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    },
    
    // 推荐食谱
    recommendations: [],
    
    // 快捷添加选项
    quickMeals: [
      { name: '早餐', icon: '🌅', time: '07:00-09:00', color: '#FFD93D' },
      { name: '午餐', icon: '☀️', time: '11:30-13:30', color: '#FF6B6B' },
      { name: '晚餐', icon: '🌙', time: '17:30-19:30', color: '#6C5CE7' },
      { name: '加餐', icon: '🍎', time: '随时', color: '#4ECDC4' },
    ],
    
    // 添加弹窗
    showAddDialog: false,
    currentMealType: '',
    foodInput: '',
    caloriesInput: '',
  },

  onLoad() {
    this.loadTodayRecords();
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
    const records = getDietRecords();
    let totalCalories = 0;
    let nutrition = { protein: 0, carbs: 0, fat: 0, fiber: 0 };
    
    records.forEach(record => {
      totalCalories += record.calories;
      if (record.nutrition) {
        nutrition.protein += record.nutrition.protein || 0;
        nutrition.carbs += record.nutrition.carbs || 0;
        nutrition.fat += record.nutrition.fat || 0;
        nutrition.fiber += record.nutrition.fiber || 0;
      }
    });
    
    this.setData({
      todayRecords: records,
      totalCalories: Math.round(totalCalories),
      nutrition,
    });
  },

  // 加载推荐食谱
  loadRecommendations() {
    const recommendations = getDietRecommendations();
    this.setData({ recommendations });
  },

  // 打开添加对话框
  openAddDialog(e) {
    const mealType = e.currentTarget.dataset.type;
    this.setData({
      showAddDialog: true,
      currentMealType: mealType,
      foodInput: '',
      caloriesInput: '',
    });
  },

  // 关闭对话框
  closeAddDialog() {
    this.setData({ showAddDialog: false });
  },

  // 输入处理
  onFoodInput(e) {
    this.setData({ foodInput: e.detail.value });
  },

  onCaloriesInput(e) {
    this.setData({ caloriesInput: e.detail.value });
  },

  // 添加饮食记录
  addRecord() {
    const { foodInput, caloriesInput, currentMealType } = this.data;
    
    if (!foodInput || !caloriesInput) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none',
      });
      return;
    }
    
    const record = {
      id: Date.now(),
      mealType: currentMealType,
      food: foodInput,
      calories: parseInt(caloriesInput),
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('zh-CN'),
    };
    
    addDietRecord(record);
    this.loadTodayRecords();
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
          let records = this.data.todayRecords.filter(r => r.id !== id);
          wx.setStorageSync('dietRecords', records);
          this.loadTodayRecords();
          wx.showToast({
            title: '删除成功',
            icon: 'success',
          });
        }
      },
    });
  },

  // 查看食谱详情
  viewRecipeDetail(e) {
    const recipe = e.currentTarget.dataset.recipe;
    wx.showModal({
      title: recipe.name,
      content: `热量: ${recipe.calories}卡\n\n食材:\n${recipe.ingredients.join('\n')}\n\n做法:\n${recipe.steps}`,
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // 一键使用食谱
  useRecipe(e) {
    const recipe = e.currentTarget.dataset.recipe;
    this.setData({
      showAddDialog: true,
      currentMealType: '午餐',
      foodInput: recipe.name,
      caloriesInput: recipe.calories.toString(),
    });
  },

  onShareAppMessage() {
    return {
      title: '我的饮食计划 - 健康伙伴',
      path: '/pages/diet/diet',
    };
  },
});

