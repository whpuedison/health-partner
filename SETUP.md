# Vant Weapp 安装配置指南

## 📦 安装步骤

### 1. 安装 npm 依赖

在项目根目录执行：

```bash
npm install
```

这会安装 `@vant/weapp` UI 组件库。

### 2. 构建 npm 包

在**微信开发者工具**中操作：

1. 打开微信开发者工具
2. 点击顶部菜单：**工具** → **构建 npm**
3. 等待构建完成（会在 `src` 目录下生成 `miniprogram_npm` 文件夹）

### 3. 重新编译

点击微信开发者工具的**编译**按钮，项目就可以正常运行了！

## ✅ 已配置的功能

### 1. 自定义 TabBar（带图标）
- 使用 Vant Weapp 的 `van-tabbar` 组件
- 内置了图标：
  - 首页：`wap-home-o`
  - 健康：`records`
  - 我的：`user-o`

### 2. 全局组件
已在 `app.json` 中注册以下常用组件，可在任何页面直接使用：
- `van-icon` - 图标
- `van-button` - 按钮
- `van-cell` / `van-cell-group` - 单元格
- `van-toast` - 轻提示
- `van-dialog` - 弹窗

## 📖 使用示例

### 使用图标

```html
<!-- 在任何 wxml 中使用 -->
<van-icon name="star" size="20px" color="#3cc51f" />
<van-icon name="arrow" />
```

### 使用按钮

```html
<van-button type="primary">主要按钮</van-button>
<van-button type="success">成功按钮</van-button>
<van-button icon="star-o">带图标按钮</van-button>
```

### 更多组件

需要使用其他 Vant 组件时，在页面的 `.json` 文件中引入：

```json
{
  "usingComponents": {
    "van-card": "@vant/weapp/card/index",
    "van-tag": "@vant/weapp/tag/index"
  }
}
```

## 🎨 图标列表

Vant Weapp 提供了 600+ 图标，常用的有：

**基础图标：**
- `home-o` - 首页
- `star-o` - 收藏
- `like-o` - 点赞
- `search` - 搜索
- `setting-o` - 设置

**商业图标：**
- `cart-o` - 购物车
- `shop-o` - 商店
- `goods-collect-o` - 收藏商品

**通用图标：**
- `arrow` - 箭头
- `plus` - 加号
- `cross` - 关闭
- `success` - 成功
- `fail` - 失败

**更多图标查看：** [Vant Weapp 图标文档](https://vant-contrib.gitee.io/vant-weapp/#/icon)

## 📚 文档链接

- [Vant Weapp 官方文档](https://vant-contrib.gitee.io/vant-weapp)
- [组件列表](https://vant-contrib.gitee.io/vant-weapp/#/quickstart)
- [图标列表](https://vant-contrib.gitee.io/vant-weapp/#/icon)

## ⚠️ 常见问题

### Q: 构建 npm 后没有生成文件？
A: 确保 `project.config.json` 中 `setting.nodeModules` 为 `true`。

### Q: 组件不显示？
A: 确保已经执行了「构建 npm」步骤。

### Q: 样式不生效？
A: 在 `app.wxss` 中添加：
```css
@import '@vant/weapp/common/index.wxss';
```

## 🚀 下一步

现在你可以：
1. 运行 `npm install` 安装依赖
2. 在微信开发者工具中构建 npm
3. 重新编译项目
4. 享受漂亮的 UI 组件和图标！

