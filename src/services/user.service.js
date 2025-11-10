// services/user.service.js

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
 * 获取健康状态评估（仅基于BMI）
 * 颜色与 WXSS 中的 BMI 状态颜色保持一致
 * 
 * 评分体系基于医学研究：
 * 1. BMI与死亡率关系呈U型曲线，最优范围22-25（死亡率最低）
 * 2. WHO标准：<18.5偏瘦，18.5-24.9正常，25-29.9超重，≥30肥胖
 * 3. 亚洲标准更严格：<18.5偏瘦，18.5-22.9正常，23-24.9超重，≥25肥胖
 * 4. 参考研究：BMI在22-25之间健康风险最低，偏离越远风险越高
 * 
 * 评分规则（基于健康风险的反向映射）：
 * - 最优范围（22-25）：95-100分，BMI=23.5（中点）时100分
 * - 正常范围（18.5-22, 25-24）：85-95分，接近最优范围分数越高
 * - 偏瘦（<18.5）：30-85分，根据偏离程度递减
 * - 偏重（24-28）：60-85分，根据偏离程度递减
 * - 肥胖（≥28）：15-60分，根据偏离程度递减
 */
function getHealthStatus(bmi) {
  let bmiStatus = '';
  let healthStatus = '';
  let score = 0;
  let color = '#3cc51f'; // 默认正常颜色
  
  // 最优BMI范围（基于医学研究：22-25死亡率最低）
  const optimalMin = 22;
  const optimalMax = 25;
  const optimalCenter = 23.5;
  
  // BMI 评估（颜色与 health.wxss 中的 .bmi-section 颜色一致）
  if (bmi < 18.5) {
    // 偏瘦：BMI < 18.5（WHO标准）
    bmiStatus = '偏瘦';
    color = '#4ECDC4'; // 与 .bmi-section.underweight 一致
    
    // 评分计算：基于健康风险递增
    // BMI=18.5时85分（接近正常），BMI=17时70分，BMI=16时55分，BMI=15时40分，BMI<15时30分
    if (bmi >= 17) {
      // 17-18.5: 70-85分线性插值
      score = 70 + (bmi - 17) / (18.5 - 17) * (85 - 70);
    } else if (bmi >= 16) {
      // 16-17: 55-70分线性插值
      score = 55 + (bmi - 16) / (17 - 16) * (70 - 55);
    } else if (bmi >= 15) {
      // 15-16: 40-55分线性插值
      score = 40 + (bmi - 15) / (16 - 15) * (55 - 40);
    } else {
      // <15: 30-40分线性插值，最低30分
      score = Math.max(30, 30 + (bmi - 12) / (15 - 12) * (40 - 30));
    }
    
    if (bmi < 16) {
      healthStatus = '需要增加营养';
    } else {
      healthStatus = '需要改善';
    }
  } else if (bmi >= 18.5 && bmi < optimalMin) {
    // 正常偏低：18.5 ≤ BMI < 22
    bmiStatus = '正常';
    color = '#3cc51f'; // 与 .bmi-section.normal 一致
    
    // 评分计算：BMI=22时95分，BMI=18.5时85分
    score = 85 + (bmi - 18.5) / (optimalMin - 18.5) * (95 - 85);
    
    healthStatus = '健康状态良好';
  } else if (bmi >= optimalMin && bmi <= optimalMax) {
    // 最优范围：22 ≤ BMI ≤ 25（基于医学研究的最优范围）
    bmiStatus = '正常';
    color = '#3cc51f'; // 与 .bmi-section.normal 一致
    
    // 评分计算：BMI=23.5（中点）时100分，边界（22或25）时95分
    const distanceFromCenter = Math.abs(bmi - optimalCenter);
    const maxDistance = optimalMax - optimalCenter; // 1.5
    score = 100 - (distanceFromCenter / maxDistance) * 5; // 95-100分
    
    healthStatus = '健康状态优秀';
  } else if (bmi > optimalMax && bmi < 28) {
    // 偏重：25 < BMI < 28（WHO标准：25-29.9为超重）
    bmiStatus = '偏重';
    color = '#FFD93D'; // 与 .bmi-section.overweight 一致
    
    // 评分计算：BMI=25时95分，BMI=28时60分
    score = 95 - (bmi - optimalMax) / (28 - optimalMax) * (95 - 60);
    
    healthStatus = '亚健康状态';
  } else {
    // 肥胖：BMI ≥ 28（WHO标准：≥30为肥胖，这里用28作为分界点，符合中国标准）
    bmiStatus = '肥胖';
    color = '#FF6B6B'; // 与 .bmi-section.obese 一致
    
    // 评分计算：基于健康风险递增
    // BMI=28时60分，BMI=30时45分，BMI=35时25分，BMI≥40时15分
    if (bmi < 30) {
      // 28-30: 60-45分线性插值
      score = 60 - (bmi - 28) / (30 - 28) * (60 - 45);
    } else if (bmi < 35) {
      // 30-35: 45-25分线性插值
      score = 45 - (bmi - 30) / (35 - 30) * (45 - 25);
    } else {
      // ≥35: 25-15分线性插值，最低15分
      score = Math.max(15, 25 - (bmi - 35) / (40 - 35) * (25 - 15));
    }
    
    if (bmi >= 35) {
      healthStatus = '需要立即关注';
    } else {
      healthStatus = '请关注健康';
    }
  }
  
  return {
    bmiStatus,
    healthStatus,
    score: Math.round(Math.min(Math.max(score, 15), 100)), // 限制在15-100分，四舍五入
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

module.exports = {
  calculateBMI,
  getHealthStatus,
  getIdealWeightRange,
  calculateBMR,
  calculateTDEE,
};
