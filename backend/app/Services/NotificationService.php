<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class NotificationService
{
    /**
     * Envoyer une notification Discord
     */
    public function sendDiscord(string $webhookUrl, string $message, string $title = 'DispatchMon'): bool
    {
        if (empty($webhookUrl)) return false;

        try {
            $response = Http::timeout(5)->post($webhookUrl, [
                'embeds' => [[
                    'title' => $title,
                    'description' => $message,
                    'color' => 5814783, // blue
                    'timestamp' => now()->toIso8601String(),
                ]],
            ]);
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Envoyer une notification Slack
     */
    public function sendSlack(string $webhookUrl, string $message, string $title = 'DispatchMon'): bool
    {
        if (empty($webhookUrl)) return false;

        try {
            $response = Http::timeout(5)->post($webhookUrl, [
                'blocks' => [[
                    'type' => 'section',
                    'text' => [
                        'type' => 'mrkdwn',
                        'text' => "*{$title}*\n{$message}",
                    ],
                ]],
            ]);
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Envoyer vers un webhook custom
     */
    public function sendCustom(string $webhookUrl, array $data): bool
    {
        if (empty($webhookUrl)) return false;

        try {
            $response = Http::timeout(5)->post($webhookUrl, $data);
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Envoyer vers tous les webhooks configurés
     */
    public function broadcast(string $message, string $title = 'DispatchMon'): void
    {
        $settings = app(\App\Http\Controllers\SettingsController::class)->index()->getData();

        // Discord
        $discordUrl = $settings->discord_webhook ?? '';
        if ($discordUrl) {
            $this->sendDiscord($discordUrl, $message, $title);
        }

        // Slack
        $slackUrl = $settings->slack_webhook ?? '';
        if ($slackUrl) {
            $this->sendSlack($slackUrl, $message, $title);
        }

        // Custom
        $customUrl = $settings->custom_webhook ?? '';
        if ($customUrl) {
            $this->sendCustom($customUrl, ['title' => $title, 'message' => $message]);
        }
    }
}
