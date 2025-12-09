// custom-tab-bar/index.js
Component({
  data: {
    active: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '记录',
        icon: '📊',
      },
      {
        pagePath: '',
        text: '',
        icon: '➕',
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
        pagePath: '/pages/diet-record/diet-record',
      },
      {
        icon: '🏃',
        text: '记运动',
        pagePath: '/pages/exercise-record/exercise-record',
      },
      {
        icon: '📏',
        text: '记体围',
        pagePath: '/pages/health/health',
      },
      {
        icon: '👕',
        text: '记体型',
        pagePath: '/pages/health/health',
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
    },
  },

  methods: {
    // 普通点击事件
    onChange(event) {
      const { index } = event.currentTarget.dataset;
      const item = this.data.list[index];
      
      // 如果是添加按钮，不处理点击（只处理长按）
      if (item.isAdd) {
        return;
      }
      
      wx.switchTab({
        url: item.pagePath,
      });
      
      this.setData({ active: index });
    },

    // 点击+按钮（切换显示/隐藏）
    onAddButtonClick() {
      this.setData({
        showSubMenu: !this.data.showSubMenu,
        activeSubMenu: -1,
      });
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

    // 鼠标悬停高亮（可选，用于更好的视觉反馈）
    onSubMenuHover(event) {
      const { index } = event.currentTarget.dataset;
      this.setData({ activeSubMenu: index });
    },

    // 鼠标离开取消高亮
    onSubMenuLeave() {
      this.setData({ activeSubMenu: -1 });
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
