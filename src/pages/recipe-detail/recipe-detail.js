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
    loading: false,
    isFavorite: false // 是否已收藏
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
      const app = getApp();
      const openId = app.globalData.openId || wx.getStorageSync('openId');
      
      const res = await Http.get(API.RECIPE_DETAIL, { recipeId, openId });
      
      if (res?.data) {
        const dailyMeals = res.data?.dailyMeals || [];
        const firstDayId = dailyMeals?.length > 0 ? dailyMeals[0].id : null;

        this.setData({
          recipeDetail: res?.data,
          dailyMeals: dailyMeals,
          selectedDayId: firstDayId,
          isFavorite: res.data?.isFavorite || false,
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
   * 切换收藏状态
   */
  async toggleFavorite() {
    const { recipeId, isFavorite } = this.data;
    const app = getApp();
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    
    if (!openId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    try {
      if (isFavorite) {
        // 取消收藏
        await Http.delete(API.RECIPE_FAVORITE_REMOVE, { openId, recipeId });
        wx.showToast({ title: '已取消收藏', icon: 'success' });
        this.setData({ isFavorite: false });
      } else {
        // 添加收藏
        await Http.post(API.RECIPE_FAVORITE_ADD, { openId, recipeId });
        wx.showToast({ title: '收藏成功', icon: 'success' });
        this.setData({ isFavorite: true });
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      wx.showToast({ title: '操作失败', icon: 'none' });
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

