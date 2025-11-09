# 开发指南

## 环境准备

### 1. 安装 Node.js
确保安装了 Node.js 14.0 或更高版本。

### 2. 安装微信开发者工具
从[微信官方文档](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)下载并安装最新版本的微信开发者工具。

### 3. 安装依赖
```bash
npm install
```

## 开发流程

### 1. 打开开发者工具
1. 打开微信开发者工具
2. 导入项目，选择项目根目录
3. AppID 可以选择测试号或填写真实的 AppID

### 2. 开始开发
- 在 `src/` 目录下进行开发
- 微信开发者工具会自动编译和刷新

## 目录结构说明

```
src/
├── pages/          # 页面目录
│   ├── index/     # 首页
│   ├── health/    # 健康记录页
│   └── profile/   # 个人中心
├── components/     # 组件目录
│   └── card/      # 卡片组件
├── utils/         # 工具函数
│   ├── util.js    # 通用工具
│   ├── storage.js # 存储工具
│   └── http.js    # 网络请求封装
├── services/      # API 服务
│   ├── user.service.js   # 用户服务
│   └── health.service.js # 健康服务
├── config/        # 配置文件
│   ├── api.js     # API 路径配置
│   └── constants.js # 常量配置
├── assets/        # 静态资源
│   └── images/    # 图片资源
├── app.js         # 小程序入口
├── app.json       # 小程序配置
└── app.wxss       # 全局样式
```

## 页面开发

### 创建新页面

1. 在 `src/pages/` 目录下创建页面文件夹，如 `example/`
2. 创建以下文件：
   - `example.js` - 页面逻辑
   - `example.wxml` - 页面结构
   - `example.wxss` - 页面样式
   - `example.json` - 页面配置

3. 在 `src/app.json` 的 `pages` 数组中注册页面：
```json
{
  "pages": [
    "pages/example/example"
  ]
}
```

### 页面模板

```javascript
// example.js
Page({
  data: {
    // 页面数据
  },

  onLoad() {
    // 页面加载
  },

  onShow() {
    // 页面显示
  },

  // 其他方法
});
```

## 组件开发

### 创建新组件

1. 在 `src/components/` 目录下创建组件文件夹
2. 创建组件所需的 4 个文件（.js, .wxml, .wxss, .json）
3. 在页面的 `.json` 中引用组件

### 组件模板

```javascript
// component.js
Component({
  properties: {
    // 组件属性
  },

  data: {
    // 组件数据
  },

  methods: {
    // 组件方法
  }
});
```

## API 请求

### 使用方式

```javascript
import { Http } from '../../utils/http';

// GET 请求
const result = await Http.get('/api/path', { param: 'value' });

// POST 请求
const result = await Http.post('/api/path', { data: 'value' });
```

### 使用 Service

```javascript
import { UserService } from '../../services/user.service';

// 获取用户信息
const userInfo = await UserService.getUserInfo();
```

## 本地存储

### 使用 Storage 工具类

```javascript
import { Storage } from '../../utils/storage';

// 存储数据
Storage.set('key', value);

// 读取数据
const value = Storage.get('key');

// 删除数据
Storage.remove('key');

// 清空所有数据
Storage.clear();
```

## 代码规范

### 运行 ESLint 检查
```bash
npm run lint
```

### 自动修复问题
```bash
npm run lint:fix
```

### 格式化代码
```bash
npm run prettier
```

## 构建与发布

### 1. 在开发者工具中上传代码
1. 点击右上角"上传"按钮
2. 填写版本号和项目备注
3. 上传代码

### 2. 在小程序管理后台提交审核
1. 登录[小程序管理后台](https://mp.weixin.qq.com)
2. 进入"版本管理"
3. 将开发版本提交审核

## 常见问题

### Q: 缺少图标资源？
A: 将图标文件放到 `src/assets/images/` 目录，并在 `app.json` 中配置路径。临时可以使用占位图或移除 tabBar 配置中的 icon 相关字段。

### Q: 修改代码后不生效？
A: 检查开发者工具是否开启了自动编译，或手动点击编译按钮。

## 调试技巧

### 1. 使用 console.log
```javascript
console.log('调试信息', data);
```

### 2. 使用开发者工具的调试面板
- Console：查看日志
- Network：查看网络请求
- Storage：查看本地存储
- AppData：查看页面数据

### 3. 真机调试
在开发者工具中点击"真机调试"，扫码在真实设备上测试。

## 性能优化建议

1. **图片优化**：使用合适尺寸的图片，使用 webp 格式
2. **懒加载**：对于长列表使用虚拟列表
3. **分包加载**：将不常用的页面配置为分包
4. **减少 setData 调用**：合并多次 setData
5. **使用组件化**：提高代码复用性

## 更多资源

- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [JavaScript MDN 文档](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript)
