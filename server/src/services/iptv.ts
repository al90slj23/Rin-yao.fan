import Elysia from "elysia"
import type { DB } from "../_worker"
import { iptvSources } from "../db/schema"
import { getDB } from "../utils/di"
import { eq } from "drizzle-orm"

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
        const dbSources = await db.query.iptvSources.findMany()
        const sources: IPTVSource[] = dbSources.map((s: any) => ({
            id: s.id,
            name: s.name,
            url: s.url,
            enabled: s.enabled === 1,
            lastFetch: s.lastFetch
        }))

        const enabledSources = sources.filter(s => s.enabled)
        if (enabledSources.length === 0) {
            // Fallback to demo if no sources enabled
            return getDemoChannels()
        }

        for (const source of enabledSources) {
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

                    // Try to parse as text first (for M3U format), then fall back to JSON
                    const contentType = response.headers.get('content-type') || ''
                    let data: any

                    if (contentType.includes('application/json')) {
                        data = await response.json()
                    } else {
                        // Default to text parsing (handles M3U and other text formats)
                        data = await response.text()
                    }
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
                    await db.update(iptvSources)
                        .set({ lastFetch: Math.floor(Date.now() / 1000) })
                        .where(eq(iptvSources.id, source.id))

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
        if (typeof data === 'string') {
            // M3U format parsing
            const lines = data.split('\n')
            let currentGroup = 'Other'
            let channelIndex = 0

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim()

                if (line.startsWith('#EXTINF:')) {
                    const extinf = line
                    // Extract tvg-name, tvg-logo, and group-title from EXTINF line
                    const tvgNameMatch = extinf.match(/tvg-name="([^"]*)"/)
                    const tvgLogoMatch = extinf.match(/tvg-logo="([^"]*)"/)
                    const groupMatch = extinf.match(/group-title="([^"]*)"/)

                    // Get the channel name (after the last comma)
                    const commaIndex = extinf.lastIndexOf(',')
                    const channelName = commaIndex !== -1 ? extinf.substring(commaIndex + 1).trim() : ''

                    // Get the URL from the next line
                    if (i + 1 < lines.length) {
                        const url = lines[i + 1].trim()
                        if (url && !url.startsWith('#') && url.length > 0) {
                            const name = tvgNameMatch ? tvgNameMatch[1] : channelName
                            const group = groupMatch ? groupMatch[1] : currentGroup
                            const logo = tvgLogoMatch ? tvgLogoMatch[1] : undefined

                            if (name && url) {
                                channels.push({
                                    id: `m3u_${channelIndex}`,
                                    name: name,
                                    logo: logo,
                                    url: url,
                                    group: group
                                })
                                channelIndex++
                            }
                        }
                    }
                }
            }
        } else if (Array.isArray(data)) {
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
        .get('/iptv/channels', async ({ query }: { query: { force_refresh?: string } }) => {
            const forceRefresh = query.force_refresh === '1' || query.force_refresh === 'true'
            const channels = await fetchIPTVChannels(db, forceRefresh)
            return channels
        })
        .get('/iptv/channels/:id', async ({ params, query }: { params: { id: string }, query: { force_refresh?: string } }) => {
            const forceRefresh = query.force_refresh === '1' || query.force_refresh === 'true'
            const channels = await fetchIPTVChannels(db, forceRefresh)
            const channel = channels.find(c => c.id === params.id)
            if (!channel) {
                return { error: 'Channel not found' }
            }
            return channel
        })
        .get('/iptv/sources', async () => {
            const sources = await db.query.iptvSources.findMany()
            return sources.map((row: any) => ({
                id: row.id,
                name: row.name,
                url: row.url,
                enabled: row.enabled === 1,
                lastFetch: row.lastFetch
            }))
        })
        .post('/iptv/sources', async ({ body }: { body: any }) => {
            const newSource = {
                id: `custom_${Date.now()}`,
                name: body.name || 'Custom Source',
                url: body.url,
                enabled: body.enabled !== false ? 1 : 0,
            }

            await db.insert(iptvSources).values(newSource)

            return {
                id: newSource.id,
                name: newSource.name,
                url: newSource.url,
                enabled: newSource.enabled === 1,
            }
        })
        .put('/iptv/sources/:id', async ({ params, body }: { params: { id: string }, body: any }) => {
            const sourceRow = await db.query.iptvSources.findFirst({ where: eq(iptvSources.id, params.id) })

            if (!sourceRow) {
                return { error: 'Source not found' }
            }

            const updates: any = {}
            if (body.name !== undefined) updates.name = body.name
            if (body.url !== undefined) updates.url = body.url
            if (body.enabled !== undefined) updates.enabled = body.enabled ? 1 : 0

            if (Object.keys(updates).length > 0) {
                await db.update(iptvSources).set(updates).where(eq(iptvSources.id, params.id))
            }

            return {
                id: params.id,
                name: updates.name || sourceRow.name,
                url: updates.url || sourceRow.url,
                enabled: updates.enabled !== undefined ? updates.enabled === 1 : sourceRow.enabled === 1,
                lastFetch: sourceRow.lastFetch
            }
        })
        .delete('/iptv/sources/:id', async ({ params }: { params: { id: string } }) => {
            const sourceRow = await db.query.iptvSources.findFirst({ where: eq(iptvSources.id, params.id) })

            if (!sourceRow) {
                return { error: 'Source not found' }
            }

            await db.delete(iptvSources).where(eq(iptvSources.id, params.id))

            return {
                id: sourceRow.id,
                name: sourceRow.name,
                url: sourceRow.url,
                enabled: sourceRow.enabled === 1,
                lastFetch: sourceRow.lastFetch
            }
        })
        .post('/iptv/refresh', async () => {
            const channels = await fetchIPTVChannels(db, true)
            return {
                success: true,
                channels_count: channels.length,
                timestamp: Date.now()
            }
        })
        .get('/iptv/debug', async () => {
            const sources = await db.query.iptvSources.findMany()
            const sourcesList = sources.map((row: any) => ({
                id: row.id,
                name: row.name,
                url: row.url,
                enabled: row.enabled === 1,
                last_fetch: row.lastFetch ? new Date(row.lastFetch * 1000).toISOString() : null,
            }))

            return {
                cache_status: {
                    has_cache: !!channelCache,
                    cache_age_ms: channelCache ? Date.now() - channelCache.timestamp : null,
                    channels_count: channelCache?.data.length || 0,
                },
                sources: sourcesList,
                timestamp: new Date().toISOString(),
            }
        })
        .get('/iptv/video-proxy', async ({ query, headers, request }: { query: any, headers: any, request: Request }) => {
            const videoUrl = query?.url
            if (!videoUrl) {
                return new Response('Video URL is required', { status: 400 })
            }

            try {
                // Decode the URL if it's encoded, otherwise use as-is
                let decodedUrl = videoUrl
                try {
                    decodedUrl = decodeURIComponent(videoUrl)
                } catch {
                    // If decode fails, use original URL
                }

                // Build request headers that mimic a real browser
                const fetchHeaders: Record<string, string> = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Encoding': 'gzip, deflate',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                }

                // Pass through Range header if present (for streaming support)
                if (headers['range']) {
                    fetchHeaders['Range'] = headers['range']
                }

                const response = await fetch(decodedUrl, {
                    method: 'GET',
                    headers: fetchHeaders
                })

                if (!response.ok) {
                    console.error(`Proxy fetch failed: ${response.status} for URL: ${decodedUrl}`)
                    return new Response('Failed to fetch video', { status: response.status })
                }

                // Get the content type from the original response
                const contentType = response.headers.get('content-type') || 'video/mp2t'

                let responseBody: any = await response.arrayBuffer()

                // Check if this is an M3U8/M3U playlist file
                // First check by content-type and file extension
                let isM3U8 = contentType.includes('application/vnd.apple.mpegurl') ||
                            contentType.includes('application/x-mpegURL') ||
                            decodedUrl.toLowerCase().endsWith('.m3u8') ||
                            decodedUrl.toLowerCase().endsWith('.m3u')

                // If not detected yet, check content for M3U8 markers
                if (!isM3U8 && contentType.includes('text/plain')) {
                    try {
                        const text = new TextDecoder().decode(responseBody.slice(0, 100))
                        isM3U8 = text.trim().startsWith('#EXTM3U') || text.includes('#EXT-X-VERSION')
                    } catch (err) {
                        // Ignore decoding errors
                    }
                }

                // If it's an M3U8 file, parse and rewrite URLs
                if (isM3U8) {
                    try {
                        const text = new TextDecoder().decode(responseBody)
                        const rewrittenM3U8 = rewriteM3U8Playlist(text, decodedUrl, request)
                        responseBody = new TextEncoder().encode(rewrittenM3U8)
                        console.log('🔄 Rewritten M3U8 playlist for:', decodedUrl)
                    } catch (err) {
                        console.warn('Failed to parse M3U8, serving raw:', err)
                        // If parsing fails, serve as-is
                    }
                }

                // Return appropriate headers for video streaming
                // Note: CORS headers are handled by global CORS plugin
                const responseHeaders: Record<string, string> = {
                    'Content-Type': isM3U8 ? 'application/vnd.apple.mpegurl' : contentType,
                    'Accept-Ranges': 'bytes'
                }

                // Update content-length for rewritten M3U8
                if (typeof responseBody === 'object' && responseBody instanceof ArrayBuffer) {
                    responseHeaders['Content-Length'] = responseBody.byteLength.toString()
                } else if (response.headers.has('content-length') && !isM3U8) {
                    responseHeaders['Content-Length'] = response.headers.get('content-length')!
                }

                return new Response(responseBody, {
                    status: 200,
                    headers: responseHeaders
                })
            } catch (err: unknown) {
                console.error('Error proxying video:', err)
                return new Response('Error fetching video', { status: 500 })
            }
        })

        /**
         * Rewrite M3U8 playlist URLs to route through proxy
         */
        function rewriteM3U8Playlist(content: string, baseUrl: string, request: Request): string {
            const lines = content.split('\n')
            const rewritten: string[] = []

            // Get the base domain of the original URL for resolving relative paths
            const urlObj = new URL(baseUrl)
            const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1)

            // Get the proxy base URL from the request
            const proxyHost = request.headers.get('origin') || new URL(request.url).origin
            const proxyBase = `${proxyHost}/iptv/video-proxy`

            for (const line of lines) {
                const trimmed = line.trim()

                // Check if this line is a URL (not a comment, not empty, not a directive)
                if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('EXT')) {
                    try {
                        // Determine if URL is relative or absolute
                        let absoluteUrl = trimmed

                        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('//')) {
                            // Relative URL - resolve against base directory
                            absoluteUrl = new URL(trimmed, baseDir).toString()
                        } else if (trimmed.startsWith('//')) {
                            // Protocol-relative URL
                            absoluteUrl = urlObj.protocol + trimmed
                        }

                        // Rewrite to use proxy
                        const proxyUrl = `${proxyBase}?url=${encodeURIComponent(absoluteUrl)}`
                        rewritten.push(proxyUrl)
                    } catch (err) {
                        console.warn('Failed to rewrite URL:', trimmed, err)
                        rewritten.push(line) // Keep original on error
                    }
                } else {
                    // Keep comments and directives as-is
                    rewritten.push(line)
                }
            }

            return rewritten.join('\n')
        }
}
