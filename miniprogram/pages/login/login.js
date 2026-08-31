// 小程序原生登录页：wx.login 同步 openid，getPhoneNumber 按钮同步手机号，
// 然后把签名绑票交给 web-view 网页完成顾客会话绑定。
const { getBaseUrl, getApiBaseUrl } = require('../../utils/config')

Page({
  data: {
    loggingIn: true,
    openid: '',
    phone: '',
    bound: false,
    loading: false,
    error: ''
  },

  onShow() {
    this.ensureLogin()
  },

  ensureLogin() {
    this.setData({ loggingIn: true, error: '' })
    wx.login({
      success: async (res) => {
        if (!res.code) {
          this.setData({ loggingIn: false, error: 'wx.login 未返回 code' })
          return
        }
        try {
          const data = await this.requestApi('/api/wechat/mini/login', { code: res.code })
          this.setData({ openid: data.openid, loggingIn: false })
          // 若之前已授权过手机号，直接进入
          const phone = wx.getStorageSync('delta_phone') || ''
          if (phone) {
            this.setData({ phone })
            this.enterApp()
          }
        } catch (e) {
          this.setData({ loggingIn: false, error: (e && e.message) || '登录失败' })
        }
      },
      fail: () => this.setData({ loggingIn: false, error: '登录失败，请检查网络' })
    })
  },

  requestApi(path, payload) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: getApiBaseUrl() + path,
        method: 'POST',
        data: payload,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300 && res.data) resolve(res.data)
          else reject(new Error((res.data && res.data.error) || '请求失败'))
        },
        fail: () => reject(new Error('网络异常，请确认服务地址'))
      })
    })
  },

  // 微信手机号快捷验证按钮
  onGetPhoneNumber(e) {
    if (e.detail.errMsg && e.detail.errMsg.indexOf('ok') === -1) {
      this.setData({ error: '未授权手机号' })
      return
    }
    const code = e.detail.code
    if (!code) {
      this.setData({ error: '未获取到手机号 code' })
      return
    }
    if (!this.data.openid) {
      this.setData({ error: '请先完成微信登录' })
      return
    }
    this.setData({ loading: true, error: '' })
    this.requestApi('/api/wechat/mini/phone', { openid: this.data.openid, code })
      .then((data) => {
        wx.setStorageSync('delta_phone', data.phone)
        this.setData({ phone: data.phone, loading: false })
        this.enterApp()
      })
      .catch((e) => this.setData({ loading: false, error: e.message }))
  },

  // 暂不绑定手机号，直接进入
  skipPhone() {
    this.enterApp()
  },

  async enterApp() {
    if (!this.data.openid) return
    this.setData({ loading: true })
    try {
      const data = await this.requestApi('/api/wechat/mini/bind-token', {
        openid: this.data.openid,
        phone: this.data.phone
      })
      wx.setStorageSync('delta_bind_token', data.token)
      wx.setStorageSync('delta_openid', this.data.openid)
      wx.switchTab({ url: '/pages/index/index' })
    } catch (e) {
      this.setData({ loading: false, error: e.message })
    }
  }
})
