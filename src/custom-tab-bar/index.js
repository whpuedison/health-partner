// custom-tab-bar/index.js
const { API } = require('../config/api');
const { Http } = require('../utils/http');
Component({
  data: {
    active: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        icon: '🏠',
      },
      {
        pagePath: '',
        text: '',
        icon: '+',
        isAdd: true, // 标记为添加按钮
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        icon: '👤',
      },
    ],
    // 子菜单配置（5个菜单项）
    subMenus: [
      {
        icon: '⚖️',
        text: '记体重',
        pagePath: '/pages/weight/weight',
      },
      {
        icon: '🍎',
        text: '记饮食',
        pagePath: '/pages/diet/diet',
      },
      {
        icon: '🏃',
        text: '记运动',
        pagePath: '/pages/exercise/exercise',
      },
      {
        icon: '📏',
        text: '记体围',
        pagePath: '/pages/measure/measure',
      },
      {
        icon: '💃',
        text: '记体型',
        pagePath: '/pages/post/post',
      },
    ],
    showSubMenu: false, // 是否显示子菜单
    activeSubMenu: -1, // 当前高亮的子菜单索引
    subMenuHeight: 0, // 子菜单容器高度
  },

  lifetimes: {
    attached() {
      // 计算子菜单高度
      const itemHeight = 100; // 每个子菜单项高度（rpx转px需要乘以屏幕宽度/750）
      const systemInfo = wx.getSystemInfoSync();
      const rpxRatio = systemInfo.windowWidth / 750;
      this.setData({
        subMenuHeight: this.data.subMenus.length * itemHeight * rpxRatio,
      });

      // 获取功能开关状态
      const app = getApp();
      
      const updateShapeMenu = (enable) => {
        const subMenus = this.data.subMenus;
        subMenus[4].pagePath = `/pages/post/post?powerEnable=${enable ? 1 : 0}`;
        this.setData({ subMenus });
      };

      if (app.globalData && typeof app.globalData.powerEnable !== 'undefined') {
        // 使用缓存
        updateShapeMenu(app.globalData.powerEnable);
      } else {
        // 请求接口
       setTimeout(() => {
           Http.get(API.POST_POWER_ENABLE).then(res => {
            const powerEnable = res.data;
            // 写入缓存
            if (app.globalData) {
              app.globalData.powerEnable = powerEnable;
            }
            updateShapeMenu(powerEnable);
          }).catch(err => {
            console.error('获取功能开关失败:', err);
          });
       }, 1000)
      }
    },
  },

  methods: {
    // 点击+按钮（切换显示/隐藏）
    onAddButtonClick() {
      this.setData({
        showSubMenu: !this.data.showSubMenu,
        activeSubMenu: -1,
      });
    },

    // 普通点击事件
    onChangeTab(event) {
      const { index } = event.currentTarget.dataset;
      const item = this.data.list[index];
      
      // 如果是添加按钮，不处理点击（只处理长按）
      if (item.isAdd) {
        this.onAddButtonClick()
        return;
      }
      
      wx.switchTab({
        url: item.pagePath,
      });
      
      this.setData({ active: index });
    },

    // 点击子菜单项
    onSubMenuClick(event) {
      const { index } = event.currentTarget.dataset;
      const selectedMenu = this.data.subMenus[index];
      
      // 关闭子菜单
      this.setData({
        showSubMenu: false,
        activeSubMenu: -1,
      });

      // 跳转到对应页面
      wx.navigateTo({
        url: selectedMenu.pagePath,
      });
    },

    // 点击遮罩关闭
    onMaskTap() {
      this.setData({
        showSubMenu: false,
        activeSubMenu: -1,
      });
    },

    // 初始化当前激活的tab
    init() {
      const page = getCurrentPages().pop();
      if (!page) return;
      
      const route = page.route;
      const active = this.data.list.findIndex(item => item.pagePath === `/${route}`);
      
      this.setData({ active: active === -1 ? 0 : active });
    },
  },
});
