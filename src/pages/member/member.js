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
    selectedProductPrice: '0.00', // 当前选中的商品价格
    isSubmitting: false // 防止重复提交
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
      
      // 后端已经计算了 isMember，直接使用，避免前端时间解析差异
      // 同时格式化日期用于展示
      const isMember = res.data.isMember
      const formattedDate = this.formatExpireDate(res.data.memberExpireAt)
      
      this.setData({
        userInfo: res.data,
        isMember,
        memberExpireAt: formattedDate
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
    // 使用实例变量作为同步锁，防止 setData 异步导致的竞态问题
    if (this._isSubmitting) return
    if (!selectedProductId) return
    
    if (this.data.isIOS) {
      wx.showModal({
        title: '提示',
        content: '由于相关规范，iOS用户暂不支持购买虚拟商品，请联系客服或使用安卓设备购买',
        showCancel: false
      })
      return
    }

    // 双重锁定：实例变量用于逻辑阻断，setData 用于 UI 反馈
    this._isSubmitting = true
    this.setData({ isSubmitting: true })

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
        this._isSubmitting = false
        this.setData({ isSubmitting: false })
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
          // 只有支付失败/取消才提示，否则可能覆盖成功的提示
          if (err.errMsg.indexOf('cancel') === -1) {
             wx.showToast({ title: '支付失败', icon: 'none' })
          } else {
             wx.showToast({ title: '已取消支付', icon: 'none' })
          }
        },
        complete: () => {
             this._isSubmitting = false
             this.setData({ isSubmitting: false })
        }
      })
    } catch (error) {
      wx.hideLoading()
      this._isSubmitting = false
      this.setData({ isSubmitting: false })
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
