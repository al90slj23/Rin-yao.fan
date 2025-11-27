import { useEffect, useRef, useState } from "react"
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
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

export function IPTVPage() {
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [selectedChannel, setSelectedChannel] = useState<IPTVChannel | null>(null)
    const [allChannels, setAllChannels] = useState<IPTVChannel[]>([])
    const [currentSourceName, setCurrentSourceName] = useState<string>('')
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const playerRef = useRef<HTMLVideoElement>(null)
    const plyrRef = useRef<Plyr | null>(null)
    const fetchRef = useRef(false)
    const { t } = useTranslation()

    function fetchChannels(isRefresh = false) {
        if (isRefresh) {
            setRefreshing(true)
        }

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
                .catch(() => {
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
                .then(([channelsRes]: any[]) => {
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
                    setRefreshing(false)
                })
        } else {
            Promise.all([
                client.iptv.channels.get(),
                fetchSourceName()
            ])
                .then(([channelsRes]: any[]) => {
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

    // Initialize Plyr player when channel changes or player ref is ready
    useEffect(() => {
        const videoElement = playerRef.current
        if (!videoElement || !selectedChannel?.url) return

        const proxyUrl = getProxyUrl(selectedChannel.url)

        // Initialize player once (don't recreate it)
        if (!plyrRef.current) {
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
                    quality: { default: 360, options: [360, 720, 1080] },
                    autoplay: true,
                    loop: { active: false },
                })
            } catch (e) {
                console.error('Plyr init failed:', e)
                plyrRef.current = null
                return
            }
        }

        // Just update the source, don't destroy/recreate player
        try {
            videoElement.src = proxyUrl
            videoElement.load()

            // Auto-play after source change
            if (videoElement.play) {
                videoElement.play().catch((e: unknown) => {
                    console.debug('Autoplay suppressed:', e instanceof Error ? e.message : e)
                })
            }
        } catch (e) {
            console.error('Failed to load video:', e)
        }

        return () => {
            // Only clean up on unmount, not on every source change
        }
    }, [selectedChannel])

    // Clean up player on component unmount
    useEffect(() => {
        return () => {
            if (plyrRef.current) {
                try {
                    plyrRef.current.destroy()
                    plyrRef.current = null
                } catch (e) {
                    // Suppress cleanup errors
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
                                <div className="ml-3 flex-shrink-0 flex gap-2">
                                    <button
                                        onClick={() => fetchChannels(true)}
                                        disabled={refreshing}
                                        className="flex-shrink-0 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-all"
                                        title={t('reload')}
                                    >
                                        <i className={`ri-refresh-line text-lg ${refreshing ? 'animate-spin' : ''}`}></i>
                                    </button>
                                </div>
                            </div>

                            {/* Video Player Container */}
                            {selectedChannel && (
                                <div className="flex-1 overflow-hidden">
                                    <div className="w-full h-full bg-black flex items-center justify-center">
                                        {selectedChannel.url ? (
                                            <video
                                                ref={playerRef}
                                                key={selectedChannel.id}
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
                                </div>
                            )}
                        </div>

                        {/* Right: Channel List Sidebar (Mobile: Below player, Desktop: Side) */}
                        <div className={`w-full md:w-1/3 ${sidebarOpen ? 'h-1/3' : 'h-12'} md:h-full flex flex-col overflow-hidden bg-gray-950 border-l border-gray-800 transition-all duration-200`}>
                            {/* Sidebar Header */}
                            <div className="flex-shrink-0 border-b border-gray-800">
                                <div className="flex items-center justify-between p-2 md:p-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm md:text-lg font-bold text-white">{t('iptv.channels')} ({channelList.length})</h3>
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

                            {/* Channels Scroll Area */}
                            {sidebarOpen && (
                                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                                    <div className="space-y-0.5 p-1">
                                        {channelList.map(channel => (
                                            <button
                                                key={channel.id}
                                                onClick={() => setSelectedChannel(channel)}
                                                className={`w-full flex items-center gap-1.5 p-1.5 rounded transition-all duration-200 text-xs ${
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
                                                {/* Channel Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-xs truncate">{channel.name}</p>
                                                    {channel.group && (
                                                        <p className="text-xs opacity-60 truncate">{channel.group}</p>
                                                    )}
                                                </div>
                                                {/* Indicator */}
                                                {selectedChannel?.id === channel.id && (
                                                    <i className="ri-check-line flex-shrink-0 text-xs"></i>
                                                )}
                                            </button>
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
