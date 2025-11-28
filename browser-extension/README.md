# Yao.fan IPTV Helper 浏览器扩展

允许 yao.fan 网站播放 HTTP 流媒体的浏览器扩展。

## 功能特点

- ✅ **自动允许混合内容** - 允许 HTTPS 网站加载 HTTP 资源
- 🔒 **安全限制** - 仅对 yao.fan 域名生效
- 🚀 **直接访问** - 不需要服务器代理，直接访问源站
- 🎨 **简洁界面** - 一键启用/禁用
- 📺 **专为 IPTV 优化** - 针对 M3U8 流媒体优化

## 安装方法

### Chrome / Edge

1. 下载扩展文件夹
2. 打开浏览器，访问 `chrome://extensions/` (Chrome) 或 `edge://extensions/` (Edge)
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `browser-extension` 文件夹
6. ✅ 安装完成！

### Firefox

1. 下载扩展文件夹
2. 打开浏览器，访问 `about:debugging#/runtime/this-firefox`
3. 点击"临时载入附加组件"
4. 选择 `manifest.json` 文件
5. ✅ 安装完成！

## 使用方法

1. 安装扩展后会自动启用
2. 访问 https://yao.fan/iptv
3. 添加 HTTP M3U8 URL（如 `http://example.com/live.m3u8`）
4. 点击播放 - 无需任何额外操作！

## 图标设置

### 快速生成图标

扩展需要以下尺寸的图标：
- `icons/icon16.png` (16x16)
- `icons/icon48.png` (48x48)
- `icons/icon128.png` (128x128)

#### 方案 1: 使用在线工具生成

1. 访问 https://www.favicon-generator.org/
2. 上传 logo 图片（推荐使用📺电视机图标）
3. 下载生成的图标
4. 重命名并放入 `icons/` 文件夹

#### 方案 2: 使用现成图标

临时可以使用任意图标，例如：
```bash
# macOS 使用系统图标
cp /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/AlertCautionIcon.icns icons/temp.icns
# 然后使用在线工具转换为 PNG
```

#### 方案 3: 使用 ImageMagick 生成

```bash
# 安装 ImageMagick
brew install imagemagick

# 创建简单的 TV 图标
convert -size 128x128 xc:purple -fill white -gravity center \
  -pointsize 80 -annotate +0+0 "📺" icons/icon128.png

convert icons/icon128.png -resize 48x48 icons/icon48.png
convert icons/icon128.png -resize 16x16 icons/icon16.png
```

## 技术原理

扩展通过 `declarativeNetRequest` API 修改网络请求头：

1. **移除 CSP 限制** - 删除 Content-Security-Policy 头
2. **添加 CORS 头** - 允许跨域访问
3. **仅对 yao.fan** - 使用 `initiatorDomains` 限制作用域

## 隐私说明

- ✅ **不收集任何数据** - 扩展不会收集或上传任何信息
- ✅ **仅本地运行** - 所有操作在浏览器本地完成
- ✅ **开源透明** - 代码完全开源，可自行审查
- ✅ **限定域名** - 仅对 yao.fan 域名生效

## 常见问题

### Q: 为什么需要这个扩展？

A: 现代浏览器默认阻止 HTTPS 网站加载 HTTP 资源（混合内容阻止）。这个扩展允许 yao.fan 播放 HTTP 流媒体。

### Q: 安全吗？

A: 扩展仅对 yao.fan 域名生效，不会影响其他网站。代码开源，可自行审查。

### Q: 为什么不用服务器代理？

A: 服务器代理会消耗带宽和增加延迟。使用浏览器扩展可以：
- 零服务器成本
- 更低延迟
- 直接访问源站

### Q: 如何卸载？

A: 在浏览器扩展管理页面找到"Yao.fan IPTV Helper"，点击"移除"即可。

## 开发者

### 目录结构

```
browser-extension/
├── manifest.json       # 扩展配置
├── rules.json         # 网络请求规则
├── background.js      # 后台脚本
├── popup.html         # 弹窗界面
├── popup.js           # 弹窗脚本
├── icons/             # 图标文件夹
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # 说明文档
```

### 发布到 Chrome Web Store

1. 注册 Chrome 开发者账号（一次性 $5 费用）
2. 打包扩展为 ZIP 文件
3. 访问 https://chrome.google.com/webstore/devconsole
4. 上传 ZIP 文件
5. 填写商店信息
6. 等待审核（通常 1-3 天）

## 许可证

MIT License - 自由使用、修改、分发

## 支持

如有问题，请访问：
- GitHub Issues: https://github.com/al90slj23/Rin-yao.fan/issues
- 网站: https://yao.fan

---

Made with ❤️ for Yao.fan IPTV
