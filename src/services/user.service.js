// services/user.service.js

/**
 * 获取用户资料
 */
function getUserProfile() {
  return {
    height: 170,
    weight: 65,
    age: 25,
    gender: '男',
    bodyFat: 20,
  };
}

/**
 * 更新用户资料
 */
function updateUserProfile(profile) {
  return true;
}

/**
 * 计算 BMI
 */
function calculateBMI(height, weight) {
  if (!height || !weight) return 0;
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  return bmi;
}

/**
 * 获取健康状态评估
 */
function getHealthStatus(bmi, bodyFat) {
  let bmiStatus = '';
  let healthStatus = '';
  let score = 0;
  let color = '#3cc51f';
  
  // BMI 评估
  if (bmi < 18.5) {
    bmiStatus = '偏瘦';
    score += 60;
    color = '#FFD93D';
  } else if (bmi >= 18.5 && bmi < 24) {
    bmiStatus = '正常';
    score += 90;
    color = '#3cc51f';
  } else if (bmi >= 24 && bmi < 28) {
    bmiStatus = '偏重';
    score += 70;
    color = '#FF8E53';
  } else {
    bmiStatus = '肥胖';
    score += 50;
    color = '#FF6B6B';
  }
  
  // 体脂率评估（假设性别为男）
  if (bodyFat > 0) {
    if (bodyFat < 15) {
      score += 5;
    } else if (bodyFat >= 15 && bodyFat <= 25) {
      score += 10;
    } else if (bodyFat > 25 && bodyFat <= 30) {
      score -= 10;
    } else {
      score -= 20;
    }
  }
  
  // 综合健康状态
  if (score >= 85) {
    healthStatus = '健康状态良好';
  } else if (score >= 70) {
    healthStatus = '亚健康状态';
  } else if (score >= 60) {
    healthStatus = '需要改善';
  } else {
    healthStatus = '请关注健康';
  }
  
  return {
    bmiStatus,
    healthStatus,
    score: Math.min(Math.max(score, 0), 100),
    color,
  };
}

/**
 * 获取理想体重范围
 */
function getIdealWeightRange(height, gender) {
  const heightInMeters = height / 100;
  
  // 理想 BMI 范围 18.5-23.9
  const minWeight = 18.5 * heightInMeters * heightInMeters;
  const maxWeight = 23.9 * heightInMeters * heightInMeters;
  
  return {
    min: minWeight.toFixed(1),
    max: maxWeight.toFixed(1),
  };
}

/**
 * 计算基础代谢率 (BMR)
 */
function calculateBMR(weight, height, age, gender) {
  let bmr = 0;
  
  // Harris-Benedict 公式
  if (gender === '男') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
  
  return Math.round(bmr);
}

/**
 * 计算每日热量需求 (TDEE)
 */
function calculateTDEE(bmr, activityLevel = 1.375) {
  // 活动系数：
  // 1.2 久坐不动
  // 1.375 轻度活动（每周1-3天）
  // 1.55 中度活动（每周3-5天）
  // 1.725 高度活动（每周6-7天）
  // 1.9 专业运动员
  
  return Math.round(bmr * activityLevel);
}

/**
 * 获取健康建议
 */
function getHealthAdvice(bmi, bodyFat, age) {
  const advice = [];
  
  // BMI 建议
  if (bmi < 18.5) {
    advice.push('您的体重偏轻，建议增加营养摄入');
    advice.push('适当增加力量训练，增加肌肉量');
  } else if (bmi >= 24 && bmi < 28) {
    advice.push('建议控制饮食，减少高热量食物摄入');
    advice.push('每天至少30分钟有氧运动');
  } else if (bmi >= 28) {
    advice.push('建议咨询专业医生或营养师');
    advice.push('制定科学的减重计划');
  }
  
  // 体脂率建议
  if (bodyFat > 25) {
    advice.push('体脂率偏高，建议增加运动频率');
    advice.push('控制碳水化合物和脂肪摄入');
  }
  
  // 通用建议
  advice.push('保持充足睡眠，每天7-8小时');
  advice.push('多喝水，每天至少8杯');
  advice.push('戒烟限酒，保持良好生活习惯');
  
  return advice;
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  calculateBMI,
  getHealthStatus,
  getIdealWeightRange,
  calculateBMR,
  calculateTDEE,
  getHealthAdvice,
};
