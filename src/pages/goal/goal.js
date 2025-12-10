
// pages/goal/goal.js
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');
const { calculateBMI } = require('../../utils/health-calculator');

const app = getApp();

Page({
  data: {
    profile: {
      height: 0,
      weight: 0,
      originalWeight: 0,
      age: 0,
      gender: '男'
    },
    goals: {
      targetWeight: '',
      targetDate: '',
    },
    
    // 基础数据
    today: '',
    genderRange: ['男', '女'],
    genderIndex: 0,
    
    // 弹窗相关
    showInputPopup: false,
    popupTitle: '',
    popupUnit: '',
    popupField: '', // 当前编辑的字段名
    inputValue: '',
  },

  onLoad() {
    // 初始化日期
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    this.setData({
      today: `${year}-${month}-${day}`
    });
    
    this.loadData();
  },

  loadData() {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      setTimeout(() => { this.loadData(); }, 500);
      return;
    }

    wx.showLoading({ title: '加载中...', mask: true });

    Promise.all([
      Http.get(API.USER_PROFILE, { openId }),
      Http.get(API.USER_GOALS, { openId })
    ]).then(([profileRes, goalsRes]) => {
      wx.hideLoading();
      
      const profile = profileRes.data || {};
      const goalsData = goalsRes.data || {};
      
      this.setData({
        profile: {
          height: profile.height || 0,
          weight: profile.weight || 0,
          originalWeight: profile.originalWeight || 0,
          age: profile.age || 0,
          gender: profile.gender || '男'
        },
        goals: {
          targetWeight: goalsData.targetWeight ? goalsData.targetWeight.toString() : '',
          targetDate: goalsData.targetDate || '',
        },
        // 更新Picker索引
        genderIndex: profile.gender === '女' ? 1 : 0
      });
    }).catch((error) => {
      wx.hideLoading();
      console.error('加载数据失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  // 点击列表项（非Picker项）
  onItemTap(e) {
    const { field, title, unit } = e.currentTarget.dataset;
    let currentValue = '';
    
    if (field === 'height' || field === 'weight' || field === 'age' || field === 'originalWeight') {
      currentValue = this.data.profile[field];
    } else if (field === 'targetWeight') {
      currentValue = this.data.goals.targetWeight;
    }
    
    this.setData({
      showInputPopup: true,
      popupTitle: title,
      popupUnit: unit,
      popupField: field,
      inputValue: currentValue || ''
    });
  },

  // 弹窗输入
  onPopupInput(e) {
    let value = e.detail.value;
    const { popupField } = this.data;
    
    // 年龄：仅允许正整数
    if (popupField === 'age') {
      value = value.replace(/[^\d]/g, '');
      // 限制最大3位数
      if (value.length > 3) {
        value = value.substring(0, 3);
      }
    } 
    // 身高、体重、目标体重：允许一位小数
    else {
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
    }
    
    this.setData({ inputValue: value });
  },

  // 关闭弹窗
  closePopup() {
    this.setData({ showInputPopup: false });
  },

  // 保存弹窗输入
  savePopupInput() {
    const { popupField, inputValue } = this.data;
    const value = parseFloat(inputValue);
    
    if (!value || isNaN(value)) {
      wx.showToast({ title: '请输入有效数值', icon: 'none' });
      return;
    }
    
    // 根据字段分发保存逻辑
    switch (popupField) {
      case 'weight':
        this.saveWeight(value);
        break;
      case 'originalWeight':
        this.saveProfile({ weight: value });
        break;  
      case 'height':
        this.saveProfile({ height: value });
        break;
      case 'age':
        this.saveProfile({ age: parseInt(value) });
        break;
      case 'targetWeight':
        this.saveGoal({ targetWeight: value });
        break;
    }
    
    this.closePopup();
  },

  // 性别变更
  onGenderChange(e) {
    const index = parseInt(e.detail.value);
    const gender = this.data.genderRange[index];
    this.setData({ genderIndex: index });
    this.saveProfile({ gender });
  },

  // 日期变更
  onDateChange(e) {
    const date = e.detail.value;
    this.setData({ 'goals.targetDate': date });
    this.saveGoal({ targetDate: date });
  },

  // === 原子化保存方法 ===

  // 1. 保存体重记录
  saveWeight(weight) {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    const today = this.data.today;
    
    Http.post(API.WEIGHT_SAVE, {
      openId,
      weight,
      recordDate: today // 默认记录为今天
    }).then((res) => {
      if (res.success) {
        this.setData({ 'profile.weight': weight });
        wx.showToast({ title: '已记录体重', icon: 'success' });
      }
    });
  },

  // 2. 保存用户档案 (初始体重、身高, 年龄, 性别)
  saveProfile(data) {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    Http.post(API.USER_PROFILE, {
      openId,
      ...data
    }).then((res) => {
      if (res.success) {
        // 更新本地显示
        if (data.weight) {
          this.setData({ 'profile.originalWeight': data.weight });
        }
        const tempData = data
        if (data.weight) {
          tempData.originalWeight = data.weight;
          delete tempData.weight;
        }
        const newProfile = { 
          ...this.data.profile,
          ...tempData
        };
        this.setData({ profile: newProfile });
        // 更新全局缓存
        if (app.globalData.profile) {
          app.globalData.profile = { ...app.globalData.profile, ...data };
        }
        wx.showToast({ title: '已更新档案', icon: 'success' });
      }
    });
  },

  // 3. 保存用户目标 (目标体重, 目标日期)
  saveGoal(data) {
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    Http.post(API.USER_GOALS, {
      openId,
      ...data
    }).then((res) => {
      if (res.success) {
        // 更新本地显示
        const newGoals = { ...this.data.goals, ...data };
        this.setData({ goals: newGoals });
        wx.showToast({ title: '已更新目标', icon: 'success' });
      }
    });
  },

  onShareAppMessage() {
    return {
      title: '拍照识热量，轻松控饮食',
      path: '/pages/questionnaire/questionnaire',
      imageUrl: 'https://whpuedison.online/images/kongka_share.jpg'
    };
  },

  onShareTimeline() {
    return {
          title: '拍照识热量，轻松控饮食',
          path: '/pages/questionnaire/questionnaire',
          imageUrl: 'https://whpuedison.online/images/tomato.jpg'
        };
   }
});
