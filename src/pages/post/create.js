// pages/post/create.js
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');

const app = getApp();

Page({
  data: {
    content: '',
    images: [],
    uploading: false,
    canPublish: false, // 是否可以发布
  },

  onLoad() {
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: '发布帖子'
    });
  },

  // 输入内容
  onContentInput(e) {
    const content = e.detail.value;
    this.setData({
      content: content,
      canPublish: content.trim().length > 0 // 有内容就可以发布
    });
  },

  // 选择图片
  chooseImages() {
    const maxCount = 9 - this.data.images.length;
    if (maxCount <= 0) {
      wx.showToast({
        title: '最多选择9张图片',
        icon: 'none'
      });
      return;
    }

    wx.chooseImage({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = [...this.data.images, ...res.tempFilePaths];
        this.setData({
          images: newImages,
          canPublish: this.data.content.trim().length > 0 || newImages.length > 0 // 有内容或图片就可以发布
        });
      }
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    this.setData({ 
      images: images,
      canPublish: this.data.content.trim().length > 0 || images.length > 0 // 更新发布状态
    });
  },

  // 预览图片
  previewImage(e) {
    const current = e.currentTarget.dataset.url;
    wx.previewImage({
      current: current,
      urls: this.data.images
    });
  },

  // 发布帖子
  publishPost() {
    const { content, images } = this.data;

    if (!content.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }

    const openId = app.globalData.openId || wx.getStorageSync('openId');
    if (!openId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    this.setData({ uploading: true });
    wx.showLoading({ title: '发布中...', mask: true });

    // 先上传图片
    this.uploadImages(images).then((imageUrls) => {
      // 然后发布帖子
      return Http.post(API.POST_CREATE, {
        openId: openId,
        content: content.trim(),
        images: imageUrls
      });
    }).then(() => {
      wx.hideLoading();
      wx.showToast({
        title: '发布成功',
        icon: 'success'
      });
      setTimeout(() => {
        // 返回广场页面并刷新
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2]; // 获取上一个页面（广场页面）
        if (prevPage && prevPage.route === 'pages/square/square') {
          // 如果上一个页面是广场，设置刷新标志
          prevPage.setData({ shouldRefresh: true });
        }
        wx.navigateBack({
          success: () => {
            // 返回成功后，触发广场页面的刷新
            if (prevPage && typeof prevPage.loadPosts === 'function') {
              setTimeout(() => {
                prevPage.loadPosts(true);
              }, 300);
            }
          }
        });
      }, 1500);
    }).catch((error) => {
      wx.hideLoading();
      this.setData({ uploading: false });
      console.error('发布失败', error);
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'none'
      });
    });
  },

  // 上传图片
  uploadImages(imagePaths) {
    if (imagePaths.length === 0) {
      return Promise.resolve([]);
    }

    const uploadPromises = imagePaths.map((filePath) => {
      return Http.uploadFile(filePath, 'image', {
        type: 'post'
      });
    });

    return Promise.all(uploadPromises).then((results) => {
      return results.map(result => {
        if (result.data && result.data.url) {
          return result.data.url;
        }
        return null;
      }).filter(url => url !== null);
    });
  }
});

