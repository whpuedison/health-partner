// pages/exercise/exercise.js
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');

Page({
  data: {
    activeTab: 0,
    tabs: ['今日运动', '运动记录'], // 隐藏运动推荐
    
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
    weekTotalDuration: 0,
    weekTotalCalories: 0,
    
    // 快捷运动
    quickExercises: [
      { id: 1, name: '跑步', icon: '🏃', color: '#FF6B6B', needsDistance: true },
      { id: 2, name: '骑行', icon: '🚴', color: '#FFD93D', needsDistance: true },
      { id: 3, name: '游泳', icon: '🏊', color: '#4ECDC4', needsDistance: false },
      { id: 4, name: '瑜伽', icon: '🧘', color: '#A8E6CF', needsDistance: false },
      { id: 5, name: '力量训练', icon: '🏋️', color: '#9B59B6', needsDistance: false },
      { id: 6, name: '跳绳', icon: '🪢', color: '#E74C3C', needsDistance: false },
    ],
    
    // 添加对话框
    showAddDialog: false,
    currentExercise: null,
    durationInput: '',
    distanceInput: '',
    _loadingTodayRecords: false,
    _loadingWeekRecords: false,
  },

  onLoad() {
    this.loadUserGoals();
    this.loadTodayStats();
    this.loadTodayRecords();
    // 运动记录 tab 的数据只在切换到该 tab 时加载
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
    // 切换到运动记录标签时，重新加载本周记录
    if (index === 1) {
      this.loadWeekRecords();
    }
  },

  // 获取 openId
  getOpenId() {
    const app = getApp();
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
        if (res.data && res.data.targetExercise) {
          this.setData({
            'todayStats.target': res.data.targetExercise,
          });
        }
      })
      .catch(err => {
        console.error('加载用户目标失败:', err);
      });
  },

  // 加载今日运动统计
  loadTodayStats() {
    const openId = this.getOpenId();
    if (!openId) {
      setTimeout(() => this.loadTodayStats(), 500);
      return;
    }

    Http.get(API.USER_EXERCISE_STATS, { openId })
      .then(res => {
        if (res.data) {
          this.setData({
            todayStats: {
              ...this.data.todayStats,
              duration: res.data.totalDuration || 0,
              calories: res.data.totalCalories || 0,
              distance: (res.data.totalDistance || 0).toFixed(1),
            },
          });
        }
      })
      .catch(err => {
        console.error('加载今日运动统计失败:', err);
      });
  },

  // 加载今日记录
  loadTodayRecords() {
    if (this.data._loadingTodayRecords) return;
    this.setData({ _loadingTodayRecords: true });

    const openId = this.getOpenId();
    if (!openId) {
      this.setData({ _loadingTodayRecords: false });
      setTimeout(() => this.loadTodayRecords(), 500);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    Http.get(API.USER_EXERCISE_RECORDS, {
      openId,
      startDate: today,
      endDate: today,
    })
      .then(res => {
        if (res.data) {
          const records = res.data.map(record => {
            const exercise = this.data.quickExercises.find(e => e.name === record.exerciseType) || {};
            return {
              id: record.id,
              name: record.exerciseType,
              icon: exercise.icon || '🏃',
              duration: record.duration,
              calories: record.calories,
              distance: record.distance,
              time: new Date(record.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
              date: record.recordDate,
            };
          });
          this.setData({ todayRecords: records });
        }
        this.setData({ _loadingTodayRecords: false });
      })
      .catch(err => {
        console.error('加载今日记录失败:', err);
        this.setData({ _loadingTodayRecords: false });
      });
  },

  // 加载本周记录
  loadWeekRecords() {
    if (this.data._loadingWeekRecords) return;
    this.setData({ _loadingWeekRecords: true });

    const openId = this.getOpenId();
    if (!openId) {
      this.setData({ _loadingWeekRecords: false });
      setTimeout(() => this.loadWeekRecords(), 500);
      return;
    }

    Http.get(API.USER_EXERCISE_WEEK, { openId })
      .then(res => {
        if (res.data) {
          const records = res.data.map(record => {
            const exercise = this.data.quickExercises.find(e => e.name === record.exerciseType) || {};
            return {
              id: record.id,
              name: record.exerciseType,
              icon: exercise.icon || '🏃',
              duration: record.duration,
              calories: record.calories,
              distance: record.distance,
              time: new Date(record.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
              date: new Date(record.recordDate).toLocaleDateString('zh-CN'),
            };
          });
          
          // 计算本周总时长和总卡路里
          const weekTotalDuration = records.reduce((sum, r) => sum + (r.duration || 0), 0);
          const weekTotalCalories = records.reduce((sum, r) => sum + (r.calories || 0), 0);
          
          this.setData({
            weekRecords: records,
            weekTotalDuration,
            weekTotalCalories,
          });
        }
        this.setData({ _loadingWeekRecords: false });
      })
      .catch(err => {
        console.error('加载本周记录失败:', err);
        this.setData({ _loadingWeekRecords: false });
      });
  },

  // 打开添加对话框
  openAddDialog(e) {
    const exercise = e.currentTarget.dataset.exercise;
    this.setData({
      showAddDialog: true,
      currentExercise: exercise,
      durationInput: '',
      distanceInput: '',
    });
  },

  // 关闭对话框
  closeAddDialog() {
    this.setData({
      showAddDialog: false,
      currentExercise: null,
      durationInput: '',
      distanceInput: '',
    });
  },

  // 输入处理
  onDurationInput(e) {
    this.setData({ durationInput: e.detail.value });
  },

  onDistanceInput(e) {
    this.setData({ distanceInput: e.detail.value });
  },

  // 添加运动记录
  addRecord() {
    const { currentExercise, durationInput, distanceInput } = this.data;
    
    if (!durationInput || parseInt(durationInput) <= 0) {
      wx.showToast({
        title: '请填写运动时长',
        icon: 'none',
      });
      return;
    }

    // 如果需要距离，验证距离输入
    if (currentExercise.needsDistance) {
      if (!distanceInput || parseFloat(distanceInput) <= 0) {
        wx.showToast({
          title: '请填写运动距离',
          icon: 'none',
        });
        return;
      }
    }

    const openId = this.getOpenId();
    if (!openId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    Http.post(API.USER_EXERCISE_RECORDS, {
      openId,
      exerciseType: currentExercise.name,
      duration: parseInt(durationInput),
      distance: currentExercise.needsDistance ? parseFloat(distanceInput) : null,
    })
      .then(res => {
        wx.hideLoading();
        wx.showToast({
          title: '添加成功',
          icon: 'success',
        });
        this.loadTodayStats();
        this.loadTodayRecords();
        this.loadWeekRecords();
        this.closeAddDialog();
      })
      .catch(err => {
        wx.hideLoading();
        console.error('添加运动记录失败:', err);
      });
  },

  // 删除记录
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    const record = this.data.todayRecords.find(r => r.id === id) || 
                   this.data.weekRecords.find(r => r.id === id);
    
    wx.showModal({
      title: '确认删除',
      content: record ? `确定要删除这条${record.name}记录吗？` : '确定要删除这条记录吗？',
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

          Http.delete(API.USER_EXERCISE_RECORDS + '/' + id, { openId })
            .then(res => {
              wx.hideLoading();
              wx.showToast({
                title: '删除成功',
                icon: 'success',
              });
              this.loadTodayStats();
              this.loadTodayRecords();
              this.loadWeekRecords();
            })
            .catch(err => {
              wx.hideLoading();
              console.error('删除运动记录失败:', err);
            });
        }
      },
    });
  },


  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  onShareAppMessage() {
    return {
      title: '我的运动计划 - 健康伙伴',
      path: '/pages/exercise/exercise',
    };
  },
});

