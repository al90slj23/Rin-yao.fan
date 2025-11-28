import { Helmet } from 'react-helmet'
import { siteName } from "../utils/constants"

export function IPTVPage() {

    const features = [
        {
            icon: "🚀",
            title: "完全本地运行",
            desc: "下载后双击打开，无需服务器"
        },
        {
            icon: "🔓",
            title: "直接播放 HTTP",
            desc: "无需代理，无需扩展"
        },
        {
            icon: "💾",
            title: "自动保存频道",
            desc: "频道列表保存在浏览器中"
        },
        {
            icon: "📺",
            title: "HLS.js 支持",
            desc: "支持所有 M3U8 流媒体"
        },
        {
            icon: "🌐",
            title: "跨平台",
            desc: "Windows / Mac / Linux"
        },
        {
            icon: "🔒",
            title: "隐私保护",
            desc: "所有数据完全本地"
        }
    ]

    const versions = [
        {
            name: "在线版（需要网络）",
            size: "17 KB",
            file: "/iptv-player.html",
            features: [
                "从 CDN 加载 HLS.js",
                "需要联网使用",
                "文件体积最小"
            ],
            badge: "推荐",
            badgeColor: "bg-blue-500"
        },
        {
            name: "离线版（完全离线）",
            size: "418 KB",
            file: "/iptv-player-offline.html",
            features: [
                "内置 HLS.js 库",
                "完全离线可用",
                "下载后永久使用"
            ],
            badge: "离线",
            badgeColor: "bg-green-500"
        }
    ]

    return (
        <>
            <Helmet>
                <title>IPTV 播放器 - {siteName}</title>
            </Helmet>

            <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-purple-700">
                {/* Hero Section */}
                <div className="container mx-auto px-4 py-20">
                    <div className="text-center text-white mb-16">
                        <div className="text-6xl mb-6">📺</div>
                        <h1 className="text-5xl font-bold mb-4">
                            IPTV 播放器
                        </h1>
                        <p className="text-xl opacity-90 max-w-2xl mx-auto">
                            单文件 HTML 播放器，下载即用，无需服务器<br />
                            完美支持 HTTP/HTTPS M3U8 流媒体
                        </p>
                    </div>

                    {/* Download Cards */}
                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
                        {versions.map((version, index) => (
                            <div key={index} className="bg-white rounded-2xl p-8 shadow-2xl hover:transform hover:scale-105 transition-all duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-2xl font-bold text-gray-800">
                                        {version.name}
                                    </h3>
                                    <span className={`px-3 py-1 ${version.badgeColor} text-white rounded-full text-sm font-semibold`}>
                                        {version.badge}
                                    </span>
                                </div>

                                <div className="text-gray-600 mb-6">
                                    <span className="text-3xl font-bold text-purple-600">{version.size}</span>
                                </div>

                                <ul className="space-y-3 mb-8">
                                    {version.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-green-500 mt-1">✓</span>
                                            <span className="text-gray-700">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <a
                                    href={version.file}
                                    download={version.file.split('/').pop()}
                                    className="block w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                                >
                                    下载播放器
                                </a>
                            </div>
                        ))}
                    </div>

                    {/* Features Grid */}
                    <div className="max-w-6xl mx-auto mb-20">
                        <h2 className="text-3xl font-bold text-white text-center mb-12">
                            ✨ 功能特性
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            {features.map((feature, index) => (
                                <div key={index} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-white hover:bg-white/20 transition-all duration-300">
                                    <div className="text-4xl mb-4">{feature.icon}</div>
                                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                                    <p className="text-white/80">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Usage Guide */}
                    <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-10 mb-20">
                        <h2 className="text-3xl font-bold text-white mb-8 text-center">
                            📖 使用方法
                        </h2>
                        <div className="space-y-6 text-white">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center font-bold">
                                    1
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl mb-2">下载播放器</h3>
                                    <p className="text-white/80">选择在线版或离线版，点击下载按钮</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center font-bold">
                                    2
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl mb-2">双击打开</h3>
                                    <p className="text-white/80">在浏览器中打开 HTML 文件</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center font-bold">
                                    3
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl mb-2">添加频道</h3>
                                    <p className="text-white/80">输入频道名称和 M3U8 地址</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center font-bold">
                                    4
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl mb-2">开始播放</h3>
                                    <p className="text-white/80">点击频道，即刻播放！</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FAQ */}
                    <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-10">
                        <h2 className="text-3xl font-bold text-white mb-8 text-center">
                            ❓ 常见问题
                        </h2>
                        <div className="space-y-6 text-white">
                            <div>
                                <h3 className="font-bold text-xl mb-2">为什么选择本地播放器？</h3>
                                <p className="text-white/80">
                                    本地 HTML 使用 file:// 协议，没有混合内容限制，可以直接播放 HTTP 流媒体。
                                    完全离线，保护隐私，零服务器成本。
                                </p>
                            </div>

                            <div>
                                <h3 className="font-bold text-xl mb-2">在线版和离线版有什么区别？</h3>
                                <p className="text-white/80">
                                    在线版从 CDN 加载 HLS.js（需要联网），文件小。
                                    离线版内置 HLS.js（完全离线），文件较大但可永久使用。
                                </p>
                            </div>

                            <div>
                                <h3 className="font-bold text-xl mb-2">支持哪些格式？</h3>
                                <p className="text-white/80">
                                    支持 HLS (M3U8) 流媒体，包括 HTTP 和 HTTPS 源。
                                    自动处理播放列表和视频片段。
                                </p>
                            </div>

                            <div>
                                <h3 className="font-bold text-xl mb-2">频道数据保存在哪里？</h3>
                                <p className="text-white/80">
                                    频道列表保存在浏览器的 localStorage 中，完全本地存储，
                                    不会上传到任何服务器。
                                </p>
                            </div>

                            <div>
                                <h3 className="font-bold text-xl mb-2">其他选择？</h3>
                                <p className="text-white/80 mb-2">
                                    如果你想要在线使用，我们还提供：
                                </p>
                                <ul className="list-disc list-inside text-white/80 space-y-1">
                                    <li>浏览器扩展（零服务器成本）</li>
                                    <li>服务器代理模式（无需安装）</li>
                                </ul>
                                <p className="text-white/80 mt-2">
                                    查看 <a href="https://github.com/al90slj23/Rin-yao.fan/tree/dev/browser-extension" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">GitHub 文档</a>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-white/80 mt-20">
                        <p>
                            Made with ❤️ for Yao.fan IPTV
                        </p>
                        <p className="mt-2">
                            <a href="https://github.com/al90slj23/Rin-yao.fan" target="_blank" rel="noopener noreferrer" className="hover:text-white underline">
                                GitHub
                            </a>
                            {" · "}
                            <a href="https://yao.fan" className="hover:text-white underline">
                                主页
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}
