const API = {
  // 用户相关
  USER_LOGIN: '/api/v1/user/login',
  USER_INFO: '/api/v1/user/info',
  USER_UPDATE: '/api/v1/user/update',
  USER_UPLOAD_AVATAR: '/api/v1/user/upload-avatar',
  USER_PROFILE: '/api/v1/user/profile',
  USER_GOALS: '/api/v1/user/goals',
  USER_TODAY_PROGRESS: '/api/v1/user/today-progress',
  USER_CHECK_IN: '/api/v1/user/check-in',
  USER_HEALTH_RECORDS: '/api/v1/user/health-records',
  USER_GOAL_PAGE_DATA: '/api/v1/user/goal-page-data',
  USER_STATS: '/api/v1/user/stats',
  // 运动记录相关
  USER_EXERCISE_RECORDS: '/api/v1/user/exercise-records',
  USER_EXERCISE_STATS: '/api/v1/user/exercise-stats',
  USER_EXERCISE_WEEK: '/api/v1/user/exercise-week',
  // 饮食记录相关
  USER_DIET_RECORDS: '/api/v1/user/diet-records',
  USER_DIET_STATS: '/api/v1/user/diet-stats',
  // 食物相关
  FOOD_CATEGORIES: '/api/v1/food/categories',
  FOOD_FOODS: '/api/v1/food/foods',
  FOOD_SEARCH: '/api/v1/food/search',
  FOOD_UNITS: '/api/v1/food/units',
  FOOD_CALCULATE: '/api/v1/food/calculate',
  // 帖子相关
  POST_CREATE: '/api/v1/post/create',
  POST_LIST: '/api/v1/post/list',
  POST_TIMELINE: '/api/v1/post/timeline',
  POST_DELETE: '/api/v1/post',
};

module.exports = { API };

