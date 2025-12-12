/**
 * 运动数据工具库
 * 包含运动分类、图标、卡路里消耗估算(千卡/分钟)
 */

const exerciseCategories = [
  {
    id: 'daily',
    name: '日常活动',
    icon: '📅',
    exercises: [
      { id: 'walk', name: '走路', icon: '🚶', calories: 4, intensity: '低' },
      { id: 'stairs', name: '爬楼梯', icon: '🪜', calories: 9, intensity: '高' },
      { id: 'housework', name: '做家务', icon: '🧹', calories: 3, intensity: '低' },
      { id: 'dog_walking', name: '遛狗', icon: '🐕', calories: 3.5, intensity: '低' },
      { id: 'kids', name: '带娃', icon: '👶', calories: 4, intensity: '中' },
      { id: 'gardening', name: '园艺', icon: '🌱', calories: 4, intensity: '中' },
      { id: 'moving', name: '搬运物品', icon: '📦', calories: 6, intensity: '中' },
      { id: 'standing', name: '站立工作', icon: '🧍', calories: 1.5, intensity: '低' },
      { id: 'wash_car', name: '洗车', icon: '🚗', calories: 4.5, intensity: '中' }
    ]
  },
  {
    id: 'cardio',
    name: '有氧燃脂',
    icon: '🔥',
    exercises: [
      { id: 'run', name: '跑步', icon: '🏃', calories: 10, intensity: '高' },
      { id: 'swim', name: '游泳', icon: '🏊', calories: 8, intensity: '中' },
      { id: 'cycle', name: '骑行', icon: '🚴', calories: 7, intensity: '中' },
      { id: 'jump_rope', name: '跳绳', icon: '🪢', calories: 12, intensity: '高' },
      { id: 'hiit', name: 'HIIT', icon: '⚡', calories: 13, intensity: '高' },
      { id: 'elliptical', name: '椭圆机', icon: '🚲', calories: 8, intensity: '中' },
      { id: 'rowing', name: '划船机', icon: '🚣', calories: 9, intensity: '高' },
      { id: 'badminton', name: '羽毛球', icon: '🏸', calories: 6, intensity: '中' },
      { id: 'basketball', name: '篮球', icon: '🏀', calories: 8, intensity: '高' }
    ]
  },
  {
    id: 'strength',
    name: '力量塑型',
    icon: '💪',
    exercises: [
      { id: 'yoga', name: '瑜伽', icon: '🧘', calories: 3, intensity: '低' },
      { id: 'pilates', name: '普拉提', icon: '🛏️', calories: 4, intensity: '低' },
      { id: 'squat', name: '深蹲', icon: '🏋️', calories: 6, intensity: '高' },
      { id: 'push_up', name: '俯卧撑', icon: '💪', calories: 5, intensity: '中' },
      { id: 'plank', name: '平板支撑', icon: '⏱️', calories: 4, intensity: '中' },
      { id: 'crunches', name: '卷腹', icon: '➰', calories: 4, intensity: '中' },
      { id: 'dumbbell', name: '哑铃训练', icon: '🦾', calories: 5, intensity: '中' },
      { id: 'sit_up', name: '仰卧起坐', icon: '⬆️', calories: 4, intensity: '中' },
      { id: 'pull_up', name: '引体向上', icon: '🧗', calories: 8, intensity: '高' }
    ]
  }
];

/**
 * 获取所有运动数据
 */
function getAllExercises() {
  return exerciseCategories;
}

/**
 * 搜索运动
 * @param {string} keyword 
 */
function searchExercises(keyword) {
  if (!keyword) return [];
  const result = [];
  exerciseCategories.forEach(category => {
    category.exercises.forEach(ex => {
      if (ex.name.includes(keyword)) {
        result.push(ex);
      }
    });
  });
  return result;
}

/**
 * 计算卡路里
 * @param {string} exerciseId 
 * @param {number} durationMinutes 
 */
function calculateCalories(exerciseId, durationMinutes) {
  let exercise = null;
  for (const cat of exerciseCategories) {
    exercise = cat.exercises.find(e => e.id === exerciseId);
    if (exercise) break;
  }
  
  if (!exercise) return 0;
  return Math.round(exercise.calories * durationMinutes);
}

module.exports = {
  exerciseCategories,
  getAllExercises,
  searchExercises,
  calculateCalories
};
