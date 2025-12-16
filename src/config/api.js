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
  FOOD_RECOGNIZE: '/api/v1/food/recognize',
  FOOD_RECOGNIZE_TEXT: '/api/v1/food/recognize-text',
  FOOD_ANALYZE: '/api/v1/food/analyze',
  // 运动识别
  EXERCISE_RECOGNIZE_TEXT: '/api/v1/exercise/recognize-text',
  
  // 身体围度
  MEASUREMENT_SAVE: '/api/v1/measurement/save',
  MEASUREMENT_DAILY: '/api/v1/measurement/daily',
  MEASUREMENT_LIST: '/api/v1/measurement/list',
  MEASUREMENT_DELETE: '/api/v1/measurement/delete',
  MEASUREMENT_LATEST: '/api/v1/measurement/latest', // 新增：获取最近体围记录
  // 帖子相关
  POST_CREATE: '/api/v1/post/create',
  POST_LIST: '/api/v1/post/list',
  POST_TIMELINE: '/api/v1/post/timeline',
  POST_DELETE: '/api/v1/post',
  POST_LIKE: '/api/v1/post',
  POST_COMMENTS: '/api/v1/post',
  POST_COMMENT: '/api/v1/post',
  POST_COMMENT_DELETE: '/api/v1/post/comment',
  POST_POWER_ENABLE: '/api/v1/post/power-enable',
  // 体重记录相关
  WEIGHT_SAVE: '/api/v1/user/weight',
  WEIGHT_MONTH: '/api/v1/user/weight/month',
  WEIGHT_DELETE: '/api/v1/user/weight',
  WEIGHT_LATEST: '/api/v1/user/weight/latest', // 新增：获取最近体重记录
  // 反馈
  FEEDBACK: '/api/v1/feedback',
};

module.exports = { API };
