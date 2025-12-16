const { Http } = require('../../utils/http');
const { API } = require('../../config/api');
const { exerciseCategories, calculateCalories } = require('../../utils/exercise-data');
const app = getApp();

Page({
  data: {
    profile: {},
    // 日历相关
    currentDate: new Date().getTime(),
    selectedDate: '',
    weekDays: [],
    
    // 统计数据
    todayStats: {
      duration: 0,
      calories: 0
    },
    todayRecords: [],
    
    // 运动列表
    exerciseCategories: exerciseCategories.map(c => ({...c, collapsed: true})), // 默认折叠
    
    // 添加运动弹窗
    showAddDialog: false,
    currentExercise: null,
    currentExerciseId: null,
    durationInput: '',
    caloriesEstimate: 0,
    
    // AI文本识别
    showTextInput: false,
    exerciseText: '',
    
    // AI Loading
    aiLoading: false,
    
    // AI识别结果弹窗
    showResultPopup: false,
    recognitionResult: null,

    // 今日记录列表
    todayListExpanded: false
  },

  onLoad(options) {
    this.initCalendar();
    this.fetchProfile()
    this.loadData();

    // 自动触发功能
    if (options && options.mode === 'text') {
      setTimeout(() => {
        this.showTextInputDialog();
      }, 500);
    }
  },
  
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 1 }); // 记录页tab索引
    }
  },

  fetchProfile() {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) return;

    Http.get(API.USER_PROFILE, { openId })
    .then(res => {
      this.setData({
        profile: res.data
      })
    })
  },

  // 初始化日历
  initCalendar() {
    const today = new Date();
    this.updateWeekDays(new Date(today)); // 传递副本
    this.setData({
      selectedDate: this.formatDate(today) // 保持 today 不变
    });
  },

  // 更新周历数据
  updateWeekDays(date) {
    const currentDay = date.getDay(); // 0 is Sunday
    const diff = date.getDate() - currentDay + (currentDay == 0 ? -6 : 1); // Adjust when day is sunday
    const monday = new Date(date.setDate(diff));
    
    const weekDays = [];
    const todayStr = this.formatDate(new Date());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dateStr = this.formatDate(day);
      
      weekDays.push({
        day: day.getDate(),
        weekDay: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day.getDay()],
        date: dateStr,
        isToday: dateStr === todayStr,
        fullDate: day
      });
    }
    
    this.setData({ weekDays });
  },

  // 切换周
  changeWeek(e) {
    const type = e.currentTarget.dataset.type;
    const currentFirstDay = this.data.weekDays[0].fullDate;
    const newDate = new Date(currentFirstDay);
    
    if (type === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    
    this.updateWeekDays(newDate);
  },

  // 选择日期
  selectDate(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ selectedDate: date });
    this.loadData();
  },

  // 加载数据
  loadData() {
    this.loadRecords();
  },

  // 加载记录
  loadRecords() {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    Http.get(API.USER_EXERCISE_RECORDS, {
      openId,
      startDate: this.data.selectedDate,
      endDate: this.data.selectedDate
    }).then(res => {
      if (res.data && res.data.list) {
        // 后端现在返回 { list, totalDuration, totalCalories }
        const { list, totalDuration, totalCalories } = res.data;
        
        this.setData({ 
          todayRecords: list,
          todayStats: {
            duration: totalDuration,
            calories: totalCalories
          }
        });
      } else {
        this.setData({ 
          todayRecords: [],
          todayStats: { duration: 0, calories: 0 }
        });
      }
    });
  },

  // 格式化日期 YYYY-MM-DD
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 打开添加弹窗
  openAddDialog(e) {
    const { exercise, exerciseId } = e.currentTarget.dataset;
    this.setData({
      showAddDialog: true,
      currentExercise: exercise,
      currentExerciseId: exerciseId,
      durationInput: '',
      caloriesEstimate: 0
    });
  },

  closeAddDialog() {
    this.setData({ showAddDialog: false });
  },

  // 时长输入
  onDurationInput(e) {
    const duration = parseInt(e.detail.value) || 0;
    const calories = calculateCalories(this.data.currentExercise.id, duration);
    this.setData({
      durationInput: e.detail.value,
      caloriesEstimate: calories
    });
  },

  // 保存记录
  saveRecord() {
    const { currentExercise, currentExerciseId, durationInput, selectedDate } = this.data;
    if (!durationInput) {
      wx.showToast({ title: '请输入时长', icon: 'none' });
      return;
    }

    const openId = app.globalData.openId || wx.getStorageSync('openId');
    Http.post(API.USER_EXERCISE_RECORDS, {
      openId,
      exerciseType: currentExercise.name,
      exerciseId: currentExerciseId,
      icon: currentExercise.icon,
      duration: parseInt(durationInput),
      caloriesPerMinute: currentExercise.calories,
      recordDate: selectedDate
    }).then(res => {
      wx.showToast({ title: '添加成功' });
      this.closeAddDialog();
      this.loadData();
    });
  },
  
  // 删除记录
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条运动记录吗？',
      success: (res) => {
        if (res.confirm) {
          Http.delete(API.USER_EXERCISE_RECORDS + '/' + id, { openId }).then(() => {
            this.loadData();
          });
        }
      }
    });
  },

  // AI 相关
  showTextInputDialog() {
    this.setData({ showTextInput: true, exerciseText: '' });
  },

  closeTextInput() {
    this.setData({ showTextInput: false });
  },

  onExerciseTextInput(e) {
    this.setData({ exerciseText: e.detail.value });
  },

  // 提交AI识别
  submitTextAnalysis() {
    if (!this.data.exerciseText.trim()) {
      wx.showToast({ title: '请输入描述', icon: 'none' });
      return;
    }
    
    this.closeTextInput();
    
    this.setData({ aiLoading: true });
    
    Http.post(API.EXERCISE_RECOGNIZE_TEXT, {
      text: this.data.exerciseText,
      profile: this.data.profile
    }, null, true).then(res => { // 增加 true 参数以支持长超时
      this.setData({ aiLoading: false });
      if (res.data) {
        this.setData({
          showResultPopup: true,
          recognitionResult: res.data
        });
      }
    }).catch(err => {
      this.setData({ aiLoading: false });
      console.error('AI识别错误详情:', err); // 增加日志以便调试
      wx.showToast({ title: '识别失败，请重试', icon: 'none' });
    });
  },
  
  // 确认保存AI结果
  confirmAIRecord() {
    const { recognitionResult, selectedDate } = this.data;
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    const { exercise_name,  duration_minutes, calories, exerciseId } = recognitionResult || {}
    Http.post(API.USER_EXERCISE_RECORDS, {
      openId,
      exerciseId,
      exerciseType: exercise_name,
      icon: recognitionResult.exercise_icon,
      duration: duration_minutes,
      calories: calories,
      recordDate: selectedDate
    }).then(() => {
      this.setData({ showResultPopup: false });
      wx.showToast({ title: '保存成功' });
      this.loadData();
    });
  },
  
  closeResultPopup() {
    this.setData({ showResultPopup: false });
  },

  // 切换折叠状态
  toggleCategory(e) {
    const index = e.currentTarget.dataset.index;
    const categories = this.data.exerciseCategories;
    categories[index].collapsed = !categories[index].collapsed;
    this.setData({ exerciseCategories: categories });
  },

  // 切换今日记录折叠
  toggleTodayList() {
    this.setData({
      todayListExpanded: !this.data.todayListExpanded
    });
  },

   recordShareAction(scene) {
      const openId = app.globalData.openId || wx.getStorageSync('openId');
      if (!openId) return;
      
      const recordUrl = '/api/v1/user/share';
      Http.post(recordUrl, {
          openId,
          scene: scene, 
          page: 'pages/exercise/exercise' // 记录来源页面
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
