<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\BackupController;
use App\Http\Controllers\VersionController;
use App\Http\Controllers\UpdateController;

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
    Route::get('/timeline/hourly', [StatsController::class, 'timelineHourly']);
    Route::get('/timeline/weekly', [StatsController::class, 'timelineWeekly']);
    Route::get('/top/channels', [StatsController::class, 'topChannels']);
    Route::get('/top/clients', [StatsController::class, 'topClients']);
    Route::delete('/events', [StatsController::class, 'purge']);
    Route::delete('/all', [StatsController::class, 'clearAll']);
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

// Backup API
Route::prefix('backups')->group(function () {
    Route::get('/', [BackupController::class, 'index']);
    Route::post('/', [BackupController::class, 'create']);
    Route::post('/{name}/restore', [BackupController::class, 'restore']);
    Route::get('/{name}/download', [BackupController::class, 'download']);
    Route::delete('/{name}', [BackupController::class, 'delete']);
});

// Version API
Route::get('/version', [VersionController::class, 'index']);
Route::get('/version/check', [VersionController::class, 'check']);

// Update API
Route::post('/update', [UpdateController::class, 'update']);

// Export API
Route::prefix('export')->group(function () {
    Route::get('/clients', [\App\Http\Controllers\ExportController::class, 'clients']);
    Route::get('/events', [\App\Http\Controllers\ExportController::class, 'events']);
    Route::get('/clients/json', [\App\Http\Controllers\ExportController::class, 'clientsJson']);
    Route::get('/events/json', [\App\Http\Controllers\ExportController::class, 'eventsJson']);
});

// System API
Route::get('/system', [\App\Http\Controllers\SystemController::class, 'index']);
