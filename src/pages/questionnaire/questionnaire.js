// pages/questionnaire/questionnaire.js
const app = getApp();

Page({
  data: {
    // 当前步骤（从1开始）
    currentStep: 1,
    // 总步骤数（后续可以扩展）
    totalSteps: 5,
    // 选择的性别
    selectedGender: null,
    // 选择的身高
    selectedHeight: 170,
    // 选择的体重
    selectedWeight: 70,
    // 出生日期选择
    currentDate: new Date('2000-01-01').getTime(), // 默认2000年1月1日的时间戳
    showDatePicker: false,
    minDate: new Date(new Date().getFullYear() - 80, 0, 1).getTime(), // 最小日期为80年前 (约1944年)
    maxDate: new Date(new Date().getFullYear() - 18, 11, 31).getTime(), // 最大日期为18年前 (约2006年)
    formatter(type, value) {
      if (type === 'year') {
        return `${value}年`;
      }
      if (type === 'month') {
        return `${value}月`;
      }
      return value;
    },
    formattedDate: '2000-01-01',  // 用于显示的格式化日期字符串
    // 年龄计算结果
    age: 0,
    ageDescription: '',
    // BMI计算结果
    bmi: 0,
    bmiStatus: '正常',
    bmiIndicatorPosition: 0,
    bmiSuggestions: [],
    // 问卷数据
    questionnaireData: {
      gender: null,
      height: null,
      weight: null,
      birth_date: null,
      age: null,
      bmi: null
    }
  },

  onLoad() {
    // 设置 tabBar 隐藏（如果存在）
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: -1 });
    }

    // 初始化时如果已经有身高体重数据，计算BMI
    this.calculateBMI();

    // 初始化年龄评估（默认2000-01-01）
    const defaultBirth = new Date('2000-01-01');
    const age = this.calculateAge(defaultBirth);
    const ageDescription = this.getAgeDescription(age);
    const formattedDate = this.formatDate(defaultBirth);

    this.setData({
      age: age,
      ageDescription: ageDescription,
      formattedDate: formattedDate
    });
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

    // 实时计算BMI
    this.calculateBMI();
  },

  // 显示日期选择器
  showDatePicker() {
    this.setData({ showDatePicker: true });
  },

  // 隐藏日期选择器
  hideDatePicker() {
    this.setData({ showDatePicker: false });
  },

  // 日期输入处理（用于bind:input）
  onInput(e) {
    this.setData({
      currentDate: e.detail,
    });
  },

  // 日期选择器确认（点击确定按钮）
  onDateConfirm(e) {
    const date = new Date(e.detail);
    const formattedDate = this.formatDate(date);
    const age = this.calculateAge(date);
    const ageDescription = this.getAgeDescription(age);

    this.setData({
      showDatePicker: false,
      formattedDate: formattedDate,
      age: age,
      ageDescription: ageDescription,
      'questionnaireData.birth_date': formattedDate,
      'questionnaireData.age': age
    });
  },

  // 日期选择器取消（点击取消按钮）
  onDateCancel() {
    this.setData({
      showDatePicker: false
    });
  },

  // 出生日期确认（弹窗关闭时触发）
  onPopupClose() {
    // 弹窗手动关闭时也更新数据
    const date = new Date(this.data.currentDate);
    const formattedDate = this.formatDate(date);
    const age = this.calculateAge(date);
    const ageDescription = this.getAgeDescription(age);

    this.setData({
      showDatePicker: false,
      formattedDate: formattedDate,
      age: age,
      ageDescription: ageDescription,
      'questionnaireData.birth_date': formattedDate,
      'questionnaireData.age': age
    });
  },

  // 隐藏日期选择器（弃用）
  hideDatePicker() {
    this.setData({ showDatePicker: false });
  },

  // 格式化日期为YYYY-MM-DD格式
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 计算年龄
  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  },

  // 获取年龄描述
  getAgeDescription(age) {
    if (age < 18) {
      return '青少年时期，身体发育关键阶段。基础代谢水平较高，建议保持均衡营养摄入和适量运动，促进身体健康成长。';
    } else if (age < 30) {
      return '青年时期，新陈代谢旺盛，能量消耗较高。这是建立健康生活习惯的最好时机，坚持规律锻炼可以帮助维持体形。';
    } else if (age < 45) {
      return '中年初期，工作压力增大，基础代谢水平开始下降。建议注重饮食健康，规律运动，避免脂肪堆积。';
    } else if (age < 60) {
      return '中年后期，基础代谢水平进一步下降，身体各项机能需要保养。建议定期体检，注重骨骼健康和心血管保健。';
    } else if (age < 75) {
      return '老年初期，基础代谢水平明显下降，肌肉量减少。建议补充优质蛋白质，轻柔有氧运动，促进钙吸收。';
    } else {
      return '高龄阶段，需要特别关注营养均衡和身体机能保养。建议定期咨询医生，定制适合的养生方案。';
    }
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

  // 计算BMI
  calculateBMI() {
    const { selectedHeight: height, selectedWeight: weight } = this.data;

    if (!height || !weight || height <= 0 || weight <= 0) {
      // 数据不完整，不计算BMI
      this.setData({
        bmi: 0,
        bmiStatus: '未评估',
        bmiIndicatorPosition: 25, // 正常位置
        bmiSuggestions: []
      });
      return;
    }

    // BMI公式：体重(kg) ÷ (身高(m)的平方)
    const heightInMeter = height / 100;
    const bmiValue = weight / (heightInMeter * heightInMeter);

    // 获取BMI状态和建议
    const status = this.getHealthStatus(bmiValue);
    const indicatorPosition = this.calculateIndicatorPosition(bmiValue);

    this.setData({
      bmi: bmiValue.toFixed(1),
      bmiStatus: status.status,
      bmiIndicatorPosition: indicatorPosition,
      bmiSuggestions: status.suggestions,
      'questionnaireData.bmi': bmiValue.toFixed(1)
    });
  },

  // 获取健康状态和建议
  getHealthStatus(bmi) {
    let status = '';
    let suggestions = [];

    if (bmi < 18.5) {
      status = '偏瘦';
      suggestions = [
        '您的BMI偏低，需要增加营养摄入',
        '建议多吃高蛋白食品，如肉类、蛋类、豆制品'
      ];
    } else if (bmi >= 18.5 && bmi < 24) {
      status = '正常';
      suggestions = [
        '您的BMI在正常范围内，请保持健康生活方式',
        '坚持规律饮食和适量运动'
      ];
    } else if (bmi >= 24 && bmi < 28) {
      status = '偏重';
      suggestions = [
        '您的BMI偏高，建议控制饮食并增加运动',
        '减少高脂、高糖食物摄入'
      ];
    } else {
      status = '肥胖';
      suggestions = [
        '您的BMI较高，建议咨询专业医生',
        '制定合理的减重计划'
      ];
    }

    return { status, suggestions };
  },

  // 计算BMI指示器位置
  calculateIndicatorPosition(bmi) {
    // 使用中国标准：偏瘦(<18.5), 正常(18.5-24), 偏重(24-28), 肥胖(≥28)
    // 各区段对应bar的百分比：
    // 偏瘦(15%), 正常(25%), 偏重(25%), 肥胖(35%) 合计100%

    if (bmi < 18.5) {
      // 偏瘦区段：BMI 12-18.5 映射到 0-15%
      return Math.max(0, ((bmi - 12) / (18.5 - 12)) * 15);
    } else if (bmi < 24) {
      // 正常区段：BMI 18.5-24 映射到 15-40%
      return 15 + ((bmi - 18.5) / (24 - 18.5)) * 25;
    } else if (bmi < 28) {
      // 偏重区段：BMI 24-28 映射到 40-65%
      return 40 + ((bmi - 24) / (28 - 24)) * 25;
    } else {
      // 肥胖区段：BMI 28-40 映射到 65-100%
      return 65 + Math.min(35, ((bmi - 28) / (40 - 28)) * 35);
    }
  },

  // 计算进度百分比
  getProgressPercent() {
    return (this.data.currentStep / this.data.totalSteps) * 100;
  }
});
