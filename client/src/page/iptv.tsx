import { Helmet } from 'react-helmet'
import { siteName } from "../utils/constants"
import React, { useEffect, useRef, useState } from 'react'

// HLS.js types
declare global {
    interface Window {
        Hls: any;
    }
}

interface Channel {
    name: string;
    url: string;
    group: string;
}

interface DebugLog {
    message: string;
    type: 'info' | 'warn' | 'error';
    timestamp: string;
}

export function IPTVPage() {
    const [channels, setChannels] = useState<Channel[]>([])
    const [currentChannelIndex, setCurrentChannelIndex] = useState<number>(-1)
    const [channelName, setChannelName] = useState('')
    const [channelUrl, setChannelUrl] = useState('')
    const [debugLogs, setDebugLogs] = useState<DebugLog[]>([])
    const [showDebug, setShowDebug] = useState(false)
    const [hlsLoaded, setHlsLoaded] = useState(false)

    const videoRef = useRef<HTMLVideoElement>(null)
    const hlsRef = useRef<any>(null)
    const debugPanelRef = useRef<HTMLDivElement>(null)

    // Load HLS.js
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js'
        script.onload = () => {
            log('HLS.js 加载成功，版本: ' + window.Hls.version)
            setHlsLoaded(true)
        }
        script.onerror = () => {
            log('HLS.js 加载失败', 'error')
        }
        document.head.appendChild(script)

        return () => {
            document.head.removeChild(script)
        }
    }, [])

    // Load channels from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('iptv_channels')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setChannels(parsed)
                log(`加载了 ${parsed.length} 个频道`)
            } catch (e) {
                log('频道列表加载失败', 'error')
            }
        }
    }, [])

    // Auto-scroll debug panel
    useEffect(() => {
        if (debugPanelRef.current && showDebug) {
            debugPanelRef.current.scrollTop = debugPanelRef.current.scrollHeight
        }
    }, [debugLogs, showDebug])

    const log = (message: string, type: 'info' | 'warn' | 'error' = 'info') => {
        const timestamp = new Date().toLocaleTimeString()
        setDebugLogs((prev: DebugLog[]) => [...prev, { message, type, timestamp }])
        console.log(`[${timestamp}] ${message}`)
    }

    const clearLogs = () => {
        setDebugLogs([])
        console.log('Debug logs cleared')
    }

    const copyLogs = async () => {
        const text = debugLogs.map((log: DebugLog) => `[${log.timestamp}] ${log.message}`).join('\n')
        try {
            await navigator.clipboard.writeText(text)
            alert('调试日志已复制到剪贴板')
        } catch (err) {
            console.error('Failed to copy logs:', err)
            alert('复制失败')
        }
    }

    const saveChannels = (newChannels: Channel[]) => {
        localStorage.setItem('iptv_channels', JSON.stringify(newChannels))
        log('频道列表已保存')
    }

    const parseM3UPlaylist = async (content: string): Promise<Channel[]> => {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line)
        const parsedChannels: Channel[] = []
        let currentName = ''
        let currentGroup = ''

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            if (line.startsWith('#EXTINF:')) {
                const nameMatch = line.match(/,(.+)$/)
                if (nameMatch) currentName = nameMatch[1].trim()
                const groupMatch = line.match(/group-title="([^"]+)"/)
                if (groupMatch) currentGroup = groupMatch[1]
            } else if (!line.startsWith('#') && line.startsWith('http')) {
                if (currentName) {
                    parsedChannels.push({
                        name: currentName,
                        url: line,
                        group: currentGroup || '未分组'
                    })
                    currentName = ''
                    currentGroup = ''
                }
            }
        }

        return parsedChannels
    }

    const addChannel = async () => {
        const name = channelName.trim()
        const url = channelUrl.trim()

        if (!url) {
            alert('请填写 URL 地址')
            return
        }

        const isPlaylist = url.toLowerCase().endsWith('.m3u') ||
                          url.toLowerCase().includes('.m3u?')

        if (isPlaylist || !name) {
            log('检测到播放列表，正在解析...')
            try {
                const response = await fetch(url)
                const content = await response.text()

                if (content.includes('#EXTM3U') || content.includes('#EXTINF:')) {
                    const parsedChannels = await parseM3UPlaylist(content)
                    if (parsedChannels.length === 0) {
                        alert('播放列表中没有找到频道')
                        return
                    }
                    log(`解析出 ${parsedChannels.length} 个频道`)
                    const newChannels = [...channels, ...parsedChannels]
                    setChannels(newChannels)
                    saveChannels(newChannels)
                    setChannelName('')
                    setChannelUrl('')
                    log(`已添加 ${parsedChannels.length} 个频道`)
                } else {
                    if (!name) {
                        alert('请填写频道名称')
                        return
                    }
                    const newChannels = [...channels, { name, url, group: '未分组' }]
                    setChannels(newChannels)
                    saveChannels(newChannels)
                    setChannelName('')
                    setChannelUrl('')
                    log(`添加频道: ${name}`)
                }
            } catch (error: any) {
                log(`获取播放列表失败: ${error.message}`, 'error')
                alert('无法获取播放列表，请检查 URL')
            }
        } else {
            const newChannels = [...channels, { name, url, group: '未分组' }]
            setChannels(newChannels)
            saveChannels(newChannels)
            setChannelName('')
            setChannelUrl('')
            log(`添加频道: ${name}`)
        }
    }

    const removeChannel = (index: number) => {
        const newChannels = channels.filter((_: Channel, i: number) => i !== index)
        setChannels(newChannels)
        saveChannels(newChannels)
        log(`删除频道: ${channels[index].name}`)

        if (currentChannelIndex === index) {
            setCurrentChannelIndex(-1)
            if (hlsRef.current) {
                hlsRef.current.destroy()
                hlsRef.current = null
            }
        }
    }

    const clearChannels = () => {
        if (confirm('确定要清空所有频道吗？')) {
            setChannels([])
            setCurrentChannelIndex(-1)
            localStorage.removeItem('iptv_channels')
            log('已清空所有频道')
            if (hlsRef.current) {
                hlsRef.current.destroy()
                hlsRef.current = null
            }
        }
    }

    const playChannel = (index: number, useProxy = false) => {
        if (!hlsLoaded || !window.Hls) {
            log('HLS.js 未加载', 'error')
            return
        }

        const channel = channels[index]
        setCurrentChannelIndex(index)

        log(`========== 开始播放 ==========`)
        log(`频道名称: ${channel.name}`)

        let playUrl = channel.url
        if (useProxy) {
            playUrl = `https://api.yao.fan/iptv/video-proxy?url=${encodeURIComponent(channel.url)}`
            log(`使用代理模式: ${playUrl}`)
        } else {
            log(`直连模式: ${channel.url}`)
        }

        const video = videoRef.current
        if (!video) return

        if (hlsRef.current) {
            log('销毁之前的 HLS 实例')
            hlsRef.current.destroy()
        }

        if (window.Hls.isSupported()) {
            log(`HLS.js 支持检查: ✓ 支持`)
            log(`创建 HLS 实例...`)

            const hls = new window.Hls({
                debug: false,
                enableWorker: true,
                xhrSetup: function(_xhr: XMLHttpRequest, url: string) {
                    log(`发起 XHR 请求: ${url}`)
                }
            })

            hlsRef.current = hls

            let corsErrorDetected = false

            hls.on(window.Hls.Events.MANIFEST_LOADING, (_event: string, data: any) => {
                log(`[事件] 开始加载清单: ${data.url}`)
            })

            hls.on(window.Hls.Events.MANIFEST_LOADED, (_event: string, data: any) => {
                log(`[事件] 清单加载成功`)
                log(`  - 级别数: ${data.levels.length}`)
            })

            hls.on(window.Hls.Events.MANIFEST_PARSED, (_event: string, data: any) => {
                log(`[事件] 清单解析完成 (${data.levels.length} 个级别)`)
                log(`尝试播放视频...`)
                video.play()
                    .then(() => log('✓ 视频开始播放'))
                    .catch((e: Error) => log(`自动播放被阻止: ${e.message}`, 'warn'))
            })

            hls.on(window.Hls.Events.FRAG_LOADED, (_event: string, data: any) => {
                log(`[事件] 片段 #${data.frag.sn} 加载成功`)
            })

            hls.on(window.Hls.Events.ERROR, (_event: string, data: any) => {
                log(`========== 错误详情 ==========`, 'error')
                log(`错误类型: ${data.type}`, 'error')
                log(`错误详情: ${data.details}`, 'error')
                log(`是否致命: ${data.fatal ? '是' : '否'}`, 'error')

                if (data.response) {
                    log(`HTTP 状态码: ${data.response.code}`, 'error')
                }

                // 检测 CORS 错误（HTTP 状态码 0）
                if (data.fatal &&
                    data.type === window.Hls.ErrorTypes.NETWORK_ERROR &&
                    data.details === 'manifestLoadError' &&
                    data.response &&
                    data.response.code === 0 &&
                    !useProxy &&
                    !corsErrorDetected) {

                    corsErrorDetected = true
                    log(``, 'warn')
                    log(`⚠️ 检测到 CORS 阻止，自动切换到代理模式...`, 'warn')
                    log(``, 'warn')

                    hls.destroy()
                    setTimeout(() => playChannel(index, true), 500)
                    return
                }

                if (data.fatal) {
                    switch (data.type) {
                        case window.Hls.ErrorTypes.NETWORK_ERROR:
                            log('尝试恢复网络错误...', 'warn')
                            hls.startLoad()
                            break
                        case window.Hls.ErrorTypes.MEDIA_ERROR:
                            log('尝试恢复媒体错误...', 'warn')
                            hls.recoverMediaError()
                            break
                        default:
                            log('无法恢复的错误类型，停止播放', 'error')
                            hls.destroy()
                            break
                    }
                }
            })

            log(`加载源: ${playUrl}`)
            hls.loadSource(playUrl)
            hls.attachMedia(video)
            log(`等待清单加载...`)

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            log('使用原生 HLS 支持 (Safari)')
            video.src = playUrl
            video.play()
                .then(() => log('✓ 视频开始播放'))
                .catch((e: Error) => log(`播放失败: ${e.message}`, 'error'))
        } else {
            log('浏览器不支持 HLS 播放', 'error')
            alert('浏览器不支持 HLS 播放')
        }

        log(`========== 初始化完成 ==========`)
    }

    return (
        <>
            <Helmet>
                <title>IPTV 在线播放器 - {siteName}</title>
            </Helmet>

            <div className="flex h-screen bg-gray-900">
                {/* Sidebar */}
                <div className="w-80 bg-gray-800 flex flex-col">
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-purple-600 to-blue-600">
                        <h1 className="text-2xl font-bold text-white">📺 IPTV 播放器</h1>
                        <p className="text-sm text-white/80 mt-1">智能双模式 · 自动 CORS 处理</p>
                    </div>

                    {/* Add Channel Form */}
                    <div className="p-4 bg-gray-750 border-b border-gray-700">
                        <h3 className="text-white font-semibold mb-3">添加频道</h3>
                        <input
                            type="text"
                            placeholder="频道名称（可选）"
                            value={channelName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChannelName(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addChannel()}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                            type="text"
                            placeholder="M3U8 URL 或播放列表地址"
                            value={channelUrl}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChannelUrl(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addChannel()}
                            className="w-full px-3 py-2 bg-gray-700 text-white rounded mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={addChannel}
                                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition"
                            >
                                添加/导入
                            </button>
                            <button
                                onClick={clearChannels}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition"
                            >
                                清空
                            </button>
                        </div>
                    </div>

                    {/* Channel List */}
                    <div className="flex-1 overflow-y-auto">
                        {channels.length === 0 ? (
                            <div className="p-4 text-center text-gray-400 text-sm">
                                暂无频道，请添加
                            </div>
                        ) : (
                            channels.map((channel: Channel, index: number) => (
                                <div
                                    key={index}
                                    className={`px-4 py-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700 transition ${
                                        index === currentChannelIndex ? 'bg-purple-600/20' : ''
                                    }`}
                                    onClick={() => playChannel(index)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white font-medium truncate">{channel.name}</div>
                                            <div className="text-xs text-gray-400 truncate">{channel.group}</div>
                                        </div>
                                        <button
                                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                                e.stopPropagation()
                                                removeChannel(index)
                                            }}
                                            className="ml-2 text-gray-400 hover:text-red-500 text-xl leading-none"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Player Area */}
                <div className="flex-1 flex flex-col bg-black">
                    {/* Video Container */}
                    <div className="flex-1 relative">
                        <video
                            ref={videoRef}
                            controls
                            className="w-full h-full"
                            style={{ backgroundColor: '#000' }}
                        />

                        {currentChannelIndex === -1 && (
                            <div className="absolute inset-0 flex items-center justify-center text-white/50">
                                <div className="text-center">
                                    <div className="text-6xl mb-4">📺</div>
                                    <div className="text-xl">选择左侧频道开始播放</div>
                                </div>
                            </div>
                        )}

                        {/* Debug Toggle Button */}
                        <button
                            onClick={() => setShowDebug(!showDebug)}
                            className="absolute top-4 right-4 px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded backdrop-blur-sm transition"
                        >
                            🐛 调试日志 {showDebug ? '▼' : '▲'}
                        </button>
                    </div>

                    {/* Debug Panel */}
                    {showDebug && (
                        <div className="h-64 bg-gray-900 border-t border-gray-700 flex flex-col">
                            {/* Button Bar */}
                            <div className="flex gap-2 p-2 border-b border-gray-700">
                                <button
                                    onClick={clearLogs}
                                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition"
                                >
                                    清空日志
                                </button>
                                <button
                                    onClick={copyLogs}
                                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition"
                                >
                                    复制日志
                                </button>
                            </div>

                            {/* Log Content */}
                            <div
                                ref={debugPanelRef}
                                className="flex-1 overflow-y-auto p-4 font-mono text-xs"
                            >
                                {debugLogs.length === 0 ? (
                                    <div className="text-gray-500">暂无日志</div>
                                ) : (
                                    debugLogs.map((log: DebugLog, index: number) => (
                                        <div
                                            key={index}
                                            className={`mb-1 ${
                                                log.type === 'error' ? 'text-red-400' :
                                                log.type === 'warn' ? 'text-yellow-400' :
                                                'text-green-400'
                                            }`}
                                        >
                                            [{log.timestamp}] {log.message}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
