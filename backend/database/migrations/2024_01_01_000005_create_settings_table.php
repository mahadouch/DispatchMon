<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // Insérer les settings par défaut pour Telegram
        DB::table('settings')->insert([
            ['key' => 'telegram_enabled', 'value' => '0', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'telegram_bot_token', 'value' => null, 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'telegram_chat_id', 'value' => null, 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'notify_client_connect', 'value' => '1', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'notify_client_disconnect', 'value' => '0', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'notify_channel_start', 'value' => '1', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'notify_channel_stop', 'value' => '1', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'notify_errors', 'value' => '1', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'notify_new_client', 'value' => '1', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
