const { Http } = require('../../utils/http');
const { API } = require('../../config/api');
const app = getApp();

Page({
  data: {
    // 日历相关
    currentDate: new Date().getTime(),
    selectedDate: '',
    weekDays: [],

    // 今日数据
    todayStats: {
      bust: null,
      waist: null,
      hip: null,
      arm: null,
      thigh: null,
      calf: null
    },

    // 弹窗控制
    showPicker: false,
    currentType: '', // 'bust', 'waist', 'hip'
    currentValue: 0,
    pickerConfig: {
      min: 0,
      max: 200,
      step: 1
    },

    // 静态配置
    measureConfig: {
      bust: { name: '胸围', min: 60, max: 130, default: '', icon: '👕', desc: '沿胸部最高点水平测量' },
      waist: { name: '腰围', min: 50, max: 120, default: '', icon: '🧵', desc: '沿腰部最细处水平测量' },
      hip: { name: '臀围', min: 70, max: 130, default: '', icon: '👖', desc: '沿臀部最宽处水平测量' },
      arm: { name: '上臂围', min: 15, max: 60, default: '', icon: '💪', desc: '手臂自然下垂，测量上臂最粗处' },
      thigh: { name: '大腿围', min: 30, max: 100, default: '', icon: '🦵', desc: '双腿分开与肩同宽，测量大腿根部' },
      calf: { name: '小腿围', min: 20, max: 60, default: '', icon: '🦶', desc: '测量小腿肚最粗处' }
    },
    
    // 状态标记
    hasExistingValue: false
  },

  onLoad() {
    this.initCalendar();
    this.loadData();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 1 });
    }
  },

  // 初始化日历 (复用 exercise 逻辑)
  initCalendar() {
    const today = new Date();
    this.updateWeekDays(new Date(today));
    this.setData({
      selectedDate: this.formatDate(today)
    });
  },

  updateWeekDays(date) {
    const currentDay = date.getDay();
    const diff = date.getDate() - currentDay + (currentDay == 0 ? -6 : 1);
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

  changeWeek(e) {
    const type = e.currentTarget.dataset.type;
    const currentFirstDay = this.data.weekDays[0].fullDate;
    const newDate = new Date(currentFirstDay);
    
    if (type === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    
    this.updateWeekDays(new Date(newDate));
  },

  selectDate(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ selectedDate: date }, () => {
      this.loadData();
    });
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 加载数据
  loadData() {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) return;

    Http.get(API.MEASUREMENT_DAILY, {
      openId,
      date: this.data.selectedDate
    }).then(res => {
      this.setData({
        todayStats: res.data || {}
      });
    });
  },

  // 打开测量弹窗
  openMeasure(e) {
    const type = e.currentTarget.dataset.type;
    const existingValue = this.data.todayStats[type];
    
    this.setData({
      showPicker: true,
      currentType: type,
      currentValue: existingValue || '',
      hasExistingValue: !!existingValue
    });
  },

  closePicker() {
    this.setData({ showPicker: false });
  },

  onInput(e) {
    let value = e.detail.value;
    // 允许输入小数
    if (value && value.indexOf('.') === -1 && value.length > 3) {
       value = value.slice(0, 3);
    }
    this.setData({
      currentValue: value
    });
  },

  saveMeasurement() {
    const { currentType, currentValue, selectedDate } = this.data;
    
    if (!currentValue) {
      wx.showToast({ title: '请输入数值', icon: 'none' });
      return;
    }

    const openId = app.globalData.openId || wx.getStorageSync('openId');
    
    wx.showLoading({ title: '保存中...', mask: true });

    Http.post(API.MEASUREMENT_SAVE, {
      openId,
      date: selectedDate,
      type: currentType,
      value: parseFloat(currentValue)
    }).then(() => {
      // 延迟关闭loading，确保体验
      setTimeout(() => {
        wx.hideLoading();
        this.setData({ showPicker: false });
        wx.showToast({ title: '记录成功' });
        // 重新加载数据
        this.loadData();
      }, 500);
    }).catch(err => {
      wx.hideLoading();
      console.error('Save measurement failed:', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  },

  deleteMeasurement() {
    const that = this;
    wx.showModal({
      title: '提示',
      content: '确定要删除这条记录吗？',
      success(res) {
        if (res.confirm) {
          const openId = app.globalData.openId || wx.getStorageSync('openId');
          const { currentType, selectedDate } = that.data;
          
          wx.showLoading({ title: '删除中...', mask: true });

          Http.post(API.MEASUREMENT_DELETE, {
            openId,
            date: selectedDate,
            type: currentType
          }).then(() => {
            wx.hideLoading();
            that.setData({ showPicker: false });
            wx.showToast({ title: '已删除', icon: 'none' });
            that.loadData();
          }).catch(err => {
            wx.hideLoading();
            console.error('Delete measurement failed:', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  // 计算腰臀比
  get whr() {
    const { waist, hip } = this.data.todayStats;
    if (waist && hip) {
      return (waist / hip).toFixed(2);
    }
    return '--';
  },

  get whrStatus() {
     const { waist, hip } = this.data.todayStats;
     if (!waist || !hip) return '';
     const ratio = waist / hip;
     // 简单评估 (女性)
     if (ratio < 0.8) return '梨型身材';
     if (ratio > 0.85) return '苹果型身材';
     return '标准身材';
  },

   recordShareAction(scene) {
        const openId = app.globalData.openId || wx.getStorageSync('openId');
        if (!openId) return;
        
        const recordUrl = '/api/v1/user/share';
        Http.post(recordUrl, {
            openId,
            scene: scene, 
            page: 'pages/measure/measure' // 记录来源页面
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
