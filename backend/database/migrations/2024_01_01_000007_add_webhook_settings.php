<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $webhooks = [
            'discord_webhook' => '',
            'slack_webhook' => '',
            'custom_webhook' => '',
        ];

        foreach ($webhooks as $key => $value) {
            DB::table('settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'updated_at' => now()]
            );
        }
    }

    public function down(): void
    {
        DB::table('settings')->whereIn('key', [
            'discord_webhook', 'slack_webhook', 'custom_webhook'
        ])->delete();
    }
};
