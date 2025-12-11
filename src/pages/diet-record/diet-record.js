// pages/diet-record/diet-record.js
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');
const { calculateDailyCalories, calculateNutrientGrams } = require('../../utils/health-calculator');
const app = getApp();

Page({
  data: {
    // 周历数据
    weekDays: [],
    selectedDate: '',
    currentWeekStart: null,
    
    // 营养数据
    todayIntake: 0,        // 今日摄入
    todayBurned: 0,        // 今日消耗
    todayRemaining: 0,     // 还可以吃
    targetCalories: 0,  // 目标卡路里
    
    // 营养素数据
    protein: { current: 0, target: 60 },
    fat: { current: 0, target: 50 },
    carbs: { current: 0, target: 200 },
    
    // 饮食记录
    mealGroups: {
      '早餐': [],
      '午餐': [],
      '晚餐': [],
      '加餐': []
    },
    
    // 折叠状态
    expandedMeals: {
      '早餐': false,
      '午餐': false,
      '晚餐': false,
      '加餐': true  // 加餐默认展开
    },
    
    // 拍照相关
    showPhotoTip: false,
    showRecognitionResult: false,
    recognitionData: null,
    
    // 一句话记饮食
    showTextInput: false,
    dietText: '',
    
    // 餐次选择
    showMealTypeSelector: false,
    selectedMealType: '',
    mealTypes: [
      { value: '早餐', icon: '🌅' },
      { value: '午餐', icon: '🌞' },
      { value: '晚餐', icon: '🌙' },
      { value: '加餐', icon: '🍎' }
    ],
    
    // 编辑食物
    editingFoodIndex: -1,
    editFoodName: '',
    editFoodWeight: '',
    
    // 加载状态
    loading: false
  },

  onLoad(options) {
    this.initWeekCalendar();
    this.loadTodayData();

    // 自动触发功能
    if (options && options.mode) {
      setTimeout(() => {
        if (options.mode === 'text') {
          this.showTextInputDialog();
        } else if (options.mode === 'camera') {
          // 拍照模式：直接调用拍照，或者显示提示
          this.showPhotoTipDialog();
        }
      }, 500);
    }
  },

  /**
   * 切换餐次折叠状态
   */
  toggleMeal(e) {
    const { meal } = e.currentTarget.dataset;
    const key = `expandedMeals.${meal}`;
    this.setData({
      [key]: !this.data.expandedMeals[meal]
    });
  },

  /**
   * 初始化周历
   */
  initWeekCalendar() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0-6
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = this.formatDate(date);
      const isToday = dateStr === this.formatDate(today);
      
      weekDays.push({
        date: dateStr,
        day: date.getDate(),
        weekDay: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
        isToday
      });
    }
    
    this.setData({
      weekDays,
      selectedDate: this.formatDate(today),
      currentWeekStart: monday
    });
  },

  /**
   * 切换周
   */
  changeWeek(e) {
    const { type } = e.currentTarget.dataset;
    const newStart = new Date(this.data.currentWeekStart);
    newStart.setDate(newStart.getDate() + (type === 'prev' ? -7 : 7));
    
    const weekDays = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(newStart);
      date.setDate(newStart.getDate() + i);
      const dateStr = this.formatDate(date);
      const isToday = dateStr === this.formatDate(today);
      
      weekDays.push({
        date: dateStr,
        day: date.getDate(),
        weekDay: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
        isToday
      });
    }
    
    this.setData({
      weekDays,
      currentWeekStart: newStart
    });
  },

  /**
   * 选择日期
   */
  selectDate(e) {
    const { date } = e.currentTarget.dataset;
    this.setData({ selectedDate: date });
    this.loadDateData(date);
  },

  /**
   * 加载今日数据
   */
  async loadTodayData() {
    await this.loadDateData(this.data.selectedDate);
  },

  /**
   * 加载指定日期数据
   */
  async loadDateData(date) {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) return;

    this.setData({ loading: true });

    try {
      // 加载饮食记录
      const dietResult = await Http.get(API.USER_DIET_RECORDS, {
        openId,
        startDate: date,
        endDate: date
      });

      // 加载运动记录
      const exerciseResult = await Http.get(API.USER_EXERCISE_RECORDS, {
        openId,
        startDate: date,
        endDate: date
      });

      // 处理饮食数据
      let totalCalories = 0;
      let totalProtein = 0;
      let totalFat = 0;
      let totalCarbs = 0;
      
      // 按餐次分组
      const mealGroups = {
        '早餐': [],
        '午餐': [],
        '晚餐': [],
        '加餐': []
      };

      if (dietResult.data) {
        dietResult.data.forEach(record => {
          totalCalories += record.calories || 0;
          totalProtein += record.protein || 0;
          totalFat += record.fat || 0;
          totalCarbs += record.carbs || 0;
          
          const mealType = record.mealType || '加餐';
          const recordData = {
            id: record.id,
            foodName: record.foodName,
            calories: record.calories,
            time: new Date(record.createdAt).toLocaleTimeString('zh-CN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          };
          
          if (mealGroups[mealType]) {
            mealGroups[mealType].push(recordData);
          } else {
            mealGroups['加餐'].push(recordData);
          }
        });
      }

      // 处理运动数据
      let totalBurned = 0;
      if (exerciseResult.data) {
        exerciseResult.data.forEach(record => {
          totalBurned += record.calories || 0;
        });
      }

      // 计算每个餐次的统计信息
      const mealStats = {};
      Object.keys(mealGroups).forEach(mealType => {
        const records = mealGroups[mealType];
        const totalCal = records.reduce((sum, item) => sum + (item.calories || 0), 0);
        mealStats[mealType] = {
          count: records.length,
          totalCalories: totalCal
        };
      });

      // 计算目标消耗卡路里
      const profileResult = await Http.get(API.USER_PROFILE, { openId }) || {};
      const targetCalories = calculateDailyCalories(profileResult.data);
      const nutrientTargets = calculateNutrientGrams(targetCalories + totalBurned, { protein: 21, fat: 21, carbs: 58 });

      // 计算剩余
      const remaining = targetCalories - totalCalories + totalBurned;

      this.setData({
        todayIntake: Math.round(totalCalories),
        todayBurned: Math.round(totalBurned),
        todayRemaining: Math.max(0, Math.round(remaining)),
        protein: { target: nutrientTargets.proteinGrams, current: parseFloat(totalProtein.toFixed(1)) },
        fat: { target: nutrientTargets.fatGrams, current: parseFloat(totalFat.toFixed(1)) },
        carbs: { target: nutrientTargets.carbsGrams, current: parseFloat(totalCarbs.toFixed(1)) },
        mealGroups: mealGroups,
        mealStats: mealStats,
        loading: false
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      this.setData({ loading: false });
    }
  },

  /**
   * 显示拍照提示
   */
  showPhotoTipDialog() {
    this.setData({ showPhotoTip: true });
  },

  /**
   * 关闭拍照提示
   */
  closePhotoTip() {
    this.setData({ showPhotoTip: false });
  },

  /**
   * 开始拍照
   */
  startPhoto() {
    this.closePhotoTip();
    
    wx.chooseImage({
      count: 1,
      sourceType: ['camera', 'album'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.recognizeFood(tempFilePath);
      }
    });
  },

  /**
   * 识别食物
   */
  async recognizeFood(imagePath) {
    // 提示语列表
    const tips = [
      'AI正在分析中',
      '正在识别食物',
      '分析营养成分中',
      '计算卡路里中'
    ];
    
    let currentTipIndex = 0;
    
    // 显示初始提示
    wx.showLoading({ 
      title: tips[0], 
      mask: true 
    });

    // 每5秒轮播一次提示，到最后一条就停止
    const tipTimer = setInterval(() => {
      if (currentTipIndex < tips.length - 1) {
        currentTipIndex++;
        wx.showLoading({ 
          title: tips[currentTipIndex], 
          mask: true 
        });
      }
      // 到达最后一条后不再更新，保持显示"计算卡路里中..."
    }, 5000);

    try {
      // 转换为base64
      const base64 = await this.imageToBase64(imagePath);
      
      // 调用识别API
      const result = await Http.post(API.FOOD_RECOGNIZE, {
        imageBase64: base64
      }, null, true); // 启用长超时（5分钟）

      // 清除定时器
      clearInterval(tipTimer);
      wx.hideLoading();

      if (result.data && result.data.foods && result.data.foods.length > 0) {
        // 格式化数据，保留1位小数
        const formattedData = {
          ...result.data,
          foods: result.data.foods.map(food => ({
            ...food,
            calorie: parseFloat((food.calorie || 0).toFixed(1)),
            protein: parseFloat((food.protein || 0).toFixed(1)),
            carbs: parseFloat((food.carbs || 0).toFixed(1)),
            fat: parseFloat((food.fat || 0).toFixed(1))
          })),
          totalNutrition: {
            totalCalories: parseFloat((result.data.totalNutrition?.totalCalories || 0).toFixed(1)),
            totalProtein: parseFloat((result.data.totalNutrition?.totalProtein || 0).toFixed(1)),
            totalCarbs: parseFloat((result.data.totalNutrition?.totalCarbs || 0).toFixed(1)),
            totalFat: parseFloat((result.data.totalNutrition?.totalFat || 0).toFixed(1))
          }
        };

        this.setData({
          showRecognitionResult: true,
          recognitionData: formattedData
        });
      } else {
        wx.showToast({ title: '未识别到食物', icon: 'none' });
      }
    } catch (error) {
      // 清除定时器
      clearInterval(tipTimer);
      wx.hideLoading();
      console.error('识别失败:', error);
      wx.showToast({ title: '识别失败，请重试', icon: 'none' });
    }
  },

  /**
   * 图片转base64
   */
  imageToBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => resolve(res.data),
        fail: reject
      });
    });
  },

  /**
   * 编辑食物
   */
  editFood(e) {
    const { index } = e.currentTarget.dataset;
    const food = this.data.recognitionData.foods[index];
    
    this.setData({
      editingFoodIndex: index,
      editFoodName: food.name,
      editFoodWeight: String(food.weight || 100),
      originalFoodName: food.name  // 保存原始名称用于判断
    });
  },

  /**
   * 编辑食物名称输入
   */
  onEditNameInput(e) {
    this.setData({ editFoodName: e.detail.value });
  },

  /**
   * 编辑食物重量输入
   */
  onEditWeightInput(e) {
    this.setData({ editFoodWeight: e.detail.value });
  },

  /**
   * 保存编辑
   */
  async saveEdit() {
    const { editingFoodIndex, editFoodName, editFoodWeight, recognitionData, originalFoodName } = this.data;
    
    if (!editFoodName || !editFoodWeight) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    const newWeight = parseFloat(editFoodWeight);
    const food = recognitionData.foods[editingFoodIndex];
    const nameChanged = editFoodName !== originalFoodName;

    // 如果只是修改克数，自己计算
    if (!nameChanged) {
      const oldWeight = food.weight || 100;
      const ratio = newWeight / oldWeight;
      
      const foods = [...recognitionData.foods];
      foods[editingFoodIndex] = {
        ...food,
        weight: newWeight,
        calorie: Math.round(food.calorie * ratio),
        protein: parseFloat((food.protein * ratio).toFixed(1)),
        carbs: parseFloat((food.carbs * ratio).toFixed(1)),
        fat: parseFloat((food.fat * ratio).toFixed(1))
      };

      // 重新计算总营养
      const totalNutrition = this.calculateTotalNutrition(foods);

      this.setData({
        recognitionData: {
          ...recognitionData,
          foods,
          totalNutrition
        },
        editingFoodIndex: -1
      });
      
      return;
    }

    // 如果修改了名称，调用AI重新分析
    wx.showLoading({ title: '分析中...' });

    try {
      const result = await Http.post(API.FOOD_ANALYZE, {
        foodName: editFoodName,
        weight: newWeight
      }, null, true); // 启用长超时（5分钟）

      if (result.data) {
        const foods = [...recognitionData.foods];
        foods[editingFoodIndex] = {
          ...foods[editingFoodIndex],
          name: editFoodName,
          weight: newWeight,
          calorie: parseFloat((result.data.calories || 0).toFixed(1)),
          protein: parseFloat((result.data.protein || 0).toFixed(1)),
          carbs: parseFloat((result.data.carbs || 0).toFixed(1)),
          fat: parseFloat((result.data.fat || 0).toFixed(1))
        };

        // 重新计算总营养
        const totalNutrition = this.calculateTotalNutrition(foods);

        this.setData({
          recognitionData: {
            ...recognitionData,
            foods,
            totalNutrition
          },
          editingFoodIndex: -1
        });
      }

      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      console.error('分析失败:', error);
      wx.showToast({ title: '分析失败', icon: 'none' });
    }
  },

  /**
   * 取消编辑
   */
  cancelEdit() {
    this.setData({ editingFoodIndex: -1 });
  },

  /**
   * 新增食物
   */
  addNewFood() {
    const { recognitionData } = this.data;
    const newFood = {
      name: '',
      weight: '',
      calorie: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };
    
    const foods = [...(recognitionData?.foods || []), newFood];
    
    this.setData({
      recognitionData: {
        ...recognitionData,
        foods
      },
      editingFoodIndex: foods.length - 1,
      editFoodName: '',
      editFoodWeight: '',
      originalFoodName: ''
    });
  },

  /**
   * 删除食物
   */
  deleteFood(e) {
    const { index } = e.currentTarget.dataset;
    const { recognitionData } = this.data;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个食物吗？',
      success: (res) => {
        if (res.confirm) {
          const foods = recognitionData.foods.filter((_, i) => i !== index);
          const totalNutrition = this.calculateTotalNutrition(foods);
          
          this.setData({
            recognitionData: {
              ...recognitionData,
              foods,
              totalNutrition
            }
          });
        }
      }
    });
  },

  /**
   * 显示文本输入弹窗
   */
  showTextInputDialog() {
    this.setData({ 
      showTextInput: true,
      dietText: ''
    });
  },

  /**
   * 关闭文本输入弹窗
   */
  closeTextInput() {
    this.setData({ showTextInput: false });
  },

  /**
   * 文本输入
   */
  onDietTextInput(e) {
    this.setData({ dietText: e.detail.value });
  },

  /**
   * 提交文本识别
   */
  async submitTextRecognition() {
    const { dietText } = this.data;
    
    if (!dietText || !dietText.trim()) {
      wx.showToast({ title: '请输入饮食内容', icon: 'none' });
      return;
    }

    this.closeTextInput();
    
    // 提示语列表
    const tips = [
      'AI正在分析中',
      '正在识别食物',
      '分析营养成分中',
      '计算卡路里中'
    ];
    
    let currentTipIndex = 0;
    
    // 显示初始提示
    wx.showLoading({ 
      title: tips[0], 
      mask: true 
    });

    // 每5秒轮播一次提示，到最后一条就停止
    const tipTimer = setInterval(() => {
      if (currentTipIndex < tips.length - 1) {
        currentTipIndex++;
        wx.showLoading({ 
          title: tips[currentTipIndex], 
          mask: true 
        });
      }
    }, 5000);

    try {
      // 调用文本识别API（复用食物识别的后端逻辑）
      const result = await Http.post(API.FOOD_RECOGNIZE_TEXT, {
        text: dietText.trim()
      }, null, true);

      // 清除定时器
      clearInterval(tipTimer);
      wx.hideLoading();

      if (result.data && result.data.foods && result.data.foods.length > 0) {
        // 格式化数据
        const formattedData = {
          ...result.data,
          foods: result.data.foods.map(food => ({
            ...food,
            calorie: parseFloat((food.calorie || 0).toFixed(1)),
            protein: parseFloat((food.protein || 0).toFixed(1)),
            carbs: parseFloat((food.carbs || 0).toFixed(1)),
            fat: parseFloat((food.fat || 0).toFixed(1))
          })),
          totalNutrition: {
            totalCalories: parseFloat((result.data.totalNutrition?.totalCalories || 0).toFixed(1)),
            totalProtein: parseFloat((result.data.totalNutrition?.totalProtein || 0).toFixed(1)),
            totalCarbs: parseFloat((result.data.totalNutrition?.totalCarbs || 0).toFixed(1)),
            totalFat: parseFloat((result.data.totalNutrition?.totalFat || 0).toFixed(1))
          }
        };

        this.setData({
          showRecognitionResult: true,
          recognitionData: formattedData
        });
      } else {
        wx.showToast({ title: '未识别到食物', icon: 'none' });
      }
    } catch (error) {
      clearInterval(tipTimer);
      wx.hideLoading();
      console.error('识别失败:', error);
      wx.showToast({ title: '识别失败，请重试', icon: 'none' });
    }
  },

  /**
   * 计算总营养
   */
  calculateTotalNutrition(foods) {
    return foods.reduce((total, food) => ({
      totalCalories: total.totalCalories + (food.calorie || 0),
      totalProtein: total.totalProtein + (food.protein || 0),
      totalCarbs: total.totalCarbs + (food.carbs || 0),
      totalFat: total.totalFat + (food.fat || 0)
    }), {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0
    });
  },

  /**
   * 显示餐次选择器
   */
  showMealSelector() {
    this.setData({ showMealTypeSelector: true });
  },

  /**
   * 选择餐次
   */
  selectMealType(e) {
    const { value } = e.currentTarget.dataset;
    this.setData({
      selectedMealType: value,
      showMealTypeSelector: false
    });
    
    // 保存识别结果
    this.saveRecognitionResults();
  },

  /**
   * 保存识别结果
   */
  async saveRecognitionResults() {
    const { recognitionData, selectedMealType } = this.data;
    
    if (!recognitionData || !recognitionData.foods) return;

    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const promises = recognitionData.foods.map(food => {
        return Http.post(API.USER_DIET_RECORDS, {
          openId,
          mealType: selectedMealType,
          foodName: food.name,
          calories: food.calorie || 0,
          protein: food.protein || 0,
          carbs: food.carbs || 0,
          fat: food.fat || 0,
          customWeight: food.weight || 100,
          recordDate: this.data.selectedDate
        });
      });

      await Promise.all(promises);

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      
      this.setData({
        showRecognitionResult: false,
        recognitionData: null,
        selectedMealType: ''
      });
      
      this.loadDateData(this.data.selectedDate);
    } catch (error) {
      wx.hideLoading();
      console.error('保存失败:', error);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  /**
   * 关闭识别结果
   */
  closeRecognitionResult() {
    this.setData({
      showRecognitionResult: false,
      recognitionData: null
    });
  },

  /**
   * 删除记录
   */
  async deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条记录吗？',
        success: res => resolve(res.confirm)
      });
    });

    if (!confirm) return;

    const openId = app.globalData.openId || wx.getStorageSync('openId');
    wx.showLoading({ title: '删除中...' });

    try {
      await Http.delete(`${API.USER_DIET_RECORDS}/${id}`, { openId });
      wx.hideLoading();
      wx.showToast({ title: '删除成功', icon: 'success' });
      this.loadDateData(this.data.selectedDate);
    } catch (error) {
      wx.hideLoading();
      console.error('删除失败:', error);
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});
