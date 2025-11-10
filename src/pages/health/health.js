// pages/health/health.js
const { calculateBMI, getHealthStatus } = require('../../services/user.service');
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');

const app = getApp();

Page({
  data: {
    activeTab: 0,
    tabs: ['健康数据', '体征记录'],
    
    // 用户信息
    profile: {
      height: 0,
      weight: 0,
      age: 0,
      gender: '男',
    },
    
    // 计算结果
    bmi: 0,
    bmiIndicatorPosition: 0,
    bmiStatus: '',
    healthStatus: '',
    healthScore: 0,
    
    // 健康评估颜色
    statusColor: '#3cc51f',
    
    // 体征记录
    records: [],
    recordTypes: ['血压', '心率', '体重', '血糖', '体温'],
    
    // 编辑对话框
    showEditDialog: false,
    editHeight: '',
    editWeight: '',
    editAge: '',
    editGender: '男',
    
    // 记录对话框
    showAddModal: false,
    currentType: '',
    currentValue: '',
  },

  onLoad() {
    this.loadProfile();
    this.loadRecords();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 1 });
    }
    // 注意：不在这里调用 loadProfile()，避免与 onLoad() 重复调用
    // 如果需要刷新数据，可以在特定场景下手动调用
    this.loadRecords();
  },

  // 切换标签
  onTabChange(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ activeTab: index });
  },

  // 阻止弹窗背景滚动
  preventTouchMove() {
    // 空函数，用于阻止滚动穿透
    return false;
  },

  // 计算BMI指示器位置
  // 注意：需要与 getHealthStatus 函数中的分类标准保持一致
  // 使用中国标准：偏瘦(<18.5), 正常(18.5-24), 偏重(24-28), 肥胖(≥28)
  calculateIndicatorPosition(bmi) {
    // section划分：偏瘦(0-25%), 正常(25-50%), 偏重(50-75%), 肥胖(75-100%)
    // BMI分类：偏瘦(<18.5), 正常(18.5-24), 偏重(24-28), 肥胖(≥28)
    if (bmi < 18.5) {
      // 偏瘦：BMI 12-18.5 映射到 0-25%
      return Math.max(0, Math.min(25, ((bmi - 12) / (18.5 - 12)) * 25));
    } else if (bmi < 24) {
      // 正常：BMI 18.5-24 映射到 25-50%
      return 25 + ((bmi - 18.5) / (24 - 18.5)) * 25;
    } else if (bmi < 28) {
      // 偏重：BMI 24-28 映射到 50-75%
      return 50 + ((bmi - 24) / (28 - 24)) * 25;
    } else {
      // 肥胖：BMI 28-40 映射到 75-100%
      return 75 + Math.min(25, ((bmi - 28) / (40 - 28)) * 25);
    }
  },

  // 加载用户资料
  loadProfile() {
    // 优先从全局数据或本地存储获取（登录时已获取）
    const cachedProfile = app.globalData.profile || wx.getStorageSync('profile');
    
    if (cachedProfile) {
      const profile = cachedProfile;
      // 计算 BMI
      const bmi = calculateBMI(profile.height, profile.weight);
      const status = getHealthStatus(bmi);
      
      // 计算BMI指示器位置
      const indicatorPosition = this.calculateIndicatorPosition(bmi);
      
      this.setData({
        profile: {
          height: profile.height || 0,
          weight: profile.weight || 0,
          age: profile.age || 0,
          gender: profile.gender || '男',
        },
        bmi: bmi > 0 ? bmi.toFixed(1) : '0.0',
        bmiIndicatorPosition: indicatorPosition.toFixed(2),
        bmiStatus: status.bmiStatus,
        healthStatus: status.healthStatus,
        healthScore: status.score,
        statusColor: status.color,
      });
      
      // 后台刷新数据（不阻塞UI）
      this.refreshProfile();
      return;
    }
    
    // 如果没有缓存数据，从接口获取
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      // 如果没有 openId，等待一下再试
      setTimeout(() => {
        this.loadProfile();
      }, 500);
      return;
    }

    Http.get(API.USER_PROFILE, {
      openId: openId
    }).then((result) => {
      if (result.data) {
        const profile = result.data;
        // 更新全局数据和本地存储
        app.globalData.profile = profile;
        wx.setStorageSync('profile', profile);
        
        // 计算 BMI
        const bmi = calculateBMI(profile.height, profile.weight);
        const status = getHealthStatus(bmi);
        
        // 计算BMI指示器位置
        const indicatorPosition = this.calculateIndicatorPosition(bmi);
        
        this.setData({
          profile: {
            height: profile.height || 0,
            weight: profile.weight || 0,
            age: profile.age || 0,
            gender: profile.gender || '男',
          },
          bmi: bmi > 0 ? bmi.toFixed(1) : '0.0',
          bmiIndicatorPosition: indicatorPosition.toFixed(2),
          bmiStatus: status.bmiStatus,
          healthStatus: status.healthStatus,
          healthScore: status.score,
          statusColor: status.color,
        });
      }
    }).catch((error) => {
      console.error('获取健康档案失败', error);
      // 如果获取失败，显示默认值
      this.setData({
        profile: {
          height: 0,
          weight: 0,
          age: 0,
          gender: '男',
        },
        bmi: '0.0',
        bmiIndicatorPosition: 0,
        bmiStatus: '未评估',
        healthStatus: '未评估',
        healthScore: 0,
        statusColor: '#3cc51f',
      });
    });
  },

  // 后台刷新健康档案数据（不阻塞UI）
  refreshProfile() {
    // 防止重复调用
    if (this._refreshingProfile) {
      return;
    }
    this._refreshingProfile = true;
    
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      this._refreshingProfile = false;
      return;
    }
    
    Http.get(API.USER_PROFILE, {
      openId: openId
    }).then((result) => {
      if (result.data) {
        // 更新全局数据和本地存储
        app.globalData.profile = result.data;
        wx.setStorageSync('profile', result.data);
      }
      this._refreshingProfile = false;
    }).catch((error) => {
      // 静默失败，不影响UI
      console.error('后台刷新健康档案失败', error);
      this._refreshingProfile = false;
    });
  },

  // 打开编辑对话框
  openEditDialog() {
    const { profile } = this.data;
    
    this.setData({
      showEditDialog: true,
      editHeight: profile.height > 0 ? profile.height.toString() : '',
      editWeight: profile.weight > 0 ? profile.weight.toString() : '',
      editAge: profile.age > 0 ? profile.age.toString() : '',
      editGender: profile.gender || '男',
    });
  },

  // 关闭编辑对话框
  closeEditDialog() {
    this.setData({ showEditDialog: false });
  },

  // 输入处理
  onHeightInput(e) {
    this.setData({ editHeight: e.detail.value });
  },

  onWeightInput(e) {
    this.setData({ editWeight: e.detail.value });
  },

  onAgeInput(e) {
    this.setData({ editAge: e.detail.value });
  },

  onGenderChange(e) {
    this.setData({ editGender: e.detail.value });
  },

  // 保存资料
  saveProfile() {
    const { editHeight, editWeight, editAge, editGender } = this.data;
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    
    if (!openId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }
    
    // 验证输入
    if (!editHeight || !editWeight || !editAge) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none',
      });
      return;
    }
    
    // 验证数值范围
    const height = parseFloat(editHeight);
    const weight = parseFloat(editWeight);
    const age = parseInt(editAge);
    
    if (height < 100 || height > 250) {
      wx.showToast({
        title: '身高范围：100-250cm',
        icon: 'none',
      });
      return;
    }
    
    if (weight < 30 || weight > 300) {
      wx.showToast({
        title: '体重范围：30-300kg',
        icon: 'none',
      });
      return;
    }
    
    if (age < 1 || age > 150) {
      wx.showToast({
        title: '年龄范围：1-150岁',
        icon: 'none',
      });
      return;
    }
    
    // 调用后端接口保存数据
    Http.post(API.USER_PROFILE, {
      openId: openId,
      height: height,
      weight: weight,
      age: age,
      gender: editGender
    }).then((result) => {
      // 关闭对话框
      this.closeEditDialog();
      
      // 显示成功提示
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 2000,
      });
      
      // 更新全局数据和本地存储
      if (result.data) {
        const profile = {
          height: result.data.height || null,
          weight: result.data.weight || null,
          age: result.data.age || null,
          gender: result.data.gender || '男',
        };
        app.globalData.profile = profile;
        wx.setStorageSync('profile', profile);
      }
      
      // 重新加载数据
      this.loadProfile();
    }).catch((error) => {
      console.error('保存健康档案失败', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none',
      });
    });
  },

  // 加载体征记录
  loadRecords() {
    this.setData({ records: [] });
  },

  // 打开添加记录对话框
  showAddDialog() {
    this.setData({ showAddModal: true });
  },

  // 关闭记录对话框
  hideAddDialog() {
    this.setData({
      showAddModal: false,
      currentType: '',
      currentValue: '',
    });
  },

  // 选择记录类型
  selectType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ currentType: type });
  },

  // 输入数值
  onValueInput(e) {
    this.setData({ currentValue: e.detail.value });
  },

  // 保存体征记录
  saveRecord() {
    const { currentType, currentValue, records } = this.data;

    if (!currentType || !currentValue) {
      wx.showToast({
        title: '请完整填写信息',
        icon: 'none',
      });
      return;
    }

    const now = new Date();
    const newRecord = {
      id: Date.now(),
      type: currentType,
      value: currentValue,
      date: now.toLocaleDateString('zh-CN'),
      time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedRecords = [newRecord, ...records];
    this.setData({ records: updatedRecords });

    wx.showToast({
      title: '记录成功',
      icon: 'success',
    });

    this.hideAddDialog();
  },

  // 删除记录
  deleteRecord(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: res => {
        if (res.confirm) {
          const records = this.data.records.filter(r => r.id !== id);
          this.setData({ records });
          wx.showToast({
            title: '删除成功',
            icon: 'success',
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
      title: '我的健康数据 - 健康伙伴',
      path: '/pages/health/health',
    };
  },
});
