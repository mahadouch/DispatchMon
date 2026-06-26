<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DispatcharrEvent extends Model
{
    protected $fillable = [
        'event_type', 'channel_name', 'stream_name', 'stream_url',
        'provider_name', 'profile_used', 'client_ip', 'client_id',
        'user_agent', 'username', 'runtime', 'total_bytes',
        'duration', 'bytes_sent', 'error_type', 'error_message',
        'reason', 'source_name', 'programs', 'channels_count',
        'account_name', 'streams_created', 'streams_updated',
        'streams_deleted', 'content_name', 'content_uuid',
        'raw_payload', 'dispatcharr_timestamp',
    ];

    protected $casts = [
        'raw_payload' => 'array',
        'dispatcharr_timestamp' => 'datetime',
        'total_bytes' => 'integer',
        'bytes_sent' => 'integer',
    ];
}
