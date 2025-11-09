// custom-tab-bar/index.js
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
        pagePath: '/pages/health/health',
        text: '健康',
        icon: '📊',
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        icon: '👤',
      },
    ],
  },

  methods: {
    onChange(event) {
      const { index } = event.currentTarget.dataset;
      const item = this.data.list[index];
      
      wx.switchTab({
        url: item.pagePath,
      });
      
      this.setData({ active: index });
    },

    init() {
      const page = getCurrentPages().pop();
      if (!page) return;
      
      const route = page.route;
      const active = this.data.list.findIndex(item => item.pagePath === `/${route}`);
      
      this.setData({ active: active === -1 ? 0 : active });
    },
  },
});
