import Elysia from "elysia"
import { DB } from '../utils/db'
import { getDB } from '../utils/di'

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
    ]
}

/**
 * Initialize default sources in database if they don't exist
 */
async function initializeDefaultSources(db: DB) {
    try {
        // Check if sources table is empty
        const result = await db.prepare('SELECT COUNT(*) as count FROM iptv_sources').first<{ count: number }>()
        if (result?.count === 0) {
            // Insert default sources
            const defaults = getDefaultSources()
            for (const source of defaults) {
                await db.prepare(
                    'INSERT INTO iptv_sources (id, name, url, enabled) VALUES (?, ?, ?, ?)'
                ).bind(source.id, source.name, source.url, source.enabled ? 1 : 0).run()
            }
        }
    } catch (err) {
        console.warn('Failed to initialize default sources:', err)
    }
}

/**
 * Fetch IPTV channels with caching
 */
async function fetchIPTVChannels(db: DB, forceRefresh = false): Promise<IPTVChannel[]> {
    try {
        // Return cached data if available and not forcing refresh
        if (!forceRefresh && channelCache && Date.now() - channelCache.timestamp < CACHE_TTL) {
            console.log('Returning cached IPTV channels')
            return channelCache.data
        }

        // Get sources from database
        const sourcesRows = await db.prepare('SELECT * FROM iptv_sources WHERE enabled = 1').all<any>()
        const sources: IPTVSource[] = (sourcesRows.results || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            url: row.url,
            enabled: row.enabled === 1,
            lastFetch: row.lastFetch
        }))

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

                    // Update source last fetch time in database
                    await db.prepare('UPDATE iptv_sources SET lastFetch = ? WHERE id = ?')
                        .bind(Date.now(), source.id).run()

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
    const db: DB = getDB()
    return new Elysia({ aot: false })
        .onStart(async () => {
            // Initialize default sources on startup
            await initializeDefaultSources(db)
        })
        .group('/iptv', (group) =>
            group
                // Get channels with optional force refresh
                .get("/channels", async ({ query }: { query: { force_refresh?: string } }) => {
                    const forceRefresh = query.force_refresh === '1' || query.force_refresh === 'true'
                    const channels = await fetchIPTVChannels(db, forceRefresh)
                    return channels
                })
                // Get specific channel
                .get("/channels/:id", async ({ params, query }: { params: { id: string }, query: { force_refresh?: string } }) => {
                    const forceRefresh = query.force_refresh === '1' || query.force_refresh === 'true'
                    const channels = await fetchIPTVChannels(db, forceRefresh)
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
                    const sourcesRows = await db.prepare('SELECT * FROM iptv_sources ORDER BY createdAt DESC').all<any>()
                    return (sourcesRows.results || []).map((row: any) => ({
                        id: row.id,
                        name: row.name,
                        url: row.url,
                        enabled: row.enabled === 1,
                        lastFetch: row.lastFetch
                    }))
                })
                // Add new IPTV source
                .post("/sources", async ({ body }: { body: any }) => {
                    const newSource: IPTVSource = {
                        id: `custom_${Date.now()}`,
                        name: body.name || 'Custom Source',
                        url: body.url,
                        enabled: body.enabled !== false,
                    }

                    await db.prepare(
                        'INSERT INTO iptv_sources (id, name, url, enabled) VALUES (?, ?, ?, ?)'
                    ).bind(newSource.id, newSource.name, newSource.url, newSource.enabled ? 1 : 0).run()

                    return newSource
                })
                // Update IPTV source
                .put("/sources/:id", async ({ params, body }: { params: { id: string }, body: any }) => {
                    const sourceRow = await db.prepare('SELECT * FROM iptv_sources WHERE id = ?').bind(params.id).first<any>()

                    if (!sourceRow) {
                        return { error: 'Source not found' }
                    }

                    const updates: { [key: string]: any } = {}
                    if (body.name) updates.name = body.name
                    if (body.url) updates.url = body.url
                    if (body.enabled !== undefined) updates.enabled = body.enabled ? 1 : 0

                    if (Object.keys(updates).length > 0) {
                        const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ')
                        const values = Object.values(updates)
                        values.push(params.id)

                        await db.prepare(`UPDATE iptv_sources SET ${setClause} WHERE id = ?`).bind(...values).run()
                    }

                    return {
                        id: params.id,
                        name: updates.name || sourceRow.name,
                        url: updates.url || sourceRow.url,
                        enabled: updates.enabled !== undefined ? updates.enabled === 1 : sourceRow.enabled === 1,
                        lastFetch: sourceRow.lastFetch
                    }
                })
                // Delete IPTV source
                .delete("/sources/:id", async ({ params }: { params: { id: string } }) => {
                    const sourceRow = await db.prepare('SELECT * FROM iptv_sources WHERE id = ?').bind(params.id).first<any>()

                    if (!sourceRow) {
                        return { error: 'Source not found' }
                    }

                    await db.prepare('DELETE FROM iptv_sources WHERE id = ?').bind(params.id).run()

                    return {
                        id: sourceRow.id,
                        name: sourceRow.name,
                        url: sourceRow.url,
                        enabled: sourceRow.enabled === 1,
                        lastFetch: sourceRow.lastFetch
                    }
                })
                // Force refresh channels
                .post("/refresh", async () => {
                    const channels = await fetchIPTVChannels(db, true)
                    return {
                        success: true,
                        channels_count: channels.length,
                        timestamp: Date.now()
                    }
                })
                // Debug endpoint - check IPTV data status
                .get("/debug", async () => {
                    const sourcesRows = await db.prepare('SELECT * FROM iptv_sources').all<any>()
                    const sources = (sourcesRows.results || []).map((row: any) => ({
                        id: row.id,
                        name: row.name,
                        url: row.url,
                        enabled: row.enabled === 1,
                        last_fetch: row.lastFetch ? new Date(row.lastFetch).toISOString() : null,
                    }))

                    return {
                        cache_status: {
                            has_cache: !!channelCache,
                            cache_age_ms: channelCache ? Date.now() - channelCache.timestamp : null,
                            channels_count: channelCache?.data.length || 0,
                        },
                        sources,
                        timestamp: new Date().toISOString(),
                    }
                })
                // Video proxy endpoint - bypasses CORS restrictions
                .get("/video-proxy", async ({ query }) => {
                    const videoUrl = (query as any)?.url
                    if (!videoUrl) {
                        return new Response('Video URL is required', { status: 400 })
                    }

                    try {
                        // Decode the URL if it's base64 encoded, otherwise use as-is
                        let decodedUrl = videoUrl
                        try {
                            decodedUrl = decodeURIComponent(videoUrl)
                        } catch {
                            // If decode fails, use original URL
                        }

                        const response = await fetch(decodedUrl, {
                            method: 'GET',
                            headers: {
                                'User-Agent': 'Rin-IPTV-Player/1.0'
                            }
                        })

                        if (!response.ok) {
                            return new Response('Failed to fetch video', { status: response.status })
                        }

                        // Get the content type from the original response
                        const contentType = response.headers.get('content-type') || 'video/mp2t'
                        const buffer = await response.arrayBuffer()

                        return new Response(buffer, {
                            status: 200,
                            headers: {
                                'Content-Type': contentType,
                                'Access-Control-Allow-Origin': '*',
                                'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                                'Access-Control-Allow-Headers': 'Content-Type, Range',
                                'Accept-Ranges': 'bytes'
                            }
                        })
                    } catch (err) {
                        console.error('Error proxying video:', err)
                        return new Response('Error fetching video', { status: 500 })
                    }
                })
        )
}
