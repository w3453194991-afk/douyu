import { useApp } from '../appStore';
import { useStudio } from '../store';

declare global {
  interface Window {
    __douyu?: {
      useStudio: typeof useStudio;
      useApp: typeof useApp;
    };
  }
}

// 本机创作工具，留一个调试/演示入口，方便导入图纸和排查状态。
if (typeof window !== 'undefined') {
  window.__douyu = { useStudio, useApp };
}
