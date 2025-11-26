import Elysia from "elysia"

interface IPTVChannel {
    id: string
    name: string
    logo?: string
    url: string
    group?: string
}

/**
 * Fetch IPTV channels from Guovin's IPTV API
 * Source: https://github.com/Guovin/iptv-api
 */
async function fetchIPTVChannels(): Promise<IPTVChannel[]> {
    try {
        // Try multiple sources
        const sources = [
            'https://api.iptv.name/all.json',
            'https://raw.githubusercontent.com/Guovin/iptv-api/main/tv.json',
        ]

        for (const source of sources) {
            try {
                const response = await fetch(source, {
                    method: 'GET',
                    headers: { 'User-Agent': 'Rin-IPTV-Player/1.0' }
                })

                if (!response.ok) continue

                const data: any = await response.json()
                const channels = parseIPTVData(data)

                if (channels.length > 0) {
                    console.log(`Successfully fetched ${channels.length} channels from ${source}`)
                    return channels
                }
            } catch (err) {
                console.warn(`Failed to fetch from ${source}:`, err)
                continue
            }
        }

        console.warn('No IPTV channels available from external sources')
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
                .get("/channels", async () => {
                    const channels = await fetchIPTVChannels()
                    return channels
                })
                .get("/channels/:id", async ({ params }) => {
                    const channels = await fetchIPTVChannels()
                    const channel = channels.find(c => c.id === params.id)
                    if (!channel) {
                        return {
                            error: 'Channel not found'
                        }
                    }
                    return channel
                })
        )
}
