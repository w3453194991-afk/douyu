const config = require('./config');
const sys = wx.getSystemInfoSync();

App({
  globalData: {
    config,
    isDevtools: sys.platform === 'devtools',
  },
  onLaunch() {},
});
