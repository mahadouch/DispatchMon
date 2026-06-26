<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Services\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * GET /api/settings
     */
    public function index(): JsonResponse
    {
        $settings = Setting::allAsArray();
        return response()->json($settings);
    }

    /**
     * PUT /api/settings
     * Met à jour plusieurs settings d'un coup
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->all();

        foreach ($data as $key => $value) {
            Setting::set($key, $value);
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * POST /api/settings/telegram/test
     * Tester la connexion Telegram
     */
    public function testTelegram(): JsonResponse
    {
        $telegram = new TelegramService();
        $result = $telegram->test();

        return response()->json($result);
    }
}
