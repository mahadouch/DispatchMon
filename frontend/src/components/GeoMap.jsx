import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const COUNTRY_COORDS = {
    MA: [-5.8, 32.3], FR: [2.2, 46.6], US: [-95.7, 37.1],
    GB: [-3.4, 55.4], BR: [-51.9, -14.2], IN: [78.9, 20.6],
    EG: [30.8, 26.8], SA: [45.1, 23.9], IT: [12.6, 41.9],
    DZ: [1.7, 28.0], DE: [10.4, 51.2], ES: [-3.7, 40.5],
    PT: [-8.2, 39.4], NL: [5.3, 52.1], BE: [4.4, 50.5],
    CA: [-106.3, 56.1], TR: [35.2, 38.9], JP: [138.2, 36.2],
    KR: [127.8, 35.9], CN: [104.2, 35.9], AU: [133.8, -25.3],
    ZA: [22.9, -30.6], NG: [8.7, 9.1], KE: [37.9, 0.0],
    AR: [-63.6, -38.4], MX: [-102.6, 23.6], RU: [105.3, 61.5],
}

const COLORS = [
    '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
]

export default function GeoMap({ clients }) {
    const countryCounts = {}
    clients.forEach(c => {
        if (c.country_code) {
            countryCounts[c.country_code] = (countryCounts[c.country_code] || 0) + 1
        }
    })

    const sorted = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])

    return (
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                        scale: 120,
                        center: [10, 20],
                    }}
                    style={{ width: '100%', height: 300 }}
                >
                    <Geographies geography={GEO_URL}>
                        {({ geographies }) => geographies.map(geo => (
                            <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                fill="#1e2d3d"
                                stroke="#30363d"
                                style={{
                                    default: { outline: 'none' },
                                    hover: { fill: '#2d3a4d', outline: 'none' },
                                    pressed: { outline: 'none' },
                                }}
                            />
                        ))}
                    </Geographies>
                    {sorted.map(([code, count], i) => {
                        const coords = COUNTRY_COORDS[code]
                        if (!coords) return null
                        const radius = Math.min(4 + count * 2, 20)
                        return (
                            <Marker key={code} coordinates={coords}>
                                <circle
                                    r={radius}
                                    fill={COLORS[i % COLORS.length]}
                                    opacity={0.7}
                                    stroke={COLORS[i % COLORS.length]}
                                    strokeWidth={1}
                                />
                                <text
                                    textAnchor="middle"
                                    y={-radius - 4}
                                    style={{
                                        fontSize: 10,
                                        fill: '#e2e8f0',
                                        fontWeight: 600,
                                    }}
                                >
                                    {count}
                                </text>
                            </Marker>
                        )
                    })}
                </ComposableMap>
            </div>
            <div style={{ minWidth: 180 }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--t1)' }}>
                    Par pays
                </h4>
                {sorted.map(([code, count], i) => (
                    <div key={code} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        marginBottom: 6, fontSize: 12
                    }}>
                        <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: COLORS[i % COLORS.length]
                        }} />
                        <span style={{ color: 'var(--t2)', flex: 1 }}>{code}</span>
                        <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{count}</span>
                    </div>
                ))}
                {sorted.length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--t3)' }}>Aucune donnée</p>
                )}
            </div>
        </div>
    )
}
