<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    private string $botToken;
    private string $chatId;

    public function __construct()
    {
        $this->botToken = Setting::get('telegram_bot_token', '');
        $this->chatId = Setting::get('telegram_chat_id', '');
    }

    /**
     * Vérifier si Telegram est configuré et activé
     */
    public function isConfigured(): bool
    {
        return Setting::get('telegram_enabled', '0') === '1'
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
            'stream_error', 'error' => 'errors',
            default => 'client_connect', // fallback
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

        return match ($eventType) {
            'client_connect' => "🟢 <b>Nouveau client</b>\n👤 {$client}{$pays}\n📺 {$channel}",
            'client_disconnect' => "🔴 <b>Déconnexion</b>\n👤 {$client}{$pays}\n📺 {$channel}",
            'channel_start' => "▶️ <b>Chaîne démarrée</b>\n📺 {$channel}",
            'channel_stop' => "⏹️ <b>Chaîne arrêtée</b>\n📺 {$channel}",
            'stream_error', 'error' => "⚠️ <b>Erreur</b>\n📺 {$channel}\n💬 " . substr($error ?: 'Erreur inconnue', 0, 200),
            default => "📌 <b>{$eventType}</b>\n📺 {$channel}",
        };
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
