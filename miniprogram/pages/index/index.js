const { getBaseUrl, consumeTargetPath } = require('../../utils/config')

Page({
  data: {
    url: ''
  },

  onShow() {
    const targetPath = consumeTargetPath()
    let base = targetPath ? `${getBaseUrl()}${targetPath}` : getBaseUrl()
    // 登录页回传的小程序绑票：同步 openid / 手机号到网页会话
    const bindToken = wx.getStorageSync('delta_bind_token')
    if (bindToken) {
      wx.removeStorageSync('delta_bind_token')
      const sep = base.includes('?') ? '&' : '?'
      base = `${base}${sep}mini_bind=${encodeURIComponent(bindToken)}`
    }
    this.setData({ url: base })
  },

  onWebviewLoad() {
    console.log('[DeltaClub] web-view loaded:', this.data.url)
  },

  onWebviewError(event) {
    console.error('[DeltaClub] web-view error:', event.detail)
    wx.showToast({
      title: '网页加载失败，去调试页检查地址',
      icon: 'none',
      duration: 2600
    })
  }
})
