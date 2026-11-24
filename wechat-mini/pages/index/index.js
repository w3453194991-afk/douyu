const app = getApp();

Page({
  data: {
    url: '',
    tip: '',
  },

  onLoad() {
    const config = app.globalData.config;
    const isDevtools = app.globalData.isDevtools;
    const base = isDevtools ? config.devOrigin : config.onlineOrigin;

    if (!base) {
      this.setData({
        tip: '体验版和手机不能访问电脑的 127.0.0.1。先把豆屿部署到公网 HTTPS 域名，再把地址填到 wechat-mini/config.js 的 onlineOrigin。',
      });
      return;
    }

    if (!isDevtools && !/^https:\/\//i.test(base)) {
      this.setData({
        tip: '体验版必须使用 https 公网域名，并且要在微信公众平台配置「业务域名」。当前地址不能用。',
      });
      return;
    }

    this.setData({ url: `${base.replace(/\/$/, '')}/#/mini` });
  },

  onWebError(e) {
    console.error('web-view error', e.detail);
    wx.showModal({
      title: '页面没打开',
      content:
        '检查三件事：1. 公网 HTTPS 地址能打开；2. 微信后台已配置 business domain；3. 手机网络能访问这个域名。',
      showCancel: false,
    });
  },
});
