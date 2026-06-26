<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\SettingsController;

// Webhook endpoint (no auth needed - Dispatcharr calls this)
Route::post('/webhook/dispatcharr', [WebhookController::class, 'handle']);

// Stats API
Route::prefix('stats')->group(function () {
    Route::get('/summary', [StatsController::class, 'summary']);
    Route::get('/channels', [StatsController::class, 'channels']);
    Route::get('/events', [StatsController::class, 'events']);
    Route::get('/events/by-type', [StatsController::class, 'eventsByType']);
    Route::get('/clients', [StatsController::class, 'clients']);
    Route::get('/timeline', [StatsController::class, 'timeline']);
    Route::get('/m3u', [StatsController::class, 'm3u']);
    Route::delete('/events', [StatsController::class, 'purge']);
});

// Client management API
Route::prefix('clients')->group(function () {
    Route::get('/', [ClientController::class, 'index']);
    Route::get('/active', [ClientController::class, 'active']);
    Route::get('/stats', [ClientController::class, 'stats']);
    Route::put('/{id}/pay', [ClientController::class, 'markPaid']);
    Route::put('/{id}/unpay', [ClientController::class, 'markUnpaid']);
    Route::post('/batch-pay', [ClientController::class, 'batchPay']);
});

// Settings API
Route::prefix('settings')->group(function () {
    Route::get('/', [SettingsController::class, 'index']);
    Route::put('/', [SettingsController::class, 'update']);
    Route::post('/telegram/test', [SettingsController::class, 'testTelegram']);
});
