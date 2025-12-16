// services/health.service.js

/**
 * 获取今日健康数据汇总
 * 注意：此函数现在只返回默认统计数据，实际数据应从后端获取
 */
function getHealthSummary() {
  // 获取今日饮食记录（从后端获取，这里返回空数组）
  const dietRecords = getDietRecords();
  let todayCalories = 0;
  dietRecords.forEach(record => {
    todayCalories += record.calories || 0;
  });
  
  // 获取今日运动记录（从后端获取，这里返回空数组）
  const exerciseRecords = getExerciseRecords('today');
  let todayExercise = 0;
  exerciseRecords.forEach(record => {
    todayExercise += record.duration || 0;
  });
  
  // 获取今日饮水记录（从后端获取）
  const todayWater = 0;
  
  return {
    todayStats: {
      calories: Math.round(todayCalories),
      targetCalories: 2000,
      exercise: todayExercise,
      targetExercise: 30,
      water: todayWater,
      targetWater: 8,
    },
  };
}


/**
 * 获取饮食记录
 */
function getDietRecords() {
  return [];
}

/**
 * 获取推荐食谱
 */
function getDietRecommendations() {
  return [
    {
      id: 1,
      name: '鸡胸肉蔬菜沙拉',
      category: '减脂',
      calories: 350,
      description: '高蛋白低脂，营养均衡',
      image: '',
      ingredients: ['鸡胸肉 150g', '生菜 100g', '番茄 50g', '黄瓜 50g', '橄榄油 5ml'],
      steps: '1. 鸡胸肉煎熟切片\n2. 蔬菜洗净切块\n3. 混合后加入橄榄油和少量盐',
    },
    {
      id: 2,
      name: '糙米鸡蛋炒饭',
      category: '健康主食',
      calories: 420,
      description: '粗粮搭配，饱腹感强',
      image: '',
      ingredients: ['糙米 150g', '鸡蛋 2个', '胡萝卜 50g', '豌豆 30g'],
      steps: '1. 糙米煮熟\n2. 蔬菜切丁\n3. 鸡蛋炒散，加入糙米和蔬菜翻炒',
    },
    {
      id: 3,
      name: '三文鱼藜麦碗',
      category: '增肌',
      calories: 480,
      description: '优质蛋白质，Omega-3丰富',
      image: '',
      ingredients: ['三文鱼 120g', '藜麦 100g', '西兰花 80g', '牛油果 50g'],
      steps: '1. 藜麦煮熟\n2. 三文鱼煎熟\n3. 西兰花焯水，摆盘组合',
    },
    {
      id: 4,
      name: '低卡蔬菜汤',
      category: '减脂',
      calories: 180,
      description: '低热量高饱腹感',
      image: '',
      ingredients: ['番茄 2个', '洋葱 1个', '西芹 50g', '蘑菇 100g'],
      steps: '1. 所有食材切块\n2. 加水煮开\n3. 转小火炖20分钟，加盐调味',
    },
  ];
}

/**
 * 获取运动记录
 */
function getExerciseRecords(type = 'today') {
  return [];
}

/**
 * 添加运动记录
 */
function addExerciseRecord(record) {
  return true;
}

/**
 * 获取运动推荐
 */
function getExerciseRecommendations() {
  return [
    {
      id: 1,
      name: '入门有氧训练',
      icon: '🏃',
      level: '初级',
      duration: 20,
      calories: 200,
      color: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
      description: '适合刚开始运动的人群，轻松上手。包含快走、慢跑等低强度有氧运动。',
    },
    {
      id: 2,
      name: 'HIIT 高强度间歇',
      icon: '💪',
      level: '中级',
      duration: 25,
      calories: 350,
      color: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
      description: '短时高效燃脂训练，适合有一定运动基础的人群。',
    },
    {
      id: 3,
      name: '力量塑形训练',
      icon: '🏋️',
      level: '中级',
      duration: 40,
      calories: 300,
      color: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
      description: '针对全身肌肉的力量训练，帮助塑造完美体型。',
    },
    {
      id: 4,
      name: '瑜伽拉伸课程',
      icon: '🧘',
      level: '初级',
      duration: 30,
      calories: 150,
      color: 'linear-gradient(135deg, #A8E6CF 0%, #4ECDC4 100%)',
      description: '放松身心，增强柔韧性，适合所有人群。',
    },
    {
      id: 5,
      name: '核心力量强化',
      icon: '🔥',
      level: '高级',
      duration: 35,
      calories: 280,
      color: 'linear-gradient(135deg, #FFD93D 0%, #F9CA24 100%)',
      description: '针对核心肌群的强化训练，提升运动表现。',
    },
  ];
}

module.exports = {
  getHealthSummary,
  getDietRecords,
  getDietRecommendations,
  getExerciseRecords,
  addExerciseRecord,
  getExerciseRecommendations,
};
