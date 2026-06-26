<?php

namespace App\Http\Controllers;

use App\Models\DispatcharrEvent;
use App\Models\Channel;
use App\Models\ActiveClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class StatsController extends Controller
{
    /**
     * GET /api/stats/summary
     */
    public function summary(): JsonResponse
    {
        $totalChannels = Channel::count();
        $activeChannels = Channel::where('is_active', true)->count();
        $totalViewers = ActiveClient::count();
        $totalEvents = DispatcharrEvent::count();
        $events24h = DispatcharrEvent::where('created_at', '>=', now()->subDay())->count();
        $errors24h = DispatcharrEvent::where('event_type', 'like', '%error%')
            ->where('created_at', '>=', now()->subDay())->count();

        return response()->json([
            'total_channels' => $totalChannels,
            'active_channels' => $activeChannels,
            'total_viewers' => $totalViewers,
            'total_events' => $totalEvents,
            'events_24h' => $events24h,
            'errors_24h' => $errors24h,
        ]);
    }

    /**
     * GET /api/stats/channels
     */
    public function channels(): JsonResponse
    {
        $channels = Channel::orderByDesc('current_viewers')
            ->orderByDesc('last_seen')
            ->get();

        // Enrichir chaque chaîne avec la liste des clients actifs
        foreach ($channels as $channel) {
            $channel->active_clients_list = ActiveClient::where('channel_name', $channel->name)
                ->select('client_ip', 'username', 'country', 'country_code', 'connected_at')
                ->orderByDesc('connected_at')
                ->get();
        }

        return response()->json($channels);
    }

    /**
     * GET /api/stats/events
     */
    public function events(): JsonResponse
    {
        $events = DispatcharrEvent::leftJoin('known_clients', 'dispatcharr_events.client_ip', '=', 'known_clients.client_ip')
            ->select(
                'dispatcharr_events.*',
                'known_clients.country',
                'known_clients.country_code',
            )
            ->orderByDesc('dispatcharr_events.created_at')
            ->limit(200)
            ->get();

        return response()->json($events);
    }

    /**
     * GET /api/stats/events/by-type
     */
    public function eventsByType(): JsonResponse
    {
        $events = DispatcharrEvent::select('event_type', DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subDay())
            ->groupBy('event_type')
            ->orderByDesc('count')
            ->get();

        return response()->json($events);
    }

    /**
     * GET /api/stats/clients
     */
    public function clients(): JsonResponse
    {
        $clients = ActiveClient::orderByDesc('connected_at')->get();
        return response()->json($clients);
    }

    /**
     * GET /api/stats/timeline
     * Événements par heure sur les dernières 24h
     */
    public function timeline(): JsonResponse
    {
        $events = DispatcharrEvent::select(
            DB::raw("strftime('%Y-%m-%d %H:00', created_at) as hour"),
            'event_type',
            DB::raw('count(*) as count')
        )
            ->where('created_at', '>=', now()->subDay())
            ->groupBy('hour', 'event_type')
            ->orderBy('hour')
            ->get();

        return response()->json($events);
    }

    /**
     * GET /api/stats/m3u
     */
    public function m3u(): JsonResponse
    {
        $accounts = DispatcharrEvent::where('event_type', 'm3u_refresh')
            ->select('account_name', DB::raw('count(*) as refresh_count'), DB::raw('max(created_at) as last_refresh'))
            ->groupBy('account_name')
            ->get();

        return response()->json($accounts);
    }

    /**
     * DELETE /api/stats/events
     * Purger les anciens événements
     */
    public function purge(): JsonResponse
    {
        $deleted = DispatcharrEvent::where('created_at', '<', now()->subDays(30))->delete();
        return response()->json(['deleted' => $deleted]);
    }

    /**
     * GET /api/stats/timeline/hourly
     * Nombre de viewers par heure sur les dernières 24h
     */
    public function timelineHourly(): JsonResponse
    {
        $data = [];
        for ($i = 23; $i >= 0; $i--) {
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

    /**
     * GET /api/stats/timeline/weekly
     * Nombre de connexions par jour sur les 7 derniers jours
     */
    public function timelineWeekly(): JsonResponse
    {
        $data = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->startOfDay();
            $count = DispatcharrEvent::where('event_type', 'client_connect')
                ->where('created_at', '>=', $date)
                ->where('created_at', '<', $date->copy()->endOfDay())
                ->count();
            $data[] = [
                'date' => $date->format('d/m'),
                'connections' => $count,
            ];
        }
        return response()->json($data);
    }

    /**
     * GET /api/stats/top/channels
     * Top 10 chaînes par nombre de connexions (7 jours)
     */
    public function topChannels(): JsonResponse
    {
        $top = DispatcharrEvent::where('event_type', 'client_connect')
            ->select('channel_name', \DB::raw('count(*) as total'))
            ->where('created_at', '>=', now()->subDays(7))
            ->whereNotNull('channel_name')
            ->groupBy('channel_name')
            ->orderByDesc('total')
            ->limit(10)
            ->get();
        return response()->json($top);
    }

    /**
     * GET /api/stats/top/clients
     * Top 10 clients par nombre de sessions
     */
    public function topClients(): JsonResponse
    {
        $top = \App\Models\KnownClient::orderByDesc('total_sessions')
            ->limit(10)
            ->get(['client_ip', 'username', 'country', 'country_code', 'total_sessions']);
        return response()->json($top);
    }

    /**
     * DELETE /api/stats/all
     * Vider toutes les statistiques
     */
    public function clearAll(): JsonResponse
    {
        DispatcharrEvent::truncate();
        ActiveClient::truncate();
        Channel::truncate();
        \App\Models\KnownClient::query()->delete();

        return response()->json([
            'status' => 'ok',
            'message' => 'Toutes les statistiques ont été vidées',
        ]);
    }
}
