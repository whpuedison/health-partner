// pages/square/square.js
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');

const app = getApp();

Page({
  data: {
    posts: [],
    page: 1,
    pageSize: 20,
    loading: false,
    hasMore: true,
    shouldRefresh: false,
  },

  onLoad() {
    // 设置 tabBar 激活状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 1 });
    }
    this.loadPosts(true);
  },

  onShow() {
    // 设置 tabBar 激活状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ active: 1 });
    }
    // 如果从发布页面返回，刷新列表
    if (this.data.shouldRefresh) {
      this.setData({ shouldRefresh: false });
      // 延迟一下确保页面已经显示
      setTimeout(() => {
        this.loadPosts(true);
      }, 100);
    }
  },

  // 加载帖子列表
  loadPosts(refresh = false) {
    if (this.data.loading) return;
    
    if (refresh) {
      this.setData({
        page: 1,
        posts: [],
        hasMore: true
      });
    }

    if (!this.data.hasMore && !refresh) return;

    this.setData({ loading: true });

    Http.get(API.POST_LIST, {
      page: this.data.page,
      pageSize: this.data.pageSize
    }).then((result) => {
      this.setData({ loading: false });
      
      if (result.data && result.data.length > 0) {
        // 获取当前用户ID用于判断是否显示删除按钮
        const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
        const currentUserId = userInfo?.id ? Number(userInfo.id) : null;
        
        const newPosts = result.data.map(post => {
          // 将 post.user_id 转换为数字进行比较
          const postUserId = post.user_id ? Number(post.user_id) : null;
          // 判断是否是当前用户的帖子（只有当前用户的帖子才显示删除按钮）
          const isOwner = currentUserId && postUserId && currentUserId === postUserId;
          
          return {
            ...post,
            created_at: this.formatTime(post.created_at),
            isOwner: isOwner || false
          };
        });
        
        this.setData({
          posts: refresh ? newPosts : [...this.data.posts, ...newPosts],
          page: this.data.page + 1,
          hasMore: result.data.length === this.data.pageSize
        });
      } else {
        this.setData({ hasMore: false });
      }
    }).catch((error) => {
      this.setData({ loading: false });
      console.error('加载帖子失败', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadPosts(true);
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadPosts(false);
    }
  },

  // 跳转到发布页面
  goToCreate() {
    wx.navigateTo({
      url: '/pages/post/create',
      success: () => {
        this.setData({ shouldRefresh: true });
      }
    });
  },

  // 删除帖子
  deletePost(e) {
    const postId = e.currentTarget.dataset.id;
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条帖子吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...', mask: true });
          
          Http.delete(`${API.POST_DELETE}/${postId}`, {
            openId: openId
          }).then(() => {
            wx.hideLoading();
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            // 刷新列表
            this.loadPosts(true);
          }).catch((error) => {
            wx.hideLoading();
            console.error('删除帖子失败', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          });
        }
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const current = e.currentTarget.dataset.url;
    const urls = e.currentTarget.dataset.urls;
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  // 格式化时间
  formatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    
    if (diff < minute) {
      return '刚刚';
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)}分钟前`;
    } else if (diff < day) {
      return `${Math.floor(diff / hour)}小时前`;
    } else if (diff < 7 * day) {
      return `${Math.floor(diff / day)}天前`;
    } else {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    }
  }
});

