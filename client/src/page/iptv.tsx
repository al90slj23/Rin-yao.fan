import { useEffect, useRef, useState } from "react"
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import Hls from 'hls.js'
import { Helmet } from 'react-helmet'
import { useTranslation } from "react-i18next"
import { Waiting } from "../components/loading"
import { client, endpoint } from "../main"
import { siteName } from "../utils/constants"

interface IPTVChannel {
    id: string
    name: string
    logo?: string
    url: string
    group?: string
}

interface ChannelStatus {
    responseTime?: number // in milliseconds
    timestamp?: number
    error?: boolean
}

export function IPTVPage() {
    const [loading, setLoading] = useState(true)
    const [selectedChannel, setSelectedChannel] = useState<IPTVChannel | null>(null)
    const [allChannels, setAllChannels] = useState<IPTVChannel[]>([])
    const [currentSourceName, setCurrentSourceName] = useState<string>('')
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [channelStatus, setChannelStatus] = useState<Record<string, ChannelStatus>>({})
    const [isTesting, setIsTesting] = useState(false)
    const [showAddChannel, setShowAddChannel] = useState(false)
    const [addChannelUrl, setAddChannelUrl] = useState('')
    const [addChannelName, setAddChannelName] = useState('')
    const [debugInfo, setDebugInfo] = useState<string>('')
    const playerRef = useRef<HTMLVideoElement>(null)
    const plyrRef = useRef<Plyr | null>(null)
    const hlsRef = useRef<Hls | null>(null)
    const fetchRef = useRef(false)
    const { t } = useTranslation()

    // Debug logging helper
    const log = (message: string, data?: any) => {
        const timestamp = new Date().toLocaleTimeString()
        const logMsg = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data, null, 2) : ''}`
        console.log(logMsg)
        setDebugInfo(prev => prev + '\n' + logMsg)
    }

    // Load channel status from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('iptv_channel_status')
        if (saved) {
            try {
                setChannelStatus(JSON.parse(saved))
            } catch (e: unknown) {
                console.error('Failed to load channel status:', e)
            }
        }
    }, [])

    // Save channel status to localStorage
    const saveChannelStatus = (status: Record<string, ChannelStatus>) => {
        setChannelStatus(status)
        localStorage.setItem('iptv_channel_status', JSON.stringify(status))
    }

    // Get status color and text for a channel
    function getStatusIndicator(status?: ChannelStatus) {
        if (!status || !status.responseTime) return null

        const ms = status.responseTime
        const sec = (ms / 1000).toFixed(2)

        if (status.error) {
            return { text: '✗', color: 'text-red-500', bg: 'bg-red-900' }
        }

        if (ms < 3000) {
            return { text: `${ms}ms`, color: 'text-green-500', bg: 'bg-green-900' }
        } else if (ms < 8000) {
            return { text: `${sec}s`, color: 'text-yellow-500', bg: 'bg-yellow-900' }
        } else if (ms < 15000) {
            return { text: `${sec}s`, color: 'text-orange-500', bg: 'bg-orange-900' }
        } else {
            return { text: `${sec}s`, color: 'text-red-500', bg: 'bg-red-900' }
        }
    }

    // Test all channels via proxy to bypass mixed content blocking (HTTP from HTTPS page)
    async function testAllChannels() {
        if (isTesting || allChannels.length === 0) return

        setIsTesting(true)
        const newStatus: Record<string, ChannelStatus> = { ...channelStatus }
        const timeout = 20000 // 20 seconds timeout per channel

        for (const channel of allChannels) {
            try {
                const startTime = performance.now()
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), timeout)

                // Route through proxy to convert HTTP->HTTPS and bypass mixed content policy
                const proxyUrl = `${endpoint}/iptv/video-proxy?url=${encodeURIComponent(channel.url)}`

                await fetch(proxyUrl, {
                    method: 'HEAD',
                    signal: controller.signal
                }).catch(() => {
                    // Fallback to GET if HEAD is not supported
                    return fetch(proxyUrl, {
                        method: 'GET',
                        signal: controller.signal
                    })
                })

                clearTimeout(timeoutId)
                const responseTime = Math.round(performance.now() - startTime)

                newStatus[channel.id] = {
                    responseTime,
                    timestamp: Date.now(),
                    error: false
                }
            } catch (err: unknown) {
                newStatus[channel.id] = {
                    responseTime: 0,
                    timestamp: Date.now(),
                    error: true
                }
            }
        }

        saveChannelStatus(newStatus)
        setIsTesting(false)
    }

    function addTestChannel() {
        if (!addChannelUrl.trim()) return

        const testChannel: IPTVChannel = {
            id: `test_${Date.now()}`,
            name: addChannelName.trim() || 'Test Channel',
            url: addChannelUrl.trim(),
            group: 'Test'
        }

        setAllChannels([testChannel, ...allChannels])
        setSelectedChannel(testChannel)
        setAddChannelUrl('')
        setAddChannelName('')
        setShowAddChannel(false)
    }

    function fetchChannels(isRefresh = false) {

        // Fetch sources to get current source name
        const fetchSourceName = () => {
            return client.iptv.sources.get()
                .then(({ data }: { data: unknown }) => {
                    if (Array.isArray(data) && data.length > 0) {
                        const enabledSource = data.find((s: any) => s.enabled)
                        if (enabledSource) {
                            setCurrentSourceName(enabledSource.name)
                        }
                    }
                })
                .catch((_: unknown) => {
                    // Ignore source fetch errors
                })
        }

        // If forcing refresh, use the refresh endpoint instead
        if (isRefresh) {
            client.iptv.refresh.post({})
                .then(() => {
                    // After refresh, fetch the updated channels and source name
                    return Promise.all([
                        client.iptv.channels.get(),
                        fetchSourceName()
                    ])
                })
                .then((results: any[]) => {
                    const channelsRes = results[0]
                    const { data } = channelsRes
                    if (data && typeof data !== 'string') {
                        const arr = Array.isArray(data) ? data : []
                        setAllChannels(arr)

                        // Select first channel by default or keep current selection
                        if (arr.length > 0) {
                            if (!selectedChannel) {
                                setSelectedChannel(arr[0])
                            }
                        }
                    }
                })
                .catch((err: unknown) => {
                    console.error("fetchChannels error:", err)
                })
        } else {
            Promise.all([
                client.iptv.channels.get(),
                fetchSourceName()
            ])
                .then((results: any[]) => {
                    const channelsRes = results[0]
                    const { data } = channelsRes
                    if (data && typeof data !== 'string') {
                        const arr = Array.isArray(data) ? data : []
                        setAllChannels(arr)

                        // Select first channel by default or keep current selection
                        if (arr.length > 0) {
                            if (!selectedChannel) {
                                setSelectedChannel(arr[0])
                            }
                        }
                    }
                })
                .catch((err: unknown) => {
                    console.error("fetchChannels error:", err)
                })
                .finally(() => {
                    setLoading(false)
                })
        }
    }

    useEffect(() => {
        if (fetchRef.current) return
        fetchChannels()
        fetchRef.current = true
    }, [])

    // Get proxy URL for video to bypass CORS restrictions
    function getProxyUrl(videoUrl: string): string {
        return `${endpoint}/iptv/video-proxy?url=${encodeURIComponent(videoUrl)}`
    }

    // Initialize HLS.js and Plyr player when channel changes
    useEffect(() => {
        const videoElement = playerRef.current
        if (!videoElement || !selectedChannel?.url) {
            log('Player init skipped: no video element or channel')
            return
        }

        log('🎬 Loading channel', { name: selectedChannel.name, url: selectedChannel.url })
        const proxyUrl = getProxyUrl(selectedChannel.url)
        log('📡 Proxy URL', proxyUrl)

        // Initialize Plyr player once
        if (!plyrRef.current) {
            log('🎮 Initializing Plyr player')
            try {
                plyrRef.current = new Plyr(videoElement, {
                    controls: [
                        'play-large',
                        'play',
                        'progress',
                        'current-time',
                        'mute',
                        'volume',
                        'fullscreen'
                    ],
                    autoplay: false, // Changed to false to avoid browser blocking
                    loop: { active: false },
                })
                log('✅ Plyr initialized successfully')
            } catch (e: unknown) {
                log('❌ Plyr init failed', e)
                plyrRef.current = null
                return
            }
        }

        // Check if HLS is supported
        if (Hls.isSupported()) {
            log('✅ HLS.js is supported')

            // Destroy existing HLS instance if any
            if (hlsRef.current) {
                log('🔄 Destroying existing HLS instance')
                hlsRef.current.destroy()
            }

            // Create new HLS instance
            const hls = new Hls({
                debug: true, // Enable debug logs
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 90
            })
            hlsRef.current = hls

            // HLS event listeners for debugging
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                log('📺 HLS: Media attached')
            })

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                log('📋 HLS: Manifest parsed', { levels: data.levels.length })
                // Try to play after manifest is loaded
                videoElement.play().catch((e: unknown) => {
                    log('⚠️ Autoplay blocked (user interaction needed)', e instanceof Error ? e.message : String(e))
                })
            })

            hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
                log('📊 HLS: Level loaded', { level: data.level, duration: data.details.totalduration })
            })

            hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
                log('🎞️ HLS: Fragment loaded', { sn: data.frag.sn, duration: data.frag.duration })
            })

            hls.on(Hls.Events.ERROR, (event, data) => {
                log('❌ HLS Error', { type: data.type, details: data.details, fatal: data.fatal })

                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            log('🔄 Network error, attempting recovery...')
                            hls.startLoad()
                            break
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            log('🔄 Media error, attempting recovery...')
                            hls.recoverMediaError()
                            break
                        default:
                            log('💀 Fatal error, cannot recover')
                            hls.destroy()
                            break
                    }
                }
            })

            // Load the video
            log('🚀 Loading M3U8 stream...')
            hls.loadSource(proxyUrl)
            hls.attachMedia(videoElement)

        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            log('✅ Native HLS support (Safari)')
            videoElement.src = proxyUrl
            videoElement.load()
            videoElement.play().catch((e: unknown) => {
                log('⚠️ Autoplay blocked', e instanceof Error ? e.message : String(e))
            })
        } else {
            log('❌ HLS not supported on this browser')
        }

        return () => {
            log('🧹 Cleaning up channel change')
        }
    }, [selectedChannel])

    // Clean up player and HLS on component unmount
    useEffect(() => {
        return () => {
            log('🧹 Component unmounting, cleaning up...')

            // Destroy HLS instance
            if (hlsRef.current) {
                try {
                    hlsRef.current.destroy()
                    hlsRef.current = null
                    log('✅ HLS instance destroyed')
                } catch (e: unknown) {
                    log('⚠️ Error destroying HLS', e)
                }
            }

            // Destroy Plyr instance
            if (plyrRef.current) {
                try {
                    plyrRef.current.destroy()
                    plyrRef.current = null
                    log('✅ Plyr instance destroyed')
                } catch (e: unknown) {
                    log('⚠️ Error destroying Plyr', e)
                }
            }
        }
    }, [])

    if (loading) {
        return <Waiting />
    }

    const channelList = allChannels.length > 0 ? allChannels : []
    const hasChannels = channelList.length > 0

    return (
        <>
            <Helmet>
                <title>{t('iptv.title')} - {siteName}</title>
            </Helmet>
            <div className="fixed inset-0 bg-black z-40" style={{ top: '80px' }}>
                {hasChannels ? (
                    <div className="flex flex-col md:flex-row h-full gap-0">
                        {/* Left: Player Section (Mobile: Full width, Desktop: 2/3) */}
                        <div className="flex-1 md:w-2/3 flex flex-col overflow-hidden">
                            {/* Player Controls Header */}
                            <div className="flex items-center justify-between p-3 bg-gray-900 border-b border-gray-800">
                                <div className="flex-1 min-w-0">
                                    {selectedChannel && (
                                        <>
                                            <h2 className="text-lg md:text-2xl font-bold text-white truncate">{selectedChannel.name}</h2>
                                            {selectedChannel.group && (
                                                <p className="text-xs md:text-sm text-gray-400 truncate">{selectedChannel.group}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Video Player Container */}
                            {selectedChannel && (
                                <div className="flex-1 overflow-hidden flex flex-col">
                                    <div className="flex-1 bg-black flex items-center justify-center">
                                        {selectedChannel.url ? (
                                            <video
                                                ref={playerRef}
                                                crossOrigin="anonymous"
                                                playsInline
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <div className="text-white text-center">
                                                <i className="ri-error-warning-line ri-5x mb-4 block text-red-500"></i>
                                                <p>{t('iptv.unable_to_load')}: {selectedChannel.name}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Debug Info Panel - Collapsible */}
                                    <details className="bg-gray-900 border-t border-gray-700">
                                        <summary className="px-3 py-2 cursor-pointer text-xs text-gray-400 hover:bg-gray-800">
                                            🐛 调试信息 (点击展开/收起)
                                        </summary>
                                        <div className="p-3 max-h-40 overflow-y-auto bg-black">
                                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                                                {debugInfo || '等待日志...'}
                                            </pre>
                                            <button
                                                onClick={() => setDebugInfo('')}
                                                className="mt-2 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                                            >
                                                清除日志
                                            </button>
                                        </div>
                                    </details>
                                </div>
                            )}
                        </div>

                        {/* Right: Channel List Sidebar (Mobile: Below player, Desktop: Side) */}
                        <div className={`w-full md:w-1/3 ${sidebarOpen ? 'h-1/3' : 'h-12'} md:h-full flex flex-col overflow-hidden bg-gray-950 border-l border-gray-800 transition-all duration-200`}>
                            {/* Sidebar Header */}
                            <div className="flex-shrink-0 border-b border-gray-800">
                                <div className="flex items-center justify-between p-2 md:p-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm md:text-lg font-bold text-white">{t('iptv.channels')} ({channelList.length})</h3>
                                            {/* Test channels button */}
                                            <button
                                                onClick={() => testAllChannels()}
                                                disabled={isTesting}
                                                className={`flex-shrink-0 p-1.5 rounded text-white transition-all flex items-center gap-1 ${
                                                    isTesting
                                                        ? 'bg-gray-700 cursor-not-allowed opacity-50'
                                                        : 'bg-blue-600 hover:bg-blue-700'
                                                }`}
                                                title="Test channel connection speed"
                                            >
                                                <i className={`ri-speed-line ${isTesting ? 'animate-spin' : ''}`}></i>
                                                <span className="text-xs hidden sm:inline">Test</span>
                                            </button>
                                            {/* Add channel button */}
                                            <button
                                                onClick={() => setShowAddChannel(!showAddChannel)}
                                                className="flex-shrink-0 p-1.5 rounded text-white transition-all flex items-center gap-1 bg-purple-600 hover:bg-purple-700"
                                                title="Add test channel"
                                            >
                                                <i className="ri-add-line"></i>
                                                <span className="text-xs hidden sm:inline">Add</span>
                                            </button>
                                        </div>
                                        {currentSourceName && (
                                            <p className="text-xs text-gray-400 truncate mt-1">{t('iptv.source')}: {currentSourceName}</p>
                                        )}
                                    </div>
                                    {/* Toggle button for mobile */}
                                    <button
                                        onClick={() => setSidebarOpen(!sidebarOpen)}
                                        className="md:hidden ml-2 p-1 rounded text-white hover:bg-gray-800 flex-shrink-0"
                                        title={sidebarOpen ? t('iptv.hide_channels') : t('iptv.show_channels')}
                                    >
                                        <i className={`ri-${sidebarOpen ? 'arrow-down' : 'arrow-up'}-s-line`}></i>
                                    </button>
                                </div>
                            </div>

                            {/* Add Channel Form */}
                            {showAddChannel && (
                                <div className="flex-shrink-0 border-b border-gray-800 p-2 md:p-3 space-y-2 bg-gray-900">
                                    <input
                                        type="text"
                                        placeholder="Channel name (optional)"
                                        value={addChannelName}
                                        onChange={(e) => setAddChannelName(e.target.value)}
                                        className="w-full px-2 py-1.5 text-xs rounded bg-gray-800 text-white placeholder-gray-500 border border-gray-700"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Stream URL (m3u8 or mp4)"
                                        value={addChannelUrl}
                                        onChange={(e) => setAddChannelUrl(e.target.value)}
                                        className="w-full px-2 py-1.5 text-xs rounded bg-gray-800 text-white placeholder-gray-500 border border-gray-700"
                                    />
                                    <div className="flex gap-1">
                                        <button
                                            onClick={addTestChannel}
                                            disabled={!addChannelUrl.trim()}
                                            className="flex-1 px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition"
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowAddChannel(false)
                                                setAddChannelUrl('')
                                                setAddChannelName('')
                                            }}
                                            className="flex-1 px-2 py-1 text-xs rounded bg-gray-700 text-white hover:bg-gray-600 transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Channels Scroll Area */}
                            {sidebarOpen && (
                                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                                    <div className="space-y-0.5 p-1">
                                        {channelList.map(channel => (
                                            <div
                                                key={channel.id}
                                                className={`w-full flex items-center gap-1.5 p-1.5 rounded transition-all duration-200 text-xs group ${
                                                    selectedChannel?.id === channel.id
                                                        ? 'bg-theme text-white shadow-lg'
                                                        : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                                                }`}
                                            >
                                                {/* Channel Logo */}
                                                <div className="flex-shrink-0 w-8 h-8 bg-gray-700 rounded flex items-center justify-center overflow-hidden text-xs">
                                                    {channel.logo ? (
                                                        <img
                                                            src={channel.logo}
                                                            alt={channel.name}
                                                            className="w-full h-full object-contain p-0.5"
                                                            onError={(e: unknown) => {
                                                                if (e && typeof e === 'object' && 'target' in e) {
                                                                    ((e as any).target as HTMLImageElement).style.display = 'none'
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <i className="ri-tv-2-line text-xs"></i>
                                                    )}
                                                </div>
                                                {/* Channel Info - Clickable */}
                                                <button
                                                    onClick={() => setSelectedChannel(channel)}
                                                    className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                                                >
                                                    <p className="font-semibold text-xs truncate">{channel.name}</p>
                                                    {channel.group && (
                                                        <p className="text-xs opacity-60 truncate">{channel.group}</p>
                                                    )}
                                                </button>
                                                {/* Status Indicator */}
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    {(() => {
                                                        const status = getStatusIndicator(channelStatus[channel.id])
                                                        return status ? (
                                                            <span className={`text-xs font-semibold whitespace-nowrap ${status.color}`}>
                                                                {status.text}
                                                            </span>
                                                        ) : null
                                                    })()}
                                                </div>
                                                {/* Copy URL Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        navigator.clipboard.writeText(channel.url)
                                                    }}
                                                    title="Copy stream URL"
                                                    className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-600 transition-all"
                                                >
                                                    <i className="ri-file-copy-line text-xs"></i>
                                                </button>
                                                {/* Selected Indicator */}
                                                {selectedChannel?.id === channel.id && (
                                                    <i className="ri-check-line flex-shrink-0 text-xs"></i>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center text-gray-400">
                            <i className="ri-tv-2-line ri-5x mb-4 block"></i>
                            <p className="text-xl">{t('iptv.no_channels')}</p>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}