// pages/timeline/timeline.js
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
    this.loadPosts(true);
  },

  onShow() {
    // 如果从发布页面返回，刷新列表
    if (this.data.shouldRefresh) {
      this.setData({ shouldRefresh: false });
      // 延迟一下确保页面已经显示
      setTimeout(() => {
        this.loadPosts(true);
      }, 100);
    }
  },

  // 加载帖子列表（只加载当前用户的帖子）
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

    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    // 调用时光轴接口，传入 openId 获取当前用户的帖子
    Http.get(API.POST_TIMELINE, {
      openId: openId,
      page: this.data.page,
      pageSize: this.data.pageSize
    }).then((result) => {
      this.setData({ loading: false });
      
      if (result.data && result.data.length > 0) {
        const newPosts = result.data.map(post => ({
          ...post,
          created_at: this.formatTime(post.created_at),
          isOwner: true, // 时光轴中所有帖子都是自己的，都显示删除按钮
          likeCount: post.likeCount || 0,
          isLiked: post.isLiked || false,
          commentCount: 0, // 初始值，后续加载评论时更新
          comments: [], // 评论列表
          showComments: false, // 是否显示评论
          showCommentInput: false // 是否显示评论输入框
        }));
        
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

  // 点赞/取消点赞
  async toggleLike(e) {
    const postId = e.currentTarget.dataset.id;
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    
    if (!openId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    const postIndex = this.data.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    const post = this.data.posts[postIndex];
    const newIsLiked = !post.isLiked;
    
    // 乐观更新
    const posts = [...this.data.posts];
    posts[postIndex] = {
      ...post,
      isLiked: newIsLiked,
      likeCount: newIsLiked ? post.likeCount + 1 : Math.max(0, post.likeCount - 1)
    };
    this.setData({ posts });
    
    try {
      const result = await Http.post(`${API.POST_LIKE}/${postId}/like`, null, {
        openId: openId
      });
      
      // 更新点赞数
      if (result.data) {
        posts[postIndex] = {
          ...posts[postIndex],
          likeCount: result.data.likeCount || posts[postIndex].likeCount
        };
        this.setData({ posts });
      }
    } catch (error) {
      console.error('点赞失败', error);
      // 回滚
      posts[postIndex] = post;
      this.setData({ posts });
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 切换评论显示
  toggleComments(e) {
    const postId = e.currentTarget.dataset.id;
    const postIndex = this.data.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    const post = this.data.posts[postIndex];
    const showComments = !post.showComments;
    
    const posts = [...this.data.posts];
    posts[postIndex] = {
      ...post,
      showComments: showComments
    };
    
    // 如果显示评论且还没有加载过，则加载评论
    if (showComments && (!post.comments || post.comments.length === 0)) {
      this.loadComments(postId, postIndex);
    }
    
    this.setData({ posts });
  },

  // 加载评论
  async loadComments(postId, postIndex) {
    try {
      const result = await Http.get(`${API.POST_COMMENTS}/${postId}/comments`);
      if (result.data) {
        const posts = [...this.data.posts];
        // 格式化评论时间
        const comments = (result.data || []).map(comment => ({
          ...comment,
          created_at: this.formatTime(comment.createdAt || comment.created_at),
          replies: (comment.replies || []).map(reply => ({
            ...reply,
            created_at: this.formatTime(reply.createdAt || reply.created_at)
          }))
        }));
        
        posts[postIndex] = {
          ...posts[postIndex],
          comments: comments,
          commentCount: comments.reduce((sum, c) => sum + 1 + (c.replies ? c.replies.length : 0), 0)
        };
        this.setData({ posts });
      }
    } catch (error) {
      console.error('加载评论失败', error);
    }
  },

  // 显示评论输入框
  showCommentInput(e) {
    const postId = e.currentTarget.dataset.id;
    const parentId = e.currentTarget.dataset.parentId;
    const replyToUserId = e.currentTarget.dataset.replyToUserId;
    const replyToNickname = e.currentTarget.dataset.replyToNickname;
    
    const postIndex = this.data.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    const posts = [...this.data.posts];
    posts[postIndex] = {
      ...this.data.posts[postIndex],
      showCommentInput: true,
      commentInput: {
        parentId: parentId || null,
        replyToUserId: replyToUserId || null,
        replyToNickname: replyToNickname || null,
        content: ''
      }
    };
    this.setData({ posts });
  },

  // 隐藏评论输入框
  hideCommentInput(e) {
    const postId = e.currentTarget.dataset.id;
    const postIndex = this.data.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    const posts = [...this.data.posts];
    posts[postIndex] = {
      ...this.data.posts[postIndex],
      showCommentInput: false,
      commentInput: null
    };
    this.setData({ posts });
  },

  // 评论输入
  onCommentInput(e) {
    const postId = e.currentTarget.dataset.id;
    const value = e.detail.value;
    const postIndex = this.data.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    const posts = [...this.data.posts];
    if (posts[postIndex].commentInput) {
      posts[postIndex].commentInput.content = value;
    }
    this.setData({ posts });
  },

  // 提交评论
  async submitComment(e) {
    const postId = e.currentTarget.dataset.id;
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    
    if (!openId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    const postIndex = this.data.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;
    
    const post = this.data.posts[postIndex];
    const commentInput = post.commentInput;
    
    if (!commentInput || !commentInput.content || !commentInput.content.trim()) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({ title: '发布中...', mask: true });
    
    try {
      const result = await Http.post(`${API.POST_COMMENT}/${postId}/comment`, {
        content: commentInput.content.trim(),
        parentId: commentInput.parentId,
        replyToUserId: commentInput.replyToUserId
      }, {
        openId: openId
      });
      
      wx.hideLoading();
      
      // 重新加载评论
      await this.loadComments(postId, postIndex);
      
      // 隐藏输入框
      const posts = [...this.data.posts];
      posts[postIndex] = {
        ...posts[postIndex],
        showCommentInput: false,
        commentInput: null
      };
      this.setData({ posts });
      
      wx.showToast({
        title: '评论成功',
        icon: 'success'
      });
    } catch (error) {
      wx.hideLoading();
      console.error('评论失败', error);
      wx.showToast({
        title: '评论失败',
        icon: 'none'
      });
    }
  },

  // 长按一级评论
  onCommentLongPress(e) {
    const commentId = e.currentTarget.dataset.commentId;
    const postId = e.currentTarget.dataset.postId;
    const userId = e.currentTarget.dataset.userId;
    
    // 检查是否是自己的评论
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    const currentUserId = userInfo?.id ? Number(userInfo.id) : null;
    const commentUserId = userId ? Number(userId) : null;
    
    if (currentUserId && commentUserId && currentUserId === commentUserId) {
      this.showDeleteCommentDialog(commentId, postId);
    }
  },

  // 长按二级评论（回复）
  onReplyLongPress(e) {
    const commentId = e.currentTarget.dataset.commentId;
    const postId = e.currentTarget.dataset.postId;
    const userId = e.currentTarget.dataset.userId;
    
    // 检查是否是自己的回复
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    const currentUserId = userInfo?.id ? Number(userInfo.id) : null;
    const replyUserId = userId ? Number(userId) : null;
    
    if (currentUserId && replyUserId && currentUserId === replyUserId) {
      this.showDeleteCommentDialog(commentId, postId);
    }
  },

  // 显示删除评论对话框
  showDeleteCommentDialog(commentId, postId) {
    wx.showActionSheet({
      itemList: ['删除'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.deleteComment({
            currentTarget: {
              dataset: {
                commentId: commentId,
                postId: postId
              }
            }
          });
        }
      }
    });
  },

  // 删除评论
  async deleteComment(e) {
    const commentId = e.currentTarget.dataset.commentId;
    const postId = e.currentTarget.dataset.postId;
    const openId = app.globalData.openId || wx.getStorageSync('openId');
    
    if (!openId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...', mask: true });
          
          try {
            await Http.delete(`${API.POST_COMMENT_DELETE}/${commentId}`, {
              openId: openId
            });
            
            wx.hideLoading();
            
            // 重新加载评论
            const postIndex = this.data.posts.findIndex(p => p.id === postId);
            if (postIndex !== -1) {
              await this.loadComments(postId, postIndex);
            }
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          } catch (error) {
            wx.hideLoading();
            console.error('删除评论失败', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
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

