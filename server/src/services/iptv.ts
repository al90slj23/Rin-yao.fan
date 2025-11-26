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
        // Fetch from Guovin's IPTV API
        const response = await fetch('https://api.iptv.name/all.json')
        if (!response.ok) {
            throw new Error(`Failed to fetch IPTV channels: ${response.statusText}`)
        }

        const data: any = await response.json()

        // Transform the data to our format
        const channels: IPTVChannel[] = []

        if (Array.isArray(data)) {
            data.forEach((group: any) => {
                if (group.channels && Array.isArray(group.channels)) {
                    group.channels.forEach((channel: any, index: number) => {
                        channels.push({
                            id: `${group.name}_${index}`,
                            name: channel.name || 'Unknown',
                            logo: channel.logo || undefined,
                            url: channel.url || '',
                            group: group.name || 'Other'
                        })
                    })
                }
            })
        }

        return channels
    } catch (error) {
        console.error('Error fetching IPTV channels:', error)
        return []
    }
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
