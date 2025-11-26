import Elysia from "elysia"

interface IPTVChannel {
    id: string
    name: string
    logo?: string
    url: string
    group?: string
}

interface IPTVSource {
    id: string
    name: string
    url: string
    enabled: boolean
    lastFetch?: number
}

// In-memory cache with TTL (1 hour)
const CACHE_TTL = 3600000 // 1 hour in milliseconds
let channelCache: { data: IPTVChannel[], timestamp: number } | null = null
let sourcesCache: IPTVSource[] = []

/**
 * Get demo channels (built-in fallback)
 */
function getDemoChannels(): IPTVChannel[] {
    return [
        {
            id: 'demo_cctv1',
            name: 'CCTV-1',
            logo: 'https://epg.51zhy.cn:8000/logo/cctv1.png',
            url: 'https://www.example.com/cctv1.m3u8',
            group: 'CCTV'
        },
        {
            id: 'demo_cctv2',
            name: 'CCTV-2',
            logo: 'https://epg.51zhy.cn:8000/logo/cctv2.png',
            url: 'https://www.example.com/cctv2.m3u8',
            group: 'CCTV'
        },
        {
            id: 'demo_cctv3',
            name: 'CCTV-3',
            logo: 'https://epg.51zhy.cn:8000/logo/cctv3.png',
            url: 'https://www.example.com/cctv3.m3u8',
            group: 'CCTV'
        },
        {
            id: 'demo_cctv5',
            name: 'CCTV-5',
            logo: 'https://epg.51zhy.cn:8000/logo/cctv5.png',
            url: 'https://www.example.com/cctv5.m3u8',
            group: 'CCTV'
        },
        {
            id: 'demo_cctv13',
            name: 'CCTV-13',
            logo: 'https://epg.51zhy.cn:8000/logo/cctv13.png',
            url: 'https://www.example.com/cctv13.m3u8',
            group: 'CCTV'
        },
        {
            id: 'demo_beijing',
            name: 'Beijing Satellite TV',
            logo: 'https://epg.51zhy.cn:8000/logo/beiying.png',
            url: 'https://www.example.com/btv.m3u8',
            group: 'Provincial'
        },
        {
            id: 'demo_shanghai',
            name: 'Shanghai Satellite TV',
            logo: 'https://epg.51zhy.cn:8000/logo/sheng.png',
            url: 'https://www.example.com/stv.m3u8',
            group: 'Provincial'
        },
        {
            id: 'demo_zhejiang',
            name: 'Zhejiang Satellite TV',
            logo: 'https://epg.51zhy.cn:8000/logo/zjstv.png',
            url: 'https://www.example.com/ztv.m3u8',
            group: 'Provincial'
        }
    ]
}

/**
 * Get default IPTV sources
 */
function getDefaultSources(): IPTVSource[] {
    return [
        {
            id: 'local_demo',
            name: 'Demo Channels (Local)',
            url: 'local://demo',
            enabled: true,
        },
        {
            id: 'demo_channels',
            name: 'Demo Channels (External)',
            url: 'https://demo.iptv.name/all.json',
            enabled: false,
        },
        {
            id: 'guovin_json',
            name: 'Guovin IPTV (JSON)',
            url: 'https://api.iptv.name/all.json',
            enabled: false,
        },
        {
            id: 'guovin_github',
            name: 'Guovin IPTV (GitHub)',
            url: 'https://raw.githubusercontent.com/Guovin/iptv-api/main/tv.json',
            enabled: false,
        },
    ]
}

/**
 * Fetch IPTV channels with caching
 */
async function fetchIPTVChannels(forceRefresh = false): Promise<IPTVChannel[]> {
    try {
        // Return cached data if available and not forcing refresh
        if (!forceRefresh && channelCache && Date.now() - channelCache.timestamp < CACHE_TTL) {
            console.log('Returning cached IPTV channels')
            return channelCache.data
        }

        // Get sources (from cache or default)
        const sources = sourcesCache.length > 0 ? sourcesCache : getDefaultSources()

        for (const source of sources) {
            if (!source.enabled) continue

            try {
                let channels: IPTVChannel[] = []

                // Handle local sources
                if (source.url === 'local://demo') {
                    channels = getDemoChannels()
                } else {
                    const response = await fetch(source.url, {
                        method: 'GET',
                        headers: { 'User-Agent': 'Rin-IPTV-Player/1.0' }
                    })

                    if (!response.ok) continue

                    const data: any = await response.json()
                    channels = parseIPTVData(data)
                }

                if (channels.length > 0) {
                    console.log(`Successfully fetched ${channels.length} channels from ${source.name}`)

                    // Update cache
                    channelCache = {
                        data: channels,
                        timestamp: Date.now()
                    }

                    // Update source last fetch time
                    source.lastFetch = Date.now()

                    return channels
                }
            } catch (err) {
                console.warn(`Failed to fetch from ${source.name}:`, err)
                continue
            }
        }

        console.warn('No IPTV channels available from any source')
        return []
    } catch (error) {
        console.error('Error fetching IPTV channels:', error)
        return []
    }
}

function parseIPTVData(data: any): IPTVChannel[] {
    const channels: IPTVChannel[] = []

    try {
        if (Array.isArray(data)) {
            // Guovin's format with groups
            data.forEach((group: any) => {
                if (group.channels && Array.isArray(group.channels)) {
                    group.channels.forEach((channel: any, index: number) => {
                        if (channel.name && channel.url) {
                            channels.push({
                                id: `${group.name}_${index}`,
                                name: channel.name,
                                logo: channel.logo || undefined,
                                url: channel.url,
                                group: group.name || 'Other'
                            })
                        }
                    })
                }
            })
        } else if (data && typeof data === 'object') {
            // Alternative format: key-value pairs
            Object.entries(data).forEach(([groupName, groupData]: [string, any]) => {
                if (Array.isArray(groupData)) {
                    groupData.forEach((channel: any, index: number) => {
                        const name = typeof channel === 'string' ? channel : channel.name
                        const url = typeof channel === 'string' ? undefined : channel.url
                        if (name && url) {
                            channels.push({
                                id: `${groupName}_${index}`,
                                name: name,
                                url: url,
                                group: groupName
                            })
                        }
                    })
                }
            })
        }
    } catch (err) {
        console.error('Error parsing IPTV data:', err)
    }

    return channels
}

export function IPTVService() {
    return new Elysia({ aot: false })
        .group('/iptv', (group) =>
            group
                // Get channels with optional force refresh
                .get("/channels", async ({ query }: { query: { force_refresh?: string } }) => {
                    const forceRefresh = query.force_refresh === '1' || query.force_refresh === 'true'
                    const channels = await fetchIPTVChannels(forceRefresh)
                    return channels
                })
                // Get specific channel
                .get("/channels/:id", async ({ params, query }: { params: { id: string }, query: { force_refresh?: string } }) => {
                    const forceRefresh = query.force_refresh === '1' || query.force_refresh === 'true'
                    const channels = await fetchIPTVChannels(forceRefresh)
                    const channel = channels.find(c => c.id === params.id)
                    if (!channel) {
                        return {
                            error: 'Channel not found'
                        }
                    }
                    return channel
                })
                // Get IPTV sources
                .get("/sources", async () => {
                    return sourcesCache.length > 0 ? sourcesCache : getDefaultSources()
                })
                // Add new IPTV source
                .post("/sources", async ({ body }: { body: any }) => {
                    const newSource: IPTVSource = {
                        id: `custom_${Date.now()}`,
                        name: body.name || 'Custom Source',
                        url: body.url,
                        enabled: body.enabled !== false,
                    }

                    // If sourcesCache is empty, initialize with default sources
                    if (sourcesCache.length === 0) {
                        sourcesCache = getDefaultSources()
                    }

                    sourcesCache.push(newSource)
                    return newSource
                })
                // Update IPTV source
                .put("/sources/:id", async ({ params, body }: { params: { id: string }, body: any }) => {
                    // If sourcesCache is empty, initialize with default sources
                    if (sourcesCache.length === 0) {
                        sourcesCache = getDefaultSources()
                    }

                    const source = sourcesCache.find(s => s.id === params.id)
                    if (!source) {
                        return { error: 'Source not found' }
                    }

                    if (body.name) source.name = body.name
                    if (body.url) source.url = body.url
                    if (body.enabled !== undefined) source.enabled = body.enabled

                    return source
                })
                // Delete IPTV source
                .delete("/sources/:id", async ({ params }: { params: { id: string } }) => {
                    // If sourcesCache is empty, initialize with default sources
                    if (sourcesCache.length === 0) {
                        sourcesCache = getDefaultSources()
                    }

                    const index = sourcesCache.findIndex(s => s.id === params.id)
                    if (index === -1) {
                        return { error: 'Source not found' }
                    }

                    const removed = sourcesCache.splice(index, 1)[0]
                    return removed
                })
                // Force refresh channels
                .post("/refresh", async () => {
                    const channels = await fetchIPTVChannels(true)
                    return {
                        success: true,
                        channels_count: channels.length,
                        timestamp: Date.now()
                    }
                })
                // Debug endpoint - check IPTV data status
                .get("/debug", async () => {
                    const sources = sourcesCache.length > 0 ? sourcesCache : getDefaultSources()

                    return {
                        cache_status: {
                            has_cache: !!channelCache,
                            cache_age_ms: channelCache ? Date.now() - channelCache.timestamp : null,
                            channels_count: channelCache?.data.length || 0,
                        },
                        sources: sources.map(s => ({
                            id: s.id,
                            name: s.name,
                            url: s.url,
                            enabled: s.enabled,
                            last_fetch: s.lastFetch ? new Date(s.lastFetch).toISOString() : null,
                        })),
                        timestamp: new Date().toISOString(),
                    }
                })
        )
}
