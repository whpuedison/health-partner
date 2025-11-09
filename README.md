# 健康伙伴小程序

一个基于微信小程序的健康管理应用，采用工程化设计。

## 项目特性

- 📦 **工程化配置** - ESLint + Prettier 代码规范
- 🎨 **现代化 UI** - 美观的界面设计
- 📱 **完整功能** - 健康记录、用户管理等核心功能
- 🚀 **可扩展** - 良好的项目结构，易于扩展

## 项目结构

```
health-partner/
├── src/                      # 源代码目录
│   ├── pages/               # 页面
│   │   ├── index/          # 首页
│   │   ├── health/         # 健康记录页
│   │   └── profile/        # 个人中心
│   ├── components/          # 组件
│   ├── utils/              # 工具函数
│   ├── services/           # API 服务
│   ├── config/             # 配置文件
│   ├── assets/             # 静态资源
│   ├── app.js              # 小程序入口
│   ├── app.json            # 小程序配置
│   └── app.wxss            # 全局样式
├── package.json            # 项目配置
├── .eslintrc.json          # ESLint 配置
├── .prettierrc.json        # Prettier 配置
└── project.config.json     # 微信开发者工具配置
```

## 开始使用

### 1. 安装依赖

```bash
npm install
```

### 2. 导入项目

1. 打开微信开发者工具
2. 导入项目，选择项目根目录
3. 填写 AppID（测试可选择测试号）
4. 开始开发

### 3. 代码规范检查

```bash
# 检查代码
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run prettier
```

## 主要功能

### 1. 首页
- 用户信息展示
- 健康小贴士
- 快速入口

### 2. 健康记录
- 添加健康数据（血压、心率、体重、血糖）
- 查看历史记录
- 删除记录

### 3. 个人中心
- 用户信息管理
- 功能菜单
- 缓存管理

## 开发指南

### 添加新页面

1. 在 `src/pages/` 目录下创建页面文件夹
2. 创建 `.js`、`.wxml`、`.wxss`、`.json` 文件
3. 在 `src/app.json` 中注册页面

### 添加新组件

1. 在 `src/components/` 目录下创建组件文件夹
2. 创建组件所需文件
3. 在页面的 `.json` 文件中引用组件

## 技术栈

- **框架**: 微信小程序原生框架
- **语言**: JavaScript (ES6+)
- **样式**: WXSS
- **代码规范**: ESLint + Prettier

## 待扩展功能

- [ ] 健康数据图表展示
- [ ] 数据导出功能
- [ ] 健康提醒推送
- [ ] 社区分享功能
- [ ] 后端 API 集成
- [ ] 单元测试

## 注意事项

1. **AppID 配置**: 在 `project.config.json` 中修改 `appid` 字段
2. **图标资源**: TabBar 的图标需要自行准备，放到 `src/assets/images/` 目录

## License

MIT
