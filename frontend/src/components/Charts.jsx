import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

const COLORS = {
    blue: '#3b82f6',
    green: '#22c55e',
    orange: '#f59e0b',
    red: '#ef4444',
    purple: '#a855f7',
    cyan: '#06b6d4',
    pink: '#ec4899',
    lime: '#84cc16',
    fuchsia: '#d946ef',
    indigo: '#6366f1',
}

const PALETTE = Object.values(COLORS)

const gridColor = '#1e2d3d'
const textColor = '#64748b'

export function ViewerTimeline({ data }) {
    const chartData = {
        labels: data.map(d => d.hour),
        datasets: [{
            label: 'Viewers',
            data: data.map(d => d.viewers),
            borderColor: COLORS.blue,
            backgroundColor: 'rgba(59,130,246,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: COLORS.blue,
        }]
    }
    return (
        <Line data={chartData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 12 } },
                y: { grid: { color: gridColor }, ticks: { color: textColor }, beginAtZero: true }
            }
        }} />
    )
}

export function TopChannelsChart({ data }) {
    const chartData = {
        labels: data.map(d => d.channel_name),
        datasets: [{
            label: 'Connexions',
            data: data.map(d => d.total),
            backgroundColor: PALETTE,
            borderRadius: 6,
        }]
    }
    return (
        <Bar data={chartData} options={{
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor }, beginAtZero: true },
                y: { grid: { display: false }, ticks: { color: textColor } }
            }
        }} />
    )
}

export function TopClientsChart({ data }) {
    const chartData = {
        labels: data.map(d => d.username || d.client_ip),
        datasets: [{
            label: 'Sessions',
            data: data.map(d => d.total_sessions),
            backgroundColor: PALETTE,
            borderWidth: 0,
        }]
    }
    return (
        <Doughnut data={chartData} options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: textColor, padding: 12, font: { size: 11 } }
                }
            }
        }} />
    )
}

export function WeeklyConnections({ data }) {
    const chartData = {
        labels: data.map(d => d.date),
        datasets: [{
            label: 'Connexions',
            data: data.map(d => d.connections),
            borderColor: COLORS.green,
            backgroundColor: 'rgba(34,197,94,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: COLORS.green,
        }]
    }
    return (
        <Line data={chartData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: textColor } },
                y: { grid: { color: gridColor }, ticks: { color: textColor }, beginAtZero: true }
            }
        }} />
    )
}
