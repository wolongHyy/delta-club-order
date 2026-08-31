const config = require('../../utils/config')

Page({
  data: {
    baseUrl: config.getBaseUrl(),
    defaultUrl: config.getDefaultBaseUrl(),
    testResult: '',
    testError: false
  },

  onInput(event) {
    this.setData({ baseUrl: event.detail.value })
  },

  onSave() {
    const url = config.normalizeBaseUrl(this.data.baseUrl)
    if (!url) {
      wx.showToast({ title: '地址必须以 http:// 或 https:// 开头', icon: 'none' })
      return
    }
    try {
      wx.setStorageSync('delta_base_url', url)
    } catch (error) {}
    this.setData({ baseUrl: url, testResult: '', testError: false })
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  onReset() {
    try {
      wx.removeStorageSync('delta_base_url')
    } catch (error) {}
    this.setData({
      baseUrl: config.getDefaultBaseUrl(),
      testResult: '',
      testError: false
    })
    wx.showToast({ title: '已恢复默认', icon: 'success' })
  },

  onTest() {
    this.setData({ testResult: '正在测试...', testError: false })
    wx.request({
      url: `${this.data.baseUrl}/api/home`,
      method: 'GET',
      timeout: 8000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.setData({ testResult: `连接成功，状态码 ${res.statusCode}`, testError: false })
        } else {
          this.setData({ testResult: `服务返回异常，状态码 ${res.statusCode}`, testError: true })
        }
      },
      fail: (error) => {
        this.setData({
          testResult: `连接失败：${error.errMsg}。请先启动服务，检查手机/电脑是否同一 Wi-Fi，并允许 Node.js 访问专用网络。`,
          testError: true
        })
      }
    })
  },

  onOpenSide(event) {
    const path = event.currentTarget.dataset.path
    const url = config.normalizeBaseUrl(this.data.baseUrl)
    if (!url) {
      wx.showToast({ title: '请先填写正确的服务地址', icon: 'none' })
      return
    }
    try {
      wx.setStorageSync('delta_base_url', url)
      wx.setStorageSync('delta_target_path', path)
    } catch (error) {}
    wx.switchTab({ url: '/pages/index/index' })
  }
})
