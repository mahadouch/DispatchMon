<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KnownClient extends Model
{
    protected $fillable = [
        'client_ip', 'username', 'country', 'country_code',
        'is_paid', 'first_seen', 'last_seen', 'total_sessions',
    ];

    protected $casts = [
        'is_paid' => 'boolean',
        'first_seen' => 'datetime',
        'last_seen' => 'datetime',
        'total_sessions' => 'integer',
    ];
}
