/**
 * Yao.fan IPTV Helper - Popup Script
 */

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const toggleBtn = document.getElementById('toggleBtn');
const btnText = document.getElementById('btnText');
const helpBtn = document.getElementById('helpBtn');

// 加载当前状态
function loadStatus() {
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    updateUI(response.enabled);
  });
}

// 更新 UI
function updateUI(enabled) {
  if (enabled) {
    statusDot.classList.remove('disabled');
    statusText.textContent = '已启用';
    toggleBtn.classList.add('enabled');
    btnText.textContent = '点击禁用';
  } else {
    statusDot.classList.add('disabled');
    statusText.textContent = '已禁用';
    toggleBtn.classList.remove('enabled');
    btnText.textContent = '点击启用';
  }
}

// 切换状态
toggleBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'toggleEnabled' }, (response) => {
    updateUI(response.enabled);

    // 显示提示
    const originalText = btnText.textContent;
    btnText.textContent = response.enabled ? '✅ 已启用' : '⏸️ 已禁用';

    setTimeout(() => {
      btnText.textContent = response.enabled ? '点击禁用' : '点击启用';
    }, 1000);
  });
});

// 帮助按钮
helpBtn.addEventListener('click', () => {
  const helpText = `
使用说明：

1. 安装扩展后会自动启用
2. 访问 https://yao.fan/iptv
3. 添加 HTTP M3U8 URL 即可播放
4. 扩展仅对 yao.fan 域名生效

常见问题：

Q: 为什么需要这个扩展？
A: 浏览器默认阻止 HTTPS 网站加载 HTTP 资源，
   这个扩展允许 yao.fan 播放 HTTP 流媒体。

Q: 安全吗？
A: 扩展仅对 yao.fan 域名生效，不影响其他网站。

Q: 如何卸载？
A: 在扩展管理页面点击"移除"即可。
  `;

  alert(helpText);
});

// 初始化
loadStatus();

// 监听键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    toggleBtn.click();
  }
});
