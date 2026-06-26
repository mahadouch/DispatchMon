# DispatchMon - Plan d'implémentation complet

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Ajouter 14 fonctionnalités majeures à DispatchMon pour en faire un dashboard IPTV complet et professionnel.

**Architecture:** Backend Laravel (API REST) + Frontend React (SPA). Base SQLite. Les features sont regroupées par modules pour permettre une implémentation incrémentale.

**Tech Stack:** Laravel 11, React 19, Vite, SQLite, Chart.js (graphiques), Socket.io (temps réel optionnel)

---

## Module 1: Dashboard Global (Graphiques)

### Task 1.1: Endpoint API pour les stats temps réel

**Objective:** Créer un endpoint qui retourne les données pour les graphiques du dashboard

**Files:**
- Modify: `backend/app/Http/Controllers/StatsController.php`
- Modify: `backend/routes/api.php`

**Step 1: Ajouter la route**
```php
// Dans routes/api.php, ajouter dans le group stats :
Route::get('/timeline/hourly', [StatsController::class, 'timelineHourly']);
Route::get('/top/channels', [StatsController::class, 'topChannels']);
Route::get('/top/clients', [StatsController::class, 'topClients']);
```

**Step 2: Implémenter timelineHourly**
```php
public function timelineHourly(): JsonResponse
{
    $hours = 24;
    $data = [];
    for ($i = $hours - 1; $i >= 0; $i--) {
        $start = now()->subHours($i)->startOfHour();
        $end = $start->copy()->endOfHour();
        $count = ActiveClient::where('connected_at', '>=', $start)
            ->where('connected_at', '<', $end)
            ->count();
        $data[] = [
            'hour' => $start->format('H:00'),
            'viewers' => $count,
        ];
    }
    return response()->json($data);
}
```

**Step 3: Implémenter topChannels**
```php
public function topChannels(): JsonResponse
{
    $top = DispatcharrEvent::where('event_type', 'client_connect')
        ->select('channel_name', \DB::raw('count(*) as total'))
        ->where('created_at', '>=', now()->subDays(7))
        ->groupBy('channel_name')
        ->orderByDesc('total')
        ->limit(10)
        ->get();
    return response()->json($top);
}
```

**Step 4: Implémenter topClients**
```php
public function topClients(): JsonResponse
{
    $top = \App\Models\KnownClient::orderByDesc('total_sessions')
        ->limit(10)
        ->get(['client_ip', 'username', 'country', 'country_code', 'total_sessions']);
    return response()->json($top);
}
```

**Step 5: Commit**
```bash
git add -A && git commit -m "feat(stats): add hourly timeline, top channels, top clients endpoints"
```

---

### Task 1.2: Installer Chart.js côté frontend

**Objective:** Ajouter Chart.js pour les graphiques

**Files:**
- Modify: `frontend/package.json`

**Step 1: Installer les dépendances**
```bash
cd ~/DispatchMon/frontend && npm install chart.js react-chartjs-2
```

**Step 2: Commit**
```bash
cd ~/DispatchMon && git add -A && git commit -m "deps: add chart.js and react-chartjs-2"
```

---

### Task 1.3: Composant Graphique Dashboard

**Objective:** Créer les composants de graphiques pour le dashboard

**Files:**
- Create: `frontend/src/components/Charts.jsx`

**Step 1: Créer le fichier Charts.jsx**
```jsx
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

export function ViewerTimeline({ data }) {
    const chartData = {
        labels: data.map(d => d.hour),
        datasets: [{
            label: 'Viewers',
            data: data.map(d => d.viewers),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.1)',
            fill: true,
            tension: 0.4,
        }]
    }
    return <Line data={chartData} options={{
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { color: '#1e2d3d' }, ticks: { color: '#64748b' } },
            y: { grid: { color: '#1e2d3d' }, ticks: { color: '#64748b' } }
        }
    }} />
}

export function TopChannelsChart({ data }) {
    const chartData = {
        labels: data.map(d => d.channel_name),
        datasets: [{
            label: 'Connexions',
            data: data.map(d => d.total),
            backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'],
        }]
    }
    return <Bar data={chartData} options={{
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', maxRotation: 45 } },
            y: { grid: { color: '#1e2d3d' }, ticks: { color: '#64748b' } }
        }
    }} />
}

export function TopClientsChart({ data }) {
    const chartData = {
        labels: data.map(d => d.username || d.client_ip),
        datasets: [{
            label: 'Sessions',
            data: data.map(d => d.total_sessions),
            backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'],
        }]
    }
    return <Doughnut data={chartData} options={{
        responsive: true,
        plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } }
    }} />
}
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat(dashboard): add chart components (timeline, top channels, top clients)"
```

---

### Task 1.4: Intégrer les graphiques dans le Dashboard

**Objective:** Afficher les graphiques sur la page d'accueil

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Ajouter les states et fetch**
```jsx
const [hourlyTimeline, setHourlyTimeline] = useState([])
const [topChannels, setTopChannels] = useState([])
const [topClients, setTopClients] = useState([])

// Dans fetchData, ajouter :
const [tlRes, tcRes, tclRes] = await Promise.allSettled([
    fetch(`${API}/stats/timeline/hourly`).then(r => r.json()),
    fetch(`${API}/stats/top/channels`).then(r => r.json()),
    fetch(`${API}/stats/top/clients`).then(r => r.json()),
])
if (tlRes.status === 'fulfilled') setHourlyTimeline(tlRes.value)
if (tcRes.status === 'fulfilled') setTopChannels(tcRes.value)
if (tclRes.status === 'fulfilled') setTopClients(tclRes.value)
```

**Step 2: Ajouter les graphiques dans le Dashboard**
```jsx
{/* Dans le dashboard, après les cards stats */}
{hourlyTimeline.length > 0 && (
    <div className="sec" style={{ marginBottom: 24 }}>
        <div className="sec-hdr"><h2>📈 Viewers (24h)</h2></div>
        <div style={{ padding: 16, height: 250 }}>
            <ViewerTimeline data={hourlyTimeline} />
        </div>
    </div>
)}

<div className="grid2">
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
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(dashboard): integrate charts on main page"
```

---

## Module 2: Alertes en temps réel (Toast notifications)

### Task 2.1: Système de toast notifications

**Objective:** Afficher des notifications toast quand des événements importants se produisent

**Files:**
- Create: `frontend/src/components/Toast.jsx`
- Modify: `frontend/src/App.jsx`

**Step 1: Créer le composant Toast**
```jsx
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
                    animation: 'slideIn 0.3s ease', minWidth: 250, maxWidth: 400
                }}>
                    {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'} {t.message}
                </div>
            ))}
        </div>
    )
}
```

**Step 2: Intégrer dans App.jsx**
```jsx
import { ToastContainer, showToast } from './components/Toast'

// Dans le return, ajouter <ToastContainer /> au début
// Dans fetchData, après avoir reçu les données :
const prevActive = activeClients.length
// ... fetch ...
const newActive = activeClients.length
if (newActive > prevActive) showToast(`${newActive - prevActive} nouveau(x) client(s) connecté(s)`, 'success')
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(alerts): add toast notification system"
```

---

## Module 3: Export CSV/JSON

### Task 3.1: Endpoint d'export backend

**Objective:** Créer des endpoints pour exporter les données

**Files:**
- Create: `backend/app/Http/Controllers/ExportController.php`
- Modify: `backend/routes/api.php`

**Step 1: Créer le controller**
```php
<?php
namespace App\Http\Controllers;

use App\Models\KnownClient;
use App\Models\DispatcharrEvent;
use App\Models\Channel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ExportController extends Controller
{
    public function clients(): Response
    {
        $clients = KnownClient::orderByDesc('total_sessions')->get();
        return $this->toCsv($clients, ['client_ip', 'username', 'country', 'country_code', 'total_sessions', 'first_seen', 'last_seen']);
    }

    public function events(): Response
    {
        $events = DispatcharrEvent::orderByDesc('created_at')->limit(5000)->get();
        return $this->toCsv($events, ['event_type', 'channel_name', 'client_ip', 'username', 'country', 'country_code', 'created_at']);
    }

    public function clientsJson(): JsonResponse
    {
        return response()->json(KnownClient::orderByDesc('total_sessions')->get());
    }

    public function eventsJson(): JsonResponse
    {
        return response()->json(DispatcharrEvent::orderByDesc('created_at')->limit(5000)->get());
    }

    private function toCsv($data, $columns): Response
    {
        $output = fopen('php://temp', 'r+');
        fputcsv($output, $columns);
        foreach ($data as $row) {
            fputcsv($output, array_map(fn($col) => $row->$col ?? '', $columns));
        }
        rewind($output);
        return response(stream_get_contents($output), 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="export.csv"',
        ]);
    }
}
```

**Step 2: Ajouter les routes**
```php
Route::prefix('export')->group(function () {
    Route::get('/clients', [ExportController::class, 'clients']);
    Route::get('/events', [ExportController::class, 'events']);
    Route::get('/clients/json', [ExportController::class, 'clientsJson']);
    Route::get('/events/json', [ExportController::class, 'eventsJson']);
});
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(export): add CSV/JSON export endpoints"
```

---

### Task 3.2: Boutons d'export côté frontend

**Objective:** Ajouter des boutons d'export dans les onglets

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Ajouter les boutons dans chaque onglet**
```jsx
// Dans l'onglet Clients, après la barre de recherche :
<a href={`${API}/export/clients`} style={{
    background: 'var(--bg2)', border: '1px solid var(--border)',
    padding: '6px 12px', borderRadius: 6, fontSize: 12, color: 'var(--t2)',
    textDecoration: 'none', marginLeft: 'auto'
}}>📥 Export CSV</a>

// Même chose pour l'onglet Événements avec /export/events
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat(export): add CSV export buttons in UI"
```

---

## Module 4: Filtres avancés événements

### Task 4.1: Filtres avancés pour les événements

**Objective:** Ajouter des filtres par date, type, chaîne, pays

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Ajouter les states de filtres**
```jsx
const [eventFilter, setEventFilter] = useState({ type: '', dateFrom: '', dateTo: '', channel: '' })
```

**Step 2: Ajouter la barre de filtres dans l'onglet Événements**
```jsx
<div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
    <input type="text" placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--t1)', padding: '6px 12px', borderRadius: 6, fontSize: 13, width: 200 }} />
    <select value={eventFilter.type} onChange={e => setEventFilter(f => ({...f, type: e.target.value}))}
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--t1)', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>
        <option value="">Tous les types</option>
        {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
    <input type="date" value={eventFilter.dateFrom} onChange={e => setEventFilter(f => ({...f, dateFrom: e.target.value}))}
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--t1)', padding: '6px 12px', borderRadius: 6, fontSize: 13 }} />
    <span style={{ color: 'var(--t3)' }}>→</span>
    <input type="date" value={eventFilter.dateTo} onChange={e => setEventFilter(f => ({...f, dateTo: e.target.value}))}
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--t1)', padding: '6px 12px', borderRadius: 6, fontSize: 13 }} />
    <span style={{ fontSize: 12, color: 'var(--t3)' }}>{filteredEvents.length} résultats</span>
</div>
```

**Step 3: Filtrer les résultats**
```jsx
const filteredEvents = events.filter(ev => {
    if (search && !ev.event_type?.includes(search) && !ev.channel_name?.includes(search) && !ev.client_ip?.includes(search) && !ev.username?.includes(search)) return false
    if (eventFilter.type && ev.event_type !== eventFilter.type) return false
    if (eventFilter.dateFrom && new Date(ev.created_at) < new Date(eventFilter.dateFrom)) return false
    if (eventFilter.dateTo && new Date(ev.created_at) > new Date(eventFilter.dateTo + 'T23:59:59')) return false
    return true
})
```

**Step 4: Commit**
```bash
git add -A && git commit -m "feat(events): add advanced filters (type, date range)"
```

---

## Module 5: Top chaînes & Top clients (Tableaux)

### Task 5.1: Tableau top chaînes

**Objective:** Afficher un classement des chaînes les plus regardées

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Ajouter un onglet "Stats" ou section dans le Dashboard**
```jsx
// Ajouter après les graphiques dans le dashboard :
<div className="sec" style={{ marginTop: 24 }}>
    <div className="sec-hdr"><h2>🏆 Top Chaînes (7 jours)</h2></div>
    <table>
        <thead><tr><th>#</th><th>Chaîne</th><th>Connexions</th></tr></thead>
        <tbody>
            {topChannels.map((ch, i) => (
                <tr key={i}>
                    <td style={{ fontWeight: 700, color: i < 3 ? 'var(--orange)' : 'var(--t3)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{ch.channel_name}</td>
                    <td style={{ fontWeight: 700, color: 'var(--blue)' }}>{ch.total}</td>
                </tr>
            ))}
        </tbody>
    </table>
</div>
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat(stats): add top channels ranking table"
```

---

## Module 6: Mode sombre/clair

### Task 6.1: Toggle thème

**Objective:** Ajouter un bouton pour basculer entre mode sombre et clair

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/App.jsx`

**Step 1: Ajouter les variables CSS pour le mode clair**
```css
[data-theme="light"] {
    --bg0: #f8fafc;
    --bg1: #ffffff;
    --bg2: #f1f5f9;
    --bg3: #e2e8f0;
    --bg-card: #ffffff;
    --border: #e2e8f0;
    --t1: #1e293b;
    --t2: #475569;
    --t3: #94a3b8;
}
```

**Step 2: Ajouter le toggle dans App.jsx**
```jsx
const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
}, [theme])

// Dans le header, ajouter un bouton :
<button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
    style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--t2)',
    padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
    {theme === 'dark' ? '☀️' : '🌙'}
</button>
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(theme): add dark/light mode toggle"
```

---

## Module 7: Multi-utilisateur (Login)

### Task 7.1: Modèle User et migration

**Objective:** Créer le système d'authentification

**Files:**
- Create: `backend/app/Models/User.php`
- Create: `backend/database/migrations/2024_01_02_000001_create_users_table.php`
- Modify: `backend/routes/api.php`

**Step 1: Créer la migration**
```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->string('password');
    $table->string('role')->default('viewer'); // admin, viewer
    $table->rememberToken();
    $table->timestamps();
});
```

**Step 2: Créer le model User**
```php
<?php
namespace App\Models;
use Illuminate\Foundation\Auth\User as Authenticatable;
class User extends Authenticatable {
    protected $fillable = ['name', 'email', 'password', 'role'];
    protected $hidden = ['password', 'remember_token'];
    protected $casts = ['password' => 'hashed'];
}
```

**Step 3: Créer le controller Auth**
```php
// backend/app/Http/Controllers/AuthController.php
public function login(Request $request) {
    $credentials = $request->validate(['email' => 'required|email', 'password' => 'required']);
    if (!Auth::attempt($credentials)) {
        return response()->json(['error' => 'Identifiants incorrects'], 401);
    }
    $token = Auth::user()->createToken('auth-token')->plainTextToken;
    return response()->json(['token' => $token, 'user' => Auth::user()]);
}
```

**Step 4: Ajouter les routes**
```php
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']); // admin only
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
});
```

**Step 5: Commit**
```bash
git add -A && git commit -m "feat(auth): add User model, login, register endpoints"
```

---

### Task 7.2: Page de login frontend

**Objective:** Créer la page de connexion

**Files:**
- Create: `frontend/src/components/Login.jsx`
- Modify: `frontend/src/App.jsx`

**Step 1: Créer Login.jsx**
```jsx
import { useState } from 'react'
const API = '/api'

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
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
            setError('Erreur de connexion')
        }
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <form onSubmit={handleSubmit} style={{
                background: 'var(--bg1)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 32, width: 360
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: 24 }}>📊 DispatchMon</h2>
                {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg2)', color: 'var(--t1)', fontSize: 13, marginBottom: 12 }} />
                <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg2)', color: 'var(--t1)', fontSize: 13, marginBottom: 16 }} />
                <button type="submit" style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                    background: 'var(--blue)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Se connecter
                </button>
            </form>
        </div>
    )
}
```

**Step 2: Modifier App.jsx pour gérer l'auth**
```jsx
const [user, setUser] = useState(null)

useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
        fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(data => data && setUser(data))
            .catch(() => {})
    }
}, [])

if (!user) return <Login onLogin={setUser} />
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(auth): add login page and auth flow"
```

---

## Module 8: API Key

### Task 8.1: Protection API par clé

**Objective:** Ajouter une protection par API key pour les endpoints sensibles

**Files:**
- Create: `backend/app/Http/Middleware/ApiKeyMiddleware.php`
- Modify: `backend/routes/api.php`

**Step 1: Créer le middleware**
```php
<?php
namespace App\Http\Middleware;
use Closure;
use Illuminate\Http\Request;

class ApiKeyMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $apiKey = config('app.api_key');
        if ($apiKey && $request->header('X-API-Key') !== $apiKey) {
            return response()->json(['error' => 'API key invalide'], 403);
        }
        return $next($request);
    }
}
```

**Step 2: Ajouter dans config/app.php**
```php
'api_key' => env('API_KEY', ''),
```

**Step 3: Appliquer aux routes sensibles**
```php
Route::middleware('api.key')->group(function () {
    Route::delete('/stats/all', [StatsController::class, 'clearAll']);
    Route::post('/update', [UpdateController::class, 'update']);
});
```

**Step 4: Commit**
```bash
git add -A && git commit -m "feat(security): add API key middleware for sensitive endpoints"
```

---

## Module 9: Webhooks personnalisés (Discord, Slack)

### Task 9.1: Service de notifications multi-canaux

**Objective:** Permettre d'envoyer des notifications vers Discord, Slack, et webhook custom

**Files:**
- Create: `backend/app/Services/NotificationService.php`
- Modify: `backend/app/Http/Controllers/SettingsController.php`

**Step 1: Créer le service**
```php
<?php
namespace App\Services;

class NotificationService
{
    public function sendDiscord(string $webhookUrl, string $message): bool
    {
        $response = \Illuminate\Support\Facades\Http::timeout(5)
            ->post($webhookUrl, ['content' => $message]);
        return $response->successful();
    }

    public function sendSlack(string $webhookUrl, string $message): bool
    {
        $response = \Illuminate\Support\Facades\Http::timeout(5)
            ->post($webhookUrl, ['text' => $message]);
        return $response->successful();
    }

    public function sendCustom(string $webhookUrl, array $data): bool
    {
        $response = \Illuminate\Support\Facades\Http::timeout(5)
            ->post($webhookUrl, $data);
        return $response->successful();
    }
}
```

**Step 2: Ajouter les settings**
```php
// Dans la table settings, ajouter :
'discord_webhook' => '',
'slack_webhook' => '',
'custom_webhook' => '',
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(webhooks): add Discord, Slack, custom webhook support"
```

---

## Module 10: Monitoring système

### Task 10.1: Endpoint stats système

**Objective:** Afficher CPU, RAM, espace disque du serveur

**Files:**
- Create: `backend/app/Http/Controllers/SystemController.php`
- Modify: `backend/routes/api.php`

**Step 1: Créer le controller**
```php
<?php
namespace App\Http\Controllers;

class SystemController extends Controller
{
    public function index()
    {
        $cpu = sys_getloadavg();
        $disk = disk_free_space('/');
        $diskTotal = disk_total_space('/');
        $mem = memory_get_usage(true);

        return response()->json([
            'cpu' => ['load_1m' => $cpu[0], 'load_5m' => $cpu[1], 'load_15m' => $cpu[2]],
            'disk' => [
                'free' => $disk,
                'total' => $diskTotal,
                'used' => $diskTotal - $disk,
                'percent' => round(($diskTotal - $disk) / $diskTotal * 100, 1),
            ],
            'memory' => [
                'used' => $mem,
                'total' => memory_get_peak_usage(true),
            ],
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
        ]);
    }
}
```

**Step 2: Ajouter la route**
```php
Route::get('/system', [SystemController::class, 'index']);
```

**Step 3: Afficher dans le dashboard**
```jsx
// Ajouter une section dans le Dashboard :
<div className="sec">
    <div className="sec-hdr"><h2>🖥️ Système</h2></div>
    <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>CPU</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{systemInfo.cpu?.load_1m?.toFixed(2)}</div>
        </div>
        <div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>Disque</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{systemInfo.disk?.percent}%</div>
            <div style={{ height: 4, background: 'var(--bg2)', borderRadius: 2, marginTop: 4 }}>
                <div style={{ height: '100%', width: `${systemInfo.disk?.percent}%`, background: 'var(--blue)', borderRadius: 2 }} />
            </div>
        </div>
        <div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>PHP</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{systemInfo.php_version}</div>
        </div>
    </div>
</div>
```

**Step 4: Commit**
```bash
git add -A && git commit -m "feat(monitoring): add system stats (CPU, disk, PHP version)"
```

---

## Module 11: Backup automatique (Cron)

### Task 11.1: Commande artisan pour backup automatique

**Objective:** Créer une commande artisan pour sauvegardes planifiées

**Files:**
- Create: `backend/app/Console/Commands/AutoBackup.php`
- Modify: `backend/app/Console/Kernel.php`

**Step 1: Créer la commande**
```php
<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Http\Controllers\BackupController;

class AutoBackup extends Command
{
    protected $signature = 'backup:auto';
    protected $description = 'Créer une sauvegarde automatique';

    public function handle()
    {
        $controller = new BackupController();
        $result = $controller->create();
        $this->info("Backup créé: " . $result->getContent());
    }
}
```

**Step 2: Ajouter le cron dans Kernel.php**
```php
protected function schedule(Schedule $schedule)
{
    $schedule->command('backup:auto')->daily()->at('03:00');
}
```

**Step 3: Ajouter le toggle dans les settings**
```jsx
// Dans l'onglet Général, ajouter :
<label>
    <input type="checkbox" checked={settings.auto_backup === '1'}
        onChange={e => setSettings(s => ({...s, auto_backup: e.target.checked ? '1' : '0'}))} />
    Backup automatique quotidien (3h00)
</label>
```

**Step 4: Commit**
```bash
git add -A && git commit -m "feat(backup): add automatic daily backup at 3am"
```

---

## Module 12: Historique par jour (Graphe)

### Task 12.1: Graphe des viewers par heure sur 7 jours

**Objective:** Afficher l'historique des viewers sur les derniers 7 jours

**Files:**
- Modify: `backend/app/Http/Controllers/StatsController.php`
- Modify: `frontend/src/App.jsx`

**Step 1: Endpoint backend**
```php
public function timelineWeekly(): JsonResponse
{
    $days = 7;
    $data = [];
    for ($i = $days - 1; $i >= 0; $i--) {
        $date = now()->subDays($i)->startOfDay();
        $count = DispatcharrEvent::where('event_type', 'client_connect')
            ->where('created_at', '>=', $date)
            ->where('created_at', '<', $date->copy()->endOfDay())
            ->count();
        $data[] = ['date' => $date->format('d/m'), 'connections' => $count];
    }
    return response()->json($data);
}
```

**Step 2: Ajouter la route**
```php
Route::get('/timeline/weekly', [StatsController::class, 'timelineWeekly']);
```

**Step 3: Graphe frontend**
```jsx
// Ajouter un graphique Line pour les 7 derniers jours
<Line data={{
    labels: weeklyData.map(d => d.date),
    datasets: [{
        label: 'Connexions/jour',
        data: weeklyData.map(d => d.connections),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
        fill: true,
    }]
}} />
```

**Step 4: Commit**
```bash
git add -A && git commit -m "feat(stats): add weekly connections graph"
```

---

## Module 13: Carte géo (Bonus)

### Task 13.1: Visualisation géographique

**Objective:** Afficher les connexions sur une carte

**Files:**
- Create: `frontend/src/components/GeoMap.jsx`

**Step 1: Utiliser react-simple-maps**
```bash
cd ~/DispatchMon/frontend && npm install react-simple-maps
```

**Step 2: Créer le composant GeoMap**
```jsx
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const COUNTRY_COORDS = {
    MA: [-5.8, 32.3], FR: [2.2, 46.6], US: [-95.7, 37.1],
    GB: [-3.4, 55.4], BR: [-51.9, -14.2], IN: [78.9, 20.6],
    EG: [30.8, 26.8], SA: [45.1, 23.9], IT: [12.6, 41.9],
    DZ: [1.7, 28.0],
}

export default function GeoMap({ clients }) {
    const countryCounts = {}
    clients.forEach(c => {
        if (c.country_code) {
            countryCounts[c.country_code] = (countryCounts[c.country_code] || 0) + 1
        }
    })

    return (
        <ComposableMap projection="geoMercator" style={{ width: '100%', height: 300 }}>
            <Geographies geography={GEO_URL}>
                {({ geographies }) => geographies.map(geo => (
                    <Geography key={geo.rsmKey} geography={geo}
                        fill="#1e2d3d" stroke="#30363d" />
                ))}
            </Geographies>
            {Object.entries(countryCounts).map(([code, count]) => {
                const coords = COUNTRY_COORDS[code]
                if (!coords) return null
                return (
                    <Marker key={code} coordinates={coords}>
                        <circle r={Math.min(count * 3, 20)} fill="#3b82f6" opacity={0.7} />
                        <text textAnchor="middle" y={-10} style={{ fontSize: 10, fill: '#e2e8f0' }}>
                            {code} ({count})
                        </text>
                    </Marker>
                )
            })}
        </ComposableMap>
    )
}
```

**Step 3: Intégrer dans le Dashboard**
```jsx
<div className="sec">
    <div className="sec-hdr"><h2>🌍 Clients par pays</h2></div>
    <div style={{ padding: 16 }}>
        <GeoMap clients={knownClients} />
    </div>
</div>
```

**Step 4: Commit**
```bash
git add -A && git commit -m "feat(geo): add geographic map visualization"
```

---

## Résumé des modules

| # | Module | Priorité | Estimé |
|---|--------|----------|--------|
| 1 | Dashboard global (graphiques) | 🔴 Haute | 4 tasks |
| 2 | Alertes toast | 🔴 Haute | 1 task |
| 3 | Export CSV/JSON | 🔴 Haute | 2 tasks |
| 4 | Filtres avancés | 🟡 Moyenne | 1 task |
| 5 | Top chaînes/clients | 🟡 Moyenne | 1 task |
| 6 | Mode sombre/clair | 🟡 Moyenne | 1 task |
| 7 | Multi-utilisateur (login) | 🟡 Moyenne | 2 tasks |
| 8 | API Key | 🟢 Bonus | 1 task |
| 9 | Webhooks (Discord/Slack) | 🟢 Bonus | 1 task |
| 10 | Monitoring système | 🟢 Bonus | 1 task |
| 11 | Backup automatique | 🟢 Bonus | 1 task |
| 12 | Historique 7 jours | 🟢 Bonus | 1 task |
| 13 | Carte géo | 🟢 Bonus | 1 task |

**Total : 19 tasks, ~13 modules**

---

## Ordre d'implémentation recommandé

1. Module 1 (Dashboard) — base de tout
2. Module 2 (Toast) — améliore l'UX immédiatement
3. Module 3 (Export) — utile au quotidien
4. Module 4 (Filtres) — rend les événements exploitables
5. Module 5 (Top) — complète le dashboard
6. Module 10 (Monitoring) — infos serveur utiles
7. Module 6 (Thème) — confort visuel
8. Module 7 (Login) — sécurité
9. Module 8 (API Key) — sécurité avancée
10. Module 11 (Backup auto) — fiabilité
11. Module 9 (Webhooks) — notifications avancées
12. Module 12 (Historique) — analytics
13. Module 13 (Carte géo) — bonus visuel

---

## Vérification finale

Après chaque module :
1. `docker compose up -d --build` — rebuild les containers
2. Tester tous les endpoints avec curl
3. Vérifier le frontend dans le navigateur
4. Commit et push sur GitHub
