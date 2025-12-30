// pages/member/member.js
const app = getApp()
const { Http } = require('../../utils/http')

Page({
  data: {
    products: [],
    userInfo: null,
    isMember: false,
    memberExpireAt: null,
    isIOS: false,
    selectedProductId: null, // 当前选中的商品ID
    selectedProductPrice: '0.00' // 当前选中的商品价格
  },

  onLoad() {
    // 检测平台
    const systemInfo = wx.getSystemInfoSync()
    const isIOS = systemInfo.platform === 'ios'
    this.setData({ isIOS })
    
    this.loadProducts()
    this.loadUserInfo()
  },

  async loadProducts() {
    try {
      const res = await Http.get('/api/v1/member/products')
      // 计算每日价格
      const productsWithDaily = res.data.map(p => ({
        ...p,
        dailyPrice: (p.price / p.duration_days).toFixed(2)
      }))
      // 默认选中推荐的或第一个
      const recommend = productsWithDaily.find(p => p.recommend)
      const selectedProduct = recommend || productsWithDaily[0]
      const selectedProductId = selectedProduct ? selectedProduct.id : null
      const selectedProductPrice = selectedProduct ? selectedProduct.price : '0.00'

      this.setData({ 
        products: productsWithDaily,
        selectedProductId,
        selectedProductPrice
      })
    } catch (error) {
      console.error('加载商品失败:', error)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  async loadUserInfo() {
    try {
      const openId = wx.getStorageSync('openId')
      if (!openId) return
      
      const res = await Http.get('/api/v1/user/profile', { openId })
      const isMember = res.data.memberExpireAt && new Date(res.data.memberExpireAt) > new Date()
      
      this.setData({
        userInfo: res.data,
        isMember,
        memberExpireAt: res.data.memberExpireAt
      })
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  // 选择商品
  selectProduct(e) {
    const { id } = e.currentTarget.dataset
    if (this.data.isIOS) return // iOS 不允许选择
    
    const product = this.data.products.find(p => p.id === id)
    this.setData({ 
        selectedProductId: id,
        selectedProductPrice: product ? product.price : '0.00'
    })
  },

  async onBuyMember() {
    const { selectedProductId } = this.data
    if (!selectedProductId) return
    
    if (this.data.isIOS) {
      wx.showModal({
        title: '提示',
        content: '由于相关规范，iOS用户暂不支持购买虚拟商品，请联系客服或使用安卓设备购买',
        showCancel: false
      })
      return
    }

    try {
      wx.showLoading({ title: '创建订单中...' })
      
      let openId = wx.getStorageSync('openId')
      if (!openId && app.globalData.openId) {
        openId = app.globalData.openId
        wx.setStorageSync('openId', openId)
      }

      if (!openId) {
        wx.hideLoading()
        wx.showToast({ title: '无法获取用户信息，请重试', icon: 'none' })
        // 尝试重新登录
        app.login()
        return
      }

      const res = await Http.post('/api/v1/member/orders', { 
        openId,
        productId: selectedProductId 
      })
      
      wx.hideLoading()
      
      // 调起微信支付
      const { paymentParams } = res.data
      
      // 真实支付
      wx.requestPayment({
        ...paymentParams,
        success: () => {
          wx.showToast({ title: '支付成功', icon: 'success' })
          setTimeout(() => {
            this.loadUserInfo()
          }, 1000)
        },
        fail: (err) => {
          console.error('支付失败:', err)
          wx.showToast({ title: '支付取消', icon: 'none' })
        }
      })
    } catch (error) {
      wx.hideLoading()
      console.error('购买失败:', error)
      wx.showToast({ title: error.message || '购买失败', icon: 'none' })
    }
  },

  formatExpireDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
})
