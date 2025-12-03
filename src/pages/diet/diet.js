// pages/diet/diet.js
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');

const app = getApp();

Page({
  data: {
    activeTab: 0,
    tabs: ['今日记录', '营养分析'], // 隐藏推荐食谱

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

    // 添加选项状态
    showAddDialog: false,
    dialogStep: 'category', // 'category' | 'food' | 'unit'

    // 级联选择状态
    currentMealType: '',

    // 分类数据
    categories: [],
    selectedCategory: null,

    // 食物数据
    foods: [],
    selectedFood: null,
    searchKeyword: '',

    // 单位数据
    units: [],
    selectedUnit: null,
    customWeight: '', // 自定义重量（克）

    // 计算后的营养信息
    calculatedNutrition: null,

    // 拍照识图状态
    showRecognitionDialog: false,
    recognitionData: null, // 识别结果数据 { foods, totalNutrition, healthScore }
    editingFoodIndex: -1, // 正在编辑的食物索引
    isSavingRecognition: false, // 是否正在保存识别结果（防止重复点击）

    _loadingCategories: false,
    _loadingFoods: false,
    _loadingUnits: false,
    _recognizing: false,
  },

  onLoad() {
    this.loadUserGoals();
    this.loadTodayRecords();
    this.loadTodayStats();
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

  // 获取 openId
  getOpenId() {
    return app.globalData.openId || wx.getStorageSync('openId');
  },

  // 加载用户目标
  loadUserGoals() {
    const openId = this.getOpenId();
    if (!openId) {
      setTimeout(() => this.loadUserGoals(), 500);
      return;
    }

    Http.get(API.USER_GOALS, { openId })
      .then(res => {
        if (res.data && res.data.targetCalories) {
          this.setData({
            targetCalories: res.data.targetCalories || 2000,
          });
        }
      })
      .catch(err => {
        console.error('加载用户目标失败:', err);
      });
  },

  // 加载今日记录
  loadTodayRecords() {
    const openId = this.getOpenId();
    if (!openId) {
      setTimeout(() => this.loadTodayRecords(), 500);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    Http.get(API.USER_DIET_RECORDS, {
      openId,
      startDate: today,
      endDate: today,
    })
      .then(res => {
        if (res.data) {
          const records = res.data.map(record => ({
            id: record.id,
            mealType: record.mealType,
            food: record.foodName,
            foodName: record.foodName, // 保留foodName字段用于删除确认
            foodIcon: record.foodIcon || '🍽️', // 食物图标
            calories: record.calories,
            time: new Date(record.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            date: record.recordDate,
          }));
          this.setData({ todayRecords: records });
        }
      })
      .catch(err => {
        console.error('加载今日记录失败:', err);
      });
  },

  // 加载今日统计
  loadTodayStats() {
    const openId = this.getOpenId();
    if (!openId) {
      setTimeout(() => this.loadTodayStats(), 500);
      return;
    }

    Http.get(API.USER_DIET_STATS, { openId })
      .then(res => {
        if (res.data) {
          this.setData({
            totalCalories: res.data.totalCalories || 0,
            nutrition: {
              protein: res.data.totalProtein || 0,
              carbs: res.data.totalCarbs || 0,
              fat: res.data.totalFat || 0,
              fiber: res.data.totalFiber || 0,
            },
          });
        }
      })
      .catch(err => {
        console.error('加载今日统计失败:', err);
      });
  },

  // 打开添加对话框（第一步：选择分类）
  openAddDialog(e) {
    const mealType = e.currentTarget.dataset.type;
    this.setData({
      showAddDialog: true,
      dialogStep: 'category',
      currentMealType: mealType,
      selectedCategory: null,
      selectedFood: null,
      selectedUnit: null,
      foods: [],
      units: [],
      searchKeyword: '',
      customWeight: '',
      calculatedNutrition: null,
    });
    this.loadCategories();
  },

  // 关闭对话框
  closeAddDialog() {
    this.setData({
      showAddDialog: false,
      dialogStep: 'category',
      selectedCategory: null,
      selectedFood: null,
      selectedUnit: null,
      foods: [],
      units: [],
      searchKeyword: '',
      customWeight: '',
      calculatedNutrition: null,
    });
  },

  // 加载分类列表
  loadCategories() {
    if (this.data._loadingCategories) return;
    this.setData({ _loadingCategories: true });

    Http.get(API.FOOD_CATEGORIES)
      .then(res => {
        if (res.data) {
          this.setData({
            categories: res.data,
            _loadingCategories: false,
          });
        } else {
          this.setData({ _loadingCategories: false });
        }
      })
      .catch(err => {
        console.error('加载分类失败:', err);
        this.setData({ _loadingCategories: false });
      });
  },

  // 选择分类（第二步：显示食物列表）
  selectCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    const category = this.data.categories.find(c => c.id === categoryId);
    
    this.setData({
      selectedCategory: category,
      dialogStep: 'food',
      selectedFood: null,
      units: [],
      searchKeyword: '',
    });
    
    this.loadFoods(categoryId);
  },

  // 加载食物列表
  loadFoods(categoryId) {
    if (this.data._loadingFoods) return;
    this.setData({ _loadingFoods: true });

    Http.get(API.FOOD_FOODS, { categoryId })
      .then(res => {
        if (res.data) {
          this.setData({
            foods: res.data,
            _loadingFoods: false,
          });
        } else {
          this.setData({ _loadingFoods: false });
        }
      })
      .catch(err => {
        console.error('加载食物列表失败:', err);
        this.setData({ _loadingFoods: false });
      });
  },

  // 搜索食物
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    
    if (keyword.trim()) {
      this.searchFoods(keyword);
    } else {
      // 如果清空搜索，恢复分类下的食物列表
      if (this.data.selectedCategory) {
        this.loadFoods(this.data.selectedCategory.id);
      }
    }
  },

  // 搜索食物
  searchFoods(keyword) {
    if (this.data._loadingFoods) return;
    this.setData({ _loadingFoods: true });

    Http.get(API.FOOD_SEARCH, { keyword })
      .then(res => {
        if (res.data) {
          this.setData({
            foods: res.data,
            _loadingFoods: false,
          });
        } else {
          this.setData({ _loadingFoods: false });
        }
      })
      .catch(err => {
        console.error('搜索食物失败:', err);
        this.setData({ _loadingFoods: false });
      });
  },

  // 选择食物（第三步：显示单位列表）
  selectFood(e) {
    const foodId = e.currentTarget.dataset.id;
    const food = this.data.foods.find(f => f.id === foodId);
    
    this.setData({
      selectedFood: food,
      dialogStep: 'unit',
      selectedUnit: null,
      customWeight: '',
      calculatedNutrition: null,
    });
    
    this.loadUnits(foodId);
  },

  // 加载单位列表
  loadUnits(foodId) {
    if (this.data._loadingUnits) return;
    this.setData({ _loadingUnits: true });

    Http.get(API.FOOD_UNITS, { foodId })
      .then(res => {
        if (res.data) {
          this.setData({
            units: res.data,
            _loadingUnits: false,
          });
        } else {
          this.setData({ _loadingUnits: false });
        }
      })
      .catch(err => {
        console.error('加载单位列表失败:', err);
        this.setData({ _loadingUnits: false });
      });
  },

  // 选择单位
  selectUnit(e) {
    const unitId = e.currentTarget.dataset.id;
    const unit = this.data.units.find(u => u.id === unitId);
    
    this.setData({
      selectedUnit: unit,
      customWeight: '',
    });
    
    this.calculateNutrition(unit.weightGrams);
  },

  // 自定义重量输入
  onCustomWeightInput(e) {
    const weight = e.detail.value;
    this.setData({
      customWeight: weight,
      selectedUnit: null, // 清空单位选择
    });
    
    if (weight && parseFloat(weight) > 0) {
      this.calculateNutrition(parseFloat(weight));
    } else {
      this.setData({ calculatedNutrition: null });
    }
  },

  // 计算营养信息
  calculateNutrition(weightGrams) {
    if (!this.data.selectedFood || !weightGrams || weightGrams <= 0) {
      return;
    }

    wx.showLoading({ title: '计算中...' });

    Http.post(API.FOOD_CALCULATE, {
      foodId: this.data.selectedFood.id,
      weightGrams: weightGrams,
    })
      .then(res => {
        wx.hideLoading();
        if (res.data) {
          this.setData({
            calculatedNutrition: res.data,
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('计算营养信息失败:', err);
      });
  },

  // 返回上一步
  goBack() {
    const { dialogStep } = this.data;
    
    if (dialogStep === 'unit') {
      this.setData({
        dialogStep: 'food',
        selectedUnit: null,
        customWeight: '',
        calculatedNutrition: null,
        units: [],
      });
    } else if (dialogStep === 'food') {
      this.setData({
        dialogStep: 'category',
        selectedFood: null,
        foods: [],
        searchKeyword: '',
      });
    }
  },

  // 确认添加
  confirmAdd() {
    const { selectedFood, selectedUnit, customWeight, calculatedNutrition, currentMealType } = this.data;
    
    if (!selectedFood) {
      wx.showToast({
        title: '请选择食物',
        icon: 'none',
      });
      return;
    }

    if (!selectedUnit && !customWeight) {
      wx.showToast({
        title: '请选择单位或输入重量',
        icon: 'none',
      });
      return;
    }

    if (!calculatedNutrition) {
      wx.showToast({
        title: '请先计算营养信息',
        icon: 'none',
      });
      return;
    }

    const openId = this.getOpenId();
    if (!openId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }

    wx.showLoading({ title: '添加中...' });

    Http.post(API.USER_DIET_RECORDS, {
      openId,
      mealType: currentMealType,
      foodId: selectedFood.id,
      unitId: selectedUnit ? selectedUnit.id : null,
      customWeight: customWeight ? parseFloat(customWeight) : null,
    })
      .then(res => {
        wx.hideLoading();
        wx.showToast({
          title: '添加成功',
          icon: 'success',
        });
        this.loadTodayRecords();
        this.loadTodayStats();
        this.closeAddDialog();
      })
      .catch(err => {
        wx.hideLoading();
        console.error('添加饮食记录失败:', err);
      });
  },

  // 删除记录
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.todayRecords.find(r => r.id === id);

    wx.showModal({
      title: '确认删除',
      content: record ? `确定要删除这条${record.foodName || record.food}记录吗？` : '确定要删除这条记录吗？',
      confirmText: '删除',
      confirmColor: '#E53E3E',
      success: res => {
        if (res.confirm) {
          const openId = this.getOpenId();
          if (!openId) {
            wx.showToast({
              title: '请先登录',
              icon: 'none',
            });
            return;
          }

          wx.showLoading({ title: '删除中...' });

          Http.delete(API.USER_DIET_RECORDS + '/' + id, { openId })
            .then(res => {
              wx.hideLoading();
              wx.showToast({
                title: '删除成功',
                icon: 'success',
              });
              this.loadTodayRecords();
              this.loadTodayStats();
            })
            .catch(err => {
              wx.hideLoading();
              console.error('删除饮食记录失败:', err);
            });
        }
      },
    });
  },

  // 打开拍照识图
  openPhotoRecognition() {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: res => {
        const sourceType = res.tapIndex === 0 ? ['camera'] : ['album'];
        this.chooseImage(sourceType);
      },
      fail: err => {
        console.log('用户取消选择:', err);
      }
    });
  },

  // 选择图片
  chooseImage(sourceType) {
    wx.chooseImage({
      count: 1,
      sourceType: sourceType,
      success: res => {
        const tempFilePath = res.tempFilePaths[0];
        const fileSize = res.tempFiles[0].size;

        // 检查文件大小（百度API限制4MB）
        if (fileSize > 4 * 1024 * 1024) {
          wx.showToast({
            title: '图片过大，请选择小于4MB的图片',
            icon: 'none',
          });
          return;
        }

        this.processAndRecognize(tempFilePath);
      },
      fail: err => {
        console.log('选择图片失败:', err);
      }
    });
  },

  // 处理图片并识别（直接转换为base64发送）
  processAndRecognize(tempFilePath) {
    wx.showLoading({ title: '处理中...' });

    // 将图片转换为base64
    wx.getFileSystemManager().readFile({
      filePath: tempFilePath,
      encoding: 'base64',
      success: res => {
        wx.hideLoading();
        const base64Data = res.data;
        this.recognizeFoodByBase64(base64Data);
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '图片处理失败',
          icon: 'none',
        });
        console.error('读取图片失败:', err);
      }
    });
  },

  // 通过base64识别食物
  recognizeFoodByBase64(imageBase64) {
    wx.showLoading({ title: '识别中...' });

    Http.post(API.FOOD_RECOGNIZE, {
      imageBase64: imageBase64
    }, null, true)
      .then(res => {
        wx.hideLoading();
        if (res.data && res.data.foods && res.data.foods.length > 0) {
          this.setData({
            showRecognitionDialog: true,
            recognitionData: res.data
          });
        } else {
          wx.showToast({
            title: '未识别到食物',
            icon: 'none',
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({
          title: '识别失败',
          icon: 'none',
        });
        console.error('食物识别失败:', err);
      });
  },

  // 关闭识别对话框
  closeRecognitionDialog() {
    this.setData({
      showRecognitionDialog: false,
      recognitionData: null,
      isSavingRecognition: false // 重置保存状态
    });
  },

  // 保存识别结果（批量添加）
  saveRecognitionResults() {
    // 防止重复点击
    if (this.data.isSavingRecognition) {
      return;
    }

    const { recognitionData } = this.data;
    
    if (!recognitionData || !recognitionData.foods || recognitionData.foods.length === 0) {
      wx.showToast({
        title: '没有可保存的食物',
        icon: 'none',
      });
      return;
    }

    const openId = this.getOpenId();
    if (!openId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }

    // 设置保存中状态
    this.setData({
      isSavingRecognition: true
    });

    wx.showLoading({ title: '保存中...' });

    // 批量添加饮食记录
    const promises = recognitionData.foods.map(food => {
      return Http.post(API.USER_DIET_RECORDS, {
        openId,
        mealType: '', // 不指定餐次
        foodName: food.name,
        calories: food.calorie || 0,
        protein: food.protein || 0,
        carbs: food.carbs || 0,
        fat: food.fat || 0,
        customWeight: food.weight || 100
      });
    });

    Promise.all(promises)
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success',
        });
        this.loadTodayRecords();
        this.loadTodayStats();
        this.closeRecognitionDialog();
        // 重置保存状态
        this.setData({
          isSavingRecognition: false
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('保存识别结果失败:', err);
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none',
        });
        // 重置保存状态，允许重试
        this.setData({
          isSavingRecognition: false
        });
      });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  onShareAppMessage() {
    return {
      title: '我的饮食计划 - 健康伙伴',
      path: '/pages/diet/diet',
    };
  },
});
