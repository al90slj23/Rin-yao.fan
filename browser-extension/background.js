/**
 * Yao.fan IPTV Helper - Background Script
 * 允许 yao.fan 播放 HTTP 流媒体
 */

console.log('🎬 Yao.fan IPTV Helper 已启动');

// 监听扩展安装
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('✅ Yao.fan IPTV Helper 安装成功');

    // 设置默认启用状态
    chrome.storage.local.set({ enabled: true });

    // 打开欢迎页面
    chrome.tabs.create({
      url: 'https://yao.fan/iptv'
    });
  } else if (details.reason === 'update') {
    console.log('🔄 Yao.fan IPTV Helper 已更新到版本', chrome.runtime.getManifest().version);
  }
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStatus') {
    chrome.storage.local.get(['enabled'], (result) => {
      sendResponse({ enabled: result.enabled !== false });
    });
    return true; // 保持消息通道开放
  }

  if (request.action === 'toggleEnabled') {
    chrome.storage.local.get(['enabled'], (result) => {
      const newState = !result.enabled;
      chrome.storage.local.set({ enabled: newState }, () => {
        sendResponse({ enabled: newState });

        // 更新图标
        updateIcon(newState);
      });
    });
    return true;
  }
});

// 更新扩展图标状态
function updateIcon(enabled) {
  const iconPath = enabled ? 'icons/icon48.png' : 'icons/icon48-disabled.png';
  chrome.action.setIcon({ path: iconPath });

  const title = enabled ?
    'Yao.fan IPTV Helper (已启用)' :
    'Yao.fan IPTV Helper (已禁用)';
  chrome.action.setTitle({ title });
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 检查是否是 yao.fan 页面
    if (tab.url.includes('yao.fan')) {
      console.log('📺 检测到 yao.fan IPTV 页面');
    }
  }
});

// 初始化图标状态
chrome.storage.local.get(['enabled'], (result) => {
  updateIcon(result.enabled !== false);
});
