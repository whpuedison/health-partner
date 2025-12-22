const { Http } = require('../../utils/http');
const { API } = require('../../config/api');

Page({
  data: {
    groups: [],
    selectedGroupId: null,
    recipes: [],
    loading: false
  },

  onLoad() {
    this.loadGroups();
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
    this.setData({ loading: true });

    try {
      const res = await Http.get(API.RECIPE_LIST, { groupId });
      
      // 为每个食谱分配随机背景色索引
      const recipes = (res?.data || []).map(recipe => ({
        ...recipe,
        bgIndex: Math.floor(Math.random() * 7) // 0-6 随机索引
      }));
      
      this.setData({
        recipes: recipes,
        loading: false
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
    wx.navigateTo({
      url: `/pages/recipe-detail/recipe-detail?recipeId=${recipeId}`
    });
  }
});

