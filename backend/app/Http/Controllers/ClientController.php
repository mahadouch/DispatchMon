<?php

namespace App\Http\Controllers;

use App\Models\ActiveClient;
use App\Models\KnownClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    /**
     * GET /api/clients
     * Liste tous les clients connus avec leur statut payé
     */
    public function index(): JsonResponse
    {
        $clients = KnownClient::orderByDesc('last_seen')->get();
        return response()->json($clients);
    }

    /**
     * GET /api/clients/active
     * Clients actuellement connectés
     */
    public function active(): JsonResponse
    {
        $clients = ActiveClient::orderByDesc('connected_at')->get();
        return response()->json($clients);
    }

    /**
     * PUT /api/clients/{id}/pay
     * Marquer un client comme payé
     */
    public function markPaid($id): JsonResponse
    {
        $client = KnownClient::findOrFail($id);
        $client->update(['is_paid' => true]);
        return response()->json(['status' => 'ok', 'client' => $client]);
    }

    /**
     * PUT /api/clients/{id}/unpay
     * Retirer le statut payé
     */
    public function markUnpaid($id): JsonResponse
    {
        $client = KnownClient::findOrFail($id);
        $client->update(['is_paid' => false]);
        return response()->json(['status' => 'ok', 'client' => $client]);
    }

    /**
     * POST /api/clients/batch-pay
     * Marquer plusieurs clients comme payés
     */
    public function batchPay(Request $request): JsonResponse
    {
        $ids = $request->input('ids', []);
        KnownClient::whereIn('id', $ids)->update(['is_paid' => true]);
        return response()->json(['status' => 'ok', 'updated' => count($ids)]);
    }

    /**
     * GET /api/clients/stats
     * Stats des clients
     */
    public function stats(): JsonResponse
    {
        $total = KnownClient::count();
        $paid = KnownClient::where('is_paid', true)->count();
        $active = ActiveClient::count();
        $countries = KnownClient::select('country_code', 'country')
            ->whereNotNull('country_code')
            ->groupBy('country_code', 'country')
            ->selectRaw('country_code, country, count(*) as count')
            ->orderByDesc('count')
            ->get();

        return response()->json([
            'total_known' => $total,
            'paid' => $paid,
            'unpaid' => $total - $paid,
            'active_now' => $active,
            'countries' => $countries,
        ]);
    }
}
