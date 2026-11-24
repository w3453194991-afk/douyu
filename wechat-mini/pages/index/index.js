const app = getApp();

Page({
  data: {
    url: 'http://127.0.0.1:8787/#/mini'
  },

  onLoad() {
    // 如果你想在真机上预览，把 127.0.0.1 换成电脑的局域网 IP，
    // 例如 http://192.168.1.23:8787/#/mini
    const base = app.globalData.serviceUrl || 'http://127.0.0.1:8787';
    this.setData({ url: `${base}/#/mini` });
  },

  onWebError(e) {
    console.error('web-view error', e.detail);
    wx.showModal({
      title: '页面没打开',
      content: '先在电脑上运行豆屿服务，并在开发者工具「详情 → 本地设置」里勾选“不校验合法域名”。',
      showCancel: false
    });
  }
});
