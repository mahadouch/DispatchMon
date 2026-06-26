<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $defaults = [
            'notify_channel_error' => '1',
            'notify_channel_reconnect' => '1',
            'notify_channel_failover' => '1',
            'notify_stream_switch' => '1',
            'notify_m3u_refresh' => '1',
            'notify_epg_refresh' => '1',
            'notify_login_failed' => '1',
            'notify_recording_start' => '1',
            'notify_recording_end' => '1',
            'notify_vod_start' => '1',
            'notify_vod_stop' => '1',
        ];

        foreach ($defaults as $key => $value) {
            DB::table('settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    public function down(): void
    {
        $keys = [
            'notify_channel_error', 'notify_channel_reconnect', 'notify_channel_failover',
            'notify_stream_switch', 'notify_m3u_refresh', 'notify_epg_refresh',
            'notify_login_failed', 'notify_recording_start', 'notify_recording_end',
            'notify_vod_start', 'notify_vod_stop',
        ];
        DB::table('settings')->whereIn('key', $keys)->delete();
    }
};
