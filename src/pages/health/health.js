// pages/health/health.js
const { getUserProfile, updateUserProfile, calculateBMI, getHealthStatus } = require('../../services/user.service');

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
      bodyFat: 0,
    },
    
    // 计算结果
    bmi: 0,
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
    editBodyFat: '',
    
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
    // 重新加载数据，确保显示最新信息
    this.loadProfile();
    this.loadRecords();
  },

  // 切换标签
  onTabChange(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ activeTab: index });
  },

  // 加载用户资料
  loadProfile() {
    const profile = getUserProfile();
    
    // 如果是初次使用（没有数据），显示0值
    const bmi = calculateBMI(profile.height, profile.weight);
    const status = getHealthStatus(bmi, profile.bodyFat);
    
    this.setData({
      profile: {
        height: profile.height || 0,
        weight: profile.weight || 0,
        age: profile.age || 0,
        gender: profile.gender || '男',
        bodyFat: profile.bodyFat || 0,
      },
      bmi: bmi > 0 ? bmi.toFixed(1) : '0.0',
      bmiStatus: status.bmiStatus,
      healthStatus: status.healthStatus,
      healthScore: status.score,
      statusColor: status.color,
    });
    
    // 如果是第一次使用，提示用户编辑资料
    if (!profile.height || !profile.weight) {
      console.log('提示：请先编辑您的健康资料');
    }
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
      editBodyFat: profile.bodyFat > 0 ? profile.bodyFat.toString() : '',
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

  onBodyFatInput(e) {
    this.setData({ editBodyFat: e.detail.value });
  },

  // 保存资料
  saveProfile() {
    const { editHeight, editWeight, editAge, editGender, editBodyFat } = this.data;
    
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
    const bodyFat = parseFloat(editBodyFat) || 0;
    
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
    
    if (bodyFat > 0 && (bodyFat < 5 || bodyFat > 60)) {
      wx.showToast({
        title: '体脂率范围：5-60%',
        icon: 'none',
      });
      return;
    }
    
    // 保存数据
    const profile = {
      height,
      weight,
      age,
      gender: editGender,
      bodyFat,
    };
    
    updateUserProfile(profile);
    
    // 重新加载数据
    this.loadProfile();
    
    // 关闭对话框
    this.closeEditDialog();
    
    // 显示成功提示
    wx.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 2000,
    });
    
    console.log('用户资料已保存:', profile);
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

  onShareAppMessage() {
    return {
      title: '我的健康数据 - 健康伙伴',
      path: '/pages/health/health',
    };
  },
});
