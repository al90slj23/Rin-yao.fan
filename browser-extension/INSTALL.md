# 📦 快速安装指南

## ⚡ 5 分钟安装

### 步骤 1: 生成图标

1. 打开 `generate-icons.html` 文件（双击即可）
2. 点击"下载所有图标"按钮
3. 将下载的 3 个图标文件放入 `icons/` 文件夹：
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`

### 步骤 2: 安装到 Chrome/Edge

1. 打开浏览器
2. 访问 `chrome://extensions/` (Chrome) 或 `edge://extensions/` (Edge)
3. 开启右上角的 **"开发者模式"**
4. 点击 **"加载已解压的扩展程序"**
5. 选择 `browser-extension` 文件夹
6. ✅ 完成！

### 步骤 3: 测试

1. 打开 https://yao.fan/iptv
2. 添加一个 HTTP M3U8 URL，例如：
   ```
   http://222.179.42.129:8181/hls1.m3u8?zzhongqd
   ```
3. 点击播放 - 应该能直接播放了！

## 🔍 验证扩展是否生效

打开浏览器控制台（F12），应该能看到：
```
🎬 Yao.fan IPTV Helper 已启动
```

在 https://yao.fan/iptv 页面，检查网络请求：
- HTTP M3U8 请求应该成功（状态码 200）
- 不再出现 "Mixed Content" 错误

## 🐛 故障排除

### 问题 1: 扩展无法加载

**解决方案**：
1. 确保所有文件都在 `browser-extension` 文件夹内
2. 确保 `manifest.json` 格式正确
3. 检查是否开启了"开发者模式"

### 问题 2: 图标不显示

**解决方案**：
1. 确保 `icons/` 文件夹内有 3 个 PNG 文件
2. 文件名必须完全匹配：`icon16.png`, `icon48.png`, `icon128.png`
3. 重新加载扩展（点击刷新按钮）

### 问题 3: 视频仍然无法播放

**解决方案**：
1. 点击扩展图标，确认状态为"已启用"
2. 刷新 https://yao.fan/iptv 页面
3. 检查视频源 URL 是否可访问
4. 打开控制台查看是否有其他错误

## 📱 移动端

浏览器扩展仅支持桌面浏览器。移动端请使用：
- 服务器代理模式
- 或专用 IPTV 播放器 App

## 🔄 更新扩展

如果扩展有更新：
1. 下载新版本文件
2. 在 `chrome://extensions/` 找到扩展
3. 点击 **刷新图标** ⟳
4. ✅ 更新完成

## ❓ 需要帮助？

- GitHub Issues: https://github.com/al90slj23/Rin-yao.fan/issues
- 网站: https://yao.fan

---

**提示**: 安装后可以删除 `generate-icons.html` 文件，不影响扩展使用。
