// 手机预览必须用电脑的局域网 IP；IP 变了可在“调试”页改成新地址。
const LAN_BASE_URL = 'http://172.27.59.81:3000'

function getDefaultBaseUrl() {
  return LAN_BASE_URL
}

function normalizeBaseUrl(value) {
  const url = String(value || '').trim().replace(/\/+$/, '')
  if (!/^https?:\/\/.+/.test(url)) return ''
  return url
}

function getBaseUrl() {
  try {
    return normalizeBaseUrl(wx.getStorageSync('delta_base_url')) || LAN_BASE_URL
  } catch (error) {
    return LAN_BASE_URL
  }
}

function getApiBaseUrl() {
  return getBaseUrl()
}

function consumeTargetPath() {
  try {
    const path = String(wx.getStorageSync('delta_target_path') || '')
    if (path) wx.removeStorageSync('delta_target_path')
    return path
  } catch (error) {
    return ''
  }
}

module.exports = {
  LAN_BASE_URL,
  getDefaultBaseUrl,
  getBaseUrl,
  getApiBaseUrl,
  normalizeBaseUrl,
  consumeTargetPath
}
