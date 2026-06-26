import { useState, useEffect, useCallback } from 'react'
import { ViewerTimeline, TopChannelsChart, TopClientsChart, WeeklyConnections } from './components/Charts'
import { ToastContainer, showToast } from './components/Toast'
import Login from './components/Login'
import GeoMap from './components/GeoMap'

const API = '/api'

const FLAGS = {
    MA: '🇲🇦', FR: '🇫🇷', US: '🇺🇸', GB: '🇬🇧', DE: '🇩🇪', ES: '🇪🇸',
    IT: '🇮🇹', PT: '🇵🇹', NL: '🇳🇱', BE: '🇧🇪', CA: '🇨🇦', SA: '🇸🇦',
    AE: '🇦🇪', EG: '🇪🇬', TN: '🇹🇳', DZ: '🇩🇿', LY: '🇱🇾', IQ: '🇮🇶',
    QA: '🇶🇦', KW: '🇰🇼', BH: '🇧🇭', OM: '🇴🇲', JO: '🇯🇴', LB: '🇱🇧',
    TR: '🇹🇷', PK: '🇵🇰', IN: '🇮🇳', BD: '🇧🇩', ID: '🇮🇩', MY: '🇲🇾',
    TH: '🇹🇭', PH: '🇵🇭', VN: '🇻🇳', KR: '🇰🇷', JP: '🇯🇵', CN: '🇨🇳',
    RU: '🇷🇺', UA: '🇺🇸', PL: '🇵🇱', CZ: '🇨🇿', RO: '🇷🇴', HU: '🇭🇺',
    SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰', FI: '🇫🇮', IE: '🇮🇪', AU: '🇦🇺',
    NZ: '🇳🇿', BR: '🇧🇷', AR: '🇦🇷', MX: '🇲🇽', CO: '🇨🇴', CL: '🇨🇱',
    PE: '🇵🇪', ZA: '🇿🇦', NG: '🇳🇬', KE: '🇰🇪', GH: '🇬🇭', XX: '🌍',
}

function timeAgo(dateStr) {
    if (!dateStr) return '—'
    const d = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (d < 60) return `${d}s`
    if (d < 3600) return `${Math.floor(d / 60)}m`
    if (d < 86400) return `${Math.floor(d / 3600)}h`
    return `${Math.floor(d / 86400)}j`
}

function fmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
    return String(n)
}

function formatBytes(bytes) {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const EVENT_ICONS = {
    channel_start: '▶️', channel_stop: '⏹️',
    client_connect: '🔌', client_disconnect: '❌',
    login_success: '🔑', login_failed: '🚫',
    channel_error: '⚠️', channel_reconnect: '🔄',
    m3u_refresh: '📡', epg_refresh: '📺',
    stream_switch: '🔀', channel_failover: '⚡',
    recording_start: '⏺️', recording_end: '⏹️',
    m3u_blocked: '🚫', epg_blocked: '🚫',
    vod_start: '🎬', vod_stop: '⏹️',
}

const EVENT_TYPES = Object.keys(EVENT_ICONS)

export default function App() {
    const [summary, setSummary] = useState(null)
    const [channels, setChannels] = useState([])
    const [events, setEvents] = useState([])
    const [eventsByType, setEventsByType] = useState([])
    const [knownClients, setKnownClients] = useState([])
    const [activeClients, setActiveClients] = useState([])
    const [clientStats, setClientStats] = useState(null)
    const [m3u, setM3u] = useState([])
    const [loading, setLoading] = useState(true)
    const [hourlyTimeline, setHourlyTimeline] = useState([])
    const [weeklyTimeline, setWeeklyTimeline] = useState([])
    const [topChannels, setTopChannels] = useState([])
    const [topClients, setTopClients] = useState([])
    const [systemInfo, setSystemInfo] = useState(null)
    const [activeTab, setActiveTab] = useState('clients')
    const [search, setSearch] = useState('')
    const [eventFilter, setEventFilter] = useState({ type: '', dateFrom: '', dateTo: '' })
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
    const [user, setUser] = useState(null)
    const [settings, setSettings] = useState({})
    const [telegramTest, setTelegramTest] = useState(null)
    const [telegramSaving, setTelegramSaving] = useState(false)
    const [backups, setBackups] = useState([])
    const [settingsTab, setSettingsTab] = useState('general')
    const [version, setVersion] = useState(null)
    const [updateInfo, setUpdateInfo] = useState(null)
    const [showUpdateNotif, setShowUpdateNotif] = useState(false)
    const [showUpdateModal, setShowUpdateModal] = useState(false)
    const [updateLogs, setUpdateLogs] = useState([])
    const [updateRunning, setUpdateRunning] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            const [sumRes, chRes, evRes, typeRes, kcRes, acRes, csRes, m3uRes, settingsRes, backupsRes, versionRes, tlRes, twRes, tcRes, tclRes] = await Promise.allSettled([
                fetch(`${API}/stats/summary`).then(r => r.json()),
                fetch(`${API}/stats/channels`).then(r => r.json()),
                fetch(`${API}/stats/events`).then(r => r.json()),
                fetch(`${API}/stats/events/by-type`).then(r => r.json()),
                fetch(`${API}/clients`).then(r => r.json()),
                fetch(`${API}/clients/active`).then(r => r.json()),
                fetch(`${API}/clients/stats`).then(r => r.json()),
                fetch(`${API}/stats/m3u`).then(r => r.json()),
                fetch(`${API}/settings`).then(r => r.json()),
                fetch(`${API}/backups`).then(r => r.json()),
                fetch(`${API}/version`).then(r => r.json()),
                fetch(`${API}/stats/timeline/hourly`).then(r => r.json()),
                fetch(`${API}/stats/timeline/weekly`).then(r => r.json()),
                fetch(`${API}/stats/top/channels`).then(r => r.json()),
                fetch(`${API}/stats/top/clients`).then(r => r.json()),
            ])

            if (sumRes.status === 'fulfilled') setSummary(sumRes.value)
            if (chRes.status === 'fulfilled') setChannels(chRes.value)
            if (evRes.status === 'fulfilled') setEvents(evRes.value)
            if (typeRes.status === 'fulfilled') setEventsByType(typeRes.value)
            if (kcRes.status === 'fulfilled') setKnownClients(kcRes.value)
            if (acRes.status === 'fulfilled') {
                const newActive = acRes.value
                if (activeClients.length > 0 && newActive.length > activeClients.length) {
                    const diff = newActive.length - activeClients.length
                    showToast(`${diff} nouveau(x) client(s) connecté(s)`, 'success')
                }
                if (activeClients.length > 0 && newActive.length < activeClients.length) {
                    const diff = activeClients.length - newActive.length
                    showToast(`${diff} client(s) déconnecté(s)`, 'info')
                }
                setActiveClients(newActive)
            }
            if (csRes.status === 'fulfilled') setClientStats(csRes.value)
            if (m3uRes.status === 'fulfilled') setM3u(m3uRes.value)
            if (settingsRes.status === 'fulfilled') setSettings(settingsRes.value)
            if (backupsRes.status === 'fulfilled') setBackups(backupsRes.value)
            if (versionRes.status === 'fulfilled') setVersion(versionRes.value)
            if (tlRes.status === 'fulfilled') setHourlyTimeline(tlRes.value)
            if (twRes.status === 'fulfilled') setWeeklyTimeline(twRes.value)
            if (tcRes.status === 'fulfilled') setTopChannels(tcRes.value)
            if (tclRes.status === 'fulfilled') setTopClients(tclRes.value)

            // System info (separate call, less frequent)
            try {
                const sysRes = await fetch(`${API}/system`).then(r => r.json())
                setSystemInfo(sysRes)
            } catch (e) {}
        } catch (e) {
            console.error('Fetch error:', e)
        } finally {
            setLoading(false)
        }

        // Check for updates (en arrière-plan, pas bloquant)
        try {
            const res = await fetch(`${API}/version/check`)
            const data = await res.json()
            if (data.update_available) {
                setUpdateInfo(data)
                setShowUpdateNotif(true)
                // Auto-masquer après 10 secondes
                setTimeout(() => setShowUpdateNotif(false), 10000)
            }
        } catch (e) {}
    }, [])

    useEffect(() => {
        if (!user) return
        fetchData()
        const timer = setInterval(fetchData, 10000)
        return () => clearInterval(timer)
    }, [fetchData, user])

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    // Check auth on mount
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (token) {
            fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                    if (data) setUser(data)
                    else localStorage.removeItem('token')
                })
                .catch(() => localStorage.removeItem('token'))
                .finally(() => setLoading(false))
        } else {
            setLoading(false)
        }
    }, [])

    const fetchBackups = async () => {
        try {
            const res = await fetch(`${API}/backups`)
            const data = await res.json()
            setBackups(data)
        } catch (e) {}
    }

    const filteredClients = knownClients.filter(c =>
        !search ||
        c.client_ip?.toLowerCase().includes(search.toLowerCase()) ||
        c.username?.toLowerCase().includes(search.toLowerCase()) ||
        c.country?.toLowerCase().includes(search.toLowerCase())
    )

    const filteredActive = activeClients.filter(c =>
        !search ||
        c.client_ip?.toLowerCase().includes(search.toLowerCase()) ||
        c.username?.toLowerCase().includes(search.toLowerCase()) ||
        c.channel_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.country?.toLowerCase().includes(search.toLowerCase())
    )

    const filteredChannels = channels.filter(ch =>
        !search ||
        ch.name?.toLowerCase().includes(search.toLowerCase()) ||
        ch.group_name?.toLowerCase().includes(search.toLowerCase())
    )

    const filteredEvents = events.filter(ev => {
        if (search) {
            const s = search.toLowerCase()
            if (!ev.event_type?.toLowerCase().includes(s) &&
                !ev.channel_name?.toLowerCase().includes(s) &&
                !ev.client_ip?.toLowerCase().includes(s) &&
                !ev.username?.toLowerCase().includes(s) &&
                !ev.country?.toLowerCase().includes(s)) return false
        }
        if (eventFilter.type && ev.event_type !== eventFilter.type) return false
        if (eventFilter.dateFrom && new Date(ev.created_at) < new Date(eventFilter.dateFrom)) return false
        if (eventFilter.dateTo && new Date(ev.created_at) > new Date(eventFilter.dateTo + 'T23:59:59')) return false
        return true
    })

    if (loading) {
        return (
            <div style={{ padding: 48, textAlign: 'center' }}>
                <div className="spinner" />
                <p style={{ marginTop: 12, color: 'var(--t2)' }}>Chargement...</p>
            </div>
        )
    }

    if (!user) {
        return <Login onLogin={setUser} />
    }

    return (
        <>
            <ToastContainer />
            <div className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h1>📊 <span>DispatchMon</span></h1>
                    <div className="badge on"><div className="dot" /><span>Connecté</span></div>
                    {version && (
                        <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 10,
                            background: 'var(--bg2)', border: '1px solid var(--border)',
                            color: 'var(--t3)'
                        }}>
                            v{version.version}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                        👤 {user.name}
                    </span>
                    <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                        color: 'var(--t2)', padding: '6px 10px', borderRadius: 6,
                        cursor: 'pointer', fontSize: 14
                    }}>
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--t3)' }}>Auto-refresh: 10s</span>
                    <button className="btn" onClick={fetchData} style={{
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                        color: 'var(--t2)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13
                    }}>🔄</button>
                    <button onClick={() => {
                        localStorage.removeItem('token')
                        setUser(null)
                    }} style={{
                        background: 'rgba(248,81,73,0.15)', border: '1px solid rgba(248,81,73,0.3)',
                        color: 'var(--red)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13
                    }}>⏻</button>
                </div>
            </div>

            {/* Notification mise à jour */}
            {showUpdateNotif && updateInfo && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(147,51,234,0.15))',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: 8, padding: '12px 20px', margin: '0 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>🚀</span>
                        <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>
                                Nouvelle version disponible !
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--t3)', marginLeft: 8 }}>
                                v{updateInfo.current} → v{updateInfo.latest}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {updateInfo.url && (
                            <a
                                href={updateInfo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    background: 'var(--blue)', color: '#fff', border: 'none',
                                    padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                                    fontSize: 12, fontWeight: 600, textDecoration: 'none'
                                }}
                            >
                                📥 Voir
                            </a>
                        )}
                        <button
                            onClick={() => setShowUpdateNotif(false)}
                            style={{
                                background: 'transparent', border: 'none',
                                color: 'var(--t3)', cursor: 'pointer', fontSize: 16, padding: 4
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            <div className="main">
                {/* Summary Cards */}
                {summary && (
                    <div className="stats-grid">
                        <div className="card">
                            <div className="lbl">Chaînes</div>
                            <div className="val" style={{ color: 'var(--blue)' }}>{summary.total_channels}</div>
                            <div className="sub">{summary.active_channels} actives</div>
                        </div>
                        <div className="card">
                            <div className="lbl">Viewers actifs</div>
                            <div className="val" style={{ color: 'var(--green)' }}>{summary.total_viewers}</div>
                            <div className="sub">maintenant</div>
                        </div>

                        <div className="card">
                            <div className="lbl">Événements (24h)</div>
                            <div className="val" style={{ color: 'var(--orange)' }}>{summary.events_24h}</div>
                            <div className="sub">{summary.total_events} total</div>
                        </div>
                    </div>
                )}

                {/* Charts */}
                {hourlyTimeline.length > 0 && (
                    <div className="sec" style={{ marginBottom: 24 }}>
                        <div className="sec-hdr"><h2>📈 Viewers (24h)</h2></div>
                        <div style={{ padding: 16, height: 250 }}>
                            <ViewerTimeline data={hourlyTimeline} />
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                    {topChannels.length > 0 && (
                        <div className="sec">
                            <div className="sec-hdr"><h2>🏆 Top Chaînes (7j)</h2></div>
                            <div style={{ padding: 16, height: 280 }}>
                                <TopChannelsChart data={topChannels} />
                            </div>
                        </div>
                    )}
                    {topClients.length > 0 && (
                        <div className="sec">
                            <div className="sec-hdr"><h2>👤 Top Clients</h2></div>
                            <div style={{ padding: 16, height: 280 }}>
                                <TopClientsChart data={topClients} />
                            </div>
                        </div>
                    )}
                </div>

                {weeklyTimeline.length > 0 && (
                    <div className="sec" style={{ marginBottom: 24 }}>
                        <div className="sec-hdr"><h2>📊 Connexions (7 jours)</h2></div>
                        <div style={{ padding: 16, height: 250 }}>
                            <WeeklyConnections data={weeklyTimeline} />
                        </div>
                    </div>
                )}

                {systemInfo && (
                    <div className="sec" style={{ marginBottom: 24 }}>
                        <div className="sec-hdr"><h2>🖥️ Système</h2></div>
                        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                            <div className="card">
                                <div className="lbl">CPU Load</div>
                                <div className="val" style={{ fontSize: 20, color: 'var(--blue)' }}>{systemInfo.cpu?.load_1m}</div>
                                <div className="sub">1m / {systemInfo.cpu?.load_5m} / {systemInfo.cpu?.load_15m}</div>
                            </div>
                            <div className="card">
                                <div className="lbl">Disque</div>
                                <div className="val" style={{ fontSize: 20, color: systemInfo.disk?.percent > 80 ? 'var(--red)' : 'var(--green)' }}>
                                    {systemInfo.disk?.percent}%
                                </div>
                                <div className="sub">{systemInfo.disk?.used_human} / {systemInfo.disk?.total_human}</div>
                                <div style={{ height: 4, background: 'var(--bg2)', borderRadius: 2, marginTop: 6 }}>
                                    <div style={{
                                        height: '100%', borderRadius: 2,
                                        width: `${systemInfo.disk?.percent}%`,
                                        background: systemInfo.disk?.percent > 80 ? 'var(--red)' : 'var(--blue)'
                                    }} />
                                </div>
                            </div>
                            <div className="card">
                                <div className="lbl">Mémoire</div>
                                <div className="val" style={{ fontSize: 20, color: systemInfo.memory?.percent > 80 ? 'var(--red)' : 'var(--purple)' }}>
                                    {systemInfo.memory?.percent}%
                                </div>
                                <div className="sub">{systemInfo.memory?.used_human} / {systemInfo.memory?.total_human}</div>
                                <div style={{ height: 4, background: 'var(--bg2)', borderRadius: 2, marginTop: 6 }}>
                                    <div style={{
                                        height: '100%', borderRadius: 2,
                                        width: `${systemInfo.memory?.percent}%`,
                                        background: systemInfo.memory?.percent > 80 ? 'var(--red)' : 'var(--purple)'
                                    }} />
                                </div>
                            </div>
                            <div className="card">
                                <div className="lbl">Versions</div>
                                <div style={{ fontSize: 13, marginTop: 4 }}>
                                    <div>PHP <strong>{systemInfo.php}</strong></div>
                                    <div>Laravel <strong>{systemInfo.laravel}</strong></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {knownClients.length > 0 && (
                    <div className="sec" style={{ marginBottom: 24 }}>
                        <div className="sec-hdr"><h2>🌍 Clients par pays</h2></div>
                        <div style={{ padding: 16 }}>
                            <GeoMap clients={knownClients} />
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="sec">
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg1)' }}>
                        {[
                            { id: 'clients', label: '👥 Clients', count: knownClients.length },
                            { id: 'active', label: '🟢 Actifs', count: activeClients.length },
                            { id: 'channels', label: '📺 Chaînes', count: channels.length },
                            { id: 'events', label: '📝 Événements', count: events.length },
                            { id: 'settings', label: '⚙️ Paramètres' },
                        ].map(tab => (
                            <div key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                                padding: '10px 18px', fontSize: 13, cursor: 'pointer',
                                color: activeTab === tab.id ? 'var(--blue)' : 'var(--t2)',
                                borderBottom: activeTab === tab.id ? '2px solid var(--blue)' : '2px solid transparent',
                            }}>
                                {tab.label} <span className="cnt">{tab.count}</span>
                            </div>
                        ))}
                    </div>

                    {/* Clients Tab - avec flag payé */}
                    {activeTab === 'clients' && (
                        <div>
                            <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="text" placeholder="🔍 Rechercher IP, username, pays..."
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    style={{
                                        background: 'var(--bg2)', border: '1px solid var(--border)',
                                        color: 'var(--t1)', padding: '6px 12px', borderRadius: 6,
                                        fontSize: 13, width: 300
                                    }}
                                />
                                <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                                    {filteredClients.length} clients
                                </span>
                                <a href={`${API}/export/clients`} style={{
                                    background: 'var(--bg2)', border: '1px solid var(--border)',
                                    padding: '6px 12px', borderRadius: 6, fontSize: 12, color: 'var(--t2)',
                                    textDecoration: 'none', marginLeft: 'auto'
                                }}>📥 CSV</a>
                                <a href={`${API}/export/clients/json`} style={{
                                    background: 'var(--bg2)', border: '1px solid var(--border)',
                                    padding: '6px 12px', borderRadius: 6, fontSize: 12, color: 'var(--t2)',
                                    textDecoration: 'none'
                                }}>{'{ }'} JSON</a>
                            </div>
                            <div style={{ maxHeight: 500, overflow: 'auto' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>IP</th>
                                            <th>Username</th>
                                            <th>Pays</th>
                                            <th>Sessions</th>
                                            <th>Première vue</th>
                                            <th>Dernière vue</th>

                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredClients.length === 0 ? (
                                            <tr><td colSpan={6}><div className="empty">Aucun client enregistré</div></td></tr>
                                        ) : filteredClients.map(c => (
                                            <tr key={c.id} style={{
                                            }}>
                                                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.client_ip}</td>
                                                <td style={{ fontWeight: 500 }}>{c.username || '—'}</td>
                                                <td>
                                                    <span style={{ fontSize: 16, marginRight: 4 }}>
                                                        {FLAGS[c.country_code] || '🌍'}
                                                    </span>
                                                    <span style={{ fontSize: 12, color: 'var(--t2)' }}>
                                                        {c.country || 'Inconnu'}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--blue)' }}>
                                                    {c.total_sessions}
                                                </td>
                                                <td style={{ fontSize: 12, color: 'var(--t3)' }}>{timeAgo(c.first_seen)}</td>
                                                <td style={{ fontSize: 12, color: 'var(--t3)' }}>{timeAgo(c.last_seen)}</td>

                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Active Clients Tab */}
                    {activeTab === 'active' && (
                        <div>
                            <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="text" placeholder="🔍 Rechercher IP, chaîne, pays..."
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    style={{
                                        background: 'var(--bg2)', border: '1px solid var(--border)',
                                        color: 'var(--t1)', padding: '6px 12px', borderRadius: 6,
                                        fontSize: 13, width: 300
                                    }}
                                />
                                <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                                    {filteredActive.length} actifs
                                </span>
                            </div>
                            <div style={{ maxHeight: 500, overflow: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                    <th>Chaîne</th>
                                        <th>IP</th>
                                        <th>Username</th>
                                        <th>Pays</th>
                                        <th>User Agent</th>
                                        <th>Connecté</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredActive.length === 0 ? (
                                        <tr><td colSpan={6}><div className="empty">Aucun client actif</div></td></tr>
                                    ) : filteredActive.map(c => (
                                        <tr key={c.id}>
                                            <td style={{ fontWeight: 500 }}>{c.channel_name}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.client_ip || '—'}</td>
                                            <td>{c.username || '—'}</td>
                                            <td>
                                                <span style={{ fontSize: 14 }}>{FLAGS[c.country_code] || '🌍'}</span>
                                                <span style={{ fontSize: 12, color: 'var(--t2)', marginLeft: 4 }}>{c.country || ''}</span>
                                            </td>
                                            <td style={{ fontSize: 11, color: 'var(--t3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {c.user_agent || '—'}
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--t3)' }}>{timeAgo(c.connected_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    )}

                    {/* Channels Tab */}
                    {activeTab === 'channels' && (
                        <div>
                            <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="text" placeholder="🔍 Rechercher chaîne, groupe..."
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    style={{
                                        background: 'var(--bg2)', border: '1px solid var(--border)',
                                        color: 'var(--t1)', padding: '6px 12px', borderRadius: 6,
                                        fontSize: 13, width: 300
                                    }}
                                />
                                <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                                    {filteredChannels.length} chaînes
                                </span>
                            </div>
                            <div style={{ maxHeight: 500, overflow: 'auto' }}>
                            <table>
                                <thead><tr><th>Chaîne</th><th>Groupe</th><th>Viewers</th><th>Clients</th><th>Statut</th><th>Dernière activité</th></tr></thead>
                                <tbody>
                                    {filteredChannels.length === 0 ? (
                                        <tr><td colSpan={6}><div className="empty">Aucune chaîne</div></td></tr>
                                    ) : filteredChannels.map(ch => (
                                        <tr key={ch.id}>
                                            <td style={{ fontWeight: 500 }}>{ch.name}</td>
                                            <td style={{ color: 'var(--t2)' }}>{ch.group_name || '—'}</td>
                                            <td style={{ fontWeight: 700, color: ch.current_viewers > 0 ? 'var(--green)' : 'var(--t3)' }}>
                                                {ch.current_viewers}
                                            </td>
                                            <td>
                                                {ch.active_clients_list && ch.active_clients_list.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                        {ch.active_clients_list.map((cl, i) => (
                                                            <span key={i} style={{ fontSize: 11, color: 'var(--t2)' }}>
                                                                {FLAGS[cl.country_code] || '🌍'} {cl.username || cl.client_ip}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: 11, color: 'var(--t3)' }}>—</span>
                                                )}
                                            </td>
                                            <td>{ch.is_active ? <span className="pill pill-g">● Live</span> : <span className="pill pill-b">○ Off</span>}</td>
                                            <td style={{ fontSize: 12, color: 'var(--t3)' }}>{timeAgo(ch.last_seen)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    )}

                    {/* Events Tab */}
                    {activeTab === 'events' && (
                        <div>
                            <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <input
                                    type="text" placeholder="🔍 Rechercher type, chaîne, client..."
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    style={{
                                        background: 'var(--bg2)', border: '1px solid var(--border)',
                                        color: 'var(--t1)', padding: '6px 12px', borderRadius: 6,
                                        fontSize: 13, width: 200
                                    }}
                                />
                                <select
                                    value={eventFilter.type}
                                    onChange={e => setEventFilter(f => ({...f, type: e.target.value}))}
                                    style={{
                                        background: 'var(--bg2)', border: '1px solid var(--border)',
                                        color: 'var(--t1)', padding: '6px 12px', borderRadius: 6,
                                        fontSize: 13
                                    }}
                                >
                                    <option value="">Tous les types</option>
                                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <input
                                    type="date"
                                    value={eventFilter.dateFrom}
                                    onChange={e => setEventFilter(f => ({...f, dateFrom: e.target.value}))}
                                    style={{
                                        background: 'var(--bg2)', border: '1px solid var(--border)',
                                        color: 'var(--t1)', padding: '6px 12px', borderRadius: 6,
                                        fontSize: 13
                                    }}
                                />
                                <span style={{ color: 'var(--t3)', fontSize: 12 }}>→</span>
                                <input
                                    type="date"
                                    value={eventFilter.dateTo}
                                    onChange={e => setEventFilter(f => ({...f, dateTo: e.target.value}))}
                                    style={{
                                        background: 'var(--bg2)', border: '1px solid var(--border)',
                                        color: 'var(--t1)', padding: '6px 12px', borderRadius: 6,
                                        fontSize: 13
                                    }}
                                />
                                <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                                    {filteredEvents.length} événements
                                </span>
                                <a href={`${API}/export/events`} style={{
                                    background: 'var(--bg2)', border: '1px solid var(--border)',
                                    padding: '6px 12px', borderRadius: 6, fontSize: 12, color: 'var(--t2)',
                                    textDecoration: 'none', marginLeft: 'auto'
                                }}>📥 CSV</a>
                                <a href={`${API}/export/events/json`} style={{
                                    background: 'var(--bg2)', border: '1px solid var(--border)',
                                    padding: '6px 12px', borderRadius: 6, fontSize: 12, color: 'var(--t2)',
                                    textDecoration: 'none'
                                }}>{'{ }'} JSON</a>
                            </div>
                            <div style={{ maxHeight: 500, overflow: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Chaîne</th>
                                        <th>Client</th>
                                        <th>Pays</th>
                                        <th>Détails</th>
                                        <th>Quand</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEvents.length === 0 ? (
                                        <tr><td colSpan={6}><div className="empty">Aucun événement</div></td></tr>
                                    ) : filteredEvents.map(ev => (
                                        <tr key={ev.id}>
                                            <td>
                                                <span style={{ marginRight: 6 }}>{EVENT_ICONS[ev.event_type] || '📌'}</span>
                                                <span style={{ fontWeight: 500 }}>{ev.event_type}</span>
                                            </td>
                                            <td style={{ color: (ev.channel_name || ev.content_name) ? 'var(--blue)' : 'var(--t3)' }}>
                                                {ev.content_name ? (
                                                    <span>🎬 {ev.content_name}</span>
                                                ) : ev.channel_name || '—'}
                                            </td>
                                            <td>
                                                {ev.username || ev.client_ip ? (
                                                    <span style={{ fontSize: 12 }}>👤 {ev.username || ev.client_ip}</span>
                                                ) : '—'}
                                            </td>
                                            <td>
                                                {(ev.country || ev.country_code) ? (
                                                    <span style={{ fontSize: 12 }}>
                                                        {FLAGS[ev.country_code] || '🌍'} {ev.country || ''}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--t3)' }}>
                                                {ev.error_message && <span style={{ color: 'var(--red)' }}>{ev.error_message.substring(0, 80)}</span>}
                                                {ev.runtime && <span>{ev.runtime.toFixed(1)}s · {formatBytes(ev.total_bytes)}</span>}
                                                {ev.duration && <span>{ev.duration.toFixed(1)}s · {formatBytes(ev.bytes_sent)}</span>}
                                                {!ev.error_message && !ev.runtime && !ev.duration && '—'}
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--t3)' }}>{timeAgo(ev.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Events by Type */}
                {eventsByType.length > 0 && (
                    <div className="sec">
                        <div className="sec-hdr"><h2>📊 Événements par type (24h)</h2></div>
                        <div style={{ padding: 16 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {eventsByType.map((e, i) => (
                                    <div key={i} style={{
                                        background: 'var(--bg2)', border: '1px solid var(--border)',
                                        borderRadius: 8, padding: '8px 14px', fontSize: 13
                                    }}>
                                        <span style={{ color: 'var(--t2)' }}>{EVENT_ICONS[e.event_type] || '📌'} {e.event_type}</span>
                                        <span style={{ fontWeight: 700, marginLeft: 8, color: 'var(--blue)' }}>{e.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div className="sec" style={{ marginTop: 16 }}>
                            <div className="sec-hdr"><h2>⚙️ Paramètres</h2></div>

                            {/* Settings Sub-Tabs */}
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg1)' }}>
                                {[
                                    { id: 'general', label: '🔧 Général' },
                                    { id: 'telegram', label: '📱 Telegram' },
                                    { id: 'webhooks', label: '🔗 Webhooks' },
                                    { id: 'backups', label: '💾 Sauvegardes' },
                                    { id: 'about', label: 'ℹ️ À propos' },
                                ].map(tab => (
                                    <div key={tab.id} onClick={() => setSettingsTab(tab.id)} style={{
                                        padding: '10px 18px', fontSize: 13, cursor: 'pointer',
                                        color: settingsTab === tab.id ? 'var(--blue)' : 'var(--t2)',
                                        borderBottom: settingsTab === tab.id ? '2px solid var(--blue)' : '2px solid transparent',
                                    }}>
                                        {tab.label}
                                    </div>
                                ))}
                            </div>

                            {/* General Tab */}
                            {settingsTab === 'general' && (
                                <div style={{ padding: 20 }}>
                                    <h3 style={{ fontSize: 15, marginBottom: 16, color: 'var(--t1)' }}>
                                        🔧 Général
                                    </h3>

                                    <div style={{
                                        background: 'var(--bg2)', border: '1px solid var(--border)',
                                        borderRadius: 8, padding: 16, marginBottom: 16
                                    }}>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: 'var(--t1)' }}>
                                            ✉️ Changer l'email
                                        </h4>
                                        <div style={{ marginBottom: 10 }}>
                                            <input type="email" placeholder="Nouvel email" id="new-email"
                                                defaultValue={user.email}
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 13 }} />
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const email = document.getElementById('new-email').value
                                                if (!email) { setTelegramTest({ ok: false, msg: '❌ Entrez un email' }); setTimeout(() => setTelegramTest(null), 3000); return }
                                                try {
                                                    const token = localStorage.getItem('token')
                                                    const res = await fetch(`${API}/auth/email`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email }) })
                                                    const data = await res.json()
                                                    if (res.ok) { setTelegramTest({ ok: true, msg: '✅ ' + data.message }); setUser(u => ({...u, email})) }
                                                    else { setTelegramTest({ ok: false, msg: '❌ ' + (data.error || 'Erreur') }) }
                                                } catch (e) { setTelegramTest({ ok: false, msg: '❌ Erreur' }) }
                                                setTimeout(() => setTelegramTest(null), 3000)
                                            }}
                                            style={{ background: 'var(--blue)', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                                        >✉️ Changer</button>
                                    </div>

                                    <div style={{
                                        background: 'var(--bg2)', border: '1px solid var(--border)',
                                        borderRadius: 8, padding: 16, marginBottom: 16
                                    }}>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: 'var(--t1)' }}>
                                            🔒 Changer le mot de passe
                                        </h4>
                                        <div style={{ marginBottom: 10 }}>
                                            <input type="password" placeholder="Mot de passe actuel" id="current-pwd"
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 13 }} />
                                        </div>
                                        <div style={{ marginBottom: 10 }}>
                                            <input type="password" placeholder="Nouveau mot de passe" id="new-pwd"
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 13 }} />
                                        </div>
                                        <div style={{ marginBottom: 10 }}>
                                            <input type="password" placeholder="Confirmer le mot de passe" id="confirm-pwd"
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg1)', color: 'var(--t1)', fontSize: 13 }} />
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const current = document.getElementById('current-pwd').value
                                                const pwd = document.getElementById('new-pwd').value
                                                const confirm = document.getElementById('confirm-pwd').value
                                                if (!current || !pwd) { setTelegramTest({ ok: false, msg: '❌ Remplis tous les champs' }); setTimeout(() => setTelegramTest(null), 3000); return }
                                                if (pwd !== confirm) { setTelegramTest({ ok: false, msg: '❌ Les mots de passe ne correspondent pas' }); setTimeout(() => setTelegramTest(null), 3000); return }
                                                try {
                                                    const token = localStorage.getItem('token')
                                                    const res = await fetch(`${API}/auth/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ current_password: current, password: pwd, password_confirmation: confirm }) })
                                                    const data = await res.json()
                                                    if (res.ok) { setTelegramTest({ ok: true, msg: '✅ ' + data.message }); ['current-pwd','new-pwd','confirm-pwd'].forEach(id => document.getElementById(id).value = '') }
                                                    else { setTelegramTest({ ok: false, msg: '❌ ' + (data.error || 'Erreur') }) }
                                                } catch (e) { setTelegramTest({ ok: false, msg: '❌ Erreur' }) }
                                                setTimeout(() => setTelegramTest(null), 3000)
                                            }}
                                            style={{ background: 'var(--blue)', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                                        >🔒 Changer</button>
                                    </div>

                                    <div style={{
                                        background: 'var(--bg2)', border: '1px solid var(--border)',
                                        borderRadius: 8, padding: 16, marginBottom: 16
                                    }}>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: 'var(--t1)' }}>
                                            ⏰ Backup automatique
                                        </h4>
                                        <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12 }}>
                                            Sauvegarde automatique quotidienne à 3h00 du matin.
                                        </p>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={settings.auto_backup === '1'}
                                                onChange={e => setSettings(s => ({...s, auto_backup: e.target.checked ? '1' : '0'}))}
                                                style={{ width: 16, height: 16 }}
                                            />
                                            <span style={{ fontSize: 13, color: 'var(--t2)' }}>
                                                Activer le backup automatique
                                            </span>
                                        </label>
                                    </div>

                                    <div style={{
                                        background: 'var(--bg2)', border: '1px solid var(--border)',
                                        borderRadius: 8, padding: 16, marginBottom: 16
                                    }}>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: 'var(--t1)' }}>
                                            🗑️ Vider les statistiques
                                        </h4>
                                        <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12 }}>
                                            Supprime tous les événements, réinitialise les viewers actifs et les clients actifs.
                                            Les clients enregistrés (known_clients) ne sont pas supprimés.
                                        </p>
                                        <button
                                            onClick={async () => {
                                                if (!confirm('Êtes-vous sûr de vouloir vider toutes les statistiques ? Cette action est irréversible.')) return
                                                try {
                                                    const res = await fetch(`${API}/stats/all`, { method: 'DELETE' })
                                                    const data = await res.json()
                                                    if (data.status === 'ok') {
                                                        setTelegramTest({ ok: true, msg: '✅ ' + data.message })
                                                        fetchData()
                                                    } else {
                                                        setTelegramTest({ ok: false, msg: '❌ Erreur' })
                                                    }
                                                } catch (e) {
                                                    setTelegramTest({ ok: false, msg: '❌ Erreur de connexion' })
                                                }
                                                setTimeout(() => setTelegramTest(null), 3000)
                                            }}
                                            style={{
                                                background: 'rgba(248,81,73,0.15)', color: 'var(--red)', border: 'none',
                                                padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600
                                            }}
                                        >
                                            🗑️ Vider toutes les stats
                                        </button>
                                    </div>

                                    {telegramTest && (
                                        <div style={{
                                            marginTop: 12, padding: '8px 14px', borderRadius: 6, fontSize: 13,
                                            background: telegramTest.ok ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
                                            color: telegramTest.ok ? 'var(--green)' : 'var(--red)'
                                        }}>
                                            {telegramTest.msg}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Telegram Tab */}
                            {settingsTab === 'telegram' && (
                                <div style={{ padding: 20 }}>
                                    <h3 style={{ fontSize: 15, marginBottom: 12, color: 'var(--t1)' }}>
                                        📱 Notifications Telegram
                                    </h3>

                                    {/* Enable/Disable */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                        <label style={{ fontSize: 13, color: 'var(--t2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <input
                                                type="checkbox"
                                                checked={settings.telegram_enabled === '1'}
                                                onChange={e => setSettings(s => ({ ...s, telegram_enabled: e.target.checked ? '1' : '0' }))}
                                                style={{ width: 16, height: 16 }}
                                            />
                                            Activer les notifications Telegram
                                        </label>
                                    </div>

                                    {/* Bot Token */}
                                    <div style={{ marginBottom: 12 }}>
                                        <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>Bot Token</label>
                                        <input
                                            type="password"
                                            value={settings.telegram_bot_token || ''}
                                            onChange={e => setSettings(s => ({ ...s, telegram_bot_token: e.target.value }))}
                                            placeholder="123456:ABC-DEF..."
                                            style={{
                                                background: 'var(--bg2)', border: '1px solid var(--border)',
                                                color: 'var(--t1)', padding: '8px 12px', borderRadius: 6,
                                                fontSize: 13, width: 400, fontFamily: 'monospace'
                                            }}
                                        />
                                    </div>

                                    {/* Chat ID */}
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>Chat ID</label>
                                        <input
                                            type="text"
                                            value={settings.telegram_chat_id || ''}
                                            onChange={e => setSettings(s => ({ ...s, telegram_chat_id: e.target.value }))}
                                            placeholder="-1001234567890 ou 123456789"
                                            style={{
                                                background: 'var(--bg2)', border: '1px solid var(--border)',
                                                color: 'var(--t1)', padding: '8px 12px', borderRadius: 6,
                                                fontSize: 13, width: 400, fontFamily: 'monospace'
                                            }}
                                        />
                                    </div>

                                    {/* Notification Toggles */}
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>Événements notifiés</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {[
                                                { key: 'notify_client_connect', label: '🟢 Connexion client' },
                                                { key: 'notify_client_disconnect', label: '🔴 Déconnexion client' },
                                                { key: 'notify_channel_start', label: '▶️ Démarrage chaîne' },
                                                { key: 'notify_channel_stop', label: '⏹️ Arrêt chaîne' },
                                                { key: 'notify_channel_error', label: '⚠️ Erreur chaîne' },
                                                { key: 'notify_channel_reconnect', label: '🔄 Reconnexion' },
                                                { key: 'notify_channel_failover', label: '⚡ Failover' },
                                                { key: 'notify_stream_switch', label: '🔀 Changement source' },
                                                { key: 'notify_m3u_refresh', label: '📡 Rafraîchissement M3U' },
                                                { key: 'notify_epg_refresh', label: '📺 Rafraîchissement EPG' },
                                                { key: 'notify_login_failed', label: '🚫 Connexion refusée' },
                                                { key: 'notify_recording_start', label: '⏺️ Début enregistrement' },
                                                { key: 'notify_recording_end', label: '⏹️ Fin enregistrement' },
                                                { key: 'notify_vod_start', label: '🎬 Début VOD' },
                                                { key: 'notify_vod_stop', label: '⏹️ Fin VOD' },
                                            ].map(item => (
                                                <label key={item.key} style={{
                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                    background: 'var(--bg2)', border: '1px solid var(--border)',
                                                    padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                                                    color: settings[item.key] === '1' ? 'var(--green)' : 'var(--t3)'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={settings[item.key] === '1'}
                                                        onChange={e => setSettings(s => ({ ...s, [item.key]: e.target.checked ? '1' : '0' }))}
                                                        style={{ width: 14, height: 14 }}
                                                    />
                                                    {item.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Buttons */}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={async () => {
                                                setTelegramSaving(true)
                                                try {
                                                    await fetch(`${API}/settings`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify(settings),
                                                    })
                                                    setTelegramTest({ ok: true, msg: '✅ Paramètres sauvegardés' })
                                                } catch (e) {
                                                    setTelegramTest({ ok: false, msg: '❌ Erreur de sauvegarde' })
                                                } finally {
                                                    setTelegramSaving(false)
                                                    setTimeout(() => setTelegramTest(null), 3000)
                                                }
                                            }}
                                            disabled={telegramSaving}
                                            style={{
                                                background: 'var(--blue)', color: '#fff', border: 'none',
                                                padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                                opacity: telegramSaving ? 0.5 : 1
                                            }}
                                        >
                                            {telegramSaving ? '...' : '💾 Sauvegarder'}
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setTelegramTest(null)
                                                try {
                                                    const res = await fetch(`${API}/settings/telegram/test`, { method: 'POST' })
                                                    const data = await res.json()
                                                    setTelegramTest(data.ok
                                                        ? { ok: true, msg: `✅ Test envoyé ! Bot: @${data.bot}` }
                                                        : { ok: false, msg: `❌ ${data.error}` }
                                                    )
                                                } catch (e) {
                                                    setTelegramTest({ ok: false, msg: '❌ Erreur de connexion' })
                                                }
                                            }}
                                            style={{
                                                background: 'rgba(63,185,80,0.15)', color: 'var(--green)', border: 'none',
                                                padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600
                                            }}
                                        >
                                            🧪 Tester
                                        </button>
                                    </div>
                                    {telegramTest && (
                                        <div style={{
                                            marginTop: 12, padding: '8px 14px', borderRadius: 6, fontSize: 13,
                                            background: telegramTest.ok ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
                                            color: telegramTest.ok ? 'var(--green)' : 'var(--red)'
                                        }}>
                                            {telegramTest.msg}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Backups Tab */}
                            {settingsTab === 'webhooks' && (
                                <div style={{ padding: 20 }}>
                                    <h3 style={{ fontSize: 15, marginBottom: 16, color: 'var(--t1)' }}>
                                        🔗 Webhooks personnalisés
                                    </h3>

                                    <div style={{
                                        background: 'var(--bg2)', border: '1px solid var(--border)',
                                        borderRadius: 8, padding: 16, marginBottom: 16
                                    }}>
                                        <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12 }}>
                                            Envoyez des notifications vers Discord, Slack ou tout service webhook.
                                        </p>

                                        <div style={{ marginBottom: 12 }}>
                                            <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>
                                                🔮 Discord Webhook URL
                                            </label>
                                            <input
                                                type="url"
                                                value={settings.discord_webhook || ''}
                                                onChange={e => setSettings(s => ({...s, discord_webhook: e.target.value}))}
                                                placeholder="https://discord.com/api/webhooks/..."
                                                style={{
                                                    width: '100%', padding: '8px 12px', borderRadius: 6,
                                                    border: '1px solid var(--border)', background: 'var(--bg1)',
                                                    color: 'var(--t1)', fontSize: 13, fontFamily: 'monospace'
                                                }}
                                            />
                                        </div>

                                        <div style={{ marginBottom: 12 }}>
                                            <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>
                                                💬 Slack Webhook URL
                                            </label>
                                            <input
                                                type="url"
                                                value={settings.slack_webhook || ''}
                                                onChange={e => setSettings(s => ({...s, slack_webhook: e.target.value}))}
                                                placeholder="https://hooks.slack.com/services/..."
                                                style={{
                                                    width: '100%', padding: '8px 12px', borderRadius: 6,
                                                    border: '1px solid var(--border)', background: 'var(--bg1)',
                                                    color: 'var(--t1)', fontSize: 13, fontFamily: 'monospace'
                                                }}
                                            />
                                        </div>

                                        <div style={{ marginBottom: 12 }}>
                                            <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>
                                                🌐 Custom Webhook URL
                                            </label>
                                            <input
                                                type="url"
                                                value={settings.custom_webhook || ''}
                                                onChange={e => setSettings(s => ({...s, custom_webhook: e.target.value}))}
                                                placeholder="https://your-api.com/webhook"
                                                style={{
                                                    width: '100%', padding: '8px 12px', borderRadius: 6,
                                                    border: '1px solid var(--border)', background: 'var(--bg1)',
                                                    color: 'var(--t1)', fontSize: 13, fontFamily: 'monospace'
                                                }}
                                            />
                                        </div>

                                        <button
                                            onClick={async () => {
                                                setTelegramSaving(true)
                                                try {
                                                    await fetch(`${API}/settings`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify(settings),
                                                    })
                                                    setTelegramTest({ ok: true, msg: '✅ Webhooks sauvegardés' })
                                                } catch (e) {
                                                    setTelegramTest({ ok: false, msg: '❌ Erreur' })
                                                } finally {
                                                    setTelegramSaving(false)
                                                    setTimeout(() => setTelegramTest(null), 3000)
                                                }
                                            }}
                                            style={{
                                                background: 'var(--blue)', color: '#fff', border: 'none',
                                                padding: '8px 18px', borderRadius: 6, cursor: 'pointer',
                                                fontSize: 13, fontWeight: 600, marginTop: 8
                                            }}
                                        >
                                            💾 Sauvegarder
                                        </button>
                                    </div>

                                    {telegramTest && (
                                        <div style={{
                                            padding: '8px 14px', borderRadius: 6, fontSize: 13,
                                            background: telegramTest.ok ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
                                            color: telegramTest.ok ? 'var(--green)' : 'var(--red)'
                                        }}>
                                            {telegramTest.msg}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Backups Tab */}
                            {settingsTab === 'backups' && (
                                <div style={{ padding: 20 }}>
                                    <h3 style={{ fontSize: 15, marginBottom: 12, color: 'var(--t1)' }}>
                                        💾 Sauvegardes de la base de données
                                    </h3>

                                    {/* Create Backup Button */}
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(`${API}/backups`, { method: 'POST' })
                                                    const data = await res.json()
                                                    if (data.status === 'ok') {
                                                        setTelegramTest({ ok: true, msg: `✅ Backup créé : ${data.filename} (${data.size_human})` })
                                                        fetchBackups()
                                                    } else {
                                                        setTelegramTest({ ok: false, msg: `❌ ${data.error}` })
                                                    }
                                                } catch (e) {
                                                    setTelegramTest({ ok: false, msg: '❌ Erreur de création' })
                                                }
                                                setTimeout(() => setTelegramTest(null), 3000)
                                            }}
                                            style={{
                                                background: 'var(--blue)', color: '#fff', border: 'none',
                                                padding: '8px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600
                                            }}
                                        >
                                            💾 Créer un backup
                                        </button>
                                    </div>

                                    {telegramTest && (
                                        <div style={{
                                            marginBottom: 12, padding: '8px 14px', borderRadius: 6, fontSize: 13,
                                            background: telegramTest.ok ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
                                            color: telegramTest.ok ? 'var(--green)' : 'var(--red)'
                                        }}>
                                            {telegramTest.msg}
                                        </div>
                                    )}

                                    {/* Backups List */}
                                    {backups.length === 0 ? (
                                        <div style={{ fontSize: 13, color: 'var(--t3)', padding: '12px 0' }}>
                                            Aucune sauvegarde
                                        </div>
                                    ) : (
                                        <div style={{ maxHeight: 400, overflow: 'auto' }}>
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Nom</th>
                                                        <th>Taille</th>
                                                        <th>Date</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {backups.map(b => (
                                                        <tr key={b.name}>
                                                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.filename}</td>
                                                            <td style={{ fontSize: 12 }}>{b.size_human}</td>
                                                            <td style={{ fontSize: 12, color: 'var(--t3)' }}>{b.created_at}</td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: 6 }}>
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (!confirm('Restaurer ce backup ? La base actuelle sera écrasée.')) return
                                                                            try {
                                                                                const res = await fetch(`${API}/backups/${b.name}/restore`, { method: 'POST' })
                                                                                const data = await res.json()
                                                                                if (data.status === 'ok') {
                                                                                    setTelegramTest({ ok: true, msg: `✅ ${data.message}` })
                                                                                } else {
                                                                                    setTelegramTest({ ok: false, msg: `❌ ${data.error}` })
                                                                                }
                                                                            } catch (e) {
                                                                                setTelegramTest({ ok: false, msg: '❌ Erreur de restauration' })
                                                                            }
                                                                            setTimeout(() => setTelegramTest(null), 3000)
                                                                        }}
                                                                        style={{
                                                                            background: 'rgba(63,185,80,0.15)', color: 'var(--green)',
                                                                            border: 'none', padding: '4px 10px', borderRadius: 4,
                                                                            cursor: 'pointer', fontSize: 11
                                                                        }}
                                                                    >
                                                                        🔄 Restaurer
                                                                    </button>
                                                                    <a
                                                                        href={`${API}/backups/${b.name}/download`}
                                                                        style={{
                                                                            background: 'rgba(59,130,246,0.15)', color: 'var(--blue)',
                                                                            border: 'none', padding: '4px 10px', borderRadius: 4,
                                                                            cursor: 'pointer', fontSize: 11, textDecoration: 'none'
                                                                        }}
                                                                    >
                                                                        📥 Télécharger
                                                                    </a>
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (!confirm('Supprimer ce backup ?')) return
                                                                            try {
                                                                                await fetch(`${API}/backups/${b.name}`, { method: 'DELETE' })
                                                                                fetchBackups()
                                                                            } catch (e) {}
                                                                        }}
                                                                        style={{
                                                                            background: 'rgba(248,81,73,0.15)', color: 'var(--red)',
                                                                            border: 'none', padding: '4px 10px', borderRadius: 4,
                                                                            cursor: 'pointer', fontSize: 11
                                                                        }}
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* About Tab */}
                            {settingsTab === 'about' && (
                                <div style={{ padding: 20 }}>
                                    <h3 style={{ fontSize: 15, marginBottom: 16, color: 'var(--t1)' }}>
                                        ℹ️ À propos
                                    </h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {/* Logo & Name */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ fontSize: 48 }}>📊</span>
                                            <div>
                                                <h2 style={{ margin: 0, fontSize: 22, color: 'var(--t1)' }}>DispatchMon</h2>
                                                <p style={{ margin: 0, fontSize: 13, color: 'var(--t3)' }}>Dashboard temps réel pour Dispatcharr</p>
                                            </div>
                                        </div>

                                        {/* Info Grid */}
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                                            background: 'var(--bg2)', border: '1px solid var(--border)',
                                            borderRadius: 8, padding: 16
                                        }}>
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 2 }}>Version</div>
                                                <div style={{ fontSize: 14, fontWeight: 600 }}>{version?.version || 'dev'}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 2 }}>Stack</div>
                                                <div style={{ fontSize: 14, fontWeight: 600 }}>React + Laravel</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 2 }}>Base de données</div>
                                                <div style={{ fontSize: 14, fontWeight: 600 }}>SQLite</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 2 }}>Notifications</div>
                                                <div style={{ fontSize: 14, fontWeight: 600 }}>Telegram Bot API</div>
                                            </div>
                                        </div>

                                        {/* Features */}
                                        <div style={{
                                            background: 'var(--bg2)', border: '1px solid var(--border)',
                                            borderRadius: 8, padding: 16
                                        }}>
                                            <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: 'var(--t1)' }}>Fonctionnalités</h4>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {[
                                                    '👥 Gestion clients',
                                                    '🟢 Clients actifs',
                                                    '📺 Monitoring chaînes',
                                                    '📝 Historique événements',
                                                    '📱 Notifications Telegram',
                                                    '💾 Sauvegardes/Restore',
                                                    '🌐 Géolocalisation IP',
                                                    '🔄 Auto-refresh 10s',
                                                ].map(f => (
                                                    <span key={f} style={{
                                                        background: 'var(--bg1)', border: '1px solid var(--border)',
                                                        padding: '4px 10px', borderRadius: 4, fontSize: 12, color: 'var(--t2)'
                                                    }}>{f}</span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Links */}
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <a
                                                href="https://github.com/mahadouch/DispatchMon"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    background: 'var(--bg2)', border: '1px solid var(--border)',
                                                    padding: '8px 16px', borderRadius: 6, fontSize: 13,
                                                    color: 'var(--t2)', textDecoration: 'none'
                                                }}
                                            >
                                                🐙 GitHub
                                            </a>
                                        </div>

                                        {/* Credits */}
                                        <div style={{ fontSize: 11, color: 'var(--t3)', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                                            Développé par <strong>mahadouch</strong> — Conçu pour <strong>Dispatcharr</strong> IPTV Server
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            {/* Update Modal */}
            {showUpdateModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <div style={{
                        background: 'var(--bg1)', border: '1px solid var(--border)',
                        borderRadius: 12, padding: 24, width: 600, maxHeight: '80vh',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16, color: 'var(--t1)' }}>
                                {updateRunning ? '🔄 Mise à jour en cours...' : '✅ Mise à jour terminée'}
                            </h3>
                            {!updateRunning && (
                                <button
                                    onClick={() => setShowUpdateModal(false)}
                                    style={{
                                        background: 'transparent', border: 'none',
                                        color: 'var(--t3)', cursor: 'pointer', fontSize: 20
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Logs */}
                        <div style={{
                            flex: 1, overflow: 'auto', maxHeight: 400,
                            background: '#0d1117', borderRadius: 8, padding: 16,
                            fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6
                        }}>
                            {updateLogs.map((log, i) => (
                                <div key={i} style={{ marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                        <span style={{ color: 'var(--t3)' }}>{'>>'}</span>
                                        <span style={{
                                            color: log.status === 'ok' ? 'var(--green)'
                                                 : log.status === 'error' ? 'var(--red)'
                                                 : log.status === 'skip' ? 'var(--t3)'
                                                 : log.status === 'info' ? '#f0883e'
                                                 : '#58a6ff',
                                            fontWeight: 600
                                        }}>
                                            {log.status === 'ok' ? '✅' : log.status === 'error' ? '❌' : log.status === 'skip' ? '⏭️' : log.status === 'info' ? '📋' : '⏳'}
                                            {' '}{log.step}
                                        </span>
                                    </div>
                                    {log.output && (
                                        <pre style={{
                                            margin: 0, padding: '4px 0 4px 24px',
                                            color: 'var(--t2)', whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                                        }}>
                                            {log.output}
                                        </pre>
                                    )}
                                </div>
                            ))}
                            {updateRunning && (
                                <div style={{ color: '#58a6ff' }}>
                                    <span className="spinner" style={{ display: 'inline-block', marginRight: 8 }} />
                                    En cours...
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            {!updateRunning && (
                                <>
                                    <button
                                        onClick={() => setShowUpdateModal(false)}
                                        style={{
                                            background: 'var(--bg2)', border: '1px solid var(--border)',
                                            color: 'var(--t2)', padding: '8px 16px', borderRadius: 6,
                                            cursor: 'pointer', fontSize: 13
                                        }}
                                    >
                                        Fermer
                                    </button>
                                    <button
                                        onClick={() => window.location.reload()}
                                        style={{
                                            background: 'var(--blue)', color: '#fff', border: 'none',
                                            padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13
                                        }}
                                    >
                                        🔄 Recharger
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
