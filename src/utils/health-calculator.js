/**
 * 健康计划业务工具函数
 */

/**
 * 计算BMI
 * @param {number} weight - 体重(kg)
 * @param {number} height - 身高(cm)
 * @returns {number} BMI值
 */
function calculateBMI(weight, height) {
  const heightInMeters = height / 100;
  return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
}

/**
 * 获取BMI状态、样式和建议
 * @param {number} bmi - BMI值
 * @returns {Object} {status: string, statusClass: string, suggestions: string[]}
 */
function getBMIStatus(bmi) {
  if (bmi < 18.5) {
    return { 
      status: '偏瘦', 
      statusClass: 'underweight',
      suggestions: [
        '您的BMI偏低，需要增加营养摄入',
        '建议多吃高蛋白食品，如肉类、蛋类、豆制品'
      ]
    };
  } else if (bmi < 24) {
    return { 
      status: '正常', 
      statusClass: 'normal',
      suggestions: [
        '您的BMI在正常范围内，请保持健康生活方式',
        '坚持规律饮食和适量运动'
      ]
    };
  } else if (bmi < 28) {
    return { 
      status: '偏重', 
      statusClass: 'overweight',
      suggestions: [
        '您的BMI偏高，建议控制饮食并增加运动',
        '减少高脂、高糖食物摄入'
      ]
    };
  } else {
    return { 
      status: '肥胖', 
      statusClass: 'obese',
      suggestions: [
        '您的BMI较高，建议咨询专业医生',
        '制定合理的减重计划'
      ]
    };
  }
}

/**
 * 计算BMI指示器位置
 * @param {number} bmi - BMI值
 * @returns {number} 指示器位置百分比(0-100)
 */
function calculateIndicatorPosition(bmi) {
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
}

// 计算年龄
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

// 获取年龄描述
function getAgeDescription(age) {
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
  }

/**
 * 获取代谢水平
 * @param {number} age - 年龄
 * @returns {Object} {metabolismLevel: string, metabolismText: string}
 */
function getMetabolismLevel(age) {
  if (age < 30) {
    return { metabolismLevel: 'high', metabolismText: '代谢较快' };
  } else if (age < 50) {
    return { metabolismLevel: 'medium', metabolismText: '代谢正常' };
  } else {
    return { metabolismLevel: 'low', metabolismText: '代谢较慢' };
  }
}

/**
 * 获取减重难度
 * @param {number} weightLossTotal - 总减重目标(kg)
 * @param {number} planDays - 计划天数
 * @returns {Object} {difficultyClass: string, difficultyText: string}
 */
function getDifficultyLevel(weightLossTotal, planDays) {
  const weeklyLoss = weightLossTotal / (planDays / 7);
  
  if (weeklyLoss < 0.5) {
    return { difficultyClass: 'easy', difficultyText: '较容易' };
  } else if (weeklyLoss < 1) {
    return { difficultyClass: 'medium', difficultyText: '适中' };
  } else {
    return { difficultyClass: 'hard', difficultyText: '较困难' };
  }
}

 // 计算基于目标日期的每周变化量
 function calculateWeeklyChangeForDate(weeks, selectedWeight, targetWeight) {
    if (!weeks || weeks <= 0) return 0;
    const totalChange = selectedWeight- targetWeight ;
    return Math.round((totalChange / weeks) * 100) / 100; // 保留两位小数
  }

    // 获取目标日期的鼓励文字
  function getGoalDateEncouragement(weeklyChange, changeType) {
    const absWeeklyChange = Math.abs(weeklyChange);
     if (absWeeklyChange <= 0.3) {
        return '🌿 健康减重第一步！温和调整饮食习惯，你会发现身体发生的惊喜变化！';
      } else if (absWeeklyChange <= 0.7) {
        return '🏃‍♀️ 专业减重方案！结合运动和饮食控制，让你拥有持久的减重效果！';
      } else {
        return '🔥 高效减重计划！在医生指导下科学控制，帮你快速实现目标身材！';
    }
  }

   // 格式化日期为YYYY-MM-DD格式
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

    // 计算到目标日期的天数
 function calculateDaysLeft(targetDate) {
    const today = new Date();
    const target = new Date(targetDate);
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays); // 至少1天
  }

/**
 * 计算每日所需卡路里
 * @param {Object} params - 参数对象
 * @param {number} params.currentWeight - 当前体重(kg)
 * @param {number} params.height - 身高(cm)
 * @param {number} params.age - 年龄
 * @param {string} params.gender - 性别 ('male' | 'female')
 * @returns {number} 每日所需卡路里
 */
function calculateDailyCalories(params) {
  const { currentWeight: _currentWeight, weight, height, age, gender} = params;

  const currentWeight = _currentWeight || weight;
  
  // 使用Mifflin-St Jeor公式计算基础代谢率(BMR)
  let bmr;
  if (['male', '男'].includes(gender)) {
    bmr = 10 * currentWeight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * currentWeight + 6.25 * height - 5 * age - 161;
  }
  
  // 根据活动水平调整
  let activityMultiplier = 1.375; // 默认轻度活动
  
  // 维持当前体重的每日热量
  const maintenanceCalories = bmr * activityMultiplier;
  
  return Math.round(maintenanceCalories);
}

/**
 * 计算计划天数
 * @param {string} targetDateStr - 目标日期字符串
 * @returns {number} 计划天数
 */
function calculatePlanDays(targetDateStr) {
  const today = new Date();
  const targetDate = new Date(targetDateStr);
  
  // 计算相差的天数
  const timeDiff = targetDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  return Math.max(daysDiff, 1); // 至少1天
}

/**
 * 计算营养素克数
 * @param {number} dailyCalories - 每日卡路里
 * @param {Object} percentages - 营养素百分比
 * @param {number} percentages.protein - 蛋白质百分比
 * @param {number} percentages.fat - 脂肪百分比
 * @param {number} percentages.carbs - 碳水化合物百分比
 * @returns {Object} {proteinGrams, fatGrams, carbsGrams}
 */
function calculateNutrientGrams(dailyCalories, percentages) {
  const { protein, fat, carbs } = percentages;
  
  return {
    proteinGrams: parseFloat(((protein / 100) * dailyCalories / 4).toFixed(1)),
    fatGrams: parseFloat(((fat / 100) * dailyCalories / 9).toFixed(1)),
    carbsGrams: parseFloat(((carbs / 100) * dailyCalories / 4).toFixed(1))
  };
}

/**
 * 计算每周减重率
 * @param {number} weightLossTotal - 总减重目标(kg)
 * @param {number} planDays - 计划天数
 * @returns {number} 每周减重率(kg/周)
 */
function calculateWeeklyLossRate(weightLossTotal, planDays) {
  return parseFloat((weightLossTotal / (planDays / 7)).toFixed(1));
}

module.exports = {
  calculateBMI,
  getBMIStatus,
  calculateAge,
  getAgeDescription,
  getMetabolismLevel,
  getDifficultyLevel,
  calculateDailyCalories,
  calculatePlanDays,
  calculateNutrientGrams,
  calculateWeeklyLossRate,
  calculateIndicatorPosition,
  calculateWeeklyChangeForDate,
  getGoalDateEncouragement,
  formatDate,
  calculateDaysLeft
};
