const { Http } = require('../../utils/http');
const { API } = require('../../config/api');

Page({
  data: {
    recipeId: null,
    bgIndex: 0,
    recipeDetail: null,
    dailyMeals: [],
    selectedDayId: null,
    selectedDayNumber: 1, // 当前选中的天数索引
    meals: [],
    loading: false,
    isFavorite: false, // 是否已收藏
    
    // 打卡相关
    checkInProgress: null, // 打卡进度数据
    showStartModal: false, // 是否显示开始选择弹窗
    showCheckInModal: false, // 是否显示打卡成功弹窗
    checkInResult: null, // 打卡结果数据
    currentDayChecked: false, // 当前天是否已打卡
    
    // 会员相关
    isMember: false, // 是否是会员
  },

  onLoad(options) {
    const { recipeId, bgIndex } = options;
    if (recipeId) {
      this.setData({ 
        recipeId,
        bgIndex: bgIndex ? parseInt(bgIndex) : 0
      });
      this.loadRecipeData(recipeId);
    }
  },

  /**
   * 加载食谱数据（包含详情和打卡进度）
   */
  async loadRecipeData(recipeId) {
    this.setData({ loading: true });

    try {
      const app = getApp();
      const openId = app.globalData.openId || wx.getStorageSync('openId');
      
      // 并行加载食谱详情和打卡进度
      const [detailRes, progressRes] = await Promise.all([
        Http.get(API.RECIPE_DETAIL, { recipeId, openId }),
        Http.get(API.RECIPE_CHECKIN_PROGRESS, { recipeId, openId })
      ]);
      
      if (detailRes?.data) {
        const dailyMeals = detailRes.data?.dailyMeals || [];
        
        // 检查会员状态
        const isMember = detailRes.data?.userInfo?.isMember || false;
        
        this.setData({
          recipeDetail: detailRes.data,
          dailyMeals: dailyMeals,
          isFavorite: detailRes.data?.isFavorite || false,
          checkInProgress: progressRes?.data || null,
          isMember: isMember,
          loading: false
        });

        // 根据打卡进度决定显示哪一天
        this.handleInitialDaySelection(dailyMeals, progressRes?.data);
      }
    } catch (error) {
      console.error('加载食谱数据失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 处理初始天数选择
   */
  handleInitialDaySelection(dailyMeals, progress) {
    if (!dailyMeals || dailyMeals.length === 0) return;

    // 首次进入或无打卡记录：直接进入第1天
    if (!progress || !progress.hasCheckInRecord) {
      const firstDayId = dailyMeals[0].id;
      const currentDayChecked = false;
      this.setData({ 
        selectedDayId: firstDayId,
        selectedDayNumber: 1,
        currentDayChecked
      });
      this.loadDailyMeal(firstDayId);
      return;
    }

    // 有打卡记录：显示选择弹窗
    this.setData({ showStartModal: true });
  },

  /**
   * 选择继续打卡
   */
  onContinueCheckIn() {
    const { dailyMeals, checkInProgress } = this.data;
    
    // 找到下一个应该打卡的天数
    let targetDayNumber = checkInProgress.nextDay;
    
    // 如果已完成，从第1天开始
    if (checkInProgress.isCompleted || targetDayNumber > dailyMeals.length) {
      targetDayNumber = 1;
    }
    
    const targetDay = dailyMeals.find(day => day.dayNumber === targetDayNumber);
    if (targetDay) {
      const currentDayChecked = checkInProgress?.dayCheckStatus[targetDayNumber] || false;
      this.setData({ 
        selectedDayId: targetDay.id,
        selectedDayNumber: targetDayNumber,
        currentDayChecked,
        showStartModal: false
      });
      this.loadDailyMeal(targetDay.id);
    }
  },

  /**
   * 选择重新开始
   */
  onRestartCheckIn() {
    wx.showModal({
      title: '确认重新开始',
      content: '重新开始将清空当前打卡记录，是否继续？',
      confirmText: '确认',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.resetCheckIn();
        }
      }
    });
  },

  /**
   * 重置打卡记录
   */
  async resetCheckIn() {
    const { recipeId, dailyMeals } = this.data;
    const app = getApp();
    const openId = app.globalData.openId || wx.getStorageSync('openId');

    try {
      wx.showLoading({ title: '重置中...' });
      
      await Http.post(API.RECIPE_CHECKIN_RESET, { openId, recipeId });
      
      wx.hideLoading();
      wx.showToast({ title: '已重置', icon: 'success' });
      
      // 重新加载打卡进度
      const progressRes = await Http.get(API.RECIPE_CHECKIN_PROGRESS, { recipeId, openId });
      
      // 进入第1天
      const firstDayId = dailyMeals[0].id;
      const currentDayChecked = progressRes?.data?.dayCheckStatus[1] || false;
      this.setData({
        checkInProgress: progressRes?.data || null,
        selectedDayId: firstDayId,
        selectedDayNumber: 1,
        currentDayChecked,
        showStartModal: false
      });
      this.loadDailyMeal(firstDayId);
      
    } catch (error) {
      wx.hideLoading();
      console.error('重置失败:', error);
      wx.showToast({ title: '重置失败', icon: 'none' });
    }
  },

  /**
   * 关闭开始弹窗（默认继续）
   */
  onCloseStartModal() {
    this.onContinueCheckIn();
  },

  /**
   * 执行打卡
   */
  async onCheckIn() {
    const { recipeId, selectedDayId, dailyMeals, checkInProgress } = this.data;
    const app = getApp();
    const openId = app.globalData.openId || wx.getStorageSync('openId');

    if (!openId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 找到当前天数
    const currentDay = dailyMeals.find(day => day.id === selectedDayId);
    if (!currentDay) return;

    const dayNumber = currentDay.dayNumber;

    // 检查是否已打卡
    if (checkInProgress?.dayCheckStatus[dayNumber]) {
      wx.showToast({ title: '该天已打卡', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '打卡中...' });
      
      const res = await Http.post(API.RECIPE_CHECKIN, {
        openId,
        recipeId,
        dailyMealId: selectedDayId,
        dayNumber
      });
      
      wx.hideLoading();
      
      if (res.success) {
        // 重新加载打卡进度
        const progressRes = await Http.get(API.RECIPE_CHECKIN_PROGRESS, { recipeId, openId });
        
        const currentDayChecked = progressRes?.data?.dayCheckStatus[dayNumber] || false;
        
        this.setData({
          checkInProgress: progressRes?.data || null,
          checkInResult: res.data,
          currentDayChecked,
          showCheckInModal: true
        });
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('打卡失败:', error);
      wx.showToast({ title: error.message || '打卡失败', icon: 'none' });
    }
  },

  /**
   * 继续下一天
   */
  onContinueNextDay() {
    const { dailyMeals, checkInProgress } = this.data;
    
    // 找到下一个未打卡的天数
    let nextDayNumber = checkInProgress.nextDay;
    
    if (nextDayNumber > dailyMeals.length) {
      // 已完成全部
      this.setData({ showCheckInModal: false });
      return;
    }
    
    const nextDay = dailyMeals.find(day => day.dayNumber === nextDayNumber);
    if (nextDay) {
      const currentDayChecked = checkInProgress?.dayCheckStatus[nextDayNumber] || false;
      this.setData({ 
        selectedDayId: nextDay.id,
        selectedDayNumber: nextDayNumber,
        currentDayChecked,
        showCheckInModal: false
      });
      this.loadDailyMeal(nextDay.id);
    }
  },

  /**
   * 留在当前/关闭弹窗
   */
  onStayCurrent() {
    this.setData({ showCheckInModal: false });
  },

  /**
   * 完成后重新开始
   */
  onRestartAfterComplete() {
    this.setData({ showCheckInModal: false });
    this.onRestartCheckIn();
  },

  /**
   * 返回食谱列表
   */
  onBackToList() {
    wx.navigateBack();
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
        // 使用 POST 请求，通过 query 参数指定 method=DELETE
        await Http.post(API.RECIPE_FAVORITE_REMOVE, { openId, recipeId });
        wx.showToast({ title: '已取消收藏', icon: 'success' });
        this.setData({ isFavorite: false });
      } else {
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

    // 找到对应的天数信息
    const selectedDay = this.data.dailyMeals.find(day => day.id === dayId);
    const dayNumber = selectedDay ? selectedDay.dayNumber : 1;
    const currentDayChecked = this.data.checkInProgress?.dayCheckStatus[dayNumber] || false;

    this.setData({ 
      selectedDayId: dayId,
      selectedDayNumber: dayNumber,
      currentDayChecked
    });
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
  },

  /**
   * 跳转到会员页面
   */
  onNavigateToMember() {
    wx.navigateTo({
      url: '/pages/member/member'
    })
  }
});

