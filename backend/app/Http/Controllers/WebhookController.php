<?php

namespace App\Http\Controllers;

use App\Models\DispatcharrEvent;
use App\Models\Channel;
use App\Models\ActiveClient;
use App\Models\KnownClient;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\TelegramService;

class WebhookController extends Controller
{
    /**
     * Recevoir les webhooks de Dispatcharr
     * POST /api/webhook/dispatcharr
     */
    public function handle(Request $request): JsonResponse
    {
        $payload = $request->all();
        $eventType = $payload['event'] ?? $payload['event_type'] ?? 'unknown';

        // Sauvegarder l'événement brut
        $event = DispatcharrEvent::create([
            'event_type' => $eventType,
            'channel_name' => $payload['channel_name'] ?? null,
            'stream_name' => $payload['stream_name'] ?? null,
            'stream_url' => $payload['stream_url'] ?? $payload['channel_url'] ?? null,
            'provider_name' => $payload['provider_name'] ?? null,
            'profile_used' => $payload['profile_used'] ?? null,
            'client_ip' => $payload['client_ip'] ?? null,
            'client_id' => $payload['client_id'] ?? null,
            'user_agent' => $payload['user_agent'] ?? null,
            'username' => $payload['username'] ?? $payload['user'] ?? null,
            'runtime' => $payload['runtime'] ?? null,
            'total_bytes' => $payload['total_bytes'] ?? null,
            'duration' => $payload['duration'] ?? null,
            'bytes_sent' => $payload['bytes_sent'] ?? null,
            'error_type' => $payload['error_type'] ?? null,
            'error_message' => $payload['error_message'] ?? null,
            'reason' => $payload['reason'] ?? null,
            'source_name' => $payload['source_name'] ?? null,
            'programs' => $payload['programs'] ?? null,
            'channels_count' => $payload['channels'] ?? null,
            'account_name' => $payload['account_name'] ?? null,
            'streams_created' => $payload['streams_created'] ?? null,
            'streams_updated' => $payload['streams_updated'] ?? null,
            'streams_deleted' => $payload['streams_deleted'] ?? null,
            'content_name' => $payload['content_name'] ?? null,
            'content_uuid' => $payload['content_uuid'] ?? null,
            'raw_payload' => $payload,
            'dispatcharr_timestamp' => $payload['timestamp'] ?? now(),
        ]);

        // Traiter selon le type d'événement
        $this->processEvent($eventType, $payload, $event);

        return response()->json(['status' => 'ok', 'event_id' => $event->id]);
    }

    /**
     * Traiter l'événement pour mettre à jour les stats
     */
    private function processEvent(string $type, array $payload, DispatcharrEvent $event): void
    {
        $channelName = $payload['channel_name'] ?? null;

        switch ($type) {
            case 'channel_start':
                if ($channelName) {
                    Channel::updateOrCreate(
                        ['name' => $channelName],
                        [
                            'is_active' => true,
                            'current_viewers' => 0,
                            'last_seen' => now(),
                        ]
                    );
                }
                break;

            case 'channel_stop':
                if ($channelName) {
                    Channel::where('name', $channelName)->update([
                        'is_active' => false,
                        'current_viewers' => 0,
                    ]);
                }
                break;

            case 'client_connect':
                $clientIp = $payload['client_ip'] ?? null;
                $clientId = $payload['client_id'] ?? null;

                if ($clientId) {
                    // Détecter le pays depuis l'IP
                    $country = $this->detectCountry($clientIp);

                    ActiveClient::updateOrCreate(
                        ['client_id' => $clientId],
                        [
                            'channel_name' => $channelName ?? 'unknown',
                            'client_ip' => $clientIp,
                            'user_agent' => $payload['user_agent'] ?? null,
                            'username' => $payload['username'] ?? null,
                            'country' => $country['name'] ?? null,
                            'country_code' => $country['code'] ?? null,
                            'connected_at' => now(),
                        ]
                    );

                    // Enregistrer dans known_clients (persiste après déconnexion)
                    if ($clientIp) {
                        $known = KnownClient::firstOrCreate(
                            ['client_ip' => $clientIp],
                            [
                                'username' => $payload['username'] ?? null,
                                'country' => $country['name'] ?? null,
                                'country_code' => $country['code'] ?? null,
                                'first_seen' => now(),
                            ]
                        );
                        $known->update([
                            'last_seen' => now(),
                            'total_sessions' => $known->total_sessions + 1,
                            'username' => $payload['username'] ?? $known->username,
                        ]);
                    }

                    $this->updateViewerCount($channelName);
                }
                break;

            case 'client_disconnect':
                if ($payload['client_id'] ?? null) {
                    ActiveClient::where('client_id', $payload['client_id'])->delete();
                    $this->updateViewerCount($channelName);
                }
                break;
        }

        // Envoyer notification Telegram
        $telegram = new TelegramService();
        $eventData = array_merge($payload, [
            'country' => $event->country ?? null,
            'country_code' => $event->country_code ?? null,
        ]);
        $telegram->notifyEvent($type, $eventData);
    }

    /**
     * Mettre à jour le compteur de viewers d'une chaîne
     */
    private function updateViewerCount(?string $channelName): void
    {
        if (!$channelName) return;
        $count = ActiveClient::where('channel_name', $channelName)->count();
        Channel::where('name', $channelName)->update(['current_viewers' => $count]);
    }

    /**
     * Détecter le pays depuis l'IP (fallback: inconnu)
     * Utilise une table de mapping IP→country basique
     */
    private function detectCountry(?string $ip): ?array
    {
        if (!$ip) return null;

        // IP privées = Maroc par défaut (ou local)
        if (str_starts_with($ip, '192.168.') || str_starts_with($ip, '10.') || str_starts_with($ip, '172.')) {
            return ['code' => 'MA', 'name' => 'Maroc'];
        }

        // Pour les IPs publiques, fallback basique
        // En prod, utiliser un service comme ip-api.com ou MaxMind
        return ['code' => 'XX', 'name' => 'Inconnu'];
    }
}
