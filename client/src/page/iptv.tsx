import { useEffect, useRef, useState } from "react"
import { Helmet } from 'react-helmet'
import { useTranslation } from "react-i18next"
import { Waiting } from "../components/loading"
import { client } from "../main"
import { siteName } from "../utils/constants"
import { Padding } from "../components/padding"

interface IPTVChannel {
    id: string
    name: string
    logo?: string
    url: string
    group?: string
}

export function IPTVPage() {
    const [channels, setChannels] = useState<IPTVChannel[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedChannel, setSelectedChannel] = useState<IPTVChannel | null>(null)
    const [groupedChannels, setGroupedChannels] = useState<Record<string, IPTVChannel[]>>({})
    const ref = useRef(false)
    const { t } = useTranslation()

    function fetchChannels() {
        client.iptv.channels.get()
            .then(({ data }) => {
                if (data && typeof data !== 'string') {
                    const arr = Array.isArray(data) ? data : []
                    setChannels(arr)

                    // Group by category
                    const groups = arr.reduce<Record<string, IPTVChannel[]>>((acc, channel) => {
                        const group = channel.group || 'Other'
                        if (!acc[group]) {
                            acc[group] = []
                        }
                        acc[group].push(channel)
                        return acc
                    }, {})
                    setGroupedChannels(groups)

                    // Select first channel by default
                    if (arr.length > 0) {
                        setSelectedChannel(arr[0])
                    }
                }
            })
            .catch(err => {
                console.error("fetchChannels error:", err)
            })
            .finally(() => {
                setLoading(false)
            })
    }

    useEffect(() => {
        if (ref.current) return
        fetchChannels()
        ref.current = true
    }, [])

    if (loading) {
        return <Waiting />
    }

    return (
        <>
            <Helmet>
                <title>{t('iptv.title')} - {siteName}</title>
            </Helmet>
            <div className="w-full max-w-6xl mx-auto">
                {/* Player Section */}
                {selectedChannel && (
                    <div className="mb-8">
                        <div className="rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                            {selectedChannel.url ? (
                                <video
                                    key={selectedChannel.id}
                                    controls
                                    autoPlay
                                    className="w-full h-full"
                                    src={selectedChannel.url}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <div className="text-white">
                                    Unable to load channel: {selectedChannel.name}
                                </div>
                            )}
                        </div>
                        <div className="mt-4">
                            <h2 className="text-2xl font-bold">{selectedChannel.name}</h2>
                            {selectedChannel.group && (
                                <p className="text-gray-500 text-sm mt-2">{selectedChannel.group}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Channels List */}
                <div className="mb-8">
                    <h3 className="text-xl font-bold mb-4">{t('iptv.channels')}</h3>
                    {Object.entries(groupedChannels).length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            {t('iptv.no_channels')}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedChannels).map(([group, groupChannels]) => (
                                <div key={group}>
                                    <h4 className="text-lg font-semibold mb-3 text-theme">
                                        {group}
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {groupChannels.map(channel => (
                                            <button
                                                key={channel.id}
                                                onClick={() => setSelectedChannel(channel)}
                                                className={`p-3 rounded-lg transition-all duration-200 ${
                                                    selectedChannel?.id === channel.id
                                                        ? 'bg-theme text-white shadow-lg'
                                                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    {channel.logo && (
                                                        <img
                                                            src={channel.logo}
                                                            alt={channel.name}
                                                            className="h-8 w-8 object-contain"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none'
                                                            }}
                                                        />
                                                    )}
                                                    <span className="text-xs text-center line-clamp-2">
                                                        {channel.name}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
