<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\ActiveClient;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    private string $botToken;
    private string $chatId;

    public function __construct()
    {
        // Priorité: DB settings > env vars
        $this->botToken = Setting::get('telegram_bot_token', '') ?: env('TELEGRAM_BOT_TOKEN', '');
        $this->chatId = Setting::get('telegram_chat_id', '') ?: env('TELEGRAM_CHAT_ID', '');
    }

    /**
     * Vérifier si Telegram est configuré et activé
     */
    public function isConfigured(): bool
    {
        $enabled = Setting::get('telegram_enabled', null) ?? env('TELEGRAM_ENABLED', '0');
        return $enabled === '1'
            && !empty($this->botToken)
            && !empty($this->chatId);
    }

    /**
     * Envoyer un message texte via Telegram Bot API
     */
    public function send(string $message, string $parseMode = 'HTML'): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        try {
            $response = Http::timeout(10)->post(
                "https://api.telegram.org/bot{$this->botToken}/sendMessage",
                [
                    'chat_id' => $this->chatId,
                    'text' => $message,
                    'parse_mode' => $parseMode,
                    'disable_web_page_preview' => true,
                ]
            );

            if ($response->successful()) {
                return true;
            }

            Log::warning('Telegram API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return false;
        } catch (\Exception $e) {
            Log::error('Telegram send failed', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Tester la connexion Telegram (envoyer un message test)
     */
    public function test(): array
    {
        if (empty($this->botToken)) {
            return ['ok' => false, 'error' => 'Bot token manquant'];
        }
        if (empty($this->chatId)) {
            return ['ok' => false, 'error' => 'Chat ID manquant'];
        }

        // D'abord vérifier que le bot est valide
        try {
            $me = Http::timeout(10)->get("https://api.telegram.org/bot{$this->botToken}/getMe");
            if (!$me->successful()) {
                return ['ok' => false, 'error' => 'Token invalide ou bot introuvable'];
            }
            $botName = $me->json('result.username', 'unknown');
        } catch (\Exception $e) {
            return ['ok' => false, 'error' => 'Impossible de contacter Telegram: ' . $e->getMessage()];
        }

        // Envoyer le message test
        $sent = $this->send(
            "🔔 <b>DispatchMon</b>\n\n" .
            "✅ Notification Telegram configurée avec succès !\n\n" .
            "🤖 Bot: @{$botName}\n" .
            "💬 Chat ID: {$this->chatId}\n" .
            "⏰ " . now()->format('d/m/Y H:i:s')
        );

        if ($sent) {
            return ['ok' => true, 'bot' => $botName];
        }
        return ['ok' => false, 'error' => 'Impossible d\'envoyer le message. Vérifiez le Chat ID.'];
    }

    /**
     * Formatter et envoyer une notification d'événement
     */
    public function notifyEvent(string $eventType, array $data): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        // Vérifier si ce type d'événement est notifié
        $settingKey = 'notify_' . $this->mapEventType($eventType);
        if (Setting::get($settingKey, '0') !== '1') {
            return false;
        }

        $message = $this->formatEvent($eventType, $data);
        return $this->send($message);
    }

    /**
     * Mapper les types d'événements Dispatcharr vers les clés de settings
     */
    private function mapEventType(string $eventType): string
    {
        return match ($eventType) {
            'client_connect' => 'client_connect',
            'client_disconnect' => 'client_disconnect',
            'channel_start' => 'channel_start',
            'channel_stop' => 'channel_stop',
            'channel_error' => 'channel_error',
            'channel_reconnect' => 'channel_reconnect',
            'channel_failover' => 'channel_failover',
            'stream_switch' => 'stream_switch',
            'm3u_refresh' => 'm3u_refresh',
            'epg_refresh' => 'epg_refresh',
            'login_failed' => 'login_failed',
            'recording_start' => 'recording_start',
            'recording_end' => 'recording_end',
            'vod_start' => 'vod_start',
            'vod_stop' => 'vod_stop',
            default => $eventType,
        };
    }

    /**
     * Formatter un message d'événement pour Telegram
     */
    private function formatEvent(string $eventType, array $data): string
    {
        $channel = $data['channel_name'] ?? '—';
        $clientIp = $data['client_ip'] ?? null;
        $username = $data['username'] ?? null;
        $country = $data['country'] ?? null;
        $countryCode = $data['country_code'] ?? null;
        $error = $data['error_message'] ?? null;

        $client = $username ?: $clientIp ?: '—';
        $flag = $countryCode ? $this->flagEmoji($countryCode) : '🌍';
        $pays = $country ? " {$flag} {$country}" : '';
        $date = now()->format('d/m/Y H:i');

        $msg = match ($eventType) {
            'client_connect' => "🟢 <b>Nouveau client</b>\n👤 {$client}{$pays}\n📺 {$channel}",
            'client_disconnect' => "🔴 <b>Déconnexion</b>\n👤 {$client}{$pays}\n📺 {$channel}",
            'channel_start' => $this->formatChannelStart($data),
            'channel_stop' => "⏹️ <b>Chaîne arrêtée</b>\n📺 {$channel}\n⏱️ " . ($data['runtime'] ?? '—') . "s\n📦 " . ($data['total_bytes'] ? number_format($data['total_bytes'] / 1048576, 1) . ' MB' : '—'),
            'channel_error' => "⚠️ <b>Erreur</b>\n📺 {$channel}\n🔴 " . ($data['error_type'] ?? '—') . "\n💬 " . substr($error ?: 'Erreur inconnue', 0, 200),
            'channel_reconnect' => "🔄 <b>Reconnexion</b>\n📺 {$channel}\n📝 Tentative " . ($data['attempt'] ?? '?') . '/' . ($data['max_attempts'] ?? '?'),
            'channel_failover' => "⚡ <b>Failover</b>\n📺 {$channel}\n💬 " . ($data['reason'] ?? '—') . "\n⏱️ " . ($data['duration'] ?? '—') . 's',
            'stream_switch' => "🔀 <b>Changement source</b>\n📺 {$channel}\n🔗 " . ($data['new_url'] ?? '—'),
            'stream_error', 'error' => "⚠️ <b>Erreur</b>\n📺 {$channel}\n💬 " . substr($error ?: 'Erreur inconnue', 0, 200),
            'm3u_refresh' => "📡 <b>Rafraîchissement M3U</b>\n🏷️ " . ($data['account_name'] ?? '—') . "\n➕ " . ($data['streams_created'] ?? 0) . " créés\n🔄 " . ($data['streams_updated'] ?? 0) . " mis à jour\n🗑️ " . ($data['streams_deleted'] ?? 0) . " supprimés\n📦 " . ($data['total_processed'] ?? 0) . " total",
            'epg_refresh' => "📺 <b>Rafraîchissement EPG</b>\n🏷️ " . ($data['source_name'] ?? '—') . "\n📋 " . ($data['programs'] ?? 0) . " programmes\n📺 " . ($data['channels'] ?? 0) . " chaînes",
            'login_failed' => "🚫 <b>Connexion refusée</b>\n👤 " . ($data['user'] ?? '—') . "\n🌐 " . ($data['client_ip'] ?? '—') . "\n💬 " . ($data['reason'] ?? '—'),
            'recording_start' => "⏺️ <b>Enregistrement démarré</b>\n📺 {$channel}\n🆔 " . ($data['recording_id'] ?? '—'),
            'recording_end' => "⏹️ <b>Enregistrement terminé</b>\n📺 {$channel}\n📦 " . ($data['bytes_written'] ? number_format($data['bytes_written'] / 1048576, 1) . ' MB' : '—'),
            'vod_start' => "🎬 <b>VOD démarré</b>\n🎞️ " . ($data['content_name'] ?? '—') . "\n👤 " . ($data['username'] ?? '—'),
            'vod_stop' => "⏹️ <b>VOD terminé</b>\n🎞️ " . ($data['content_name'] ?? '—'),
            default => "📌 <b>{$eventType}</b>\n📺 {$channel}",
        };

        // Ajouter client + date en footer
        if (!in_array($eventType, ['client_connect', 'client_disconnect', 'login_failed', 'vod_start'])) {
            if ($client !== '—') {
                $msg .= "\n👤 {$client}{$pays}";
            }
        }
        $msg .= "\n🕐 {$date}";

        return $msg;
    }

    /**
     * Formatter channel_start avec toutes les infos
     */
    private function formatChannelStart(array $data): string
    {
        $channel = $data['channel_name'] ?? '—';
        $streamName = $data['stream_name'] ?? null;
        $streamUrl = $data['stream_url'] ?? null;
        $provider = $data['provider_name'] ?? null;
        $profile = $data['profile_used'] ?? null;
        $msg = "▶️ <b>Chaîne démarrée</b>\n";
        $msg .= "📺 {$channel}";
        if ($streamName) {
            $msg .= "\n🏷️ Stream: {$streamName}";
        }
        if ($provider) {
            $msg .= "\n📡 Provider: {$provider}";
        }
        if ($profile) {
            $msg .= "\n⚙️ Profil: {$profile}";
        }
        if ($streamUrl && $streamUrl !== '-') {
            $msg .= "\n🔗 " . substr($streamUrl, 0, 80);
        }
        // Chercher les clients actifs sur cette chaîne
        $clients = ActiveClient::where('channel_name', $channel)
            ->select('username', 'client_ip', 'country', 'country_code')
            ->get();
        if ($clients->isNotEmpty()) {
            $msg .= "\n\n👤 <b>Clients :</b>";
            foreach ($clients as $cl) {
                $flag = $cl->country_code ? $this->flagEmoji($cl->country_code) : '🌍';
                $name = $cl->username ?: $cl->client_ip ?: '—';
                $country = $cl->country ? " {$flag} {$cl->country}" : '';
                $msg .= "\n  • {$name}{$country}";
            }
        }

        // Pas de date ici, formatEvent l'ajoute

        return $msg;
    }

    /**
     * Convertir code pays en emoji drapeau (Regional Indicator)
     */
    private function flagEmoji(string $code): string
    {
        $code = strtoupper($code);
        if (strlen($code) !== 2) return '🌍';
        return mb_chr(0x1F1E6 + ord($code[0]) - ord('A'))
             . mb_chr(0x1F1E6 + ord($code[1]) - ord('A'));
    }
}
