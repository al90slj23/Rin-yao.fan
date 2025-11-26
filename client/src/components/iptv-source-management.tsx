import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useAlert, useConfirm } from "./dialog"
import { client } from "../main"
import { headersWithAuth } from "../utils/auth"
import * as Switch from '@radix-ui/react-switch'

interface IPTVSource {
    id: string
    name: string
    url: string
    enabled: boolean
    lastFetch?: number
}

export function IPTVSourceManagement() {
    const { t } = useTranslation()
    const { showAlert, AlertUI } = useAlert()
    const { showConfirm, ConfirmUI } = useConfirm()

    const [sources, setSources] = useState<IPTVSource[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState({ name: '', url: '' })
    const [newSourceForm, setNewSourceForm] = useState({ name: '', url: '' })
    const [showAddForm, setShowAddForm] = useState(false)

    useEffect(() => {
        fetchSources()
    }, [])

    async function fetchSources() {
        try {
            setLoading(true)
            const response = await client.iptv.sources.get()
            if (response.data && typeof response.data !== 'string') {
                setSources(Array.isArray(response.data) ? response.data : [])
            }
        } catch (err: any) {
            showAlert(t('iptv.source_error') + ': ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleAddSource() {
        if (!newSourceForm.name.trim() || !newSourceForm.url.trim()) {
            showAlert(t('iptv.source_error'))
            return
        }

        try {
            await client.iptv.sources.post({
                name: newSourceForm.name,
                url: newSourceForm.url,
                enabled: true
            })
            showAlert(t('iptv.source_added'))
            setNewSourceForm({ name: '', url: '' })
            setShowAddForm(false)
            await fetchSources()
        } catch (err: any) {
            showAlert(t('iptv.source_error') + ': ' + err.message)
        }
    }

    async function handleUpdateSource(sourceId: string) {
        if (!editForm.name.trim() || !editForm.url.trim()) {
            showAlert(t('iptv.source_error'))
            return
        }

        try {
            await client.iptv.sources({ id: sourceId }).put({
                name: editForm.name,
                url: editForm.url
            })
            showAlert(t('iptv.source_updated'))
            setEditingId(null)
            setEditForm({ name: '', url: '' })
            await fetchSources()
        } catch (err: any) {
            showAlert(t('iptv.source_error') + ': ' + err.message)
        }
    }

    async function handleToggleEnabled(sourceId: string, currentEnabled: boolean) {
        try {
            await client.iptv.sources({ id: sourceId }).put({
                enabled: !currentEnabled
            })
            await fetchSources()
        } catch (err: any) {
            showAlert(t('iptv.source_error') + ': ' + err.message)
        }
    }

    async function handleDeleteSource(sourceId: string) {
        showConfirm({
            title: t('iptv.source_delete'),
            message: t('iptv.source_delete_confirm'),
            onConfirm: async () => {
                try {
                    await client.iptv.sources({ id: sourceId }).delete()
                    showAlert(t('iptv.source_deleted'))
                    await fetchSources()
                } catch (err: any) {
                    showAlert(t('iptv.source_error') + ': ' + err.message)
                }
            }
        })
    }

    function formatLastFetch(timestamp?: number): string {
        if (!timestamp) return t('iptv.never')
        return new Date(timestamp).toLocaleString()
    }

    return (
        <div className="flex flex-col space-y-4 w-full">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('iptv.sources')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('iptv.sources_desc')}
                </p>
            </div>

            {/* Add Source Form */}
            <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-theme text-white rounded-lg hover:opacity-90 transition-opacity self-start"
            >
                {showAddForm ? '✕' : '+'} {t('iptv.add_source')}
            </button>

            {showAddForm && (
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('iptv.source_name')}
                            </label>
                            <input
                                type="text"
                                value={newSourceForm.name}
                                onChange={(e) => setNewSourceForm({ ...newSourceForm, name: e.target.value })}
                                placeholder="My IPTV Source"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('iptv.source_url')}
                            </label>
                            <input
                                type="text"
                                value={newSourceForm.url}
                                onChange={(e) => setNewSourceForm({ ...newSourceForm, url: e.target.value })}
                                placeholder={t('iptv.source_url_placeholder')}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddSource}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                                {t('confirm')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddForm(false)
                                    setNewSourceForm({ name: '', url: '' })
                                }}
                                className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition"
                            >
                                {t('cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sources List */}
            {loading ? (
                <div className="text-center text-gray-600 dark:text-gray-400">
                    {t('settings.get_config_failed$message', { message: 'Loading...' })}
                </div>
            ) : sources.length === 0 ? (
                <div className="text-center text-gray-600 dark:text-gray-400">
                    {t('iptv.no_channels')}
                </div>
            ) : (
                <div className="space-y-2">
                    {sources.map((source) => (
                        <div
                            key={source.id}
                            className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
                        >
                            {/* Source Header (Collapsible) */}
                            <button
                                onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {expandedId === source.id ? '▼' : '▶'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                            {source.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {source.url}
                                        </p>
                                    </div>
                                </div>

                                {/* Enable/Disable Switch */}
                                <div className="flex items-center gap-2 ml-2">
                                    <Switch.Root
                                        checked={source.enabled}
                                        onCheckedChange={() => handleToggleEnabled(source.id, source.enabled)}
                                        className="w-11 h-6 bg-gray-300 rounded-full relative outline-none cursor-pointer data-[state=checked]:bg-theme"
                                    >
                                        <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform will-change-transform data-[state=checked]:translate-x-5" />
                                    </Switch.Root>
                                </div>
                            </button>

                            {/* Source Details (Expanded) */}
                            {expandedId === source.id && (
                                <div className="px-4 py-3 border-t border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 space-y-3">
                                    {editingId === source.id ? (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('iptv.source_name')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-600 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t('iptv.source_url')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={editForm.url}
                                                    onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-600 dark:text-white"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleUpdateSource(source.id)}
                                                    className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                                                >
                                                    {t('update.title')}
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="px-3 py-2 bg-gray-400 text-white text-sm rounded-lg hover:bg-gray-500 transition"
                                                >
                                                    {t('cancel')}
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    {t('iptv.source_last_fetch')}:
                                                </span>
                                                <span className="ml-2 text-gray-900 dark:text-white">
                                                    {formatLastFetch(source.lastFetch)}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingId(source.id)
                                                        setEditForm({ name: source.name, url: source.url })
                                                    }}
                                                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                                                >
                                                    {t('iptv.source_edit')}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSource(source.id)}
                                                    className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                                                >
                                                    {t('iptv.source_delete')}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <AlertUI />
            <ConfirmUI />
        </div>
    )
}
