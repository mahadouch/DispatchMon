import { useState, useEffect } from 'react'

let toastId = 0
let listeners = []

export function showToast(message, type = 'info') {
    const id = ++toastId
    listeners.forEach(fn => fn({ id, message, type }))
}

export function ToastContainer() {
    const [toasts, setToasts] = useState([])

    useEffect(() => {
        const handler = (toast) => {
            setToasts(prev => [...prev, toast])
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id))
            }, 5000)
        }
        listeners.push(handler)
        return () => { listeners = listeners.filter(l => l !== handler) }
    }, [])

    return (
        <div style={{
            position: 'fixed', top: 16, right: 16, zIndex: 10000,
            display: 'flex', flexDirection: 'column', gap: 8
        }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    background: t.type === 'success' ? '#065f46' : t.type === 'error' ? '#7f1d1d' : '#1e3a5f',
                    border: `1px solid ${t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : '#3b82f6'}`,
                    borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#e2e8f0',
                    animation: 'slideIn 0.3s ease', minWidth: 250, maxWidth: 400,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                    {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'} {t.message}
                </div>
            ))}
        </div>
    )
}
