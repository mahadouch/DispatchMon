<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Channel extends Model
{
    protected $fillable = [
        'name', 'channel_number', 'group_name', 'logo_url',
        'is_active', 'current_viewers', 'last_seen',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'current_viewers' => 'integer',
    ];
}
