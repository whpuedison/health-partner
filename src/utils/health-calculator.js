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
  return (weight / (heightInMeters * heightInMeters)).toFixed(1);
}

/**
 * 获取BMI状态
 * @param {number} bmi - BMI值
 * @returns {Object} {status: string, statusClass: string}
 */
function getBMIStatus(bmi) {
  if (bmi < 18.5) {
    return { status: '偏瘦', statusClass: 'underweight' };
  } else if (bmi < 24) {
    return { status: '正常', statusClass: 'normal' };
  } else if (bmi < 28) {
    return { status: '偏胖', statusClass: 'overweight' };
  } else {
    return { status: '肥胖', statusClass: 'obese' };
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

/**
 * 计算每日所需卡路里
 * @param {Object} params - 参数对象
 * @param {number} params.currentWeight - 当前体重(kg)
 * @param {number} params.height - 身高(cm)
 * @param {number} params.age - 年龄
 * @param {string} params.gender - 性别 ('male' | 'female')
 * @param {string} params.metabolismLevel - 代谢水平 ('high' | 'medium' | 'low')
 * @returns {number} 每日所需卡路里
 */
function calculateDailyCalories(params) {
  const { currentWeight, height, age, gender, metabolismLevel = 'medium' } = params;
  
  // 使用Mifflin-St Jeor公式计算基础代谢率(BMR)
  let bmr;
  if (gender === 'male') {
    bmr = 10 * currentWeight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * currentWeight + 6.25 * height - 5 * age - 161;
  }
  
  // 根据活动水平调整
  let activityMultiplier = 1.375; // 默认轻度活动
  
  // 维持当前体重的每日热量
  const maintenanceCalories = bmr * activityMultiplier;
  
  // 减重热量缺口 (500卡路里缺口，约每周减重0.5kg)
  const weightLossCalories = maintenanceCalories - 500;
  
  return Math.round(weightLossCalories);
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
  getMetabolismLevel,
  getDifficultyLevel,
  calculateDailyCalories,
  calculatePlanDays,
  calculateNutrientGrams,
  calculateWeeklyLossRate
};
