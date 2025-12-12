const app = getApp()
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');

Page({
  data: {
    content: '',
    contact: '',
    loading: false
  },

  onContentInput(e) {
    this.setData({
      content: e.detail.value
    })
  },

  onContactInput(e) {
    this.setData({
      contact: e.detail.value
    })
  },

  async submitFeedback() {
    if (!this.data.content || this.data.loading) return

    this.setData({ loading: true })

    try {
      const openId = wx.getStorageSync('openId')
      await Http.post(API.FEEDBACK, {
        content: this.data.content,
        contact: this.data.contact,
        openId
      })

      wx.showToast({
        title: '提交成功',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 1500)

    } catch (error) {
      console.error('Submit feedback error:', error)
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  }
})
