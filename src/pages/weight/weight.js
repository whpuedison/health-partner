// pages/weight/weight.js
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');
const app = getApp();

Page({
  data: {
    // 当前年月
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    
    // 日历数据
    calendarDays: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    
    // 体重数据
    weightRecords: {}, // { '2025-12-08': { weight: 65.5, id: 1 } }
    
    // 弹窗相关
    showWeightInput: false,
    selectedDate: '',
    inputWeight: '',
    currentWeight: null, // 当前选中日期的体重
    
    // 统计数据
    monthStats: {
      max: 0,
      min: 0,
      avg: 0,
      count: 0
    },
    
    // 加载状态
    loading: false
  },

  onLoad() {
    // 设置 tabBar 激活状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 0 });
    }
    
    // 初始化日历
    this.initCalendar();
    
    // 加载体重数据
    this.loadWeightData();
  },

  /**
   * 初始化日历
   */
  initCalendar() {
    const { currentYear, currentMonth } = this.data;
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    
    const firstDayOfWeek = firstDay.getDay(); // 0-6
    const daysInMonth = lastDay.getDate();
    
    const calendarDays = [];
    
    // 填充前面的空白
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarDays.push({ day: '', date: '', isEmpty: true });
    }
    
    // 填充日期
    const today = new Date();
    const todayStr = this.formatDate(today);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      
      calendarDays.push({
        day,
        date: dateStr,
        isToday,
        isEmpty: false
      });
    }
    
    this.setData({ calendarDays });
  },

  /**
   * 加载体重数据
   */
  async loadWeightData() {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const { currentYear, currentMonth } = this.data;
      const result = await Http.get(API.WEIGHT_MONTH, {
        openId,
        year: currentYear,
        month: currentMonth
      });

      if (result.success && result.data) {
        // 转换为对象格式
        const weightRecords = {};
        result.data.forEach(record => {
          weightRecords[record.date] = {
            weight: parseFloat(record.weight),
            id: record.id
          };
        });

        this.setData({ weightRecords });
        this.calculateStats(result.data);
      }
    } catch (error) {
      console.error('加载体重数据失败:', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 计算统计数据
   */
  calculateStats(records) {
    if (!records || records.length === 0) {
      this.setData({
        monthStats: { max: 0, min: 0, avg: 0, count: 0 }
      });
      return;
    }

    const weights = records.map(r => parseFloat(r.weight));
    const max = Math.max(...weights);
    const min = Math.min(...weights);
    const avg = (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1);

    this.setData({
      monthStats: {
        max: max.toFixed(1),
        min: min.toFixed(1),
        avg,
        count: records.length
      }
    });
  },

  /**
   * 点击日期
   */
  onDateClick(e) {
    const { date, isEmpty } = e.currentTarget.dataset;
    if (isEmpty) return;

    const currentWeight = this.data.weightRecords[date];
    
    this.setData({
      selectedDate: date,
      showWeightInput: true,
      inputWeight: currentWeight ? String(currentWeight.weight) : '',
      currentWeight: currentWeight || null
    });
  },

  /**
   * 输入体重
   */
  onWeightInput(e) {
    let value = e.detail.value;
    
    // 只允许数字和一个小数点
    value = value.replace(/[^\d.]/g, '');
    
    // 只保留一个小数点
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // 限制小数位数为1位
    if (parts.length === 2 && parts[1].length > 1) {
      value = parts[0] + '.' + parts[1].substring(0, 1);
    }
    
    this.setData({ inputWeight: value });
  },

  /**
   * 保存体重
   */
  async saveWeight() {
    const { selectedDate, inputWeight } = this.data;
    const weight = parseFloat(inputWeight);

    if (!weight || weight <= 0 || weight > 300) {
      wx.showToast({ title: '请输入有效体重', icon: 'none' });
      return;
    }

    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...', mask: true });

    try {
      const result = await Http.post(API.WEIGHT_SAVE, {
        openId,
        weight,
        recordDate: selectedDate
      });

      if (result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        
        // 关闭弹窗
        this.setData({ showWeightInput: false });
        
        // 重新加载数据
        await this.loadWeightData();
      } else {
        wx.showToast({ title: result.message || '保存失败', icon: 'none' });
      }
    } catch (error) {
      console.error('保存体重失败:', error);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 删除体重记录
   */
  async deleteWeight() {
    const { currentWeight } = this.data;
    if (!currentWeight) return;

    const result = await new Promise((resolve) => {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条体重记录吗？',
        success: (res) => resolve(res.confirm)
      });
    });

    if (!result) return;

    const openId = app.globalData.openId || wx.getStorageSync('openId');
    wx.showLoading({ title: '删除中...', mask: true });

    try {
      const deleteResult = await Http.delete(`${API.WEIGHT_DELETE}/${currentWeight.id}`, {
        openId
      });

      if (deleteResult.success) {
        wx.showToast({ title: '删除成功', icon: 'success' });
        this.setData({ showWeightInput: false });
        await this.loadWeightData();
      } else {
        wx.showToast({ title: '删除失败', icon: 'none' });
      }
    } catch (error) {
      console.error('删除体重失败:', error);
      wx.showToast({ title: '删除失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 关闭弹窗
   */
  closePopup() {
    this.setData({ showWeightInput: false });
  },

  /**
   * 切换月份
   */
  changeMonth(e) {
    const { type } = e.currentTarget.dataset;
    let { currentYear, currentMonth } = this.data;

    if (type === 'prev') {
      currentMonth--;
      if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
      }
    } else {
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    this.setData({ currentYear, currentMonth });
    this.initCalendar();
    this.loadWeightData();
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
