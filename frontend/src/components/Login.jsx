import { useState } from 'react'

const API = '/api'

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await fetch(`${API}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })
            const data = await res.json()

            if (res.ok) {
                localStorage.setItem('token', data.token)
                onLogin(data.user)
            } else {
                setError(data.error || 'Erreur de connexion')
            }
        } catch (e) {
            setError('Erreur de connexion au serveur')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', background: 'var(--bg0)'
        }}>
            <form onSubmit={handleSubmit} style={{
                background: 'var(--bg1)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 32, width: 380
            }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                        width: 56, height: 56, background: 'linear-gradient(135deg, var(--blue), var(--purple))',
                        borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28, color: '#fff', fontWeight: 700, margin: '0 auto 12px'
                    }}>D</div>
                    <h2 style={{ margin: 0, fontSize: 20 }}>DispatchMon</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--t3)' }}>Dashboard IPTV</p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
                        color: 'var(--red)', fontSize: 13, padding: '8px 12px', borderRadius: 8,
                        marginBottom: 16
                    }}>
                        ❌ {error}
                    </div>
                )}

                <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 6 }}>
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="admin@example.com"
                        required
                        style={{
                            width: '100%', padding: '10px 14px', borderRadius: 8,
                            border: '1px solid var(--border)', background: 'var(--bg2)',
                            color: 'var(--t1)', fontSize: 13, outline: 'none'
                        }}
                    />
                </div>

                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--t3)', marginBottom: 6 }}>
                        Mot de passe
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        style={{
                            width: '100%', padding: '10px 14px', borderRadius: 8,
                            border: '1px solid var(--border)', background: 'var(--bg2)',
                            color: 'var(--t1)', fontSize: 13, outline: 'none'
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                        background: 'var(--blue)', color: '#fff', fontSize: 14,
                        fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? '⏳ Connexion...' : 'Se connecter'}
                </button>
            </form>
        </div>
    )
}
