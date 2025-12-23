const { Http } = require('../../utils/http');
const { API } = require('../../config/api');

Page({
  data: {
    recipeId: null,
    bgIndex: 0,
    recipeDetail: null,
    dailyMeals: [],
    selectedDayId: null,
    meals: [],
    loading: false
  },

  onLoad(options) {
    const { recipeId, bgIndex } = options;
    if (recipeId) {
      this.setData({ 
        recipeId,
        bgIndex: bgIndex ? parseInt(bgIndex) : 0
      });
      this.loadRecipeDetail(recipeId);
    }
  },

  /**
   * 加载食谱详情
   */
  async loadRecipeDetail(recipeId) {
    this.setData({ loading: true });

    try {
      const res = await Http.get(API.RECIPE_DETAIL, { recipeId });
      
      if (res?.data) {
        const dailyMeals = res.data?.dailyMeals || [];
        const firstDayId = dailyMeals?.length > 0 ? dailyMeals[0].id : null;

        this.setData({
          recipeDetail: res?.data,
          dailyMeals: dailyMeals,
          selectedDayId: firstDayId,
          loading: false
        });

        // 如果有天数数据，加载第一天的饮食安排
        if (firstDayId) {
          this.loadDailyMeal(firstDayId);
        }
      }
    } catch (error) {
      console.error('加载食谱详情失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 选择天数
   */
  selectDay(e) {
    const dayId = e.currentTarget.dataset.dayId;
    if (dayId === this.data.selectedDayId) return;

    this.setData({ selectedDayId: dayId });
    this.loadDailyMeal(dayId);
  },

  /**
   * 加载指定天数的饮食安排
   */
  async loadDailyMeal(dailyMealId) {
    try {
      wx.showLoading({ title: '加载中...' });
      
      const res = await Http.get(API.RECIPE_DAILY_MEAL, { dailyMealId });
      
      wx.hideLoading();

      if (res.success) {
        this.setData({
          meals: res.data || []
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载饮食安排失败:', error);
    }
  }
});

