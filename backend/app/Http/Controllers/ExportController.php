<?php

namespace App\Http\Controllers;

use App\Models\KnownClient;
use App\Models\DispatcharrEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ExportController extends Controller
{
    /**
     * GET /api/export/clients
     * Export clients en CSV
     */
    public function clients(): Response
    {
        $clients = KnownClient::orderByDesc('total_sessions')->get();
        return $this->toCsv($clients, [
            'client_ip', 'username', 'country', 'country_code',
            'total_sessions', 'first_seen', 'last_seen'
        ]);
    }

    /**
     * GET /api/export/events
     * Export événements en CSV
     */
    public function events(): Response
    {
        $events = DispatcharrEvent::orderByDesc('created_at')->limit(5000)->get();
        return $this->toCsv($events, [
            'event_type', 'channel_name', 'client_ip', 'username',
            'country', 'country_code', 'created_at'
        ]);
    }

    /**
     * GET /api/export/clients/json
     * Export clients en JSON
     */
    public function clientsJson(): JsonResponse
    {
        return response()->json(KnownClient::orderByDesc('total_sessions')->get());
    }

    /**
     * GET /api/export/events/json
     * Export événements en JSON
     */
    public function eventsJson(): JsonResponse
    {
        return response()->json(
            DispatcharrEvent::orderByDesc('created_at')->limit(5000)->get()
        );
    }

    /**
     * Convertir en CSV
     */
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
