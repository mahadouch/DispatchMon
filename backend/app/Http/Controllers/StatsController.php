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
        $events = DispatcharrEvent::leftJoin('known_clients', 'dispatchmoon_events.client_ip', '=', 'known_clients.client_ip')
            ->select(
                'dispatchmoon_events.*',
                'known_clients.country',
                'known_clients.country_code',
            )
            ->orderByDesc('dispatchmoon_events.created_at')
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
}
