const { Http } = require('../../utils/http');
const { API } = require('../../config/api');

Page({
  data: {
    groups: [],
    selectedGroupId: null,
    recipes: [],
    loading: false,
    showEmpty: false // 是否显示空态
  },

  onLoad() {
    this.loadGroups();
  },

  onShow() {
    // 如果当前选中的是"我的食谱"，重新加载以刷新收藏状态
    if (this.data.selectedGroupId === 0) {
      this.loadRecipes(0);
    }
  },

  /**
   * 加载食谱分类
   */
  async loadGroups() {
    try {
      const res = await Http.get(API.RECIPE_GROUPS);
      if (res?.data?.length > 0) {
        const groups = res.data;
        const firstGroupId = groups[0].groupId;
        
        this.setData({
          groups: groups,
          selectedGroupId: firstGroupId
        });

        // 加载第一个分类的食谱
        this.loadRecipes(firstGroupId);
      }
    } catch (error) {
      console.error('加载分类失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  /**
   * 选择分类
   */
  selectGroup(e) {
    const groupId = e.currentTarget.dataset.groupId;
    if (groupId === this.data.selectedGroupId) return;

    this.setData({ selectedGroupId: groupId });
    this.loadRecipes(groupId);
  },

  /**
   * 加载食谱列表
   */
  async loadRecipes(groupId) {
    this.setData({ loading: true, showEmpty: false });

    try {
      const app = getApp();
      const openId = app.globalData.openId || wx.getStorageSync('openId');
      
      const res = await Http.get(API.RECIPE_LIST, { groupId, openId });
      
      // 为每个食谱按顺序分配背景色索引（0-6循环）
      const recipes = (res?.data || []).map((recipe, index) => ({
        ...recipe,
        bgIndex: index % 7 // 按顺序循环使用7个颜色
      }));
      
      // 如果是"我的食谱"且没有数据，显示空态
      const showEmpty = groupId === 0 && recipes.length === 0;
      
      this.setData({
        recipes: recipes,
        loading: false,
        showEmpty: showEmpty
      });
    } catch (error) {
      console.error('加载食谱失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 跳转到食谱详情
   */
  goToDetail(e) {
    const recipeId = e.currentTarget.dataset.recipeId;
    const bgIndex = e.currentTarget.dataset.bgIndex;
    wx.navigateTo({
      url: `/pages/recipe-detail/recipe-detail?recipeId=${recipeId}&bgIndex=${bgIndex}`
    });
  }
});

