import { useEffect, useRef, useState } from "react"
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import { Helmet } from 'react-helmet'
import { useTranslation } from "react-i18next"
import { Waiting } from "../components/loading"
import { client } from "../main"
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
    const [selectedChannel, setSelectedChannel] = useState<IPTVChannel | null>(null)
    const [allChannels, setAllChannels] = useState<IPTVChannel[]>([])
    const playerRef = useRef<HTMLVideoElement>(null)
    const plyrRef = useRef<Plyr | null>(null)
    const fetchRef = useRef(false)
    const { t } = useTranslation()

    function fetchChannels() {
        client.iptv.channels.get()
            .then(({ data }: { data: unknown }) => {
                if (data && typeof data !== 'string') {
                    const arr = Array.isArray(data) ? data : []
                    setAllChannels(arr)

                    // Select first channel by default
                    if (arr.length > 0) {
                        setSelectedChannel(arr[0])
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

    useEffect(() => {
        if (fetchRef.current) return
        fetchChannels()
        fetchRef.current = true
    }, [])

    // Initialize Plyr player when channel changes or player ref is ready
    useEffect(() => {
        if (playerRef.current && selectedChannel?.url) {
            // Destroy existing player instance
            if (plyrRef.current) {
                plyrRef.current.destroy()
            }

            // Update video source
            playerRef.current.src = selectedChannel.url

            // Initialize new Plyr instance
            plyrRef.current = new Plyr(playerRef.current, {
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
        }

        return () => {
            // Cleanup on unmount
            if (plyrRef.current) {
                plyrRef.current.destroy()
            }
        }
    }, [selectedChannel])

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
            <div className="w-full h-full min-h-screen bg-black">
                {hasChannels ? (
                    <div className="flex flex-col lg:flex-row gap-4 p-4 h-full">
                        {/* Left: Player Section */}
                        <div className="flex-1 lg:w-2/3 flex flex-col">
                            {selectedChannel && (
                                <>
                                    <div className="bg-black rounded-lg overflow-hidden flex-1 flex items-center justify-center min-h-96">
                                        {selectedChannel.url ? (
                                            <video
                                                ref={playerRef}
                                                key={selectedChannel.id}
                                                crossOrigin="anonymous"
                                                playsInline
                                                className="w-full h-full"
                                                src={selectedChannel.url}
                                            />
                                        ) : (
                                            <div className="text-white text-center">
                                                {t('iptv.unable_to_load')}: {selectedChannel.name}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 text-white">
                                        <h2 className="text-3xl font-bold">{selectedChannel.name}</h2>
                                        {selectedChannel.group && (
                                            <p className="text-gray-400 text-sm mt-2">{selectedChannel.group}</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Right: Channel List Sidebar */}
                        <div className="w-full lg:w-1/3 flex flex-col">
                            <h3 className="text-xl font-bold text-white mb-4">{t('iptv.channels')}</h3>
                            <div className="flex-1 overflow-y-auto bg-gray-900 rounded-lg p-3 space-y-2">
                                {channelList.map(channel => (
                                    <button
                                        key={channel.id}
                                        onClick={() => setSelectedChannel(channel)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
                                            selectedChannel?.id === channel.id
                                                ? 'bg-theme text-white shadow-lg'
                                                : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                                        }`}
                                    >
                                        {/* Channel Logo */}
                                        <div className="flex-shrink-0 w-12 h-12 bg-gray-700 rounded flex items-center justify-center overflow-hidden">
                                            {channel.logo ? (
                                                <img
                                                    src={channel.logo}
                                                    alt={channel.name}
                                                    className="w-full h-full object-contain p-1"
                                                    onError={(e: unknown) => {
                                                        if (e && typeof e === 'object' && 'target' in e) {
                                                            ((e as any).target as HTMLImageElement).style.display = 'none'
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <i className="ri-tv-2-line ri-lg"></i>
                                            )}
                                        </div>
                                        {/* Channel Info */}
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="font-semibold text-sm truncate">{channel.name}</p>
                                            {channel.group && (
                                                <p className="text-xs opacity-75 truncate">{channel.group}</p>
                                            )}
                                        </div>
                                        {/* Indicator */}
                                        {selectedChannel?.id === channel.id && (
                                            <i className="ri-check-line ri-lg flex-shrink-0"></i>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-screen flex items-center justify-center">
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
