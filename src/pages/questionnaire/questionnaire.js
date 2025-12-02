// pages/questionnaire/questionnaire.js
const app = getApp();

Page({
  data: {
    // 当前步骤（从1开始）
    currentStep:3,
    // 总步骤数（后续可以扩展）
    totalSteps: 5,
    // 选择的性别
    selectedGender: null,
    // 选择的身高
    selectedHeight: 170,
    // 选择的体重
    selectedWeight: 70,
    // 问卷数据
    questionnaireData: {
      gender: null,
      height: null,
      weight: null
    }
  },

  onLoad() {
    // 设置 tabBar 隐藏（如果存在）
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: -1 });
    }
  },

  // 选择性别
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      selectedGender: gender,
      'questionnaireData.gender': gender
    });

    // 延迟一下，让用户看到选择效果，然后进入下一步
    setTimeout(() => {
      this.nextStep();
    }, 300);
  },

  // 身高变化处理
  onHeightChange(e) {
    const height = e.detail.value;
    this.setData({
      selectedHeight: height,
      'questionnaireData.height': height
    });
  },

  // 体重变化处理
  onWeightChange(e) {
    const weight = e.detail.value;
    this.setData({
      selectedWeight: weight,
      'questionnaireData.weight': weight
    });
  },

  // 下一步
  nextStep() {
    if (this.data.currentStep < this.data.totalSteps) {
      this.setData({
        currentStep: this.data.currentStep + 1
      });
    } else {
      // 完成问卷
      this.submitQuestionnaire();
    }
  },

  // 上一步
  prevStep() {
    if (this.data.currentStep > 1) {
      this.setData({
        currentStep: this.data.currentStep - 1
      });
    }
  },

  // 提交问卷
  submitQuestionnaire() {
    console.log('问卷数据:', this.data.questionnaireData);
    // TODO: 提交到后端
    wx.showToast({
      title: '提交成功',
      icon: 'success'
    });
    
    // 返回上一页或跳转到首页
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 计算进度百分比
  getProgressPercent() {
    return (this.data.currentStep / this.data.totalSteps) * 100;
  }
});
